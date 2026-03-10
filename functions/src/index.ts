import * as dotenv from 'dotenv';
dotenv.config();

import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';
import axios from 'axios';
import { BajieService } from './services/bajie.service';
import { BncPaymentService } from './services/bncPayment';
import { CasheaService } from './services/cashea.service';
import { NotificationService } from './services/notification.service';

admin.initializeApp();

const db = admin.firestore();

// Namespaced collections to avoid collisions with client's existing data
const COLLECTIONS = {
    USERS: 'voltaje_users',
    TRANSACTIONS: 'voltaje_transactions',
    COUPONS: 'voltaje_coupons',
    COUPON_QUOTAS: 'voltaje_coupon_quotas',
    ACTIVE_RENTALS: 'voltaje_active_rentals'
} as const;

function requireAuth(context: functions.https.CallableContext): string {
    if (!context.auth) {
        throw new functions.https.HttpsError('unauthenticated', 'Debes iniciar sesión.');
    }
    return context.auth.uid;
}

async function sendRentalNotifications(uid: string, machineId: string) {
    try {
        const userDoc = await db.collection(COLLECTIONS.USERS).doc(uid).get();
        const profile = userDoc.exists ? userDoc.data() : null;

        let userName = profile?.name;
        let phone = profile?.phone;
        let email = profile?.email;

        // Fallback to Auth records
        if (!email || !userName) {
            try {
                const userAuth = await admin.auth().getUser(uid);
                userName = userName || userAuth.displayName || 'Usuario';
                email = email || userAuth.email;
            } catch (e) {
                console.warn('Could not fetch userAuth for notifications', e);
            }
        }

        const notifService = new NotificationService();
        if (email) await notifService.sendRentalEmail(email, userName || 'Usuario', machineId);
        if (phone) await notifService.sendRentalWhatsApp(phone, userName || 'Usuario', machineId);
    } catch (error) {
        console.error('Error sending rental notifications:', error);
    }
}

/**
 * initiatePayment — C2P collection + machine unlock
 */
export const initiatePayment = functions.https.onCall(async (data, context) => {
    const uid = requireAuth(context);
    const { amount, payerPhone, payerId, payerBankCode, payerToken, machineId, slotId } = data;

    if (!amount || !payerPhone || !payerId || !payerBankCode || !payerToken || !machineId) {
        throw new functions.https.HttpsError('invalid-argument', 'Faltan datos del pago.');
    }

    console.log(`📱 Payment Request by ${uid} for ${machineId} (${amount} VES)`);

    const bncPayment = new BncPaymentService();
    const bajieService = new BajieService();

    try {
        const logonRes = await bncPayment.logon();
        if (!logonRes.success) {
            throw new functions.https.HttpsError('internal', `Error Banco (Logon): ${logonRes.message}`);
        }

        const payRes = await bncPayment.collectC2P({
            amount: Number(amount),
            payerBankCode: Number(payerBankCode),
            payerCellPhone: payerPhone,
            payerID: payerId,
            payerToken: payerToken,
            description: `Rental ${machineId}`,
            operationRef: Date.now().toString()
        });

        if (!payRes.success) {
            throw new functions.https.HttpsError('aborted', `Pago Fallido: ${payRes.message}`);
        }

        const deviceId = await bajieService.resolveQrToDeviceId(machineId);
        console.log(`🔑 Resolved machineId "${machineId}" -> cId "${deviceId}"`);
        const targetSlot = slotId || await bajieService.findAvailableSlot(deviceId);
        console.log(`🎰 Target slot: ${targetSlot}`);

        let unlockRes;
        try {
            unlockRes = await bajieService.unlock(deviceId, targetSlot);
        } catch (e: any) {
            unlockRes = { success: false, error: e.message };
        }

        await db.collection(COLLECTIONS.TRANSACTIONS).add({
            uid,
            type: 'C2P_PAYMENT',
            amount: Number(amount),
            machineId,
            slotId: targetSlot,
            paymentRef: payRes.data?.Reference || 'N/A',
            unlockStatus: unlockRes.success ? 'UNLOCKED' : 'FAILED',
            timestamp: admin.firestore.FieldValue.serverTimestamp()
        });

        if (unlockRes.success) {
            await db.collection(COLLECTIONS.ACTIVE_RENTALS).doc(uid).set({
                uid,
                machineId,
                deviceId,
                slotId: targetSlot,
                status: 'ACTIVE',
                startedAt: admin.firestore.FieldValue.serverTimestamp(),
                paymentRef: payRes.data?.Reference || 'N/A',
                paymentType: 'C2P_PAYMENT'
            });
            await sendRentalNotifications(uid, machineId);
        }

        return {
            success: true,
            paymentRef: payRes.data?.Reference || 'MOCK-REF',
            unlockStatus: unlockRes.success ? 'UNLOCKED' : 'FAILED',
            unlockDetail: unlockRes,
            message: unlockRes.success
                ? 'Pago Exitoso y Powerbank Liberado'
                : 'Pago Exitoso pero Fallo Desbloqueo (Contactar Soporte)'
        };
    } catch (error) {
        if (error instanceof functions.https.HttpsError) throw error;
        console.error('Unknown Error:', error);
        throw new functions.https.HttpsError('internal', 'Error inesperado.');
    }
});

/**
 * getMachineStatus — Check machine/cabinet status
 */
export const getMachineStatus = functions.https.onCall(async (_data, _context) => {
    return { status: 'online', timestamp: Date.now() };
});

/**
 * validateP2P — Validate a Pago Móvil reference + unlock machine
 */
