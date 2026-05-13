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

async function test() {
  console.log('=== EXPLORANDO QA (qa.tvirtual.net) ===\n');
  
  // 1. Buscar productos
  console.log('1. Productos en QA:');
  const prodResult = await postRequest('qa.tvirtual.net', '/api/productos/buscar', {});
  if (prodResult.status === 200 && prodResult.data.productos?.length > 0) {
    console.log(`   Total: ${prodResult.data.total_registros}`);
    for (const p of prodResult.data.productos) {
      console.log(`   - ${p.codigo} | ${p.articulo} | usalote: ${p.usalote} | almacen: ${Object.keys(p.existencia || {}).join(', ')}`);
    }
  } else {
    console.log(`   ${JSON.stringify(prodResult.data)}`);
  }
  console.log('');

  // 2. Crear un cliente nuevo (RIF diferente)
  console.log('2. Creando cliente nuevo...');
  const clienteResult = await postRequest('qa.tvirtual.net', '/api/prov-clientes/cargar', {
    indicacliente: 1,
    inditipoente: "NR",
    especial: 0,
    indicedrif: "C",
    cedrif: "87654321",
    nombre: "CLIENTE NUEVO QA VOLTAJE",
    email: "nuevoqa@voltaje.com",
    telefono: "04121234567",
    direccion: "Caracas, Venezuela",
    diascredito: 0,
    ivaidtarifadetalle: 15
  });
  console.log('Status:', clienteResult.status);
  console.log('Response:', JSON.stringify(clienteResult.data, null, 2));
  
  let clienteOk = !clienteResult.data.error;
  if (clienteOk) {
    console.log('✅ Cliente creado!');
  } else {
    console.log('⚠️', clienteResult.data.mensaje);
    console.log('   Intentaremos con otro RIF...');
  }
  console.log('');

  // 3. Crear factura con cliente nuevo
  console.log('3. Creando factura...');
  const facturaResult = await postRequest('qa.tvirtual.net', '/api/facturacion-digital/cargar', {
    serie: "",
    moneda: "VES",
    tasa_cambio: 1,
    rif_cliente: clienteOk ? "87654321" : "19932878",
    observaciones: "FACTURA PRUEBA QA - VOLTAJE",
    almacen: "Almacen",
    vendedor: "V16098733",
    detalles: [{
      codigo: "LTVM001",
      cantidad: 1,
      presentacion: 1,
      precio_unit: 100.00,
      lote: "",
      descuento_monto: 0,
      tasa_cambio: 1,
      rif_tercero: ""
    }],
    cobros: [{
      moneda: "VES",
      monto: 100.00,
      tasa_cambio: 1,
      cuenta_asociada: "1111009",
      referencia: "QA-TEST-001"
    }]
  });
  console.log('Status:', facturaResult.status);
  console.log('Response:', JSON.stringify(facturaResult.data, null, 2));
}

test().catch(console.error);