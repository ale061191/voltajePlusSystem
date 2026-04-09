// ============================================================
// 🛠️ VOLTI'S SUPERPOWERS (Fast Toolbox)
// ============================================================

const axios = require('axios');
const config = require('./config');

async function getWalletBalance(cedula) {
    console.log(`[Tool] Fetching balance for ${cedula}...`);
    try {
        const response = await axios.get(
            `https://us-central1-voltajevzla-25454.cloudfunctions.net/getWalletBalance`,
            { timeout: 3000 }
        );
        return response.data;
    } catch (e) {
        return { balance: 'N/A', error: 'Firebase timeout' };
    }
}

async function createClientTVirtual(nombre, cedula, telefono, email, direccion) {
    console.log(`[Tool] Creating client in T-Virtual: ${cedula}`);
    try {
        const response = await axios.post(config.TVIRTUAL.urlCliente, {
            indicacliente: 1,
            inditipoente: "NN",
            especial: 0,
            indicedrif: "C",
            cedrif: cedula,
            nombre: nombre,
            email: email,
            telefono: telefono,
            direccion: direccion || "Venezuela",
            diascredito: 0,
            ivaidtarifadetalle: 15
        }, { 
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${config.TVIRTUAL.token}` },
            timeout: 5000 
        });
        return response.data;
    } catch (e) {
        return { error: true, message: e.message };
    }
}

async function emitInvoiceTVirtual(cedula, monto, observaciones) {
    console.log(`[Tool] Invoice: ${cedula} - ${monto}`);
    try {
        const response = await axios.post(config.TVIRTUAL.urlFactura, {
            serie: "",
            moneda: config.TVIRTUAL.moneda,
            tasa_cambio: 1,
            rif_cliente: cedula,
            observaciones: observaciones,
            almacen: config.TVIRTUAL.almacen,
            vendedor: config.TVIRTUAL.vendedor,
            detalles: [{
                codigo: config.TVIRTUAL.codigoServicio,
                cantidad: 1,
                presentacion: 1,
                precio_unit: monto,
                lote: "",
                descuento_monto: 0,
                tasa_cambio: 1,
                rif_tercero: ""
            }],
            cobros: [{
                moneda: config.TVIRTUAL.moneda,
                monto: monto,
                tasa_cambio: 1,
                cuenta_asociada: config.TVIRTUAL.cuentaContable,
                referencia: `VOLTI-${Date.now()}`
            }]
        }, { 
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${config.TVIRTUAL.token}` },
            timeout: 8000 
        });
        return response.data;
    } catch (e) {
        return { error: true, message: e.message };
    }
}

async function ejectBattery(machineId, slot) {
    console.log(`[Tool] Eject: ${machineId} slot ${slot}`);
    // TODO: Call Bajie API
    return { success: true, message: `🔋 Battery slot ${slot} of ${machineId} ejected (simulated)` };
}

async function getMachineStatus(machineId) {
    console.log(`[Tool] Status: ${machineId}`);
    // TODO: Call Bajie API
    return { success: true, status: 'Online', slots: 12, batteries: 5 };
}

module.exports = {
    getWalletBalance,
    createClientTVirtual,
    emitInvoiceTVirtual,
    ejectBattery,
    getMachineStatus
};