export const validateP2P = functions.https.onCall(async (data, context) => {
    const uid = requireAuth(context);
    const { amount, bankCode, phoneNumber, reference, payerId, machineId, slotId } = data;

    if (!amount || !bankCode || !phoneNumber || !reference || !machineId) {
        throw new functions.https.HttpsError('invalid-argument', 'Faltan datos P2P.');
    }

    console.log(`🔍 P2P Validation by ${uid} for ${machineId} (Ref: ${reference})`);

    const bncPayment = new BncPaymentService();
    const bajieService = new BajieService();

    try {
        const logonRes = await bncPayment.logon();
        if (!logonRes.success) {
            throw new functions.https.HttpsError('internal', `Error Banco: ${logonRes.message}`);
        }

        const validateRes = await bncPayment.validateP2P({
            accountNumber: '',
            bankCode: Number(bankCode),
            phoneNumber,
            clientID: payerId || '',
            reference,
            amount: Number(amount)
        });

        if (!validateRes.success) {
            throw new functions.https.HttpsError('not-found', `Pago no encontrado: ${validateRes.message}`);
        }

        const deviceId = await bajieService.resolveQrToDeviceId(machineId);
        console.log(`🔑 Resolved machineId "${machineId}" -> cId "${deviceId}"`);

        const targetSlot = slotId || await bajieService.findAvailableSlot(deviceId);
        console.log(`🎰 Target slot: ${targetSlot}`);

        let unlockRes;
        try {
            unlockRes = await bajieService.unlock(deviceId, targetSlot);
        } catch (e: any) {
            unlockRes = { success: false, error: e.message };
        }

        const depositVES = Number(amount);
        const userRef = db.collection(COLLECTIONS.USERS).doc(uid);
        const userSnap = await userRef.get();

        if (!userSnap.exists) {
            await userRef.set({
                walletBalance: depositVES,
                createdAt: admin.firestore.FieldValue.serverTimestamp()
            });
        } else {
            await userRef.update({
                walletBalance: admin.firestore.FieldValue.increment(depositVES)
            });
        }

        const updatedDoc = await userRef.get();
        const newBalance = updatedDoc.data()?.walletBalance || depositVES;
        console.log(`💰 Wallet credited: +${depositVES} VES => new balance: ${newBalance} VES`);

        await db.collection(COLLECTIONS.TRANSACTIONS).add({
            uid,
            type: 'P2P_DEPOSIT',
            amount: depositVES,
            reference,
            machineId,
            deviceId,
            slotId: targetSlot,
            unlockStatus: unlockRes.success ? 'UNLOCKED' : 'FAILED',
            rentalStartedAt: unlockRes.success ? admin.firestore.FieldValue.serverTimestamp() : null,
            timestamp: admin.firestore.FieldValue.serverTimestamp()
        });

        if (unlockRes.success) {
            await db.collection(COLLECTIONS.ACTIVE_RENTALS).doc(uid).set({
                uid,
                machineId,
                deviceId,
                slotId: targetSlot,
                status: 'ACTIVE',
                startedAt: admin.firestore.FieldValue.serverTimestamp(),
                paymentRef: reference,
                paymentType: 'P2P_DEPOSIT'
            });
            await sendRentalNotifications(uid, machineId);
        }

        return {
            success: true,
            paymentRef: reference,
            unlockStatus: unlockRes.success ? 'UNLOCKED' : 'FAILED',
            unlockDetail: unlockRes,
            walletBalance: newBalance,
            message: unlockRes.success ? 'Pago Validado y Powerbank Liberado' : 'Pago Validado pero Fallo Desbloqueo'
        };
    } catch (error) {
        if (error instanceof functions.https.HttpsError) throw error;
        console.error('System Error:', error);
        throw new functions.https.HttpsError('internal', 'Error interno de validación.');
    }
});

/**
 * getStations — Fetch charging stations from Bajie for the map
 */
export const getStations = functions.https.onCall(async (data, _context) => {
    try {
        const lat = data.lat ? Number(data.lat) : 10.4806;
        const lng = data.lng ? Number(data.lng) : -66.9036;

        console.log(`🗺️ Fetching Stations near ${lat}, ${lng}...`);
        const bajieService = new BajieService();
        const response = await bajieService.getShops(lat, lng);

        if (response.code === 0 || response.code === 200) {
            return { success: true, stations: response.data?.list || [] };
        }

        return { success: false, stations: [], error: response.msg || 'Error del servicio' };
    } catch (e) {
        console.error('🔥 CRITICAL ERROR in getStations:', e);
        return {
            success: false,
            stations: [],
            error: `CRITICAL: ${e instanceof Error ? e.message : String(e)}`
        };
    }
});

/**
 * withdrawFunds — Send money from wallet to user's bank via BNC P2P
 */
export const withdrawFunds = functions.https.onCall(async (data, context) => {
    const uid = requireAuth(context);
    const { amount, bankCode, phoneNumber, personalId, beneficiaryName, description } = data;

    if (!amount || !bankCode || !phoneNumber || !personalId || !beneficiaryName) {
        throw new functions.https.HttpsError('invalid-argument', 'Faltan datos del retiro (incluir nombre del beneficiario).');
    }

    const withdrawAmount = Number(amount);
    if (withdrawAmount <= 0) {
        throw new functions.https.HttpsError('invalid-argument', 'El monto debe ser mayor a 0.');
    }

    console.log(`💸 Withdrawal by ${uid}: ${withdrawAmount} VES to ${phoneNumber}`);

    const userRef = db.collection(COLLECTIONS.USERS).doc(uid);

    try {
        const walletBalance = await db.runTransaction(async (tx) => {
            const userDoc = await tx.get(userRef);

            if (!userDoc.exists) {
                tx.set(userRef, { walletBalance: 0, createdAt: admin.firestore.FieldValue.serverTimestamp() });
                throw new functions.https.HttpsError('failed-precondition', 'No tienes saldo disponible.');
            }

            const balance = userDoc.data()?.walletBalance || 0;
            if (balance < withdrawAmount) {
                throw new functions.https.HttpsError(
                    'failed-precondition',
                    `Saldo insuficiente. Disponible: ${balance} VES, Solicitado: ${withdrawAmount} VES`
                );
            }

            tx.update(userRef, {
                walletBalance: admin.firestore.FieldValue.increment(-withdrawAmount)
            });

            return balance;
        });

        const bncPayment = new BncPaymentService();
        const logonRes = await bncPayment.logon();
        if (!logonRes.success) {
            await userRef.update({ walletBalance: admin.firestore.FieldValue.increment(withdrawAmount) });
            throw new functions.https.HttpsError('internal', `Error Banco: ${logonRes.message}`);
        }

        const payoutRes = await bncPayment.sendP2C({
            amount: withdrawAmount,
            beneficiaryBankCode: Number(bankCode),
            beneficiaryCellPhone: phoneNumber,
            beneficiaryID: personalId,
            beneficiaryName: beneficiaryName,
            description: description || 'Reintegro Voltaje',
            operationRef: Date.now().toString()
        });

        if (!payoutRes.success) {
            await userRef.update({ walletBalance: admin.firestore.FieldValue.increment(withdrawAmount) });
            throw new functions.https.HttpsError('aborted', `Retiro Fallido: ${payoutRes.message}`);
        }

        await db.collection(COLLECTIONS.TRANSACTIONS).add({
            uid,
            type: 'P2C_WITHDRAWAL',
            amount: withdrawAmount,
            bankCode,
            phoneNumber,
            personalId,
            beneficiaryName,
            reference: payoutRes.data?.Reference || 'PENDING',
            previousBalance: walletBalance,
            newBalance: walletBalance - withdrawAmount,
            timestamp: admin.firestore.FieldValue.serverTimestamp()
        });

        return {
            success: true,
            message: 'Reintegro Procesado Exitosamente',
            reference: payoutRes.data?.Reference || 'PENDING',
            newBalance: walletBalance - withdrawAmount,
            date: new Date().toISOString()
        };
    } catch (error) {
        if (error instanceof functions.https.HttpsError) throw error;
        console.error('Withdrawal Error:', error);
        throw new functions.https.HttpsError('internal', 'Error interno en retiro.');
    }
});

