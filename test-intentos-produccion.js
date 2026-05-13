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

async function testClienteMinimo() {
  console.log('=== INTENTO 1: Cliente mínimo (solo datos obligatorios) ===\n');
  
  const cliente1 = {
    indicacliente: 1,
    inditipoente: "NR",
    indicedrif: "C",
    cedrif: "12345678",
    nombre: "Test Cliente"
  };

  const r1 = await makeRequest('/api/prov-clientes/cargar', cliente1);
  console.log('Status:', r1.status);
  console.log('Response:', JSON.stringify(r1.data, null, 2));
  console.log('');

  console.log('=== INTENTO 2: Cliente con email/telefono ===\n');
  
  const cliente2 = {
    indicacliente: 1,
    inditipoente: "NR",
    indicedrif: "C",
    cedrif: "87654321",
    nombre: "Test Cliente 2",
    email: "test@test.com",
    telefono: "04121234567"
  };

  const r2 = await makeRequest('/api/prov-clientes/cargar', cliente2);
  console.log('Status:', r2.status);
  console.log('Response:', JSON.stringify(r2.data, null, 2));
}

testClienteMinimo().catch(console.error);