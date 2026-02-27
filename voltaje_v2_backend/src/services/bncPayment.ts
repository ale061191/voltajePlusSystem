import axios, { AxiosInstance } from 'axios';
import { BncCrypto } from './bncCrypto';

/**
 * BNC Payment Service — Handles Logon and payment operations
 * Base URL: https://servicios.bncenlinea.com:16500/api
 */
export class BncPaymentService {
    private baseUrl: string;
    private clientGUID: string;
    private masterKey: string;
    private workingKey: string | null = null;
    private workingKeyCrypto: BncCrypto | null = null;
    private masterCrypto: BncCrypto;
    private http: AxiosInstance;

    constructor() {
        this.baseUrl = process.env.BNC_API_URL || 'https://servicios.bncenlinea.com:16500/api';
        this.clientGUID = process.env.BNC_CLIENT_GUID || '';
        this.masterKey = process.env.BNC_MASTER_KEY || '';

        if (!this.clientGUID || !this.masterKey) {
            console.warn('⚠️ BNC: Missing BNC_CLIENT_GUID or BNC_MASTER_KEY in .env');
        }

        this.masterCrypto = new BncCrypto(this.masterKey);
        this.http = axios.create({
            baseURL: this.baseUrl,
            timeout: 30000,
            headers: { 'Content-Type': 'application/json' }
        });
    }

    /**
     * Check if BNC API is reachable
     */
    async healthCheck(): Promise<{ alive: boolean; message: string }> {
        try {
            const res = await this.http.get('/welcome/home');
            return { alive: true, message: typeof res.data === 'string' ? res.data : JSON.stringify(res.data) };
        } catch (e: any) {
            return { alive: false, message: e.message };
        }
    }

    /**
     * Logon — Authenticate with MasterKey to get WorkingKey (valid until midnight)
     */
    async logon(): Promise<{ success: boolean; message: string; workingKey?: string }> {
        if (process.env.BNC_USE_MOCK === 'true') {
            console.log('🤖 BNC MOCK LOGON ENABLED');
            const mockRes = await import('./bncMock').then(m => m.BncMockService.logon(this.clientGUID));
            if (mockRes.success) {
                this.workingKey = mockRes.workingKey;
                if (this.workingKey) {
                    this.workingKeyCrypto = new BncCrypto(this.workingKey);
                }
            }
            return { success: mockRes.success, message: mockRes.message, workingKey: this.workingKey || undefined };
        }

        const payload = { ClientGUID: this.clientGUID };
        const reference = `LOGON_${Date.now()}`;

        const body = this.masterCrypto.buildRequest(this.clientGUID, reference, payload, false);

        try {
            const res = await this.http.post('/Auth/LogOn', body);
            const parsed = this.masterCrypto.parseResponse(res.data);

            if (parsed.ok && parsed.data) {
                this.workingKey = parsed.data.WorkingKey || parsed.data.workingKey;
                if (this.workingKey) {
                    this.workingKeyCrypto = new BncCrypto(this.workingKey);
                    console.log('✅ BNC Logon exitoso. WorkingKey obtenido.');
                }
                return { success: true, message: parsed.message, workingKey: this.workingKey || undefined };
            }

            return { success: false, message: `${parsed.code}: ${parsed.message}` };
            return { success: false, message: `${parsed.code}: ${parsed.message}` };
        } catch (e: any) {
            let errorMsg = `Logon failed: ${e.message}`;
            if (e.response) {
                errorMsg += ` (Status: ${e.response.status}, Data: ${JSON.stringify(e.response.data)})`;
                console.error('SERVER ERROR RESPONSE:', JSON.stringify(e.response.data, null, 2));
            }
            return { success: false, message: errorMsg };
        }
    }

    /**
     * Get the active crypto instance (WorkingKey if available, otherwise MasterKey)
     */
    private getCrypto(): BncCrypto {
        return this.workingKeyCrypto || this.masterCrypto;
    }

    /**
     * Send a P2P (Pago Móvil) payment
     */
    async sendP2P(params: {
        amount: number;
        beneficiaryBankCode: number;
        beneficiaryCellPhone: string;
        beneficiaryID: string;
        beneficiaryName: string;
        description: string;
        operationRef: string;
    }): Promise<{ success: boolean; message: string; data?: any }> {
        const crypto = this.getCrypto();
        const reference = `P2P_${params.operationRef}`;

        const payload = {
            Amount: params.amount,
            BeneficiaryBankCode: params.beneficiaryBankCode,
            BeneficiaryCellPhone: params.beneficiaryCellPhone,
            BeneficiaryEmail: '',
            BeneficiaryID: params.beneficiaryID,
            BeneficiaryName: params.beneficiaryName,
            Description: params.description,
            OperationRef: params.operationRef
        };

        const body = crypto.buildRequest(this.clientGUID, reference, payload, false);

        try {
            const res = await this.http.post('/MobPayment/SendP2P', body);
            const parsed = crypto.parseResponse(res.data);
            return { success: parsed.ok, message: `${parsed.code}: ${parsed.message}`, data: parsed.data };
        } catch (e: any) {
            let errorMsg = `P2P failed: ${e.message}`;
            if (e.response && e.response.data) {
                console.error('SERVER ERROR RESPONSE:', JSON.stringify(e.response.data, null, 2));
            }
            return { success: false, message: errorMsg };
        }
    }

    /**
     * Send a C2P (Comercio a Persona) payment — for refunds/cashback
     */
    /**
     * Collect a C2P (Cobro de Comercio a Persona) payment
     * Requires the User (Payer) to provide an OTP (Clave de Pago)
     */
    async collectC2P(params: {
        amount: number;
        payerBankCode: number;
        payerCellPhone: string;
        payerID: string;
        payerToken: string; // Terna/OTP/Clave
        description: string;
        operationRef: string;
    }): Promise<{ success: boolean; message: string; data?: any }> {
        const crypto = this.getCrypto();
        const reference = `C2P_${params.operationRef}`;

        const payload = {
            Amount: params.amount,
            PayerBankCode: params.payerBankCode,
            PayerCellPhone: params.payerCellPhone,
            PayerID: params.payerID,
            PayerToken: params.payerToken,
            Description: params.description,
            OperationRef: params.operationRef
        };

        const body = crypto.buildRequest(this.clientGUID, reference, payload, false);

        if (process.env.BNC_USE_MOCK === 'true') {
            const mockRes = await import('./bncMock').then(m => m.BncMockService.collectC2P(params));
            return mockRes;
        }

        try {
            const res = await this.http.post('/MobPayment/SendC2P', body);
            const parsed = crypto.parseResponse(res.data);
            return { success: parsed.ok, message: `${parsed.code}: ${parsed.message}`, data: parsed.data };
        } catch (e: any) {
            return { success: false, message: `C2P failed: ${e.message}` };
        }
    }

    /**
     * Check if we have a valid WorkingKey
     */
    get isAuthenticated(): boolean {
        return !!this.workingKey;
    }

    /**
     * Get status summary
     */
    getStatus(): object {
        return {
            baseUrl: this.baseUrl,
            clientGUID: this.clientGUID ? `${this.clientGUID.substring(0, 8)}...` : 'NOT SET',
            masterKey: this.masterKey ? '***SET***' : 'NOT SET',
            workingKey: this.workingKey ? '***ACTIVE***' : 'NOT ACQUIRED',
            authenticated: this.isAuthenticated
        };
    }
}

// Singleton instance
// Remove default singleton export
// export const bncPayment = new BncPaymentService();
