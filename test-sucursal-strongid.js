const https = require('https');
const TOKEN = '3fC7a2rSBB8qTcY6b9jptUurfjly0LIFPfHcfxNPj3zrezTM';

async function test() {
  const HOST = 'qa.tvirtual.net';
  const GUID = 'a46c4d07-3792-4711-aac0-8fbab1c3b50d';
  const STRONGID = '1f30e59f-8e35-4436-897a-e05219ed5cc8';

  const base = {
    serie: '', moneda: 'VES', tasa_cambio: 1, rif_cliente: '87654321',
    observaciones: 'TEST', almacen: 'VOLTAJE', vendedor: 'V0000001',
    detalles: [{ codigo: 'DTN02901', cantidad: 1, presentacion: 1, precio_unit: 1, lote: '', descuento_monto: 0, tasa_cambio: 1, rif_tercero: '' }],
    cobros: [{ moneda: 'VES', monto: 1, tasa_cambio: 1, cuenta_asociada: '1112001', referencia: 'TEST' }]
  };

  const tests = [
    { label: 'Con sucursalId GUID', payload: { ...base, sucursalId: GUID } },
    { label: 'Con sucursalId StrongId', payload: { ...base, sucursalId: STRONGID } },
    { label: 'Sin sucursalId', payload: { ...base } },
  ];

  for (const t of tests) {
    const s = JSON.stringify(t.payload);
    const res = await new Promise((resolve) => {
      const opts = { hostname: HOST, port: 443, path: '/api/facturacion-digital/cargar', method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + TOKEN, 'Content-Length': Buffer.byteLength(s) } };
      const req = https.request(opts, (r) => {
        let body = '';
        r.on('data', c => body += c);
        r.on('end', () => { try { resolve(JSON.parse(body)); } catch(e) { resolve(body); } });
      });
      req.on('error', e => resolve({ error: true, mensaje: e.message }));
      req.write(s);
      req.end();
    });
    console.log(`${t.label}: ${res.mensaje || JSON.stringify(res)}`);
  }
}
test();