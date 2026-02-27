import axios, { AxiosInstance } from 'axios';
import { BncCrypto } from './bncCrypto';

// CONFIGURATION FROM ENVIRONMENT SCARY VARIABLES (Production Ready)
// CONFIGURATION FROM ENVIRONMENT SCARY VARIABLES (Production Ready)
const CONFIG = {
    BNC_API_URL: process.env.BNC_API_URL || 'https://servicios.bncenlinea.com:16100/api',
    BNC_CLIENT_GUID: process.env.BNC_CLIENT_GUID || '',
    BNC_MASTER_KEY: process.env.BNC_MASTER_KEY || '',
    BNC_USE_MOCK: process.env.BNC_USE_MOCK || 'false',
    BNC_ACCOUNT_NUMBER: process.env.BNC_ACCOUNT_NUMBER || '',
    BNC_CLIENT_ID: process.env.BNC_CLIENT_ID || '',
    BNC_AFFILIATE: process.env.BNC_AFFILIATE || '',
    BNC_TERMINAL: process.env.BNC_TERMINAL || '',
    BNC_MERCHANT_PHONE: process.env.BNC_MERCHANT_PHONE || ''
};

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
        this.baseUrl = CONFIG.BNC_API_URL;
        this.clientGUID = CONFIG.BNC_CLIENT_GUID;
        this.masterKey = CONFIG.BNC_MASTER_KEY;

        const isMock = CONFIG.BNC_USE_MOCK === 'true';
        console.log(`🔧 BNC Service Initialized. Mode: ${isMock ? 'MOCK' : 'PRODUCTION'}`);

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
        if (CONFIG.BNC_USE_MOCK === 'true') {
            console.log('🤖 BNC MOCK LOGON ENABLED');
            this.workingKey = "MOCK_WORKING_KEY_" + Date.now();
            this.workingKeyCrypto = new BncCrypto(this.workingKey);
            return { success: true, message: "Logon Exitoso (MOCK)", workingKey: this.workingKey };
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
     * Collect a C2P (Cobro de Comercio a Persona) payment
     * Requires the User (Payer) to provide an OTP (Clave de Pago)
     * Used when USER pays APP.
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
            OperationRef: params.operationRef,
            IpAddress: "127.0.0.1",
            Affiliate: CONFIG.BNC_AFFILIATE, // Added
            Terminal: CONFIG.BNC_TERMINAL   // Added
        };

        const body = crypto.buildRequest(this.clientGUID, reference, payload, false);

        if (CONFIG.BNC_USE_MOCK === 'true') {
            console.log(`[MOCK] BNC C2P Collection (Cobro):`, params);
            await new Promise(resolve => setTimeout(resolve, 1500));
            return {
                success: true,
                message: "Cobro C2P Exitoso (MOCK)",
                data: {
                    Reference: `C2P-${Date.now()}`,
                    Date: new Date().toISOString()
                }
            };
        }

        try {
            const res = await this.http.post('/MobPayment/SendC2P', body); // Verify Endpoint
            const parsed = crypto.parseResponse(res.data);
            return { success: parsed.ok, message: `${parsed.code}: ${parsed.message}`, data: parsed.data };
        } catch (e: any) {
            return { success: false, message: `C2P failed: ${e.message}` };
        }
    }

    /**
     * SEND A P2C (Withdrawal / Refund to User)
     * Uses /MobPayment/SendP2P endpoint for outgoing transfers.
     * Phone: 58XXXXXXXXXX (12 digits). ID: V/J/E + digits.
     */
    async sendP2C(params: {
        amount: number;
        beneficiaryBankCode: number;
        beneficiaryCellPhone: string;
        beneficiaryID: string;
        beneficiaryName: string;
        description: string;
        operationRef: string;
    }): Promise<{ success: boolean; message: string; data?: any }> {
        const crypto = this.getCrypto();
        const reference = `P2C_${params.operationRef}`;

        const phone = params.beneficiaryCellPhone.replace(/[^0-9]/g, '');
        const normalizedPhone = phone.startsWith('58') ? phone
            : phone.startsWith('0') ? `58${phone.slice(1)}`
            : `58${phone}`;

        const rawId = params.beneficiaryID.trim().toUpperCase();
        const idDigits = rawId.replace(/[^0-9]/g, '');
        const idPrefix = rawId.match(/^[VJEPG]/i) ? rawId.charAt(0).toUpperCase() : 'V';
        const normalizedId = `${idPrefix}${idDigits}`;

        console.log(`💸 P2C: phone=${normalizedPhone}, id=${normalizedId}, bank=${params.beneficiaryBankCode}`);

        const payload = {
            Amount: params.amount,
            BeneficiaryBankCode: params.beneficiaryBankCode,
            BeneficiaryCellPhone: normalizedPhone,
            BeneficiaryID: normalizedId,
            BeneficiaryName: params.beneficiaryName,
            Description: params.description,
            OperationRef: params.operationRef,
            IpAddress: "127.0.0.1",
            Affiliate: CONFIG.BNC_AFFILIATE,
            Terminal: CONFIG.BNC_TERMINAL
        };

        const body = crypto.buildRequest(this.clientGUID, reference, payload, false);

        if (CONFIG.BNC_USE_MOCK === 'true') {
            console.log(`[MOCK] BNC P2C Transfer (Reintegro):`, params);
            await new Promise(resolve => setTimeout(resolve, 2000));

            return {
                success: true,
                message: "Reintegro P2C Exitoso (MOCK)",
                data: {
                    Reference: `P2C-${Date.now()}`,
                    Date: new Date().toISOString()
                }
            };
        }

        try {
            const res = await this.http.post('/MobPayment/SendP2P', body);
            const parsed = crypto.parseResponse(res.data);
            return { success: parsed.ok, message: `${parsed.code}: ${parsed.message}`, data: parsed.data };
        } catch (e: any) {
            let errorMsg = `P2C failed: ${e.message}`;
            if (e.response?.data) {
                errorMsg += ` | BNC: ${JSON.stringify(e.response.data)}`;
            }
            return { success: false, message: errorMsg };
        }
    }

    /**
     * Validate a P2P Payment (Pago Móvil)
     * Checks if a payment with specific details exists in the BNC system.
     */
    async validateP2P(params: {
        accountNumber: string;
        bankCode: number;
        phoneNumber: string;
        clientID: string;
        reference: string;
        amount: number;
        requestDate?: string;
    }): Promise<{ success: boolean; message: string; data?: any }> {
        const crypto = this.getCrypto();
        const reference = `P2P_VAL_${params.reference}`;

        const phone = params.phoneNumber.replace(/[^0-9]/g, '');
        const normalizedPhone = phone.startsWith('58') ? phone
            : phone.startsWith('0') ? `58${phone.slice(1)}`
            : `58${phone}`;

        const payload = {
            AccountNumber: params.accountNumber || CONFIG.BNC_ACCOUNT_NUMBER,
            BankCode: params.bankCode,
            PhoneNumber: normalizedPhone,
            ClientID: params.clientID || CONFIG.BNC_CLIENT_ID,
            Reference: params.reference,
            RequestDate: params.requestDate || new Date().toISOString().split('T')[0],
            Amount: params.amount,
            ChildClientID: "",
            BranchID: ""
        };

        console.log('📋 ValidateP2P payload (pre-encrypt):', JSON.stringify(payload));

        const body = crypto.buildRequest(this.clientGUID, reference, payload, false);

        if (CONFIG.BNC_USE_MOCK === 'true') {
            console.log(`[MOCK] BNC P2P Validation:`, params);
            await new Promise(resolve => setTimeout(resolve, 1500));

            if (params.reference.endsWith('0000')) {
                return { success: false, message: "Referencia no encontrada (MOCK)" };
            }

            return {
                success: true,
                message: "Validación P2P Exitosa (MOCK)",
                data: {
                    Reference: params.reference,
                    Status: "APPROVED"
                }
            };
        }

        try {
            const res = await this.http.post('/Position/ValidateP2P', body);
            const parsed = crypto.parseResponse(res.data);
            console.log('📋 ValidateP2P response parsed:', JSON.stringify({ ok: parsed.ok, code: parsed.code, message: parsed.message }));
            return {
                success: parsed.ok,
                message: parsed.message || (parsed.ok ? 'Pago Validado' : 'Pago No Encontrado'),
                data: parsed.data
            };
        } catch (e: any) {
            let errorMsg = `P2P Validation failed: ${e.message}`;
            if (e.response) {
                console.error('🔴 BNC ValidateP2P HTTP Error:', {
                    status: e.response.status,
                    statusText: e.response.statusText,
                    data: JSON.stringify(e.response.data),
                    headers: JSON.stringify(e.response.headers)
                });
                if (e.response.data) {
                    try {
                        const parsed = crypto.parseResponse(e.response.data);
                        return { success: false, message: parsed.message || errorMsg, data: parsed.data };
                    } catch (_parseErr) {
                        errorMsg += ` | BNC Response: ${JSON.stringify(e.response.data)}`;
                    }
                }
            }
            return { success: false, message: errorMsg };
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
            authenticated: this.isAuthenticated,
            mode: CONFIG.BNC_USE_MOCK === 'true' ? 'MOCK' : 'PRODUCTION'
        };
    }
}
