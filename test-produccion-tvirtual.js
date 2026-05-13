const https = require('https');

const TOKEN_PRODUCCION = '3fC7a2rSBB8qTcY6b9jptUurfjly0LIFPfHcfxNPj3zrezTM';
const HOST_PRODUCCION = 'sav.tvirtual.net';

function makeRequest(path, data) {
  return new Promise((resolve, reject) => {
    const dataString = JSON.stringify(data);
    
    const options = {
      hostname: HOST_PRODUCCION,
      port: 443,
      path: path,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${TOKEN_PRODUCCION}`,
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

    req.on('error', reject);
    req.write(dataString);
    req.end();
  });
}

async function testCompleto() {
  console.log('=== T-VIRTUAL PRODUCCIÓN - PRUEBA COMPLETA ===\n');
  
  const clienteData = {
    indicacliente: 1,
    inditipoente: "NR",
    especial: 0,
    indicedrif: "C",
    cedrif: "15567644",
    nombre: "Cliente Prueba Voltaje Production",
    email: "test@voltaje.com",
    telefono: "04121234567",
    direccion: "Caracas",
    diascredito: 0,
    ivaidtarifadetalle: 15
  };

  console.log('1. Intentando crear cliente...');
  const clienteResult = await makeRequest('/api/prov-clientes/cargar', clienteData);
  console.log('   Status:', clienteResult.status);
  console.log('   Response:', JSON.stringify(clienteResult.data, null, 2));
  console.log('');

  const facturaData = {
    serie: "",
    moneda: "VES",
    tasa_cambio: 1,
    rif_cliente: "15567644",
    observaciones: "Factura de Prueba Production - Power Bank",
    almacen: "Almacen",
    vendedor: "V16098733",
    detalles: [
      {
        codigo: "DTA43337",
        cantidad: 1,
        presentacion: 1,
        precio_unit: 4.31,
        lote: "",
        descuento_monto: 0,
        tasa_cambio: 1,
        rif_tercero: ""
      }
    ],
    cobros: [
      {
        moneda: "VES",
        monto: 4.31,
        tasa_cambio: 1,
        cuenta_asociada: "1111004",
        referencia: "TEST-001"
      }
    ]
  };

  console.log('2. Intentando crear factura...');
  const facturaResult = await makeRequest('/api/facturacion-digital/cargar', facturaData);
  console.log('   Status:', facturaResult.status);
  console.log('   Response:', JSON.stringify(facturaResult.data, null, 2));
}

testCompleto().catch(console.error);