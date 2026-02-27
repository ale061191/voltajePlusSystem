
export class BncMockService {

    static async logon(clientGuid: string): Promise<any> {
        console.log(`[MOCK] BNC Logon attempt for ${clientGuid}`);
        await new Promise(resolve => setTimeout(resolve, 800)); // Simulate network delay

        if (!clientGuid) return { success: false, message: "Missing ClientGUID" };

        return {
            success: true,
            code: "200",
            message: "Logon Exitoso (MOCK)",
            workingKey: "MOCK_WORKING_KEY_1234567890"
        };
    }

    static async collectC2P(paymentData: any): Promise<any> {
        console.log(`[MOCK] BNC C2P Collection (Cobro):`, paymentData);
        await new Promise(resolve => setTimeout(resolve, 1500));

        if (paymentData.amount > 1000000) {
            return { success: false, message: "Fondos Insuficientes (MOCK)" };
        }

        return {
            success: true,
            message: "Cobro C2P Exitoso (MOCK)",
            data: {
                Reference: `C2P-${Date.now()}`,
                Date: new Date().toISOString()
            }
        };
    }

    static async sendP2P(paymentData: any): Promise<any> {
        console.log(`[MOCK] BNC P2P Payment:`, paymentData);
        await new Promise(resolve => setTimeout(resolve, 1500));

        if (paymentData.amount > 10000) {
            return { success: false, message: "Fondos Insuficientes (MOCK)" };
        }

        return {
            success: true,
            reference: `REF-${Date.now()}`,
            date: new Date().toISOString(),
            message: "Pago Móvil Exitoso (MOCK)"
        };
    }
}
