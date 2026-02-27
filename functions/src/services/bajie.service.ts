import axios from 'axios';

/**
 * BAJIE CHARGING SERVICE
 * Two API layers:
 *   - App API (JWT): Public endpoints (stations, user info)
 *   - Web/Admin API (session token): Operator endpoints (cabinet pop, slot query)
 */
export class BajieService {
    private readonly APP_JWT = process.env.BAJIE_APP_JWT || '';
    private readonly APP_COOKIE = process.env.BAJIE_APP_COOKIE || '';
    private readonly APP_BASE = process.env.BAJIE_APP_BASE_URL || '';

    private readonly ADMIN_TOKEN = process.env.BAJIE_ADMIN_TOKEN || '';
    private readonly ADMIN_JSESSIONID = process.env.BAJIE_ADMIN_JSESSIONID || '';
    private readonly ADMIN_BASE = process.env.BAJIE_ADMIN_BASE_URL || '';

    private appHeaders: any;
    private adminHeaders: any;

    constructor() {
        this.appHeaders = {
            'Content-Type': 'application/json; charset=UTF-8',
            'Accept': 'application/json, text/plain, */*',
            'User-Agent': 'Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Mobile Safari/537.36',
            'token': this.APP_JWT,
            'Cookie': this.APP_COOKIE,
            'Origin': 'https://m.voltajevzla.com',
            'Referer': 'https://m.voltajevzla.com/',
            'lang': 'en-US',
            'agentOpenId': 'BJCD000001'
        };
        this.adminHeaders = {
            'Accept': '*/*',
            'User-Agent': 'Mozilla/5.0 (Linux; Android 6.0; Nexus 5 Build/MRA58N) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Mobile Safari/537.36',
            'token': this.ADMIN_TOKEN,
            'Cookie': `JSESSIONID=${this.ADMIN_JSESSIONID}; token=${this.ADMIN_TOKEN}`,
            'lang': 'en'
        };
        console.log(`🔌 Bajie Service Initialized (REAL CREDENTIALS - ACTIVE)`);
        console.log(`🔌 Admin token: ${this.ADMIN_TOKEN ? '***SET***' : 'NOT SET'}`);
    }

    /**
     * UNLOCK MACHINE (Pop Battery) via Admin Web API
     * Endpoint: GET /cdb/cabinet/operation on cdb-web-api
     * @param cId Device serial (e.g., DTA34039) - NOT the QR code number
     */
    async unlock(cId: string, slotId: number) {
        const url = `${this.ADMIN_BASE}/cdb/cabinet/operation`;
        const params = {
            cId,
            operationType: 'pop',
            kakou: slotId
        };

        console.log(`🤖 Bajie: Unlocking ${cId} Slot ${slotId} via ADMIN API...`);

        try {
            const res = await axios.get(url, { headers: this.adminHeaders, params, timeout: 15000 });
            console.log(`🤖 Bajie: Unlock Response: ${JSON.stringify(res.data)}`);
            if (res.data.code === 0 || res.data.code === 200) {
                console.log(`✅ Bajie: Unlock SUCCESS for ${cId} Slot ${slotId}`);
                return { success: true, data: res.data };
            }
            console.log(`⚠️ Bajie: Unlock FAILED - code: ${res.data.code}, msg: ${res.data.msg}`);
            return { success: false, error: res.data.msg || 'Unknown Error' };
        } catch (error: any) {
            console.error('❌ Bajie Unlock Error:', error.message);
            if (error.response) {
                console.error('❌ Bajie Unlock HTTP:', error.response.status, JSON.stringify(error.response.data));
            }
            return { success: false, error: error.message };
        }
    }

    /**
     * Query all battery slots for a cabinet via Admin API
     */
    async querySlots(cId: string) {
        try {
            const res = await axios.get(`${this.ADMIN_BASE}/cdb/batcab/queryAll`, {
                headers: this.adminHeaders,
                params: { pCabinetid: cId },
                timeout: 10000
            });
            return res.data;
        } catch (error: any) {
            return { code: 500, msg: error.message };
        }
    }

    /**
     * Resolve a QR code value to a cabinet cId.
     * pcode field in Bajie = the numeric QR value users scan.
     * Falls back to treating the value as a direct cId if it already looks like one.
     */
    async resolveQrToDeviceId(qrValue: string): Promise<string> {
        if (/^[A-Z]{2,4}\d{4,}$/i.test(qrValue)) {
            return qrValue;
        }

        try {
            const r = await axios.get(`${this.ADMIN_BASE}/cdb/cabinet/queryAll`, {
                headers: this.adminHeaders, timeout: 10000
            });
            if (r.data.code === 0 && r.data.list) {
                const match = r.data.list.find(
                    (c: any) => c.pcode === qrValue || c.pCode === qrValue
                );
                if (match) {
                    const cId = match.pcabinetid || match.pCabinetid;
                    console.log(`🗺️ QR ${qrValue} -> Cabinet ${cId} (pid: ${match.pid})`);
                    return cId;
                }
            }
            console.log(`⚠️ QR ${qrValue} not found in cabinet list, using raw`);
        } catch (e: any) {
            console.log(`⚠️ QR resolution failed: ${e.message}, using raw value`);
        }

        return qrValue;
    }

