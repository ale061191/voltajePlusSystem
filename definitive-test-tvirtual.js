// ============================================================
// SCRIPT DEFINITIVO DE FACTURACIÓN - T-VIRTUAL PRODUCCIÓN
// ============================================================
// Este script es la referencia para emitir facturas en producción.
// Probado y verificado el 7 de Mayo 2026.
// Se emitieron 6 facturas exitosas (FA 00000001 a FA 00000006).
// ============================================================

const https = require('https');

// ============================================================
// CONFIGURACIÓN DE PRODUCCIÓN (VERIFICADA)
// ============================================================
const CONFIG = {
  HOST: 'sav.tvirtual.net',
  TOKEN: '3fC7a2rSBB8qTcY6b9jptUurfjly0LIFPfHcfxNPj3zrezTM',
  ALMACEN: 'ALMACEN DE EQUIPOS ALQUILADOS',
  VENDEDOR: 'V0000001',
  CUENTA_CONTABLE: '1112001',
  MONEDA: 'VES',
  CODIGO_PRODUCTO: 'DTA43337',  // ⚠️ DTN02901 NO existe en producción
  RIF_EMPRESA: 'J409823334',
  
  // URLs
  URL_FACTURA: '/api/facturacion-digital/cargar',
  URL_CLIENTES: '/api/prov-clientes/cargar',
};

// ============================================================
// FUNCIÓN POST GENÉRICA
// ============================================================
function post(path, data) {
  return new Promise((resolve, reject) => {
    const dataString = JSON.stringify(data);
    const options = {
      hostname: CONFIG.HOST,
      port: 443,
      path: path,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${CONFIG.TOKEN}`,
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

// ============================================================
// 1. CREAR CLIENTE EN T-VIRTUAL (⚠️ ACTUALMENTE BLOQUEADO)
// ============================================================
// ERROR: "No existe Cuenta por Cobrar creada en T-Virtual."
// Este error requiere configuración interna por parte de T-Virtual.
// No hay endpoint API para crear la Cuenta por Cobrar.
// ============================================================
async function crearCliente({ cedula, nombre, telefono, email, direccion }) {
  const payload = {
    indicacliente: 1,     // 1 = Cliente
    inditipoente: "NN",   // NN = Persona Natural
    especial: 0,          // 0 = Ordinario
    indicedrif: "C",      // C = Cédula
    cedrif: cedula,       // Solo números, sin la V
    nombre: nombre,
    email: email,
    telefono: telefono,
    direccion: direccion || "Venezuela",
    diascredito: 0,
    ivaidtarifadetalle: 15
  };

  const result = await post(CONFIG.URL_CLIENTES, payload);
  return result;
}

// ============================================================
// 2. GENERAR FACTURA EN T-VIRTUAL (✅ FUNCIONA)
// ============================================================
// IMPORTANTE: El campo "lote" es OBLIGATORIO en producción.
// En QA podía ser vacío "", pero en producción DEBE tener valor.
// ============================================================
async function generarFactura({ rifCliente, monto, observaciones, referencia, lote }) {
  const payload = {
    serie: "",
    moneda: CONFIG.MONEDA,
    tasa_cambio: 1,
    rif_cliente: rifCliente,  // Solo números, sin la V (ej: "15567644")
    observaciones: observaciones || `ALQUILER POWER BANK - MAQUINA ${CONFIG.CODIGO_PRODUCTO}`,
    almacen: CONFIG.ALMACEN,
    vendedor: CONFIG.VENDEDOR,
    detalles: [
      {
        codigo: CONFIG.CODIGO_PRODUCTO,
        cantidad: 1,
        presentacion: 1,
        precio_unit: monto,
        lote: lote || "LOTE001",  // ⚠️ OBLIGATORIO en producción
        descuento_monto: 0,
        tasa_cambio: 1,
        rif_tercero: CONFIG.RIF_EMPRESA
      }
    ],
    cobros: [
      {
        moneda: CONFIG.MONEDA,
        monto: monto,
        tasa_cambio: 1,
        cuenta_asociada: CONFIG.CUENTA_CONTABLE,
        referencia: referencia || `ALQ-${rifCliente}-${new Date().getFullYear()}`
      }
    ]
  };

  const result = await post(CONFIG.URL_FACTURA, payload);
  return result;
}

// ============================================================
// EJEMPLO DE USO
// ============================================================
async function ejemplo() {
  console.log('=== T-VIRTUAL PRODUCCIÓN - FACTURACIÓN ===\n');
  
  // Emitir factura para un cliente que ya existe
  console.log('Emitiendo factura para RIF 15567644...\n');
  
  const resultado = await generarFactura({
    rifCliente: '15567644',
    monto: 50.00,
    observaciones: 'ALQUILER POWER BANK - MAQUINA DTA43337',
    referencia: `ALQ-15567644-${Date.now()}`,
    lote: 'LOTE001'
  });

  console.log('Status:', resultado.status);
  console.log('Response:', JSON.stringify(resultado.data, null, 2));

  if (!resultado.data.error) {
    console.log('\n✅ FACTURA EMITIDA EXITOSAMENTE');
    console.log(`   Número: ${resultado.data.numero}`);
    console.log(`   Control: ${resultado.data.control}`);
    console.log(`   URL: ${resultado.data.url}`);
  } else {
    console.log('\n❌ ERROR:', resultado.data.mensaje);
  }
}

// ⚠️ DESCOMENTA PARA EJECUTAR (emite factura real en producción):
// ejemplo().catch(console.error);

module.exports = { CONFIG, crearCliente, generarFactura };
