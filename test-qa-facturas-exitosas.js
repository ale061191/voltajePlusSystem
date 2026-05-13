const https = require('https');
const TOKEN = '3fC7a2rSBB8qTcY6b9jptUurfjly0LIFPfHcfxNPj3zrezTM';

function postRequest(host, path, data) {
  return new Promise((resolve) => {
    const dataString = JSON.stringify(data);
    const options = { hostname: host, port: 443, path, method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${TOKEN}`, 'Content-Length': Buffer.byteLength(dataString) } };
    const req = https.request(options, (res) => {
      let body = '';
      res.on('data', (chunk) => { body += chunk; });
      res.on('end', () => { try { resolve({ status: res.statusCode, data: JSON.parse(body) }); } catch(e) { resolve({ status: res.statusCode, data: body }); } });
    });
    req.on('error', (e) => resolve({ status: 'error', data: e.message }));
    req.write(dataString);
    req.end();
  });
}

async function main() {
  console.log('========================================');
  console.log('  QA - FACTURAS EXITOSAS - DETALLE');
  console.log('========================================\n');
  
  // CREAR FACTURA 1: Producto DTA43363 (sin rif_tercero)
  console.log('FACTURA 1 - DTA43363 (sin tercero):');
  let r1 = await postRequest('qa.tvirtual.net', '/api/facturacion-digital/cargar', {
    serie: "", moneda: "VES", tasa_cambio: 1, rif_cliente: "87654321",
    observaciones: "PRUEBA EXITOSA QA - POWER BANK DTA43363",
    almacen: "VOLTAJE", vendedor: "V0000001",
    detalles: [{ codigo: "DTA43363", cantidad: 1, presentacion: 1, precio_unit: 5.00, lote: "", descuento_monto: 0, tasa_cambio: 1, rif_tercero: "" }],
    cobros: [{ moneda: "VES", monto: 5.00, tasa_cambio: 1, cuenta_asociada: "1112001", referencia: "QA-EXITO-1" }]
  });
  console.log('Status:', r1.status);
  console.log('Response:', JSON.stringify(r1.data, null, 2));
  console.log('');

  // CREAR FACTURA 2: Producto DTN02901 (el que usaban antes)
  console.log('FACTURA 2 - DTN02901:');
  let r2 = await postRequest('qa.tvirtual.net', '/api/facturacion-digital/cargar', {
    serie: "", moneda: "VES", tasa_cambio: 1, rif_cliente: "87654321",
    observaciones: "PRUEBA EXITOSA QA - POWER BANK DTN02901",
    almacen: "VOLTAJE", vendedor: "V0000001",
    detalles: [{ codigo: "DTN02901", cantidad: 1, presentacion: 1, precio_unit: 10.00, lote: "", descuento_monto: 0, tasa_cambio: 1, rif_tercero: "" }],
    cobros: [{ moneda: "VES", monto: 10.00, tasa_cambio: 1, cuenta_asociada: "1112001", referencia: "QA-EXITO-2" }]
  });
  console.log('Status:', r2.status);
  console.log('Response:', JSON.stringify(r2.data, null, 2));
  console.log('');

  // CREAR FACTURA 3: Producto DTA43337 (el de producción con lote opcional)
  console.log('FACTURA 3 - DTA43337 (como en producción pero sin lote):');
  let r3 = await postRequest('qa.tvirtual.net', '/api/facturacion-digital/cargar', {
    serie: "", moneda: "VES", tasa_cambio: 1, rif_cliente: "87654321",
    observaciones: "PRUEBA EXITOSA QA - POWER BANK DTA43337",
    almacen: "VOLTAJE", vendedor: "V0000001",
    detalles: [{ codigo: "DTA43337", cantidad: 1, presentacion: 1, precio_unit: 7.50, lote: "", descuento_monto: 0, tasa_cambio: 1, rif_tercero: "" }],
    cobros: [{ moneda: "VES", monto: 7.50, tasa_cambio: 1, cuenta_asociada: "1112001", referencia: "QA-EXITO-3" }]
  });
  console.log('Status:', r3.status);
  console.log('Response:', JSON.stringify(r3.data, null, 2));
  console.log('');

  console.log('========================================');
  console.log('CLIENTE CREADO:');
  console.log('  Cédula/RIF: 87654321');
  console.log('  Nombre: CLIENTE NUEVO QA VOLTAJE');
  console.log('========================================');
}

main().catch(console.error);