/**
 * getWalletBalance — Get user's current wallet balance
 */
export const getWalletBalance = functions.https.onCall(async (_data, context) => {
    const uid = requireAuth(context);
    const userDoc = await db.collection(COLLECTIONS.USERS).doc(uid).get();

    if (!userDoc.exists) {
        await db.collection(COLLECTIONS.USERS).doc(uid).set({
            walletBalance: 0,
            createdAt: admin.firestore.FieldValue.serverTimestamp()
        });
        return { balance: 0 };
    }

    return { balance: userDoc.data()?.walletBalance || 0 };
});

/**
 * getTransactionHistory — Fetch user's transaction history
 */
export const getTransactionHistory = functions.https.onCall(async (_data, context) => {
    const uid = requireAuth(context);

    const snapshot = await db.collection(COLLECTIONS.TRANSACTIONS)
        .where('uid', '==', uid)
        .orderBy('timestamp', 'desc')
        .limit(50)
        .get();

    const transactions = snapshot.docs.map(doc => {
        const data = doc.data();
        return {
            id: doc.id,
            type: data.type || '',
            amount: data.amount || 0,
            machineId: data.machineId || '',
            reference: data.reference || data.paymentRef || '',
            unlockStatus: data.unlockStatus || '',
            slotId: data.slotId || 0,
            timestamp: data.timestamp?.toDate?.()?.toISOString() || ''
        };
    });

    return { transactions };
});

// ──────────────────────────────────────────
// BCV Exchange Rate Helper
// ──────────────────────────────────────────

async function fetchBcvRate(): Promise<number> {
    const cacheRef = db.collection('voltaje_config').doc('bcv_rate');
    const cached = await cacheRef.get();
    const data = cached.data();

    if (data?.rate && data?.updatedAt) {
        const age = Date.now() - data.updatedAt.toDate().getTime();
        if (age < 6 * 60 * 60 * 1000) {
            return data.rate;
        }
    }

    try {
        const resp = await axios.get('https://pydolarve.org/api/v2/dollar?page=bcv', {
            timeout: 8000,
            headers: { 'Accept': 'application/json' }
        });

        const monitors = resp.data?.monitors;
        const usdRate = monitors?.usd?.price;

        if (usdRate && typeof usdRate === 'number' && usdRate > 0) {
            await cacheRef.set({
                rate: usdRate,
                source: 'bcv',
                updatedAt: admin.firestore.FieldValue.serverTimestamp()
            });
            console.log(`📊 BCV rate updated: 1 USD = ${usdRate} VES`);
            return usdRate;
        }
    } catch (e: any) {
        console.error('BCV rate fetch error:', e.message);
    }

    if (data?.rate) return data.rate;

    return 95.0;
}

/**
 * getBcvRate — Public endpoint to fetch current BCV exchange rate
 */
export const getBcvRate = functions.https.onCall(async () => {
    const rate = await fetchBcvRate();
    return { rate, currency: 'VES' };
});

/**
 * calculateRentalCharge — Calculate and deduct rental cost from wallet
 * Called when user returns the power bank.
 * Bajie pricing: 5 min free, then $1 USD / 30 min (converted to VES via BCV)
 */
export const calculateRentalCharge = functions.https.onCall(async (data, context) => {
    const uid = requireAuth(context);
    const { rentalMinutes, machineId, transactionId } = data;

    if (!rentalMinutes && rentalMinutes !== 0) {
        throw new functions.https.HttpsError('invalid-argument', 'Falta duración del alquiler.');
    }

    const minutes = Number(rentalMinutes);
    const FREE_MINUTES = 5;
    const USD_PER_30MIN = 1.0;

    let chargeUSD = 0;
    if (minutes > FREE_MINUTES) {
        const billableMinutes = minutes - FREE_MINUTES;
        const periods = Math.ceil(billableMinutes / 30);
        chargeUSD = periods * USD_PER_30MIN;
    }

    const bcvRate = await fetchBcvRate();
    const chargeVES = Math.round(chargeUSD * bcvRate * 100) / 100;

    console.log(`⏱️ Rental ${minutes}min => ${chargeUSD} USD * ${bcvRate} = ${chargeVES} VES`);

    const userRef = db.collection(COLLECTIONS.USERS).doc(uid);
    let newBalance = 0;

    await db.runTransaction(async (tx) => {
        const userDoc = await tx.get(userRef);
        const balance = userDoc.data()?.walletBalance || 0;

        const deduction = Math.min(chargeVES, balance);
        newBalance = Math.round((balance - deduction) * 100) / 100;

        tx.update(userRef, { walletBalance: newBalance });
    });

    await db.collection(COLLECTIONS.TRANSACTIONS).add({
        uid,
        type: 'RENTAL_CHARGE',
        rentalMinutes: minutes,
        chargeUSD,
        chargeVES,
        bcvRate,
        machineId: machineId || '',
        relatedTransaction: transactionId || '',
        newBalance,
        timestamp: admin.firestore.FieldValue.serverTimestamp()
    });

    return {
        success: true,
        rentalMinutes: minutes,
        chargeUSD,
        chargeVES,
        bcvRate,
        newBalance,
        message: chargeVES > 0
            ? `Cargo: $${chargeUSD.toFixed(2)} (Bs. ${chargeVES.toFixed(2)})`
            : 'Sin cargo (dentro de los 5 min gratis)'
    };
});

// ──────────────────────────────────────────
// COUPON SYSTEM
// ──────────────────────────────────────────

