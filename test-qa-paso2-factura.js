const https = require('https');

const TOKEN_QA = 'eOu9ZOcjtLXfxP19Fq3Ij+D8KidlVDOKWuywwnSc7nJ62zLV';
const HOST_QA = 'qa.tvirtual.net';

function postRequest(path, data) {
  return new Promise((resolve) => {
    const dataString = JSON.stringify(data);
    const options = {
      hostname: HOST_QA,
      port: 443,
      path: path,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${TOKEN_QA}`,
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

async function main() {
  console.log('========================================');
  console.log('  QA T-VIRTUAL - CREAR FACTURA');
  console.log('========================================\n');

  // Mismos valores que funcionaron según error-tvirtual-Mayo.md
  const factura = {
    serie: "",
    moneda: "VES",
    tasa_cambio: 1,
    rif_cliente: "19932878",
    observaciones: "PRUEBA QA - ALQUILER POWER BANK MAQUINA DTN02901",
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
  };
  
  console.log('Payload:');
  console.log(JSON.stringify(factura, null, 2));
  console.log('');

  console.log('Llamando a: POST /api/facturacion-digital/cargar');
  const result = await postRequest('/api/facturacion-digital/cargar', factura);
  console.log('Status:', result.status);
  console.log('Response:', JSON.stringify(result.data, null, 2));
  console.log('');

  if (!result.data.error) {
    console.log('✅ FACTURA CREADA EXITOSAMENTE!');
    console.log('   Número:', result.data.numero);
    console.log('   Control:', result.data.control);
    console.log('   URL:', result.data.url);
  } else {
    console.log('❌ Error:', result.data.mensaje);
  }
}

main().catch(console.error);