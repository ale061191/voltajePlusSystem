import axios from 'axios';
import dotenv from 'dotenv';

dotenv.config();

const API_URL = process.env.LEGACY_API_URL || 'https://m.voltajevzla.com/cdb-web-api/v1';
const TOKEN = process.env.LEGACY_ADMIN_TOKEN;
const COOKIE = process.env.LEGACY_COOKIE_JSESSIONID;
const COOKIE_FULL = process.env.LEGACY_COOKIE_FULL;

if (!TOKEN) {
    console.warn('⚠️ WARNING: LEGACY_ADMIN_TOKEN is missing in .env. Proxy will fail.');
}

export const IotProxyService = {
    /**
     * Envía el comando "POP" (Expulsar batería) a la máquina.
     * @param cabinetId ID de la máquina (Ej: DTA34039)
     * @param slotId (Opcional) Slot específico, si no se envía, el sistema decide.
     */
    async unlockMachine(cabinetId: string, slotId: string = '1') {
        try {
            console.log(`🔌 Proxying Unlock Request for ${cabinetId}...`);

            // Endpoint descubierto en análisis: /cdb/cabinet/operation
            // Params: cId (Cabinet ID), operationType (pop), kakou (Slot ID)
            const response = await axios.get(`${API_URL}/cdb/cabinet/operation`, {
                params: {
                    cId: cabinetId,
                    operationType: 'pop',
                    kakou: slotId
                },
                headers: {
                    'token': TOKEN,
                    'Cookie': `JSESSIONID=${COOKIE}`,
                    'User-Agent': 'Mozilla/5.0 (VoltajeV2-Proxy)'
                }
            });

            console.log('✅ Chinese API Response:', response.data);
            return response.data;

        } catch (error: any) {
            console.error('❌ Proxy Error:', error.response?.data || error.message);
            throw new Error('Failed to communicate with Legacy API');
        }
    },

    /**
     * Consulta el estado de la máquina (Heartbeat/Inventario)
     */
    async getMachineStatus(cabinetId: string) {
        try {
            // Endpoint: /cdb/batcab/queryAll (According to User's Screenshot)
            const response = await axios.get(`${API_URL}/cdb/batcab/queryAll`, {
                params: { pcabinetid: cabinetId }, // CORRECTED KEY
                headers: {
                    'token': TOKEN,
                    'Cookie': `JSESSIONID=${COOKIE}`
                }
            });
            return response.data;
        } catch (error: any) {
            console.error('❌ Status Error:', error.message);
            throw error;
        }
    },

    /**
     * Obtiene la lista DETALLADA de máquinas (backend administrativo).
     * Endpoint adivinado: /cdb/cabinet/list
     */
    async getDetailedList(cabinetId: string) {
        try {
            const response = await axios.get(`${API_URL}/cdb/cabinet/list`, {
                params: {
                    page: 1,
                    limit: 10,
                    pcabinetid: cabinetId // Filtro directo
                },
                headers: {
                    'token': TOKEN,
                    'Cookie': `JSESSIONID=${COOKIE}`
                }
            });
            return response.data;
        } catch (error: any) {
            console.error('❌ Detail List Error:', error.message);
            throw error;
        }
    },

    /**
     * Obtiene el detalle PROFUNDO de una máquina (Slots, Baterías, Errores).
     * Recibido por cURL del usuario: /cdb/cabinet/detail/{id}
     */
    async getMachineDetail(cabinetId: string) {
        try {
            const response = await axios.get(`${API_URL}/cdb/cabinet/detail/${cabinetId}`, {
                headers: {
                    'token': TOKEN,
                    'Cookie': COOKIE_FULL || `JSESSIONID=${COOKIE}`, // Use FULL string if possible
                    'User-Agent': 'Mozilla/5.0 (Linux; Android 6.0; Nexus 5 Build/MRA58N) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Mobile Safari/537.36',
                    'lang': 'en'
                }
            });
            return response.data;
        } catch (error: any) {
            console.error('❌ Machine Detail Error:', error.message);
            throw error;
        }
    },

    /**
     * Obtiene la info del cliente Android (usado por la App vieja).
     * URL: /cdb/android/infobycabinetid/{id}
     */
    async getAndroidInfo(cabinetId: string) {
        try {
            const response = await axios.get(`${API_URL}/cdb/android/infobycabinetid/${cabinetId}`, {
                headers: {
                    'token': TOKEN,
                    'Cookie': `JSESSIONID=${COOKIE}`
                }
            });
            return response.data;
        } catch (error: any) {
            console.error('❌ Android Info Error:', error.message);
            throw error;
        }
    }
};
