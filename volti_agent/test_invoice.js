const axios = require('axios');
const config = require('./config');

async function testInvoice() {
    const cedula = '19932878';
    const monto = 50.0;
    const observaciones = 'TEST VOLTI - Alquiler Power Bank';

    console.log(`🚀 Iniciando test de facturación para ${cedula}...`);

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
                referencia: `TEST-VOLTI-${Date.now()}`
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

testInvoice();