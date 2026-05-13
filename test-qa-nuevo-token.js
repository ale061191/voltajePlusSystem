const https = require('https');

const TOKEN = '3fC7a2rSBB8qTcY6b9jptUurfjly0LIFPfHcfxNPj3zrezTM';

async function testQA() {
  console.log('=== PROBANDO TOKEN EN QA (qa.tvirtual.net) ===\n');

  // 1. Probar crear cliente en QA
  console.log('1. Crear cliente en QA...');
  const clienteResult = await postRequest('qa.tvirtual.net', '/api/prov-clientes/cargar', {
    indicacliente: 1,
    inditipoente: "NR",
    especial: 0,
    indicedrif: "C",
    cedrif: "19932878",
    nombre: "CLIENTE PRUEBA QA",
    email: "testqa@voltaje.com",
    telefono: "04121234567",
    direccion: "Caracas, Venezuela",
    diascredito: 0,
    ivaidtarifadetalle: 15
  });
  console.log('Status:', clienteResult.status);
  console.log('Response:', JSON.stringify(clienteResult.data, null, 2));
  console.log('');

  // 2. Probar factura en QA
  console.log('2. Crear factura en QA...');
  const facturaResult = await postRequest('qa.tvirtual.net', '/api/facturacion-digital/cargar', {
    serie: "",
    moneda: "VES",
    tasa_cambio: 1,
    rif_cliente: "19932878",
    observaciones: "PRUEBA QA - ALQUILER POWER BANK",
    almacen: "ALMACEN DE EQUIPOS ALQUILADOS",
    vendedor: "V0000001",
    detalles: [{
      codigo: "DTN02901",
      cantidad: 1,
      presentacion: 1,
      precio_unit: 50.00,
      lote: "",
      descuento_monto: 0,
      tasa_cambio: 1,
      rif_tercero: ""
    }],
    cobros: [{
      moneda: "VES",
      monto: 50.00,
      tasa_cambio: 1,
      cuenta_asociada: "1112001",
      referencia: "ALQ-QA-2026"
    }]
  });
  console.log('Status:', facturaResult.status);
  console.log('Response:', JSON.stringify(facturaResult.data, null, 2));
}

function postRequest(host, path, data) {
  return new Promise((resolve) => {
    const dataString = JSON.stringify(data);
    const options = {
      hostname: host,
      port: 443,
      path: path,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${TOKEN}`,
        'Content-Length': Buffer.byteLength(dataString)
      }
    };

    const req = https.request(options, (res) => {
      let body = '';
      res.on('data', (chunk) => { body += chunk; });
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, data: JSON.parse(body) });
        } catch(e) {
          resolve({ status: res.statusCode, data: body });
        }
      });
    });

    req.on('error', (e) => resolve({ status: 'error', data: e.message }));
    req.write(dataString);
    req.end();
  });
}

testQA().catch(console.error);