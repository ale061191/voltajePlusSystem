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

async function test() {
  console.log('=== QA - PROBANDO PRODUCTOS ===\n');

  // Probar con rif_tercero para producto 001
  console.log('1. Producto 001 con rif_tercero J409823334:');
  let r = await postRequest('qa.tvirtual.net', '/api/facturacion-digital/cargar', {
    serie: "", moneda: "VES", tasa_cambio: 1, rif_cliente: "87654321",
    observaciones: "TEST QA - 001 con tercero",
    almacen: "VOLTAJE", vendedor: "V0000001",
    detalles: [{ codigo: "001", cantidad: 1, presentacion: 1, precio_unit: 10, lote: "", descuento_monto: 0, tasa_cambio: 1, rif_tercero: "J409823334" }],
    cobros: [{ moneda: "VES", monto: 10, tasa_cambio: 1, cuenta_asociada: "1112001", referencia: "TEST-001" }]
  });
  console.log('Status:', r.status, '|', r.data?.mensaje || JSON.stringify(r.data));
  
  if (r.data.error) {
    // Probar con DTA43337
    console.log('\n2. Producto DTA43337 (sin rif_tercero):');
    r = await postRequest('qa.tvirtual.net', '/api/facturacion-digital/cargar', {
      serie: "", moneda: "VES", tasa_cambio: 1, rif_cliente: "87654321",
      observaciones: "TEST QA - DTA43337",
      almacen: "VOLTAJE", vendedor: "V0000001",
      detalles: [{ codigo: "DTA43337", cantidad: 1, presentacion: 1, precio_unit: 10, lote: "", descuento_monto: 0, tasa_cambio: 1, rif_tercero: "" }],
      cobros: [{ moneda: "VES", monto: 10, tasa_cambio: 1, cuenta_asociada: "1112001", referencia: "TEST-DTA" }]
    });
    console.log('Status:', r.status, '|', r.data?.mensaje || JSON.stringify(r.data));
  }
  
  // Buscar específicamente DTN02901 y DTA43337 en QA
  console.log('\n3. Buscando productos DTN02901 y DTA43337 en QA:');
  for (const codigo of ['DTN02901', 'DTA43337', 'DTA43363', 'DTA43401']) {
    const prod = await postRequest('qa.tvirtual.net', '/api/productos/buscar', { codigo });
    if (prod.status === 200 && prod.data.productos?.length > 0) {
      const p = prod.data.productos[0];
      console.log(`   ${p.codigo} | ${p.articulo.substring(0,30)} | usalote:${p.usalote} | almacenes:${JSON.stringify(Object.keys(p.existencia || {}))}`);
    } else {
      console.log(`   ${codigo} -> No encontrado`);
    }
  }

  // Probar con DTA43363 (el primer DTA de la lista)
  console.log('\n4. Producto DTA43363:');
  r = await postRequest('qa.tvirtual.net', '/api/facturacion-digital/cargar', {
    serie: "", moneda: "VES", tasa_cambio: 1, rif_cliente: "87654321",
    observaciones: "TEST QA - DTA43363",
    almacen: "VOLTAJE", vendedor: "V0000001",
    detalles: [{ codigo: "DTA43363", cantidad: 1, presentacion: 1, precio_unit: 10, lote: "", descuento_monto: 0, tasa_cambio: 1, rif_tercero: "" }],
    cobros: [{ moneda: "VES", monto: 10, tasa_cambio: 1, cuenta_asociada: "1112001", referencia: "TEST-DTA63" }]
  });
  console.log('Status:', r.status, '|', r.data?.mensaje || JSON.stringify(r.data));
}

test().catch(console.error);