const MAX_COUPONS_PER_MONTH = 10;
const COUPON_FREE_MINUTES = 50;

function currentMonthKey(): string {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

/**
 * createCoupon — Create a coupon for another user by email
 */
export const createCoupon = functions.https.onCall(async (data, context) => {
    const uid = requireAuth(context);
    const { recipientEmail } = data;

    if (!recipientEmail || typeof recipientEmail !== 'string') {
        throw new functions.https.HttpsError('invalid-argument', 'Email del destinatario requerido.');
    }

    const email = recipientEmail.trim().toLowerCase();

    const recipientUser = await admin.auth().getUserByEmail(email).catch(() => null);
    if (!recipientUser) {
        throw new functions.https.HttpsError('not-found', 'No existe un usuario registrado con ese correo.');
    }

    if (recipientUser.uid === uid) {
        throw new functions.https.HttpsError('invalid-argument', 'No puedes enviarte un cupón a ti mismo.');
    }

    const monthKey = currentMonthKey();
    const quotaRef = db.collection(COLLECTIONS.COUPON_QUOTAS).doc(`${uid}_${monthKey}`);

    const newCount = await db.runTransaction(async (tx) => {
        const quotaDoc = await tx.get(quotaRef);
        const used = quotaDoc.exists ? (quotaDoc.data()?.used || 0) : 0;

        if (used >= MAX_COUPONS_PER_MONTH) {
            throw new functions.https.HttpsError(
                'resource-exhausted',
                `Has alcanzado el límite de ${MAX_COUPONS_PER_MONTH} cupones este mes.`
            );
        }

        if (quotaDoc.exists) {
            tx.update(quotaRef, { used: used + 1 });
        } else {
            tx.set(quotaRef, { uid, monthKey, used: 1 });
        }

        return used + 1;
    });

    const senderRecord = await admin.auth().getUser(uid);
    const senderName = senderRecord.displayName || senderRecord.email || 'Un amigo';

    const couponRef = await db.collection(COLLECTIONS.COUPONS).add({
        fromUid: uid,
        fromName: senderName,
        toUid: recipientUser.uid,
        toEmail: email,
        toName: recipientUser.displayName || email,
        freeMinutes: COUPON_FREE_MINUTES,
        used: false,
        usedAt: null,
        createdAt: admin.firestore.FieldValue.serverTimestamp()
    });

    console.log(`🎟️ Coupon ${couponRef.id} created by ${uid} for ${email} (${newCount}/${MAX_COUPONS_PER_MONTH})`);

    return {
        success: true,
        couponId: couponRef.id,
        usedThisMonth: newCount,
        remaining: MAX_COUPONS_PER_MONTH - newCount,
        message: `Cupón enviado a ${recipientUser.displayName || email}`
    };
});

/**
 * getCouponQuota — Get how many coupons the user has created this month
 */
export const getCouponQuota = functions.https.onCall(async (_data, context) => {
    const uid = requireAuth(context);
    const monthKey = currentMonthKey();
    const quotaDoc = await db.collection(COLLECTIONS.COUPON_QUOTAS).doc(`${uid}_${monthKey}`).get();
    const used = quotaDoc.exists ? (quotaDoc.data()?.used || 0) : 0;

    return {
        used,
        remaining: MAX_COUPONS_PER_MONTH - used,
        max: MAX_COUPONS_PER_MONTH,
        month: monthKey
    };
});

/**
 * resetCouponQuota — DEV ONLY: Reset monthly counter for testing
 */
export const resetCouponQuota = functions.https.onCall(async (_data, context) => {
    const uid = requireAuth(context);
    const monthKey = currentMonthKey();
    await db.collection(COLLECTIONS.COUPON_QUOTAS).doc(`${uid}_${monthKey}`).set({ uid, monthKey, used: 0 });
    console.log(`🔄 Coupon quota reset for ${uid}`);
    return { success: true, remaining: MAX_COUPONS_PER_MONTH, message: 'Contador reiniciado' };
});

/**
 * getMyCoupons — Get coupons received by the current user
 */
export const getMyCoupons = functions.https.onCall(async (_data, context) => {
    const uid = requireAuth(context);
    console.log(`🎟️ getMyCoupons for uid: ${uid}`);

    const snap = await db.collection(COLLECTIONS.COUPONS)
        .where('toUid', '==', uid)
        .get();

    console.log(`🎟️ Found ${snap.docs.length} coupons for ${uid}`);

    const coupons = snap.docs.map(doc => {
        const d = doc.data();
        return {
            id: doc.id,
            fromName: d.fromName || 'Alguien especial',
            freeMinutes: d.freeMinutes || COUPON_FREE_MINUTES,
            used: d.used || false,
            usedAt: d.usedAt?.toDate?.()?.toISOString() || null,
            createdAt: d.createdAt?.toDate?.()?.toISOString() || ''
        };
    });

    coupons.sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''));

    return { coupons };
});

/**
 * useCoupon — Redeem a coupon: unlock a machine slot for free
 */
