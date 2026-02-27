import express, { Request, Response } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { BajieService } from './services/bajie.service';
import { BncPaymentService } from './services/bncPayment';
import { orderStore } from './services/orderStore';

dotenv.config();

// Instantiate Services AFTER dotenv
const bncPayment = new BncPaymentService();
const bajieService = new BajieService();

const app = express();
const PORT = process.env.PORT || 3006;

app.use(cors());
app.use(express.json());

// =============================================
// ROUTES
// =============================================

// 1. Health Check
app.get('/', (req: Request, res: Response) => {
    res.json({
        status: 'online',
        system: 'VoltajeVzla V2.0 Proxy',
        timestamp: new Date().toISOString(),
        bnc: bncPayment.getStatus()
    });
});

// ... (BNC Routes kept as is) ...

// =============================================
// BAJIE CHARGING (Official Wrapper)
// =============================================

// 3a. Unlock Machine (The Core Loop)
app.post('/api/bajie/unlock', async (req: Request, res: Response) => {
    console.log('🤖 Bajie Unlock Request:', req.body);
    const { deviceSn, slotId } = req.body;

    if (!deviceSn || !slotId) {
        return res.status(400).json({ error: 'deviceSn and slotId required' });
    }

    const result = await bajieService.unlock(deviceSn, slotId);
    res.json(result);
});

// 3b. User Info (Profile)
app.get('/api/bajie/user', async (req: Request, res: Response) => {
    const info = await bajieService.getUserInfo();
    res.json(info);
});

// 3c. Shop List (Map Data)
app.get('/api/bajie/shops', async (req: Request, res: Response) => {
    const list = await bajieService.getShops();
    res.json(list);
});

// 3d. Order List (History)
app.get('/api/bajie/orders', async (req: Request, res: Response) => {
    const list = await bajieService.getOrders();
    res.json(list);
});

// =============================================
// Async Payment Processing
// =============================================
// 4. Initiate Payment (App -> Backend)
app.post('/api/payment/initiate', async (req: Request, res: Response) => {
    const { amount, payerPhone, payerId, payerBankCode, payerToken, machineId } = req.body;
    console.log(`📱 Payment Initiation Request (C2P):`, req.body);

    // 1. Mock BNC Logon
    const logonRes = await bncPayment.logon();
    if (!logonRes.success) {
        return res.status(500).json({ success: false, message: 'Bank Error (Logon)' });
    }

    // 2. Process C2P Collection (Debit User)
    const payRes = await bncPayment.collectC2P({
        amount: amount,
        payerBankCode: payerBankCode,
        payerCellPhone: payerPhone,
        payerID: payerId,
        payerToken: payerToken, // OTP from User
        description: `Rental ${machineId}`,
        operationRef: Date.now().toString()
    });

    if (!payRes.success) {
        return res.status(400).json({ success: false, message: 'Payment Failed', detail: payRes.message });
    }

    // 3. Register Pending Order instead of unlocking immediately
    const targetSlot = req.body.slotId || 1; // Default to Slot 1 if not specified
    console.log(`🕒 Registering pending rental: ${payerPhone} -> ${machineId} (Slot ${targetSlot})`);

    orderStore.addPendingOrder(payerPhone, amount, machineId, targetSlot);

    // 4. Return Result
    res.json({
        success: true,
        paymentRef: payRes.data?.Reference || 'MOCK-REF',
        unlockStatus: 'PENDING',
        message: 'Pago enviado. Esperando confirmación del banco para liberar batería.'
    });
});

async function processPaymentNotification(notification: any) {
    const { PaymentType, Amount, OriginBankReference, DestinyBankReference } = notification;

    console.log(`\n📋 Processing ${PaymentType} payment webhook:`);
    console.log(`   Amount: ${Amount}`);
    console.log(`   Origin Ref: ${OriginBankReference}`);
    console.log(`   BNC Ref: ${DestinyBankReference}`);

    if (PaymentType === 'P2P') {
        const clientPhone = notification.ClientPhone;
        console.log(`   Client Phone: ${clientPhone}`);
        console.log(`   Commerce Phone: ${notification.CommercePhone}`);

        // Try to find a pending rental for this phone
        const pendingOrder = orderStore.findPendingOrder(clientPhone, Amount);

        if (pendingOrder) {
            console.log(`🎯 Matched pending rental! Order ID: ${pendingOrder.id}. Initiating Machine Unlock...`);

            try {
                // DO NOT MOCK HERE, WE NEED TO UNLOCK REAL MACHINE
                const unlockRes = await bajieService.unlock(pendingOrder.machineId, pendingOrder.slotId);
                console.log(`   🔧 Unlock Result for Machine ${pendingOrder.machineId} (Slot ${pendingOrder.slotId}):`, unlockRes);

                if (unlockRes.success) {
                    orderStore.updateOrderStatus(clientPhone, 'COMPLETED');
                    console.log('   ✅ Rental fully completed and verified!');
                } else {
                    orderStore.updateOrderStatus(clientPhone, 'FAILED');
                    console.log('   ❌ Warning: Payment succeeded but machine failed to unlock.');
                }
            } catch (error: any) {
                orderStore.updateOrderStatus(clientPhone, 'FAILED');
                console.log(`   💥 CRITICAL ERROR: Failed to reach Bajie API: ${error.message}`);
            }
        } else {
            console.log(`   ℹ️ No pending rental found for ${clientPhone} with Amount ${Amount}. Ordinary payment received.`);
        }
    } else if (PaymentType === 'TRF' || PaymentType === 'DEP') {
        console.log(`   Debtor Account: ${notification.DebtorAccount}`);
        console.log(`   Creditor Account: ${notification.CreditorAccount}`);
    }

    console.log('   ✅ Notification logged successfully\n');
}

// =============================================
// BNC WEBHOOK (Receives payment confirmations)
// =============================================
app.post('/api/bnc/webhook', async (req: Request, res: Response) => {
    console.log('\n🏦 BNC Webhook Received:', JSON.stringify(req.body, null, 2));
    await processPaymentNotification(req.body);
    res.json({ received: true });
});

app.get('/api/bnc/webhook', (req: Request, res: Response) => {
    res.json({ status: 'BNC Webhook Endpoint Active', timestamp: new Date().toISOString() });
});

// =============================================
// TEST-ONLY: Register pending order WITHOUT calling BNC
// =============================================
app.post('/api/test/register-rental', (req: Request, res: Response) => {
    const { payerPhone, amount, machineId, slotId } = req.body;
    if (!payerPhone || !amount || !machineId || !slotId) {
        return res.status(400).json({ error: 'payerPhone, amount, machineId, slotId required' });
    }
    const order = orderStore.addPendingOrder(payerPhone, amount, machineId, slotId);
    res.json({ success: true, order });
});

// =============================================
// SERVER START
// =============================================
app.listen(PORT, () => {
    console.log(`⚡ Server running on http://localhost:${PORT}`);
    console.log(`📡 Ready to bridge BNC <-> Chinese API`);
    console.log(`🏦 BNC Webhook: POST /api/bnc/webhook`);
    console.log(`🔐 BNC Auth:    POST /api/bnc/auth`);
    console.log(`🏓 BNC Ping:    GET  /api/bnc/webhook`);
});
