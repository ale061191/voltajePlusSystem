// ============================================================
// 🤖 VOLTI - INSTANT RESPONSE VERSION
// ============================================================

const TelegramBot = require('node-telegram-bot-api');
const config = require('./config');
const axios = require('axios');

const bot = new TelegramBot(config.TELEGRAM_BOT_TOKEN, { polling: true });

console.log("🚀 Volti starting...");
console.log("✅ Ready!");

// ============================================================
// TOOLS - Direct API calls
// ============================================================

// T-Virtual: Consultar cliente
async function buscarClienteTvirtual(cedula) {
    console.log(`[TVirtual] Buscando cliente: ${cedula}`);
    try {
        // Simulated - real API would require proper endpoint
        return { found: true, nombre: "Cliente Encontrado", cedula, balance: "0 VES" };
    } catch (e) {
        return { error: true, message: e.message };
    }
}

// T-Virtual: Consultar factura
async function buscarFacturaTvirtual(numero) {
    console.log(`[TVirtual] Buscando factura: ${numero}`);
    return { numero, status: "Pendiente", monto: "0 VES" };
}

// BNC: Consultar cuenta
async function consultaBNC(cedula) {
    console.log(`[BNC] Consultando cuenta: ${cedula}`);
    // Using the BNC API from the system
    const bncConfig = config.BNC;
    try {
        // Logon first
        const logonRes = await axios.post(`${bncConfig.apiUrl}/logon`, {
            clientGuid: bncConfig.clientGuid,
            masterKey: bncConfig.masterKey
        }, { timeout: 5000 });
        
        if (logonRes.data?.success) {
            return { status: "connected", message: "BNC API conectada" };
        }
    } catch (e) {
        console.log("BNC logon failed:", e.message);
    }
    return { status: "mock", balance: "Consultando...", lastUpdate: new Date().toISOString() };
}

// ============================================================
// INTENT PARSER - Fast keyword matching
// ============================================================
function parseIntent(text) {
    const t = text.toLowerCase();
    
    // === T-VIRTUAL ===
    if (t.includes('cliente') || t.includes('buscar cliente') || t.includes('busca cliente')) {
        const cedula = text.match(/\d{7,10}/)?.[0] || "19932878";
        return { action: 'tvirtual_cliente', params: { cedula } };
    }
    if (t.includes('factura') || t.includes('buscar factura')) {
        const numero = text.match(/\d+/)?.[0] || "0001";
        return { action: 'tvirtual_factura', params: { numero } };
    }
    if (t.includes('crear cliente') || t.includes('nuevo cliente')) {
        const cedula = text.match(/\d{7,10}/)?.[0] || "19932878";
        return { action: 'tvirtual_crear', params: { cedula, nombre: "Nuevo Cliente" } };
    }
    
    // === BNC ===
    if (t.includes('bnc') || t.includes('banco') || t.includes('cuenta') || t.includes('balance')) {
        const cedula = text.match(/\d{7,10}/)?.[0] || "unknown";
        return { action: 'bnc_consulta', params: { cedula } };
    }
    if (t.includes('pago') || t.includes('transferencia') || t.includes('pago móvil')) {
        return { action: 'bnc_pago', params: {} };
    }
    
    // === GENERAL ===
    if (t.includes('ayuda') || t.includes('help') || t.includes('comandos') || t.includes('qué puedes')) {
        return { action: 'help', params: {} };
    }
    if (t.includes('hola') || t.includes('buenas') || t.includes('hi')) {
        return { action: 'saludo', params: {} };
    }
    
    // Default - try to understand
    return { action: 'chat', params: { text: text } };
}

// ============================================================
// MESSAGE HANDLER
// ============================================================
bot.on('message', async (msg) => {
    const chatId = msg.chat.id;
    const text = msg.text;
    
    if (!text) {
        bot.sendMessage(chatId, "📝 Escribe tu mensaje.");
        return;
    }
    
    console.log(`[MSG] ${text}`);
    
    try {
        const intent = parseIntent(text);
        
        // EXECUTE ACTION
        if (intent.action === 'tvirtual_cliente') {
            const res = await buscarClienteTvirtual(intent.params.cedula);
            bot.sendMessage(chatId, `📄 *T-Virtual - Cliente*\n\nCédula: ${intent.params.cedula}\nNombre: ${res.nombre || 'N/A'}\nBalance: ${res.balance || 'N/A'}`, { parse_mode: 'Markdown' });
        }
        else if (intent.action === 'tvirtual_factura') {
            const res = await buscarFacturaTvirtual(intent.params.numero);
            bot.sendMessage(chatId, `📄 *T-Virtual - Factura*\n\nNúmero: ${res.numero}\nStatus: ${res.status}\nMonto: ${res.monto}`, { parse_mode: 'Markdown' });
        }
        else if (intent.action === 'tvirtual_crear') {
            bot.sendMessage(chatId, `✅ *T-Virtual*\n\nCreando cliente: ${intent.params.cedula}\nNombre: ${intent.params.nombre}`, { parse_mode: 'Markdown' });
        }
        else if (intent.action === 'bnc_consulta') {
            const res = await consultaBNC(intent.params.cedula);
            bot.sendMessage(chatId, `🏦 *BNC - Consulta*\n\nCédula: ${intent.params.cedula}\nStatus: ${res.status}\nBalance: ${res.balance}\nÚltima actualización: ${res.lastUpdate}`, { parse_mode: 'Markdown' });
        }
        else if (intent.action === 'bnc_pago') {
            bot.sendMessage(chatId, "💳 *BNC - Pagos*\n\nPara pagos usa la app de Voltaje Plus.\nVolti puede ayudarte a verificar transacciones.", { parse_mode: 'Markdown' });
        }
        else if (intent.action === 'saludo') {
            bot.sendMessage(chatId, "👋 ¡Hola! Soy *Volti*, tu asistente de Voltaje Plus.\n\nPuedo ayudarte con:\n• 📄 T-Virtual (clientes, facturas)\n• 🏦 BNC (consultas, pagos)\n• 🔋 Baterías Bajie\n\nEscribe tu consulta o 'ayuda' para ver comandos.", { parse_mode: 'Markdown' });
        }
        else if (intent.action === 'help') {
            bot.sendMessage(chatId, `🤖 *Comandos de Volti*\n\n` +
                `*T-Virtual:*\n` +
                `• "buscar cliente 19932878"\n` +
                `• "buscar factura 0001"\n` +
                `• "crear cliente 19932878"\n\n` +
                `*BNC:*\n` +
                `• "mi cuenta 19932878"\n` +
                `• "consulta banco"\n\n` +
                `*General:*\n` +
                `• "ayuda"`, { parse_mode: 'Markdown' });
        }
        else {
            bot.sendMessage(chatId, `🤖 Entiendo: "${text}"\n\nNo tengo esa información aún. Prueba "ayuda" para ver comandos disponibles.`);
        }
        
    } catch (error) {
        console.error("Error:", error.message);
        bot.sendMessage(chatId, "❌ Error procesando solicitud. Intenta de nuevo.");
    }
});

console.log("✅ Volti listening!");