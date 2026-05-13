const https = require('https');

const TOKEN_PRODUCCION = '3fC7a2rSBB8qTcY6b9jptUurfjly0LIFPfHcfxNPj3zrezTM';
const HOST_PRODUCCION = 'sav.tvirtual.net';

const pathsToTest = [
  '/api/productos/DTA43337',
  '/api/productos/buscar?codigo=DTA43337',
  '/api/servicios/DTA43337',
  '/api/servicios/buscar?codigo=DTA43337',
  '/api/inventario/DTA43337',
  '/api/lotes/producto/DTA43337',
  '/api/catalogos/productos',
  '/api/productos/cargar',
  '/api/facturacion-digital/consultar/DTA43337',
  '/api/facturacion-digital/buscar?codigo=DTA43337',
];

function makeGetRequest(path) {
  return new Promise((resolve) => {
    const options = {
      hostname: HOST_PRODUCCION,
      port: 443,
      path: path,
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${TOKEN_PRODUCCION}`
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
    req.end();
  });
}

function makePostRequest(path, data) {
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

async function testEndpoints() {
  console.log('=== BUSCANDO INFO DEL PRODUCTO DTA43337 EN SAV ===\n');

  console.log('--- GET Requests (Consultas) ---\n');
  for (const path of pathsToTest) {
    console.log(`GET: ${path}`);
    try {
      const result = await makeGetRequest(path);
      console.log(`  Status: ${result.status}`);
      if (result.status === 200) {
        console.log(`  Data:`, JSON.stringify(result.data, null, 2));
      } else if (result.data && typeof result.data === 'object') {
        console.log(`  Error: ${result.data.error || 'N/A'}`);
        console.log(`  Mensaje: ${result.data.mensaje || 'N/A'}`);
      }
    } catch (e) {
      console.log(`  Error: ${e.message}`);
    }
    console.log('');
  }

  console.log('--- POST: Intentando consultar producto ---\n');
  const postResult = await makePostRequest('/api/productos/buscar', { codigo: 'DTA43337' });
  console.log('POST /api/productos/buscar');
  console.log('  Status:', postResult.status);
  console.log('  Response:', JSON.stringify(postResult.data, null, 2));
}

testEndpoints().catch(console.error);