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
  console.log('=== CREAR CLIENTE EN PRODUCCIÓN ===\n');
  
  const clienteData = {
    indicacliente: 1,
    inditipoente: "NR",
    especial: 0,
    indicedrif: "C",
    cedrif: "J500926928",
    nombre: "Cliente Test Manual",
    email: "test@voltaje.com",
    telefono: "04121234567",
    direccion: "Caracas",
    diascredito: 0,
    ivaidtarifadetalle: 15
  };

  console.log('1. Creando cliente...');
  const clienteResult = await makeRequest('/api/prov-clientes/cargar', clienteData);
  console.log('   Status:', clienteResult.status);
  console.log('   Response:', JSON.stringify(clienteResult.data, null, 2));
  
  if (clienteResult.data.error) {
    console.log('\n❌ Error al crear cliente. Detener aquí.');
    return;
  }
  
  console.log('\n✅ Cliente creado exitosamente!');
  
  console.log('\n2. Creando factura...');
  const facturaData = {
    serie: "",
    moneda: "VES",
    tasa_cambio: 303.15,
    rif_cliente: "J500926928",
    observaciones: "Factura de Prueba Production",
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
        monto: 100.00,
        tasa_cambio: 1,
        cuenta_asociada: "1111009",
        referencia: "TEST-001"
      }
    ]
  };

  const facturaResult = await makeRequest('/api/facturacion-digital/cargar', facturaData);
  console.log('   Status:', facturaResult.status);
  console.log('   Response:', JSON.stringify(facturaResult.data, null, 2));
}

testCompleto().catch(console.error);