    /**
     * Find the first available (non-borrowed) slot in a cabinet.
     * Returns slot number or defaults to 1.
     */
    async findAvailableSlot(cId: string): Promise<number> {
        try {
            const data = await this.querySlots(cId);
            if (data.code === 0 && data.list) {
                for (const entry of data.list) {
                    const bat = entry.battery;
                    if (bat && bat.pstate === 0 && bat.pcabinetid === cId) {
                        console.log(`🔋 Available slot ${bat.pkakou} in ${cId} (battery: ${bat.pbatteryid})`);
                        return bat.pkakou;
                    }
                }
                const withBattery = data.list
                    .filter((e: any) => e.battery && e.battery.pcabinetid === cId && e.battery.pbatteryid)
                    .map((e: any) => e.battery);
                if (withBattery.length > 0) {
                    const slot = withBattery[0].pkakou;
                    console.log(`🔋 No free slot found, using first occupied: ${slot}`);
                    return slot;
                }
            }
        } catch (e: any) {
            console.log(`⚠️ Slot query failed: ${e.message}`);
        }
        return 1;
    }

    /**
     * GET USER INFO
     * Verified Endpoint: GET /sys/user/info
     */
    async getUserInfo() {
        try {
            const res = await axios.get(`${this.APP_BASE}/sys/user/info`, { headers: this.appHeaders });
            return res.data;
        } catch (error: any) {
            return { code: 500, msg: error.message };
        }
    }

    /**
     * GET STATIONS (Real Implementation)
     * Uses /cdb/cabinet/list to get the machines.
     */
    async getShops(lat: number, lng: number, page = 1, limit = 20) {
        try {
            console.log(`🔌 [DEBUG] Bajie: getShops called with Lat: ${lat}, Lng: ${lng}`);

            const listUrl = `${this.APP_BASE}/cdb/shop/listnear`;

            // PROVEN METHOD: x-www-form-urlencoded via URLSearchParams
            const formData = new URLSearchParams();
            formData.append('coordType', 'WGS－84'); // Full-width Hyphen (REQUIRED by API)
            // formData.append('mapType', 'WGS-84'); // REMOVED (Caused issues or Zoom 14 was too high)
            formData.append('lat', String(lat));
            formData.append('lng', String(lng));
            formData.append('zoomLevel', '4'); // Zoom Level 4 (REQUIRED for detailed data)
            formData.append('showPrice', 'true');
            formData.append('usePriceUnit', 'true');

            // Explicitly constructing headers to avoid reference issues
            const requestHeaders = {
                ...this.appHeaders,
                'Content-Type': 'application/x-www-form-urlencoded'
            };

            console.log(`🔌 [DEBUG] Request URL:`, listUrl);
            console.log(`🔌 [DEBUG] Request Headers:`, JSON.stringify(requestHeaders));
            console.log(`🔌 [DEBUG] Request Body (Params):`, formData.toString());

            const res = await axios.post(listUrl, formData.toString(), {
                headers: requestHeaders,
                timeout: 10000 // 10s timeout to prevent hanging
            });

            console.log(`[DEBUG] Axios Response Status:`, res.status);
            // console.log(`[DEBUG] Axios Response Data:`, JSON.stringify(res.data).substring(0, 500)); // Log first 500 chars

            if (String(res.data.code) !== '0' && res.data.code !== 200) {
                // console.log('[DEBUG] API Response Status:', res.status);
                // console.log('[DEBUG] API Response Headers:', JSON.stringify(res.headers));

                try {
                    const dataStr = JSON.stringify(res.data);
                    console.log('[DEBUG] API Response Data Preview:', dataStr.substring(0, 500));
                } catch (jsonErr) {
                    console.warn('[WARN] Could not stringify response data:', jsonErr);
                }
                throw new Error(res.data.msg || 'API Error');
            }

            const rawList = res.data.list || res.data.data || [];
            console.log(`[DEBUG] stations found raw count: ${Array.isArray(rawList) ? rawList.length : 'Not Array'}`);

            const safeList = [];
            for (const item of rawList) {
                try {
                    if (!item) continue;

                    const safeItem = {
                        id: String(item.id || item.newID || 'unknown'),
                        name: String(item.shopName || item.shopname || 'Estacion Voltaje'),
                        address: String(item.shopAddress1 || item.shopAddress || item.shopaddress || ''),
                        latitude: Number(item.latitude || 0),
                        longitude: Number(item.longitude || 0),
                        totalCount: Number(item.batteryNum || item.cabinetNum || 8),
                        availableCount: Number(item.freeNum || 0),
                        returnSlots: Number(item.canReturnNum || 0),
                        chargingCount: Number(item.chargingBatteryNum || 0),
                        cabinetCount: Number(item.cabinetNum || 1),
                        price: Number(item.pjifei || item.pJifei || 400),
                        timeUnit: Number(item.pjifeiDanwei || item.pJifeiDanwei || 30),
                        freeMinutes: Number(item.pmian || item.pMian || 0),
                        maxPrice: Number(item.pfengding || item.pFengding || 0),
                        deposit: Number(item.pyajin || item.pYajin || 0),
                        currency: String(item.currencyName || item.pcurrency || 'VES'),
                        distance: String(item.distance || ''),
                        banner: String(item.shopBanner || ''),
                        schedule: String(item.shopTime || ''),
                        status: String(item.infoStatus || ''),
                        slots: []
                    };
                    safeList.push(safeItem);
                } catch (mapErr) {
                    console.warn('[WARN] Failed to map item:', mapErr);
                }
            }

            return {
                code: 0,
                msg: 'success',
                data: {
                    list: safeList
                }
            };

        } catch (error: any) {
            console.error('❌ [DEBUG] Bajie Request Triggered Catch Block');
            if (error.response) {
                console.error('❌ [DEBUG] Axios Error Response:', error.response.status, error.response.data);
            } else {
                console.error('❌ [DEBUG] Error Message:', error.message);
                console.error('❌ [DEBUG] Error Stack:', error.stack);
            }

            return {
                code: 500,
                msg: error.message || 'Internal Service Error',
                data: { list: [] }
            };
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
            const res = await axios.get(`${this.APP_BASE}/cdb/paymentauth/list`, { headers: this.appHeaders, params });
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