export const useCoupon = functions.https.onCall(async (data, context) => {
    const uid = requireAuth(context);
    const { couponId, machineId, slotId } = data;

    if (!couponId || !machineId) {
        throw new functions.https.HttpsError('invalid-argument', 'Faltan datos del cupón o máquina.');
    }

    const couponRef = db.collection(COLLECTIONS.COUPONS).doc(couponId);
    const couponDoc = await couponRef.get();

    if (!couponDoc.exists) {
        throw new functions.https.HttpsError('not-found', 'Cupón no encontrado.');
    }

    const couponData = couponDoc.data()!;

    if (couponData.toUid !== uid) {
        throw new functions.https.HttpsError('permission-denied', 'Este cupón no te pertenece.');
    }

    if (couponData.used) {
        throw new functions.https.HttpsError('already-exists', 'Este cupón ya fue utilizado.');
    }

    const bajieService = new BajieService();
    const deviceId = await bajieService.resolveQrToDeviceId(machineId);
    console.log(`🎟️ Coupon ${couponId}: Resolved "${machineId}" -> "${deviceId}"`);

    const targetSlot = slotId || await bajieService.findAvailableSlot(deviceId);

    let unlockRes;
    try {
        unlockRes = await bajieService.unlock(deviceId, targetSlot);
    } catch (e: any) {
        unlockRes = { success: false, error: e.message };
    }

    await couponRef.update({
        used: true,
        usedAt: admin.firestore.FieldValue.serverTimestamp(),
        usedMachineId: machineId,
        usedDeviceId: deviceId,
        usedSlot: targetSlot
    });

    await db.collection(COLLECTIONS.TRANSACTIONS).add({
        uid,
        type: 'COUPON_REDEMPTION',
        couponId,
        machineId,
        deviceId,
        slotId: targetSlot,
        freeMinutes: couponData.freeMinutes,
        unlockStatus: unlockRes.success ? 'UNLOCKED' : 'FAILED',
        timestamp: admin.firestore.FieldValue.serverTimestamp()
    });

    if (unlockRes.success) {
        await db.collection(COLLECTIONS.ACTIVE_RENTALS).doc(uid).set({
            uid,
            machineId,
            deviceId,
            slotId: targetSlot,
            status: 'ACTIVE',
            startedAt: admin.firestore.FieldValue.serverTimestamp(),
            paymentRef: couponId,
            paymentType: 'COUPON_REDEMPTION'
        });
        await sendRentalNotifications(uid, machineId);
    }

    return {
        success: true,
        unlockStatus: unlockRes.success ? 'UNLOCKED' : 'FAILED',
        unlockDetail: unlockRes,
        freeMinutes: couponData.freeMinutes,
        message: unlockRes.success
            ? `¡Powerbank liberado! Tienes ${couponData.freeMinutes} min gratis.`
            : 'Cupón canjeado pero fallo el desbloqueo. Contacta soporte.'
    };
});

// ============================================================
// CASHEA PAYMENT FUNCTIONS
// ============================================================

/**
 * createCasheaOrder — Create a Cashea BNPL order and return checkout URL
 */
export const createCasheaOrder = functions.https.onCall(async (data, context) => {
    console.log('🛍️ [STEP 0] createCasheaOrder ENTERED');
    console.log('🛍️ [STEP 0] ENV CHECK — CASHEA_PUBLIC_API_KEY:', process.env.CASHEA_PUBLIC_API_KEY ? 'SET' : 'NOT SET');
    console.log('🛍️ [STEP 0] ENV CHECK — CASHEA_STORE_ID:', process.env.CASHEA_STORE_ID || 'NOT SET');

    try {
        const uid = requireAuth(context);
        console.log(`🛍️ [STEP 1] Auth OK, uid: ${uid}`);

        const { amount, machineId, slotId } = data;
        console.log(`🛍️ [STEP 2] Data: amount=${amount}, machineId=${machineId}, slotId=${slotId}`);

        if (!amount || !machineId) {
            throw new functions.https.HttpsError('invalid-argument', 'Faltan campos: amount, machineId');
        }

        console.log(`🛍️ [STEP 3] Creating CasheaService...`);
        const casheaService = new CasheaService();
        console.log(`🛍️ [STEP 4] CasheaService created OK`);

        const orderResult = await casheaService.createOrder({
            amount: Number(amount),
            machineId,
            slotId: slotId || 1,
            // Deep link: la app Flutter captura este URI para detectar el retorno
            redirectUrl: `voltaje://cashea/return`,
            cancelUrl: `voltaje://cashea/cancel`,
        });
        console.log(`🛍️ [STEP 5] Order result: ${JSON.stringify(orderResult)}`);

        if (!orderResult.success) {
            throw new functions.https.HttpsError('internal', orderResult.error || 'Error Cashea');
        }

        // Log the order creation
        await db.collection(COLLECTIONS.TRANSACTIONS).add({
            uid,
            type: 'CASHEA_ORDER_CREATED',
            amount: Number(amount),
            machineId,
            slotId: slotId || 1,
            casheaOrderId: orderResult.orderId,
            status: 'PENDING',
            createdAt: admin.firestore.FieldValue.serverTimestamp()
        });

        return {
            success: true,
            checkoutUrl: orderResult.checkoutUrl,
            orderId: orderResult.orderId,
            message: 'Orden creada. Completa el pago en Cashea.'
        };
    } catch (error: any) {
        console.error('🛍️ [FATAL] createCasheaOrder error:', error?.message || error);
        console.error('🛍️ [FATAL] Stack:', error?.stack);
        if (error instanceof functions.https.HttpsError) throw error;
        throw new functions.https.HttpsError('internal', `Error Cashea: ${error?.message || 'unknown'}`);
    }
});

/**
 * confirmCasheaOrder — Confirm the Cashea down-payment and unlock the machine
 */
export const confirmCasheaOrder = functions.https.onCall(async (data, context) => {
    const uid = requireAuth(context);
    const { idNumber, machineId, slotId } = data;

    if (!idNumber || !machineId) {
        throw new functions.https.HttpsError('invalid-argument', 'Faltan campos: idNumber, machineId');
    }

    console.log(`🛍️ Cashea Confirm by ${uid}: order ${idNumber} for ${machineId}`);

    const casheaService = new CasheaService();
    const bajieService = new BajieService();

    try {
        // 1. Confirm the down-payment with Cashea
        const confirmResult = await casheaService.confirmDownPayment(idNumber);
        if (!confirmResult.success) {
            throw new functions.https.HttpsError('internal', confirmResult.error || 'Error confirming Cashea payment');
        }

        // 2. Unlock the machine
        const deviceId = machineId;
        const targetSlot = slotId || 1;

        let unlockRes;
        try {
            unlockRes = await bajieService.unlock(deviceId, targetSlot);
        } catch (e: any) {
            unlockRes = { success: false, error: e.message };
        }

        // 3. Log the transaction
        await db.collection(COLLECTIONS.TRANSACTIONS).add({
            uid,
            type: 'CASHEA_PAYMENT',
            machineId,
            slotId: targetSlot,
            casheaIdNumber: idNumber,
            unlockStatus: unlockRes.success ? 'UNLOCKED' : 'FAILED',
            unlockDetail: unlockRes,
            createdAt: admin.firestore.FieldValue.serverTimestamp()
        });

        if (unlockRes.success) {
            await db.collection(COLLECTIONS.ACTIVE_RENTALS).add({
                uid,
                machineId,
                deviceId: machineId, // cashea currently uses machineId as proxy for deviceId in the controller
                slotId: targetSlot,
                status: 'ACTIVE',
                startedAt: admin.firestore.FieldValue.serverTimestamp(),
                paymentRef: idNumber,
                paymentType: 'CASHEA_PAYMENT'
            });
            await sendRentalNotifications(uid, machineId);
        }

        return {
            success: true,
            unlockStatus: unlockRes.success ? 'UNLOCKED' : 'FAILED',
            unlockDetail: unlockRes,
            message: unlockRes.success
                ? 'Pago Cashea confirmado y Powerbank Liberado'
                : 'Pago Cashea confirmado pero fallo el desbloqueo. Contacta soporte.'
        };
    } catch (error) {
        if (error instanceof functions.https.HttpsError) throw error;
        console.error('Cashea Confirm Error:', error);
        throw new functions.https.HttpsError('internal', 'Error al confirmar pago Cashea.');
    }
});

