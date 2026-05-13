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

async function testClienteManual() {
  console.log('=== USANDO MANUAL DE CLIENTES/PROVEEDORES ===\n');
  
  const clienteData = {
    indicacliente: 1,
    inditipoente: "JD",
    especial: 0,
    indicedrif: "R",
    cedrif: "J492337400",
    nombre: "INVERSIONES EL EJEMPLO 2025 C.A",
    email: "jhondoe@example.com",
    telefono: "04248563211",
    direccion: "AV. PEREZ MONSALVES EDIF. TAMANACO PISO 2",
    diascredito: 0,
    ivaidtarifadetalle: 15
  };

  console.log('1. Creando cliente con valores del manual...');
  const clienteResult = await makeRequest('/api/prov-clientes/cargar', clienteData);
  console.log('   Status:', clienteResult.status);
  console.log('   Response:', JSON.stringify(clienteResult.data, null, 2));
}

testClienteManual().catch(console.error);