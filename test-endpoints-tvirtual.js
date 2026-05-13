const https = require('https');

const TOKEN_PRODUCCION = '3fC7a2rSBB8qTcY6b9jptUurfjly0LIFPfHcfxNPj3zrezTM';
const HOST_PRODUCCION = 'sav.tvirtual.net';

const pathsToTest = [
  '/api/cuentas/cargar',
  '/api/cuentas-cc/cargar',
  '/api/cuentas-cobrar/cargar',
  '/api/bancos/cargar',
  '/api/almacenes/cargar',
  '/api/vendedores/cargar',
  '/api/prov-clientes/cargar',
  '/api/facturacion-digital/cargar'
];

function makeRequest(path, data = {}) {
  return new Promise((resolve) => {
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

    req.on('error', (e) => resolve({ status: 'error', data: e.message }));
    req.write(dataString);
    req.end();
  });
}

async function testAllEndpoints() {
  console.log('=== BUSCANDO ENDPOINTS DE T-VIRTUAL ===\n');
  
  for (const path of pathsToTest) {
    console.log(`Probando: ${path}`);
    try {
      const result = await makeRequest(path, {});
      console.log(`  Status: ${result.status}`);
      if (result.data && typeof result.data === 'object') {
        console.log(`  Error: ${result.data.error || 'N/A'}`);
        console.log(`  Mensaje: ${result.data.mensaje || 'N/A'}`);
      }
    } catch (e) {
      console.log(`  Error: ${e.message}`);
    }
    console.log('');
  }
}

testAllEndpoints();