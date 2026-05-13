const https = require('https');
const TOKEN = '3fC7a2rSBB8qTcY6b9jptUurfjly0LIFPfHcfxNPj3zrezTM';
const HOST = 'qa.tvirtual.net';
const GUID = 'a46c4d07-3792-4711-aac0-8fbab1c3b50d';

function post(path, data) {
  return new Promise((resolve) => {
    const s = JSON.stringify(data);
    const opts = { hostname: HOST, port: 443, path, method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer '+TOKEN, 'Content-Length': Buffer.byteLength(s) } };
    const req = https.request(opts, (res) => {
      let body = '';
      res.on('data', c => body += c);
      res.on('end', () => { try { resolve({ status: res.statusCode, data: JSON.parse(body) }); } catch(e) { resolve({ status: res.statusCode, data: body }); } });
    });
    req.on('error', e => resolve({ status: 'error', data: e.message }));
    req.write(s);
    req.end();
  });
}

async function main() {
  console.log('=== QA - PROBANDO SucursalStrongId ===\n');
  
  console.log('1. Con SucursalStrongId (nombre correcto):');
  let r = await post('/api/facturacion-digital/cargar', {
    serie: '', moneda: 'VES', tasa_cambio: 1, rif_cliente: '87654321',
    observaciones: 'TEST SUCURSAL STRONGID ' + Date.now(),
    almacen: 'VOLTAJE', vendedor: 'V0000001',
    SucursalStrongId: GUID,
    detalles: [{ codigo: 'DTN02901', cantidad: 1, presentacion: 1, precio_unit: 5, lote: '', descuento_monto: 0, tasa_cambio: 1, rif_tercero: '' }],
    cobros: [{ moneda: 'VES', monto: 5, tasa_cambio: 1, cuenta_asociada: '1112001', referencia: 'TEST-SSID-'+Date.now() }]
  });
  console.log('Status:', r.status);
  console.log('Response:', JSON.stringify(r.data, null, 2));

  if (r.data.error) {
    console.log('\n2. Sin SucursalStrongId (a ver si cambia):');
    let r2 = await post('/api/facturacion-digital/cargar', {
      serie: '', moneda: 'VES', tasa_cambio: 1, rif_cliente: '87654321',
      observaciones: 'TEST SIN SUCURSAL ' + Date.now(),
      almacen: 'VOLTAJE', vendedor: 'V0000001',
      detalles: [{ codigo: 'DTN02901', cantidad: 1, presentacion: 1, precio_unit: 5, lote: '', descuento_monto: 0, tasa_cambio: 1, rif_tercero: '' }],
      cobros: [{ moneda: 'VES', monto: 5, tasa_cambio: 1, cuenta_asociada: '1112001', referencia: 'TEST-NOSSID-'+Date.now() }]
    });
    console.log('Status:', r2.status);
    console.log('Response:', JSON.stringify(r2.data, null, 2));
  }
}
main().catch(console.error);