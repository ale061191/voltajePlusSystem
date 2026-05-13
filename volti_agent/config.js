// ============================================================
// ⚙️ VOLTI CONFIGURATION - Centralized Tokens & Endpoints
// ============================================================
// ALL TOKENS ARE STORED HERE. DO NOT COMMIT THIS FILE TO PUBLIC REPOS.
// ============================================================

module.exports = {
    // 🤖 TELEGRAM
    TELEGRAM_BOT_TOKEN: '8619873644:AAF1XicZoRzif9f65rMROrimIKwY1ArrPjM',

    // 📄 T-VIRTUAL ERP
    TVIRTUAL: {
        token: 'eOu9ZOcjtLXfxP19Fq3Ij+D8KidlVDOKWuywwnSc7nJ62zLV',
        urlFactura: 'https://qa.tvirtual.net/api/facturacion-digital/cargar',
        urlCliente: 'https://qa.tvirtual.net/api/prov-clientes/cargar',
        almacen: 'ALMACEN DE EQUIPOS ALQUILADOS',
        vendedor: 'V0000001',
        cuentaContable: '1112001',
        moneda: 'VES',
        codigoServicio: 'DTN02901'
    },

    // 🔋 BAJIE IoT (Power Bank System)
    BAJIE: {
        baseUrl: 'https://m.voltajevzla.com',
        adminToken: '54c016b58c7d57034819d0320629c220',
        adminJsessionsId: 'b9eba1a1-25a8-4146-9317-de16f14L' // Example
    },

    // 🏦 BNC Bank
    BNC: {
        apiUrl: 'https://servicios.bncenlinea.com:16100/api',
        clientGuid: 'f217229a-5f94-48f6-8611-ffed2ccf7aee',
        masterKey: 'dcd148cd10d49e19715a6f6231d243f7'
    },

    // 🔥 FIREBASE
    FIREBASE: {
        projectId: 'voltajevzla-25454',
        serviceAccountPath: './functions/firebase-service-account.json'
    },

    // 🧠 LLM (Google Gemini)
    AI: {
        provider: 'gemini',
        model: 'gemini-2.0-flash',
        apiUrl: 'https://generativelanguage.googleapis.com/v1beta/models',
        apiKey: 'AIzaSyDJ9krnymBtW4oGVvG175Simn5RO6j46n4'
    }
};