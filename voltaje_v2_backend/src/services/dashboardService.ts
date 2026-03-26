import { BncPaymentService } from './bncPayment';
import { 
    getUserByPhone, 
    getActiveRentalByUid, 
    getTransactionByReference,
    getUserByUid,
    FirebaseUser,
    FirebaseActiveRental,
    FirebaseTransaction
} from './firebaseService';

export interface PaymentWithDetails {
    // From BNC
    transactionId?: string;
    reference?: string;
    amount: number;
    type: 'P2P' | 'C2P' | 'TRF' | 'DEP' | 'OTHER';
    description?: string;
    phone?: string;
    bankCode?: number;
    timestamp?: string;
    
    // From Firebase (crossed data)
    userId?: string;
    userPhone?: string;
    userName?: string;
    cabinetId?: string;
    cabinetName?: string;
    machineId?: string;
    slotId?: number;
    paymentMethod?: string;
    status?: string;
}

export class DashboardService {
    private bncPayment: BncPaymentService;

    constructor(bncPayment: BncPaymentService) {
        this.bncPayment = bncPayment;
    }

    async getTodayPayments(): Promise<{ success: boolean; data?: PaymentWithDetails[]; message?: string }> {
        const today = new Date();
        const startDate = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0)}`;
        const endDate = startDate;

        const logonRes = await this.bncPayment.logon();
        if (!logonRes.success) {
            return { success: false, message: 'BNC Logon Failed: ' + logonRes.message };
        }

        const result = await this.bncPayment.getTransactions({
            startDate,
            endDate,
            pageSize: 100,
            pageNumber: 1
        });

        if (!result.success || !result.data) {
            return { success: false, message: result.message };
        }

        const transactions = result.data.Transactions || result.data;
        const paymentsWithDetails: PaymentWithDetails[] = [];

        for (const tx of transactions) {
            const payment = await this.enrichTransaction(tx);
            if (payment) {
                paymentsWithDetails.push(payment);
            }
        }

        return { success: true, data: paymentsWithDetails };
    }

    async getPaymentsByDateRange(startDate: string, endDate: string): Promise<{ success: boolean; data?: PaymentWithDetails[]; message?: string }> {
        const logonRes = await this.bncPayment.logon();
        if (!logonRes.success) {
            return { success: false, message: 'BNC Logon Failed: ' + logonRes.message };
        }

        const result = await this.bncPayment.getTransactions({
            startDate,
            endDate,
            pageSize: 100,
            pageNumber: 1
        });

        if (!result.success || !result.data) {
            return { success: false, message: result.message };
        }

        const transactions = result.data.Transactions || result.data;
        const paymentsWithDetails: PaymentWithDetails[] = [];

        for (const tx of transactions) {
            const payment = await this.enrichTransaction(tx);
            if (payment) {
                paymentsWithDetails.push(payment);
            }
        }

        return { success: true, data: paymentsWithDetails };
    }

    private async enrichTransaction(tx: any): Promise<PaymentWithDetails | null> {
        const payment: PaymentWithDetails = {
            transactionId: tx.TransactionId || tx.Id || tx.Reference,
            reference: tx.Reference || tx.OperationRef,
            amount: parseFloat(tx.Amount || tx.amount || 0),
            type: tx.Type || tx.PaymentType || 'OTHER',
            description: tx.Description || tx.description,
            phone: tx.ClientPhone || tx.CellPhone || tx.Phone,
            bankCode: tx.BankCode || tx.BeneficiaryBankCode,
            timestamp: tx.Date || tx.Timestamp || tx.OperationDate
        };

        // Try to determine payment type and cross with Firebase
        if (payment.type === 'P2P' || payment.type === 'C2P') {
            // Incoming payment - try to find user by phone
            if (payment.phone) {
                const user = await getUserByPhone(payment.phone);
                if (user) {
                    payment.userId = user.uid;
                    payment.userPhone = user.phone;
                    payment.userName = user.displayName || user.email;
                    
                    // Get active rental if any
                    const activeRental = await getActiveRentalByUid(user.uid);
                    if (activeRental) {
                        payment.cabinetId = activeRental.cabinetId;
                        payment.machineId = activeRental.machineId;
                        payment.slotId = activeRental.slotId;
                    }
                }
            }
            payment.paymentMethod = 'PagoMovil';
            payment.status = 'completed';
        } 
        else if (payment.type === 'TRF' || payment.type === 'DEP') {
            // Transfer or Deposit
            payment.paymentMethod = payment.type === 'TRF' ? 'Transferencia' : 'Deposito';
            payment.status = 'completed';
            
            // Try to find transaction in Firebase by reference
            if (payment.reference) {
                const firebaseTx = await getTransactionByReference(payment.reference);
                if (firebaseTx) {
                    payment.userId = firebaseTx.userId;
                    const user = await getUserByUid(firebaseTx.userId);
                    if (user) {
                        payment.userName = user.displayName || user.email;
                        payment.userPhone = user.phone;
                    }
                }
            }
        }

        return payment;
    }

    async getDashboardSummary(): Promise<{
        success: boolean;
        data?: {
            todayIncome: number;
            todayExpenses: number;
            todayTransactions: number;
            balance: number;
        };
        message?: string;
    }> {
        const logonRes = await this.bncPayment.logon();
        if (!logonRes.success) {
            return { success: false, message: 'BNC Logon Failed: ' + logonRes.message };
        }

        // Get balance
        const balanceResult = await this.bncPayment.getBalance();
        const balance = balanceResult.success && balanceResult.data 
            ? parseFloat(balanceResult.data.AvailableBalance || balanceResult.data.Balance || 0)
            : 0;

        // Get today's payments
        const todayPayments = await this.getTodayPayments();
        
        let todayIncome = 0;
        let todayExpenses = 0;

        if (todayPayments.success && todayPayments.data) {
            for (const payment of todayPayments.data) {
                if (payment.type === 'P2P' || payment.type === 'C2P' || payment.type === 'DEP') {
                    todayIncome += payment.amount;
                } else if (payment.type === 'TRF' && payment.reference?.startsWith('P2P_')) {
                    // Outgoing P2P
                    todayExpenses += payment.amount;
                }
            }
        }

        return {
            success: true,
            data: {
                todayIncome,
                todayExpenses,
                todayTransactions: todayPayments.data?.length || 0,
                balance
            }
        };
    }
}
