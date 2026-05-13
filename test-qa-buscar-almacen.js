const https = require('https');
const TOKEN = '3fC7a2rSBB8qTcY6b9jptUurfjly0LIFPfHcfxNPj3zrezTM';

function postRequest(host, path, data) {
  return new Promise((resolve) => {
    const dataString = JSON.stringify(data);
    const options = {
      hostname: host,
      port: 443,
      path: path,
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${TOKEN}`, 'Content-Length': Buffer.byteLength(dataString) }
    };
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
  console.log('=== BUSCANDO ALMACENES EN QA ===\n');

  const almacenes = [
    "Almacen Principal",
    "Almacen",
    "ALMACEN",
    "Principal",
    "General",
    "ALMACEN GENERAL",
    "Almacen General",
    "ALMACEN PRINCIPAL",
    "ALMACEN DE EQUIPOS ALQUILADOS",
    "Almacén Principal"
  ];
  
  // Ver producto en detalle para ver su almacén
  console.log('1. Detalle de un producto (001):');
  const detalle = await postRequest('qa.tvirtual.net', '/api/productos/buscar', { codigo: "001" });
  if (detalle.status === 200 && detalle.data.productos?.length > 0) {
    console.log(JSON.stringify(detalle.data.productos[0].existencia, null, 2));
  } else {
    console.log(JSON.stringify(detalle.data));
  }
  console.log('');

  // Probar cada almacén con una factura
  console.log('2. Probando almacenes (sin emitir factura - validación):');
  for (const almacen of almacenes) {
    const factura = {
      serie: "",
      moneda: "VES",
      tasa_cambio: 1,
      rif_cliente: "87654321",
      observaciones: "TEST ALMACEN QA",
      almacen: almacen,
      vendedor: "V16098733",
      detalles: [{ codigo: "001", cantidad: 1, presentacion: 1, precio_unit: 10, lote: "", descuento_monto: 0, tasa_cambio: 1, rif_tercero: "" }],
      cobros: [{ moneda: "VES", monto: 10, tasa_cambio: 1, cuenta_asociada: "1111009", referencia: "TEST-ALM" }]
    };
    const result = await postRequest('qa.tvirtual.net', '/api/facturacion-digital/cargar', factura);
    if (result.status === 200 && !result.data.error) {
      console.log(`   ✅ "${almacen}" - FUNCIONA!`);
      console.log(`      Factura: ${result.data.numero} - ${result.data.url}`);
      break;
    } else {
      const msj = result.data?.mensaje || '';
      if (msj.includes('almacen')) {
        console.log(`   ❌ "${almacen}" - No existe`);
      } else {
        console.log(`   ❌ "${almacen}" - ${msj}`);
      }
    }
  }
}

test().catch(console.error);