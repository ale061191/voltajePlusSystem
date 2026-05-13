const axios = require('axios');
const config = require('./config');

async function testStandardInvoice() {
    const cedula = '19932878';
    const monto = 100.0;
    const observaciones = 'PRUEBA ESTANDAR - ALQUILER POWERBANK';

    console.log(`🚀 Iniciando prueba de factura ESTANDAR para ${cedula}...`);

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
                rif_tercero: "" // Vacío para factura normal
            }],
            cobros: [{
                moneda: config.TVIRTUAL.moneda,
                monto: monto,
                tasa_cambio: 1,
                cuenta_asociada: config.TVIRTUAL.cuentaContable,
                referencia: `NORMAL-VOLTI-${Date.now()}`
            }]
        }, { 
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${config.TVIRTUAL.token}` },
            timeout: 10000 
        });

        console.log('✅ RESPUESTA RECIBIDA:');
        console.log(JSON.stringify(response.data, null, 2));
    } catch (e) {
        console.error('❌ ERROR EN FACTURACIÓN:');
        console.error(e.response ? e.response.data : e.message);
    }
}

testStandardInvoice();