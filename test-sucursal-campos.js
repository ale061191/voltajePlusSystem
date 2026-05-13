const https = require('https');
const TOKEN = '3fC7a2rSBB8qTcY6b9jptUurfjly0LIFPfHcfxNPj3zrezTM';
const HOST = 'qa.tvirtual.net';
const GUID = 'a46c4d07-3792-4711-aac0-8fbab1c3b50d';

function post(path, data) {
  return new Promise((resolve) => {
    const s = JSON.stringify(data);
    const opts = { hostname: HOST, port: 443, path, method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${TOKEN}`, 'Content-Length': Buffer.byteLength(s) } };
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

const base = {
  serie: "", moneda: "VES", tasa_cambio: 1, rif_cliente: "87654321",
  observaciones: "TEST SUCURSAL", almacen: "VOLTAJE", vendedor: "V0000001",
  detalles: [{ codigo: "DTN02901", cantidad: 1, presentacion: 1, precio_unit: 1, lote: "", descuento_monto: 0, tasa_cambio: 1, rif_tercero: "" }],
  cobros: [{ moneda: "VES", monto: 1, tasa_cambio: 1, cuenta_asociada: "1112001", referencia: "TEST-SUC" }]
};

async function test() {
  const campos = ['sucursalId', 'sucursal', 'sucursalGuid', 'commercialOffice', 'officeId', 'idSucursal', 'sucursalUuid', 'strongIdSucursal', 'sucursalStrongId'];
  
  for (const campo of campos) {
    const payload = { ...base, [campo]: GUID };
    const r = await post('/api/facturacion-digital/cargar', payload);
    const msj = r.data?.mensaje || JSON.stringify(r.data);
    if (msj.includes('sucursal') || msj.includes('FA')) {
      console.log(`❌ "${campo}" -> ${msj}`);
    } else {
      console.log(`✅ "${campo}" -> ${msj}`);
    }
  }
}
test().catch(console.error);