const https = require('https');

async function checkQA() {
  console.log('Verificando conectividad con QA...\n');

  // Try 1: Simple GET to root
  try {
    await new Promise((resolve, reject) => {
      const req = https.get('https://qa.tvirtual.net/', { timeout: 10000 }, (res) => {
        let body = '';
        res.on('data', (chunk) => { body += chunk; });
        res.on('end', () => {
          console.log(`GET / -> Status: ${res.statusCode}`);
          console.log(`Body (first 500 chars): ${body.substring(0, 500)}`);
          resolve();
        });
      });
      req.on('error', reject);
      req.end();
    });
  } catch(e) {
    console.log(`GET / -> Error: ${e.message}`);
  }
  console.log('');

  // Try 2: POST to facturacion with minimal data
  const token = 'eOu9ZOcjtLXfxP19Fq3Ij+D8KidlVDOKWuywwnSc7nJ62zLV';
  const data = JSON.stringify({ serie: "", moneda: "VES", tasa_cambio: 1, rif_cliente: "19932878", observaciones: "test", almacen: "test", vendedor: "test", detalles: [], cobros: [] });
  
  await new Promise((resolve) => {
    const options = {
      hostname: 'qa.tvirtual.net',
      port: 443,
      path: '/api/facturacion-digital/cargar',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
        'Content-Length': Buffer.byteLength(data)
      }
    };
    const req = https.request(options, (res) => {
      let body = '';
      res.on('data', (chunk) => { body += chunk; });
      res.on('end', () => {
        console.log(`POST /api/facturacion-digital/cargar -> Status: ${res.statusCode}`);
        try {
          console.log('Response:', JSON.stringify(JSON.parse(body), null, 2));
        } catch(e) {
          console.log('Response:', body);
        }
        resolve();
      });
    });
    req.on('error', (e) => {
      console.log(`Error: ${e.message}`);
      resolve();
    });
    req.write(data);
    req.end();
  });
  console.log('');

  // Try 3: Same with production host (sav)
  await new Promise((resolve) => {
    const prodToken = '3fC7a2rSBB8qTcY6b9jptUurfjly0LIFPfHcfxNPj3zrezTM';
    const options = {
      hostname: 'sav.tvirtual.net',
      port: 443,
      path: '/api/facturacion-digital/cargar',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${prodToken}`,
        'Content-Length': Buffer.byteLength(data)
      }
    };
    const req = https.request(options, (res) => {
      let body = '';
      res.on('data', (chunk) => { body += chunk; });
      res.on('end', () => {
        console.log(`POST sav /api/facturacion-digital/cargar -> Status: ${res.statusCode}`);
        try {
          console.log('Response:', JSON.stringify(JSON.parse(body), null, 2));
        } catch(e) {
          console.log('Response:', body);
        }
        resolve();
      });
    });
    req.on('error', (e) => {
      console.log(`Error: ${e.message}`);
      resolve();
    });
    req.write(data);
    req.end();
  });
}

checkQA();