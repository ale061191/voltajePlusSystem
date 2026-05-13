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
  console.log('=== CONSULTANDO PRODUCTOS EN QA ===\n');
  
  const productos = ['DTN02901', 'DTA43337'];
  
  for (const codigo of productos) {
    console.log(`Producto: ${codigo}`);
    const result = await makePostRequest('/api/productos/buscar', { codigo });
    if (result.status === 200 && result.data.productos?.length > 0) {
      const p = result.data.productos[0];
      console.log(`  Código: ${p.codigo}`);
      console.log(`  Nombre: ${p.articulo}`);
      console.log(`  Categoría: ${p.categoria}`);
      console.log(`  Tipo: ${p.tipo_producto}`);
      console.log(`  Usa Lote (usalote): ${p.usalote}  <--- CLAVE`);
      console.log(`  Linea: ${p.linea}`);
      console.log(`  Almacén: ${JSON.stringify(p.existencia)}`);
    } else {
      console.log('  No encontrado');
    }
    console.log('');
  }
}

testQA().catch(console.error);