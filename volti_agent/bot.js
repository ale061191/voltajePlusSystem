// ============================================================
// 🤖 VOLTI ORCHESTRATOR - FAST VERSION (No AI dependency)
// ============================================================

const TelegramBot = require('node-telegram-bot-api');
const config = require('./config');
const tools = require('./tools');

const bot = new TelegramBot(config.TELEGRAM_BOT_TOKEN, { polling: true });

console.log("🚀 Volti starting...");
console.log("⚡ Mode: FAST (instant responses)");
console.log("🤖 Listening for commands!");

// ============================================================
// FAST INTENT PARSER (No AI needed)
// ============================================================
function parseIntent(text) {
    const t = text.toLowerCase();
    
    // BALANCE - "balance", "saldo", "cuánto tiene"
    if (t.includes('balance') || t.includes('saldo') || t.includes('cuánto') || t.includes('tiene')) {
        const cedula = text.match(/\d{7,10}/)?.[0] || "unknown";
        return { tool: 'getWalletBalance', params: { cedula } };
    }
    
    // INVOICE - "factura", "facturar", "emitir"
    if (t.includes('factura') || t.includes('facturar') || t.includes('emitir')) {
        const cedula = text.match(/\d{7,10}/)?.[0] || "19932878";
        const montoMatch = text.match(/\d+/g);
        const monto = montoMatch?.find(n => n !== cedula && n.length > 2) || "5000";
        return { tool: 'emitInvoiceTVirtual', params: { cedula, monto: parseFloat(monto), observaciones: "Via Volti" } };
    }
    
    // EJECT BATTERY - "expulsa", "sacar", "eject"
    if (t.includes('expulsa') || t.includes('sacar') || t.includes('eject') || t.includes('batería')) {
        const machineId = text.match(/B_\d+/)?.[0] || "B_UNKNOWN";
        const slot = text.match(/slot\s*(\d+)/i)?.[1] || "1";
        return { tool: 'ejectBattery', params: { machineId, slot } };
    }
    
    // MACHINE STATUS - "status", "máquina", "estado"
    if (t.includes('status') || t.includes('estado') || t.includes('máquina')) {
        const machineId = text.match(/B_\d+/)?.[0] || "B_UNKNOWN";
        return { tool: 'getMachineStatus', params: { machineId } };
    }
    
    // CREATE CLIENT - "crear cliente", "nuevo cliente"
    if (t.includes('crear') && (t.includes('cliente') || t.includes('usuario'))) {
        const nombre = "Cliente Volti";
        const cedula = text.match(/\d{7,10}/)?.[0] || "19932878";
        const telefono = text.match(/\d{11,}/)?.[0] || "04120000000";
        return { tool: 'createClientTVirtual', params: { nombre, cedula, telefono, email: '', direccion: 'Venezuela' } };
    }
    
    // HELP - "ayuda", "help", "qué puedes hacer"
    if (t.includes('ayuda') || t.includes('help') || t.includes('qué') || t.includes('comandos')) {
        return { tool: 'chat', params: { 
            message: "🤖 *Volti Commands*\n\n" +
                "• Balance: \"dime el saldo de 19932878\"\n" +
                "• Factura: \"factura para 19932878 por 50000\"\n" +
                "• Expulsar: \"expulsa batería B_123 slot 1\"\n" +
                "• Estado: \"estado de máquina B_123\"\n" +
                "• Cliente: \"crear cliente 19932878\""
        }};
    }
    
    // Default - just chat
    return { tool: 'chat', params: { message: `¡Hola! Soy Volti. Pregúntame sobre: balances, facturas, baterías o estado de máquinas.` } };
}

// ============================================================
// MESSAGE HANDLER - INSTANT
// ============================================================
bot.on('message', async (msg) => {
    const chatId = msg.chat.id;
    const text = msg.text;
    
    if (!text) {
        if (msg.voice) bot.sendMessage(chatId, "🎙️ Audio recibido! Escribe tu mensaje.");
        if (msg.photo) bot.sendMessage(chatId, "📸 Imagen recibida! Escribe tu mensaje.");
        return;
    }
    
    console.log(`[MSG] ${text}`);
    
    try {
        // Instant parsing - no AI waiting
        const decision = parseIntent(text);
        
        // Execute tool
        if (decision.tool === 'getWalletBalance') {
            const res = await tools.getWalletBalance(decision.params.cedula);
            bot.sendMessage(chatId, `💰 Balance ${decision.params.cedula}: ${res.balance || res.error || 'Error'}`);
        } 
        else if (decision.tool === 'emitInvoiceTVirtual') {
            const res = await tools.emitInvoiceTVirtual(decision.params.cedula, decision.params.monto, decision.params.observaciones);
            if (res.error) {
                bot.sendMessage(chatId, `❌ Error: ${res.message}`);
            } else {
                bot.sendMessage(chatId, `✅ Factura #${res.numero || 'N/A'}\n🔗 ${res.url || 'Sin URL'}`);
            }
        }
        else if (decision.tool === 'ejectBattery') {
            const res = await tools.ejectBattery(decision.params.machineId, decision.params.slot);
            bot.sendMessage(chatId, `🔋 ${res.message}`);
        }
        else if (decision.tool === 'getMachineStatus') {
            const res = await tools.getMachineStatus(decision.params.machineId);
            bot.sendMessage(chatId, `📡 Máquina ${decision.params.machineId}\nEstado: ${res.status}\nBaterías: ${res.batteries || 0}/${res.slots || 0}`);
        }
        else if (decision.tool === 'createClientTVirtual') {
            const res = await tools.createClientTVirtual(decision.params.nombre, decision.params.cedula, decision.params.telefono, decision.params.email, decision.params.direccion);
            bot.sendMessage(chatId, res.error ? `❌ ${res.message}` : `✅ Cliente creado en T-Virtual!`);
        }
        else {
            bot.sendMessage(chatId, decision.params.message, { parse_mode: 'Markdown' });
        }
        
    } catch (error) {
        console.error("Bot Error:", error);
        bot.sendMessage(chatId, "❌ Error interno. Intenta de nuevo.");
    }
});

console.log("✅ Volti ready! Send a message now.");