const https = require('https');

const TOKEN_QA = 'eOu9ZOcjtLXfxP19Fq3Ij+D8KidlVDOKWuywwnSc7nJ62zLV';
const HOST_QA = 'qa.tvirtual.net';

function makePostRequest(path, data) {
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

async function testQA() {
  console.log('=== LISTANDO PRODUCTOS EN QA ===\n');

  // Try without codigo filter
  console.log('1. Todos los productos (sin filtro):');
  let result = await makePostRequest('/api/productos/buscar', {});
  if (result.status === 200) {
    console.log(`  Total registros: ${result.data.total_registros}`);
    if (result.data.productos?.length > 0) {
      for (const p of result.data.productos.slice(0, 10)) {
        console.log(`  - ${p.codigo} | ${p.articulo} | usalote: ${p.usalote}`);
      }
    }
  } else {
    console.log(`  Status: ${result.status}`, JSON.stringify(result.data));
  }
  console.log('');

  // Try pagination
  console.log('2. Intentando con página:');
  result = await makePostRequest('/api/productos/buscar', { pagina: 1 });
  if (result.status === 200) {
    console.log(`  Total registros: ${result.data.total_registros}`);
    if (result.data.productos?.length > 0) {
      for (const p of result.data.productos.slice(0, 10)) {
        console.log(`  - ${p.codigo} | ${p.articulo} | usalote: ${p.usalote}`);
      }
    }
  } else {
    console.log(`  Status: ${result.status}`, JSON.stringify(result.data));
  }
}

testQA().catch(console.error);