/**
 * Check if the user's profile is complete (Name, Phone, ID)
 */
export const getUserProfile = functions.https.onCall(async (data, context) => {
    const uid = requireAuth(context);
    try {
        const userDoc = await db.collection(COLLECTIONS.USERS).doc(uid).get();
        if (!userDoc.exists) {
            return { exists: false, isComplete: false };
        }
        const profile = userDoc.data();
        const isComplete = !!(profile?.name && profile?.phone && profile?.idNumber);
        return { exists: true, isComplete, profile };
    } catch (error: any) {
        throw new functions.https.HttpsError('internal', error.message);
    }
});

/**
 * Complete the user profile (first-time setup)
 */
export const completeUserProfile = functions.https.onCall(async (data, context) => {
    const uid = requireAuth(context);
    const { name, phone, idNumber } = data;

    if (!name || !phone || !idNumber) {
        throw new functions.https.HttpsError('invalid-argument', 'Todos los campos son obligatorios.');
    }

    try {
        await db.collection(COLLECTIONS.USERS).doc(uid).set({
            name,
            phone,
            idNumber,
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
            // Auto complete if missing wallet details
            walletBalance: admin.firestore.FieldValue.increment(0)
        }, { merge: true });

        return { success: true };
    } catch (error: any) {
        throw new functions.https.HttpsError('internal', error.message);
    }
});

/**
 * Verify a battery return by checking Bajie API slots for a specific machine.
 */
export const verifyBatteryReturn = functions.https.onCall(async (data, context) => {
    const uid = requireAuth(context);
    const { machineId } = data;

    if (!machineId) {
        throw new functions.https.HttpsError('invalid-argument', 'El ID de la máquina (código QR) es requerido.');
    }

    try {
        // 1. Get user's active rental
        const rentalDoc = await db.collection('active_rentals').doc(uid).get();
        if (!rentalDoc.exists) {
            throw new functions.https.HttpsError('not-found', 'No tienes ningún alquiler activo.');
        }

        const rentalData = rentalDoc.data();
        const expectedBatteryCode = rentalData?.batteryCode;

        if (!expectedBatteryCode) {
            throw new functions.https.HttpsError('failed-precondition', 'Datos del alquiler inválidos (sin serial de batería).');
        }

        // 2. Resolve the scanned QR mapping to actual cabinet ID if needed
        const bajieService = new BajieService();
        const resolvedCabinetId = await bajieService.resolveQrToDeviceId(machineId);

        // 3. Query Bajie API for slots of this machine
        const slotsResponse = await bajieService.querySlots(resolvedCabinetId);

        if (slotsResponse.code !== 0 || !slotsResponse.list) {
            console.error('Bajie Slot Query Failed:', slotsResponse);
            throw new functions.https.HttpsError('internal', 'Error al buscar el slot en el sistema. Intenta de nuevo.');
        }

        // 4. Verify if batteryCode is in any slot
        let batteryFound = false;
        let slotReturned = null;
        for (const slot of slotsResponse.list) {
            if (slot.battery && slot.battery.pbatteryid === expectedBatteryCode) {
                batteryFound = true;
                slotReturned = slot.pkakou;
                break;
            }
        }

        if (batteryFound) {
            // Success! The battery is inside the machine. Validate successful return.
            const endedAt = admin.firestore.FieldValue.serverTimestamp();

            // Move to history
            await db.collection('rental_history').add({
                ...rentalData,
                returnMachineId: resolvedCabinetId,
                returnSlotId: slotReturned,
                endedAt,
                status: 'completed'
            });

            // Delete active rental to stop tracker
            await db.collection('active_rentals').doc(uid).delete();

            return { success: true, message: '¡Batería devuelta exitosamente!' };
        } else {
            // Not found in this machine
            return { success: false, message: 'No se detectó el PowerBank asignado en esta máquina. Verifíca y vuelve a intentar.' };
        }
    } catch (error: any) {
        console.error('Error verifying battery return:', error);
        throw new functions.https.HttpsError('internal', error.message || 'Error verificando la devolución.');
    }
});

/**
 * PRUEBA PILOTO CASHEA: Endpoint HTTP (Web Gateway)
 * Retorna un HTML con el SDK de Cashea para crear el pago desde el navegador web / WebView 
 * en lugar de usar un endpoint backend REST privado.
 * Uso: Abrir en la app -> https://us-central1-[PROYECTO].cloudfunctions.net/casheaPilotWebCheckout?cedula=15567644&amount=100
 */
