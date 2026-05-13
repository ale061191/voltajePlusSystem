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

async function testFacturaManual() {
  console.log('=== USANDO VALORES DEL MANUAL OFICIAL ===\n');
  
  const facturaData = {
    serie: "",
    moneda: "VES",
    tasa_cambio: 303.15,
    rif_cliente: "J500926928",
    observaciones: "Factura de Prueba - Valores del Manual",
    almacen: "Almacen",
    vendedor: "V16098733",
    detalles: [
      {
        codigo: "LTVM001",
        cantidad: 1,
        presentacion: 1,
        precio_unit: 100.00,
        lote: "",
        descuento_monto: "",
        tasa_cambio: 1,
        rif_tercero: ""
      }
    ],
    cobros: [
      {
        moneda: "VES",
        monto: 5543.35,
        tasa_cambio: 1,
        cuenta_asociada: "1111009",
        referencia: "TEST-MANUAL-001"
      }
    ]
  };

  console.log('Enviando factura con valores del manual...');
  const facturaResult = await makeRequest('/api/facturacion-digital/cargar', facturaData);
  console.log('Status:', facturaResult.status);
  console.log('Response:', JSON.stringify(facturaResult.data, null, 2));
}

testFacturaManual().catch(console.error);