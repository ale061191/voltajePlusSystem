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
  console.log('=== QA - PROBANDO ALMACÉN "VOLTAJE" ===\n');

  // 1. Probar con vendedor del manual y almacén VOLTAJE
  console.log('1. Factura con almacén VOLTAJE y vendedor V16098733:');
  let r = await postRequest('qa.tvirtual.net', '/api/facturacion-digital/cargar', {
    serie: "",
    moneda: "VES",
    tasa_cambio: 1,
    rif_cliente: "87654321",
    observaciones: "TEST QA - POWER BANK",
    almacen: "VOLTAJE",
    vendedor: "V16098733",
    detalles: [{ codigo: "001", cantidad: 1, presentacion: 1, precio_unit: 10, lote: "", descuento_monto: 0, tasa_cambio: 1, rif_tercero: "" }],
    cobros: [{ moneda: "VES", monto: 10, tasa_cambio: 1, cuenta_asociada: "1111009", referencia: "TEST-VOLTAJE" }]
  });
  console.log('Status:', r.status, '|', r.data?.mensaje || JSON.stringify(r.data));
  console.log('');

  // Si falla, probar otras combinaciones
  if (r.data.error) {
    const mensaje = r.data.mensaje || '';
    
    if (mensaje.includes('vendedor')) {
      console.log('2. Probando con vendedor V0000001:');
      r = await postRequest('qa.tvirtual.net', '/api/facturacion-digital/cargar', {
        serie: "", moneda: "VES", tasa_cambio: 1, rif_cliente: "87654321",
        observaciones: "TEST QA - POWER BANK", almacen: "VOLTAJE", vendedor: "V0000001",
        detalles: [{ codigo: "001", cantidad: 1, presentacion: 1, precio_unit: 10, lote: "", descuento_monto: 0, tasa_cambio: 1, rif_tercero: "" }],
        cobros: [{ moneda: "VES", monto: 10, tasa_cambio: 1, cuenta_asociada: "1111009", referencia: "TEST-VOLTAJE" }]
      });
      console.log('Status:', r.status, '|', r.data?.mensaje || JSON.stringify(r.data));
    }
    
    if (r.data.error && r.data.mensaje?.includes('cuenta')) {
      console.log('\n3. Probando con cuenta 1112001:');
      r = await postRequest('qa.tvirtual.net', '/api/facturacion-digital/cargar', {
        serie: "", moneda: "VES", tasa_cambio: 1, rif_cliente: "87654321",
        observaciones: "TEST QA - POWER BANK", almacen: "VOLTAJE", vendedor: "V0000001",
        detalles: [{ codigo: "001", cantidad: 1, presentacion: 1, precio_unit: 10, lote: "", descuento_monto: 0, tasa_cambio: 1, rif_tercero: "" }],
        cobros: [{ moneda: "VES", monto: 10, tasa_cambio: 1, cuenta_asociada: "1112001", referencia: "TEST-VOLTAJE" }]
      });
      console.log('Status:', r.status, '|', r.data?.mensaje || JSON.stringify(r.data));
    }
  }
}

test().catch(console.error);