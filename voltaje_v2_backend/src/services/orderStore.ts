export interface PendingOrder {
    id: string; // Unique order ID (e.g. timestamp or UUID)
    payerPhone: string; // User's phone number
    amount: number; // Expected payment amount
    machineId: string; // Bajie target machine
    slotId: number; // Bajie target slot
    status: 'PENDING' | 'COMPLETED' | 'FAILED';
    createdAt: number;
}

class OrderStoreService {
    private orders: Map<string, PendingOrder> = new Map();

    /**
     * Store a new pending rental request.
     * Uses the payer's phone as the temporary identifier.
     * In a production app, the reference number is better, but the BNC webhook
     * returns varying reference fields. For MVP, Phone + Amount is a strong match.
     */
    addPendingOrder(payerPhone: string, amount: number, machineId: string, slotId: number): PendingOrder {
        const order: PendingOrder = {
            id: `ORD_${Date.now()}`,
            payerPhone,
            amount,
            machineId,
            slotId,
            status: 'PENDING',
            createdAt: Date.now()
        };

        // Key by phone line (clean formats to avoid mismatches)
        const cleanPhone = payerPhone.replace(/\D/g, '').slice(-10);
        this.orders.set(cleanPhone, order);

        console.log(`📦 [OrderStore] New pending order for ${cleanPhone}: ${machineId} (Slot ${slotId})`);
        return order;
    }

    /**
     * Find a pending order that matches the phone number and amount.
     */
    findPendingOrder(payerPhone: string, amount: number): PendingOrder | undefined {
        const cleanPhone = payerPhone.replace(/\D/g, '').slice(-10);
        const order = this.orders.get(cleanPhone);

        if (order && order.status === 'PENDING') {
            // Convert to numbers just in case BNC sends strings like "1.00"
            if (Number(order.amount) === Number(amount)) {
                return order;
            } else {
                console.log(`⚠️ [OrderStore] Found order for ${cleanPhone} but amount mismatched! Expected ${order.amount}, got ${amount}`);
            }
        }
        return undefined;
    }

    /**
     * Mark an order as completed or failed.
     */
    updateOrderStatus(payerPhone: string, newStatus: 'COMPLETED' | 'FAILED') {
        const cleanPhone = payerPhone.replace(/\D/g, '').slice(-10);
        const order = this.orders.get(cleanPhone);
        if (order) {
            order.status = newStatus;
            this.orders.set(cleanPhone, order);
            console.log(`🔄 [OrderStore] Order for ${cleanPhone} status updated to ${newStatus}`);
        }
    }
}

export const orderStore = new OrderStoreService();