export const casheaPilotWebCheckout = functions.https.onRequest(async (req, res) => {
    try {
        const identificationNumber = req.query.cedula as string || "15567644";
        const amount = Number(req.query.amount) || 100;

        // Obtenemos todas las credenciales de las variables de entorno de Firebase
        const publicApiKey = process.env.CASHEA_PUBLIC_API_KEY || "";
        const storeId = parseInt(process.env.CASHEA_STORE_ID || "0", 10);
        const storeName = process.env.CASHEA_STORE_NAME || "VoltajeVzla";
        const externalClientId = process.env.CASHEA_EXTERNAL_CLIENT_ID || "";
        const invoiceId = `VP-PILOT-${Date.now()}`;

        const html = `
<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Pagar con Cashea - VoltajeVzla</title>
    <!-- Importamos el SDK de webcheckout de Cashea desde unpkg -->
    <script src="https://unpkg.com/cashea-web-checkout-sdk@1.1.8/dist/webcheckout-sdk.min.js"></script>
    <style>
        body { font-family: sans-serif; display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100vh; background-color: #f9f9f9; text-align: center; margin: 0; }
        .cashea-btn { background-color: #2F3998; color: white; padding: 15px 30px; border: none; border-radius: 8px; font-size: 18px; cursor: pointer; box-shadow: 0 4px 6px rgba(0,0,0,0.1); width: 80%; max-width: 300px; }
        .cashea-btn:hover { background-color: #1e2568; }
        #loading { display: none; margin-top: 15px; color: #555; }
        #error_msg { color: red; margin-top: 10px; display: none; }
    </style>
</head>
<body>
    <img src="https://m.voltajevzla.com/static/media/logo.8b2b73ee.png" alt="VoltajeVzla" width="100" style="margin-bottom:20px;">
    <h2>Pago Seguro con Cashea</h2>
    <p>Monto de la orden: $${amount}</p>
    
    <button class="cashea-btn" id="payCasheaBtn">Pagar con Cashea</button>
    
    <div id="loading">Conectando con Cashea...</div>
    <div id="error_msg"></div>

    <script>
        document.getElementById('payCasheaBtn').addEventListener('click', async () => {
            const btn = document.getElementById('payCasheaBtn');
            const loading = document.getElementById('loading');
            const errorMsg = document.getElementById('error_msg');
            
            btn.style.display = 'none';
            loading.style.display = 'block';
            errorMsg.style.display = 'none';

            try {
                // Verificar si cargó el SDK
                let CasheaConstructor = null;
                if (window.WebCheckoutSDK) {
                    CasheaConstructor = window.WebCheckoutSDK;
                }

                if (!CasheaConstructor) {
                    console.log("Window keys:", Object.keys(window).filter(k => k.toLowerCase().includes('cashea') || k.toLowerCase().includes('webcheckout')));
                    throw new Error("El SDK de Cashea no cargó correctamente (no se encontró WebCheckoutSDK).");
                }
                
                const cashea = new CasheaConstructor({
                    apiKey: "${publicApiKey}"
                });

                // Crear el payload con los valores correctos de las variables de entorno
                const payload = {
                    identificationNumber: "${identificationNumber}",
                    externalClientId: "${externalClientId}",
                    merchantName: "${storeName}",
                    deliveryMethod: "IN_STORE",
                    redirectUrl: "https://m.voltajevzla.com",
                    invoiceId: "${invoiceId}",
                    deliveryPrice: 0,
                    orders: [
                        {
                            store: { id: ${storeId}, name: "${storeName}", enabled: true },
                            products: [
                                {
                                    id: "RENTAL-" + new Date().getTime(),
                                    sku: "RENTAL-PB",
                                    name: "Alquiler Powerbank",
                                    description: "Alquiler de Power Bank VoltajeVzla",
                                    price: ${amount},
                                    quantity: 1,
                                    tax: 0,
                                    discount: 0,
                                    imageUrl: "https://m.voltajevzla.com/static/media/logo.8b2b73ee.png"
                                }
                            ]
                        }
                    ]
                };
                
                const orderId = await cashea.saveOrderPayload(payload);
                const redirectUrl = cashea.buildRedirectURL(orderId);
                
                window.location.href = redirectUrl;
            } catch (error) {
                console.error("Error iniciando Cashea:", error);
                loading.style.display = 'none';
                btn.style.display = 'block';
                errorMsg.innerText = "Error: " + error.message;
                errorMsg.style.display = 'block';
            }
        });
    </script>
</body>
</html>
    `;

        res.status(200).send(html);
    } catch (error: any) {
        console.error("Error en Gateway Cashea:", error);
        res.status(500).send("Error interno: " + (error.message || String(error)));
    }
});

// ─────────────────────────────────────────────────────────────────────────────
// paypalWebhook — Recibe eventos de PayPal y acredita saldo en wallet
//
// Configuración requerida (una sola vez):
//   1. Ve a developer.paypal.com → My Apps & Credentials → tu app
//   2. Webhooks → Add Webhook
//   3. URL: https://us-central1-voltajevzla-25454.cloudfunctions.net/paypalWebhook
//   4. Evento: PAYMENT.CAPTURE.COMPLETED
//   5. Copia el Webhook ID generado y ponlo en functions/.env como PAYPAL_WEBHOOK_ID
//   6. Copia el Client Secret de tu app y ponlo como PAYPAL_CLIENT_SECRET
//
// Flujo:
//   PayPal → POST /paypalWebhook → verificar firma → leer custom_id (uid Firebase)
//   → acreditar USD en wallet → guardar transacción en Firestore
// ─────────────────────────────────────────────────────────────────────────────

