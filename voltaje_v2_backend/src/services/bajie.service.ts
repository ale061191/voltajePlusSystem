
import axios from 'axios';
import dotenv from 'dotenv';

dotenv.config();

/**
 * BAJIE CHARGING SERVICE (Wrapper)
 * Wraps the "Engineering API" of the Chinese backend.
 * Uses Session Hijacking (Cookie/Token) for authentication.
 */
export class BajieService {
    private baseUrl: string;
    private headers: any;

    constructor() {
        this.baseUrl = process.env.LEGACY_API_URL || 'https://m.voltajevzla.com/cdb-web-api/v1';
        this.headers = {
            'token': process.env.LEGACY_ADMIN_TOKEN,
            'Cookie': process.env.LEGACY_COOKIE_FULL,
            'User-Agent': 'Mozilla/5.0 (Linux; Android 10) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/114.0.0.0 Mobile Safari/537.36',
            'Content-Type': 'application/json'
        };
    }

    /**
     * UNLOCK MACHINE (Pop Battery)
     * Verified Endpoint: GET /cdb/cabinet/operation
     */
    async unlock(deviceSn: string, slotId: number) {
        const url = `${this.baseUrl}/cdb/cabinet/operation`;
        const params = {
            cId: deviceSn,       // Device Serial (e.g., DTA34039)
            operationType: 'pop',
            kakou: slotId        // Slot Number
        };

        console.log(`🤖 Bajie: Unlocking ${deviceSn} Slot ${slotId}...`);

        try {
            const res = await axios.get(url, { headers: this.headers, params });
            if (res.data.code === 0 || res.data.code === 200) {
                return { success: true, data: res.data };
            }
            return { success: false, error: res.data.msg || 'Unknown Error' };
        } catch (error: any) {
            console.error('❌ Bajie Unlock Error:', error.message);
            return { success: false, error: error.message };
        }
    }

    /**
     * GET USER INFO
     * Verified Endpoint: GET /sys/user/info
     */
    async getUserInfo() {
        try {
            const res = await axios.get(`${this.baseUrl}/sys/user/info`, { headers: this.headers });
            return res.data;
        } catch (error: any) {
            return { code: 500, msg: error.message };
        }
    }

    /**
     * LIST SHOPS
     * Verified Endpoint: GET /cdb/shop/list (Requires Time Params)
     */
    async getShops(page = 1, limit = 20) {
        const { sTime, eTime } = this.getTimeWindow();
        const params = { page, limit, sTime, eTime };

        try {
            const res = await axios.get(`${this.baseUrl}/cdb/shop/list`, { headers: this.headers, params });
            return res.data;
        } catch (error: any) {
            return { code: 500, msg: error.message };
        }
    }

    /**
     * LIST ORDERS
     * Verified Endpoint: GET /cdb/paymentauth/list (Requires Time Params)
     */
    async getOrders(page = 1, limit = 20) {
        const { sTime, eTime } = this.getTimeWindow();
        const params = { page, limit, sTime, eTime };

        try {
            const res = await axios.get(`${this.baseUrl}/cdb/paymentauth/list`, { headers: this.headers, params });
            return res.data;
        } catch (error: any) {
            return { code: 500, msg: error.message };
        }
    }

    // Helper: Generate 24h Time Window for API requirements
    private getTimeWindow() {
        const now = new Date();
        const yesterday = new Date(now);
        yesterday.setDate(yesterday.getDate() - 1); // Look back 24h by default

        const fmt = (d: Date) => d.toISOString().replace('T', ' ').substring(0, 19);
        return { sTime: fmt(yesterday), eTime: fmt(now) };
    }
}
