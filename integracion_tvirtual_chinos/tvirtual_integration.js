// ============================================================
// INTEGRACIÓN T-VIRTUAL - CÓDIGO PARA CHINOS
// ============================================================
//
// Este archivo contiene los endpoints y funciones necesarias
// para integrar la app con T-Virtual ERP.
//
// Carpeta: integracion_tvirtual_chinos/
// Archivos:
//   - user_info_modal.dart (UI del modal)
//   - README.md (Documentación completa)
//   - api_integration.dart (Funciones de API)
//   - tvirtual_endpoints.js (Pruebas en Node.js)

// ============================================================
// DATOS DE CONFIGURACIÓN (QA)
// ============================================================
const TVIRTUAL_CONFIG = {
  // URLs de API
  API_URL_CLIENTE: 'https://qa.tvirtual.net/api/prov-clientes/cargar',
  API_URL_FACTURA: 'https://qa.tvirtual.net/api/facturacion-digital/cargar',
  
  // Token (QA)
  API_TOKEN: 'eOu9ZOcjtLXfxP19Fq3Ij+D8KidlVDOKWuywwnSc7nJ62zLV',
  
  // Configuración de factura
  ALMACEN: 'ALMACEN DE EQUIPOS ALQUILADOS',
  VENDEDOR: 'V0000001',
  CUENTA_CONTABLE: '1112001',
  MONEDA: 'VES',
  CODIGO_SERVICIO: 'DTN02901', // Alquiler Power Bank
};

// ============================================================
// 1. CREAR CLIENTE EN T-VIRTUAL
// ============================================================
async function crearClienteTVirtual({
  cedula,
  nombre,
  telefono,
  email,
  direccion
}) {
  const payload = {
    indicacliente: 1,    // 1 = Cliente
    inditipoente: "NN",  // NN = Persona Natural
    especial: 0,         // 0 = Ordinario
    indicedrif: "C",     // C = Cédula
    cedrif: cedula,
    nombre: nombre,
    email: email,
    telefono: telefono,
    direccion: direccion || "Venezuela",
    diascredito: 0,
    ivaidtarifadetalle: 15
  };

  const response = await fetch(TVIRTUAL_CONFIG.API_URL_CLIENTE, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${TVIRTUAL_CONFIG.API_TOKEN}`
    },
    body: JSON.stringify(payload)
  });

  const data = await response.json();
  return data;
}

// ============================================================
// 2. GENERAR FACTURA EN T-VIRTUAL
// ============================================================
async function generarFacturaTVirtual({
  cedulaCliente,
  monto,
  observaciones,
  referencia
}) {
  const payload = {
    serie: "",
    moneda: TVIRTUAL_CONFIG.MONEDA,
    tasa_cambio: 1,
    rif_cliente: cedulaCliente,
    observaciones: observaciones,
    almacen: TVIRTUAL_CONFIG.ALMACEN,
    vendedor: TVIRTUAL_CONFIG.VENDEDOR,
    detalles: [
      {
        codigo: TVIRTUAL_CONFIG.CODIGO_SERVICIO,
        cantidad: 1,
        presentacion: 1,
        precio_unit: monto,
        lote: "",
        descuento_monto: 0,
        tasa_cambio: 1,
        rif_tercero: ""
      }
    ],
    cobros: [
      {
        moneda: TVIRTUAL_CONFIG.MONEDA,
        monto: monto,
        tasa_cambio: 1,
        cuenta_asociada: TVIRTUAL_CONFIG.CUENTA_CONTABLE,
        referencia: referencia || `RENTAL-${Date.now()}`
      }
    ]
  };

  const response = await fetch(TVIRTUAL_CONFIG.API_URL_FACTURA, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${TVIRTUAL_CONFIG.API_TOKEN}`
    },
    body: JSON.stringify(payload)
  });

  const data = await response.json();
  return data;
}

// ============================================================
// EJEMPLO COMPLETO DE USO
// ============================================================
async function ejemploCompleto() {
  const usuario = {
    nombre: "Juan Pérez",
    cedula: "12345678",
    telefono: "04121234567",
    email: "juan@email.com",
    direccion: "Caracas, Venezuela"
  };

  console.log("1. Creando cliente en T-Virtual...");
  const clienteResult = await crearClienteTVirtual(usuario);
  console.log("Resultado cliente:", clienteResult);

  if (!clienteResult.error) {
    console.log("\n2. Generando factura...");
    const facturaResult = await generarFacturaTVirtual({
      cedulaCliente: usuario.cedula,
      monto: 50.00,
      observaciones: "Alquiler Power Bank - Prueba",
      referencia: "TEST-001"
    });
    console.log("Resultado factura:", facturaResult);
  }
}

// Descomenta para probar:
// ejemploCompleto();

// ============================================================
// EXPORT PARA NODE.JS
// ============================================================
module.exports = {
  TVIRTUAL_CONFIG,
  crearClienteTVirtual,
  generarFacturaTVirtual
};