export const paypalWebhook = functions.https.onRequest(async (req, res) => {
    // Solo aceptar POST
    if (req.method !== 'POST') {
        res.status(405).send('Method Not Allowed');
        return;
    }

    const PAYPAL_WEBHOOK_ID = process.env.PAYPAL_WEBHOOK_ID || '';
    const PAYPAL_CLIENT_ID  = process.env.PAYPAL_CLIENT_ID  || '';
    const PAYPAL_CLIENT_SECRET = process.env.PAYPAL_CLIENT_SECRET || '';
    const PAYPAL_MODE       = process.env.PAYPAL_MODE || 'live';
    const PAYPAL_API_BASE   = PAYPAL_MODE === 'sandbox'
        ? 'https://api-m.sandbox.paypal.com'
        : 'https://api-m.paypal.com';

    try {
        const body = req.body as Record<string, any>;
        const eventType: string = body?.event_type || '';

        console.log(`📦 PayPal Webhook recibido: ${eventType}`);

        // ── 1. Verificar firma del webhook con la API de PayPal ──────────────
        // Solo verificamos si el Webhook ID está configurado.
        // Si no está configurado aún, aceptamos (modo desarrollo).
        if (PAYPAL_WEBHOOK_ID && PAYPAL_CLIENT_ID && PAYPAL_CLIENT_SECRET) {
            try {
                // Obtener access token de PayPal
                const tokenRes = await axios.post(
                    `${PAYPAL_API_BASE}/v1/oauth2/token`,
                    'grant_type=client_credentials',
                    {
                        auth: { username: PAYPAL_CLIENT_ID, password: PAYPAL_CLIENT_SECRET },
                        headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
                    }
                );
                const accessToken: string = tokenRes.data.access_token;

                // Verificar firma del webhook
                const verifyRes = await axios.post(
                    `${PAYPAL_API_BASE}/v1/notifications/verify-webhook-signature`,
                    {
                        auth_algo:         req.headers['paypal-auth-algo'],
                        cert_url:          req.headers['paypal-cert-url'],
                        transmission_id:   req.headers['paypal-transmission-id'],
                        transmission_sig:  req.headers['paypal-transmission-sig'],
                        transmission_time: req.headers['paypal-transmission-time'],
                        webhook_id:        PAYPAL_WEBHOOK_ID,
                        webhook_event:     body
                    },
                    {
                        headers: { Authorization: `Bearer ${accessToken}` }
                    }
                );

                const verificationStatus: string = verifyRes.data?.verification_status;
                if (verificationStatus !== 'SUCCESS') {
                    console.warn(`⚠️ PayPal webhook firma inválida: ${verificationStatus}`);
                    res.status(400).json({ error: 'Invalid webhook signature' });
                    return;
                }
                console.log('✅ Firma PayPal verificada correctamente');
            } catch (verifyError: any) {
                console.error('Error verificando firma PayPal:', verifyError?.response?.data || verifyError.message);
                // En caso de fallo de verificación, rechazar el evento
                res.status(400).json({ error: 'Webhook verification failed' });
                return;
            }
        } else {
            console.warn('⚠️ PAYPAL_WEBHOOK_ID o credenciales no configuradas — saltando verificación de firma');
        }

        // ── 2. Solo procesar PAYMENT.CAPTURE.COMPLETED ──────────────────────
        if (eventType !== 'PAYMENT.CAPTURE.COMPLETED') {
            // Eventos no relevantes: responder 200 para que PayPal no reintente
            console.log(`ℹ️ Evento ignorado: ${eventType}`);
            res.status(200).json({ received: true, processed: false });
            return;
        }

        // ── 3. Extraer datos del evento ──────────────────────────────────────
        const resource = body?.resource || {};
        const captureId: string   = resource?.id || '';
        const captureStatus: string = resource?.status || '';

        // El monto capturado (en USD)
        const amountUsd = parseFloat(resource?.amount?.value || '0');
        const currency: string  = resource?.amount?.currency_code || 'USD';

        // custom_id — aquí ponemos el uid de Firebase desde el JS del WebView
        // Por ahora usamos el purchase_unit supplementary_data o custom_id del pago
        const customId: string = resource?.custom_id
            || resource?.purchase_units?.[0]?.custom_id
            || '';

        console.log(`💳 Capture: id=${captureId} status=${captureStatus} amount=${amountUsd} ${currency} customId=${customId}`);

        if (captureStatus !== 'COMPLETED') {
            console.log(`ℹ️ Capture status no COMPLETED: ${captureStatus}`);
            res.status(200).json({ received: true, processed: false, reason: 'not_completed' });
            return;
        }

        if (amountUsd <= 0) {
            console.error('❌ Monto inválido en webhook PayPal:', resource?.amount);
            res.status(200).json({ received: true, processed: false, reason: 'invalid_amount' });
            return;
        }

        // ── 4. Idempotencia — evitar acreditar el mismo capture dos veces ────
        const captureRef = db.collection('voltaje_paypal_captures').doc(captureId);
        const captureDoc = await captureRef.get();
        if (captureDoc.exists) {
            console.log(`⏭️ Capture ${captureId} ya procesado — ignorando`);
            res.status(200).json({ received: true, processed: false, reason: 'already_processed' });
            return;
        }

        // ── 5. Buscar uid del usuario ─────────────────────────────────────────
        // Si el botón de PayPal tiene custom_id = uid de Firebase, usarlo.
        // Si no, intentar buscar por email (payer.email_address).
        let uid: string | null = customId || null;

        if (!uid) {
            const payerEmail: string = resource?.payer?.email_address || '';
            if (payerEmail) {
                try {
                    const userRecord = await admin.auth().getUserByEmail(payerEmail);
                    uid = userRecord.uid;
                    console.log(`🔍 uid encontrado por email ${payerEmail}: ${uid}`);
                } catch (_e) {
                    console.warn(`⚠️ No se encontró usuario para email: ${payerEmail}`);
                }
            }
        }

        if (!uid) {
            // No podemos acreditar sin uid — registrar para revisión manual
            console.error(`❌ No se pudo determinar uid para capture ${captureId}`);
            await db.collection('voltaje_paypal_unmatched').add({
                captureId,
                amountUsd,
                currency,
                resource,
                receivedAt: admin.firestore.FieldValue.serverTimestamp()
            });
            res.status(200).json({ received: true, processed: false, reason: 'uid_not_found' });
            return;
        }

        // ── 6. Acreditar saldo en wallet (en USD) ────────────────────────────
        const userRef = db.collection(COLLECTIONS.USERS).doc(uid);
        const userSnap = await userRef.get();

        if (!userSnap.exists) {
            await userRef.set({
                walletBalance: amountUsd,
                walletCurrencyUSD: amountUsd,
                createdAt: admin.firestore.FieldValue.serverTimestamp()
            });
        } else {
            await userRef.update({
                walletBalance: admin.firestore.FieldValue.increment(amountUsd),
                walletCurrencyUSD: admin.firestore.FieldValue.increment(amountUsd)
            });
        }

        const updatedUser = await userRef.get();
        const newBalance = updatedUser.data()?.walletBalance || amountUsd;
        console.log(`💰 Wallet acreditada: +${amountUsd} USD => nuevo saldo: ${newBalance}`);

        // ── 7. Registrar transacción en Firestore ────────────────────────────
        await db.collection(COLLECTIONS.TRANSACTIONS).add({
            uid,
            type: 'PAYPAL_TOPUP',
            amountUsd,
            amount: amountUsd,
            currency,
            captureId,
            paypalEventId: body?.id || '',
            payerEmail: resource?.payer?.email_address || '',
            status: 'COMPLETED',
            walletBalanceAfter: newBalance,
            timestamp: admin.firestore.FieldValue.serverTimestamp()
        });

        // ── 8. Marcar capture como procesado (idempotencia) ──────────────────
        await captureRef.set({
            uid,
            amountUsd,
            processedAt: admin.firestore.FieldValue.serverTimestamp()
        });

        console.log(`✅ PayPal recarga completada para uid=${uid}: +${amountUsd} USD`);
        res.status(200).json({
            received: true,
            processed: true,
            uid,
            amountUsd,
            newBalance
        });

    } catch (error: any) {
        console.error('❌ Error en paypalWebhook:', error?.message || error);
        // Responder 200 para evitar reintentos de PayPal en errores internos
        res.status(200).json({ received: true, error: 'internal_error' });
    }
});
