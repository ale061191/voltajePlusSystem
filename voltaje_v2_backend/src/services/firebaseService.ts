import admin from 'firebase-admin';

const COLLECTIONS = {
    USERS: 'voltaje_users',
    TRANSACTIONS: 'voltaje_transactions',
    ACTIVE_RENTALS: 'voltaje_active_rentals',
    RENTAL_HISTORY: 'voltaje_rental_history',
    COUPONS: 'voltaje_coupons',
    COUPON_QUOTAS: 'voltaje_coupon_quotas'
} as const;

let db: admin.firestore.Firestore | null = null;

export function initFirebase() {
    if (admin.apps.length === 0) {
        const serviceAccount = {
            type: 'service_account',
            project_id: process.env.FIREBASE_PROJECT_ID,
            private_key: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
            client_email: process.env.FIREBASE_CLIENT_EMAIL
        };

        if (!serviceAccount.project_id || !serviceAccount.private_key || !serviceAccount.client_email) {
            console.warn('⚠️ Firebase: Missing credentials in .env');
            return null;
        }

        admin.initializeApp({
            credential: admin.credential.cert(serviceAccount as admin.ServiceAccount)
        });
    }
    db = admin.firestore();
    return db;
}

export function getDb(): admin.firestore.Firestore | null {
    if (!db) {
        return initFirebase();
    }
    return db;
}

export interface FirebaseUser {
    uid: string;
    phone: string;
    displayName?: string;
    email?: string;
    walletBalance?: number;
}

export interface FirebaseActiveRental {
    uid: string;
    cabinetId: string;
    machineId?: string;
    slotId?: number;
    startTime?: admin.firestore.Timestamp;
}

export interface FirebaseTransaction {
    id?: string;
    userId: string;
    amount: number;
    type: 'deposit' | 'withdrawal' | 'rental' | 'refund';
    paymentMethod: string;
    reference?: string;
    timestamp: admin.firestore.Timestamp;
    status: 'pending' | 'completed' | 'failed';
}

export async function getUserByPhone(phone: string): Promise<FirebaseUser | null> {
    const database = getDb();
    if (!database) return null;

    const normalizedPhone = phone.replace(/[^0-9]/g, '');
    const usersRef = database.collection(COLLECTIONS.USERS);
    
    const snapshot = await usersRef.where('phone', '==', normalizedPhone).limit(1).get();
    
    if (snapshot.empty) return null;
    
    const doc = snapshot.docs[0];
    return { uid: doc.id, ...doc.data() } as FirebaseUser;
}

export async function getActiveRentalByUid(uid: string): Promise<FirebaseActiveRental | null> {
    const database = getDb();
    if (!database) return null;

    const snapshot = await database.collection(COLLECTIONS.ACTIVE_RENTALS)
        .where('uid', '==', uid)
        .limit(1)
        .get();

    if (snapshot.empty) return null;
    
    const doc = snapshot.docs[0];
    return { ...doc.data() } as FirebaseActiveRental;
}

export async function getTransactionByReference(reference: string): Promise<FirebaseTransaction | null> {
    const database = getDb();
    if (!database) return null;

    const snapshot = await database.collection(COLLECTIONS.TRANSACTIONS)
        .where('reference', '==', reference)
        .limit(1)
        .get();

    if (snapshot.empty) return null;
    
    const doc = snapshot.docs[0];
    return { id: doc.id, ...doc.data() } as FirebaseTransaction;
}

export async function getUserByUid(uid: string): Promise<FirebaseUser | null> {
    const database = getDb();
    if (!database) return null;

    const doc = await database.collection(COLLECTIONS.USERS).doc(uid).get();
    if (!doc.exists) return null;
    
    return { uid: doc.id, ...doc.data() } as FirebaseUser;
}

export { COLLECTIONS };
