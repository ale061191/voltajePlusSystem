import axios, { AxiosInstance } from 'axios';
import https from 'https';

export class CasheaService {
    private apiKey: string;
    private privateApiKey: string;
    private storeId: number;
    private storeName: string;
    private externalClientId: string;
    private isSandbox: boolean;
    private httpClient: AxiosInstance;

    constructor() {
        this.apiKey = process.env.CASHEA_PUBLIC_API_KEY || '';
        this.privateApiKey = process.env.CASHEA_PRIVATE_API_KEY || '';
        this.storeId = parseInt(process.env.CASHEA_STORE_ID || '0', 10);
        this.storeName = process.env.CASHEA_STORE_NAME || '';
        this.externalClientId = process.env.CASHEA_EXTERNAL_CLIENT_ID || '';
        this.isSandbox = (process.env.CASHEA_SANDBOX || 'true') === 'true';

        // ⚠️⚠️⚠️ WARNING: TEMPORARY SSL BYPASS ⚠️⚠️⚠️
        // Cashea's server (external.cashea.app) has an incomplete SSL certificate chain.
        // This agent skips SSL verification so we can test while Cashea fixes their server.
        // TODO: REMOVE THIS once Cashea fixes their SSL certificate chain.
        const unsafeAgent = new https.Agent({ rejectUnauthorized: false });

        this.httpClient = axios.create({
            timeout: 30000,
            headers: {
                'Content-Type': 'application/json',
            },
            httpsAgent: unsafeAgent, // ⚠️ TEMPORARY — remove when Cashea fixes SSL
        });

        console.log(`🛍️ Cashea Service Initialized`);
        console.log(`🛍️ API Key: ${this.apiKey ? '***SET***' : 'NOT SET'}`);
        console.log(`🛍️ Store: ${this.storeName} (ID: ${this.storeId})`);
        console.log(`🛍️ Mode: ${this.isSandbox ? 'SANDBOX' : 'PRODUCTION'}`);
    }

    /**
     * Get the checkout base URL based on environment
     */
    private getCheckoutBaseUrl(): string {
        return this.isSandbox
            ? 'https://sandbox-checkout.cashea.com.ve'
            : 'https://checkout.cashea.com.ve';
    }

    /**
     * Create a Cashea order and return the checkout URL
     */
    async createOrder(params: {
        amount: number;
        machineId: string;
        slotId: number;
        redirectUrl: string;
        cancelUrl: string;
        identificationNumber?: string;
    }): Promise<{
        success: boolean;
        checkoutUrl?: string;
        orderId?: string;
        error?: string;
    }> {
        try {
            const payload = {
                deliveryMethod: 'IN_STORE',
                redirectUrl: params.redirectUrl,
                cancelUrl: params.cancelUrl,
                merchantName: this.storeName,
                identificationNumber: params.identificationNumber || '19932878',
                externalClientId: this.externalClientId,
                invoiceId: `VP-${params.machineId}-${Date.now()}`,
                deliveryPrice: 0,
                orders: [
                    {
                        store: {
                            id: this.storeId,
                            name: this.storeName,
                            enabled: true,
                        },
                        products: [
                            {
                                id: `pb-${params.machineId}-slot${params.slotId}`,
                                name: `Alquiler Power Bank - ${params.machineId}`,
                                sku: `PB-${params.machineId}-S${params.slotId}`,
                                description: `Alquiler de power bank en máquina ${params.machineId}, slot ${params.slotId}`,
                                imageUrl: 'https://voltaje.app/logo.png',
                                price: params.amount,
                                quantity: 1,
                                tax: 0,
                                discount: 0,
                            },
                        ],
                    },
                ],
            };

            console.log(`🛍️ Creating Cashea order: ${JSON.stringify(payload)}`);

            // The SDK uses the API key to authenticate and create the order
            // The checkout SDK internally calls the Cashea API to get an orderPayloadId
            const response = await this.httpClient.post(
                'https://external-api-bldo3ynb.uk.gateway.dev/web-checkout/payload',
                payload,
                {
                    headers: {
                        'Authorization': `ApiKey ${this.apiKey}`,
                        'Content-Type': 'application/json',
                    },
                }
            );

            const orderPayloadId = response.data?.orderPayloadId || response.data?.id;

            if (!orderPayloadId) {
                console.error('🛍️ No orderPayloadId in response:', response.data);
                return {
                    success: false,
                    error: 'No se pudo obtener el ID de la orden de Cashea',
                };
            }

            const checkoutUrl = `${this.getCheckoutBaseUrl()}/?orderPayloadId=${orderPayloadId}`;

            console.log(`🛍️ Cashea order created: ${orderPayloadId}`);
            console.log(`🛍️ Checkout URL: ${checkoutUrl}`);

            return {
                success: true,
                checkoutUrl,
                orderId: String(orderPayloadId),
            };
        } catch (error: any) {
            console.error('🛍️ Cashea createOrder error:', error?.response?.data || error.message);
            return {
                success: false,
                error: error?.response?.data?.message || error.message || 'Error al crear orden Cashea',
            };
        }
    }

    /**
     * Confirm the initial down-payment for a Cashea order
     */
    async confirmDownPayment(idNumber: string): Promise<{
        success: boolean;
        data?: any;
        error?: string;
    }> {
        try {
            console.log(`🛍️ Confirming down-payment for order: ${idNumber}`);

            const response = await this.httpClient.post(
                `https://external.cashea.app/orders/${idNumber}/down-payment`,
                {},
                {
                    headers: {
                        'Authorization': `ApiKey ${this.privateApiKey}`,
                        'Content-Type': 'application/json',
                    },
                }
            );

            console.log(`🛍️ Down-payment confirmed:`, response.data);

            return {
                success: true,
                data: response.data,
            };
        } catch (error: any) {
            console.error('🛍️ Cashea confirmDownPayment error:', error?.response?.data || error.message);
            return {
                success: false,
                error: error?.response?.data?.message || error.message || 'Error al confirmar pago Cashea',
            };
        }
    }

    /**
     * Get order details by idNumber
     */
    async getOrder(idNumber: string): Promise<{
        success: boolean;
        data?: any;
        error?: string;
    }> {
        try {
            const response = await this.httpClient.get(
                `https://external.cashea.app/orders/${idNumber}`,
                {
                    headers: {
                        'Authorization': `ApiKey ${this.privateApiKey}`,
                    },
                }
            );

            return {
                success: true,
                data: response.data,
            };
        } catch (error: any) {
            return {
                success: false,
                error: error?.response?.data?.message || error.message,
            };
        }
    }

    /**
     * Cancel a Cashea order
     */
    async cancelOrder(idNumber: string): Promise<{
        success: boolean;
        error?: string;
    }> {
        try {
            await this.httpClient.delete(
                `https://external.cashea.app/orders/${idNumber}`,
                {
                    headers: {
                        'Authorization': `ApiKey ${this.privateApiKey}`,
                    },
                }
            );

            console.log(`🛍️ Order ${idNumber} cancelled`);
            return { success: true };
        } catch (error: any) {
            return {
                success: false,
                error: error?.response?.data?.message || error.message,
            };
        }
    }
}
