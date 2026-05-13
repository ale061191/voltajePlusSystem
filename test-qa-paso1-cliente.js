const https = require('https');

const TOKEN_QA = 'eOu9ZOcjtLXfxP19Fq3Ij+D8KidlVDOKWuywwnSc7nJ62zLV';
const HOST_QA = 'qa.tvirtual.net';

function postRequest(path, data) {
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

async function main() {
  console.log('========================================');
  console.log('  QA T-VIRTUAL - CREAR CLIENTE');
  console.log('========================================\n');

  // Según el manual de Clientes/Proveedores:
  // indicacliente: 1 = Cliente
  // inditipoente: "NR" = Natural Residente (persona natural venezolana)
  // especial: 0 = Ordinario
  // indicedrif: "C" = Cédula, "R" = RIF
  // cedrif: número de identificación sin letras
  // ivaidtarifadetalle: 15 = Retención 75%, 16 = 100%

  const cliente = {
    indicacliente: 1,
    inditipoente: "NR",
    especial: 0,
    indicedrif: "C",
    cedrif: "19932878",     // Cliente que ya funcionó en QA
    nombre: "CLIENTE PRUEBA VOLTAJE QA",
    email: "testqa@voltaje.com",
    telefono: "04121234567",
    direccion: "Caracas, Venezuela",
    diascredito: 0,
    ivaidtarifadetalle: 15
  };
  
  console.log('Datos del cliente:');
  console.log(JSON.stringify(cliente, null, 2));
  console.log('');

  console.log('Llamando a: POST /api/prov-clientes/cargar');
  console.log('Host:', HOST_QA);
  console.log('');

  const result = await postRequest('/api/prov-clientes/cargar', cliente);
  console.log('Status:', result.status);
  console.log('Response:', JSON.stringify(result.data, null, 2));
  console.log('');

  if (!result.data.error) {
    console.log('✅ Cliente creado exitosamente!');
    console.log('   Mensaje:', result.data.mensaje);
  } else {
    console.log('❌ Error:', result.data.mensaje);
  }
}

main().catch(console.error);