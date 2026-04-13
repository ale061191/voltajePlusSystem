const https = require('https');

const data = JSON.stringify({
  "serie": "",
  "moneda": "VES",
  "tasa_cambio": 1,
  "rif_cliente": "19932878", 
  "observaciones": "Prueba de App - Enviar a ezequielrodriguez1991@gmail.com",
  "almacen": "ALMACEN DE EQUIPOS ALQUILADOS",
  "vendedor": "V0000001",
  "detalles": [
    {
      "codigo": "DTN02901",
      "cantidad": 1,
      "presentacion": 1,
      "precio_unit": 100.00,
      "lote": "",
      "descuento_monto": 0,
      "tasa_cambio": 1,
      "rif_tercero": ""
    }
  ],
  "cobros": [
    {
      "moneda": "VES",
      "monto": 100.00,
      "tasa_cambio": 1,
      "cuenta_asociada": "1112001",
      "referencia": "TEST-APP-001"
    }
  ]
});

const options = {
  hostname: 'qa.tvirtual.net',
  port: 443,
  path: '/api/facturacion-digital/cargar',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': 'Bearer eOu9ZOcjtLXfxP19Fq3Ij+D8KidlVDOKWuywwnSc7nJ62zLV',
    'Content-Length': Buffer.byteLength(data)
  }
};

const req = https.request(options, (res) => {
  let body = '';
  console.log(`Status Code: ${res.statusCode}`);
  res.on('data', (chunk) => { body += chunk; });
  res.on('end', () => { 
      try {
          console.log(`Response: ${JSON.stringify(JSON.parse(body), null, 2)}`); 
      } catch(e) {
          console.log(`Response: ${body}`);
      }
  });
});

req.on('error', (e) => { console.error(`Error: ${e.message}`); });
req.write(data);
req.end();