# 🎯 Paso a Paso — Facturación T-Virtual (QA → Producción)

## ⚙️ Configuración General

| Parámetro | QA (pruebas) | Producción |
|-----------|-------------|------------|
| **Token** | `3fC7a2rSBB8qTcY6b9jptUurfjly0LIFPfHcfxNPj3zrezTM` | Mismo token |
| **Host API** | `qa.tvirtual.net` | `sav.tvirtual.net` |

---

## ✅ Paso 1: Crear Cliente (QA funciona, Producción BLOQUEADO)

**Endpoint:** `POST /api/prov-clientes/cargar`

```
Host: qa.tvirtual.net (QA) | sav.tvirtual.net (Prod)
Content-Type: application/json
Authorization: Bearer {token}
```

**Payload (funciona en QA):**

```json
{
  "indicacliente": 1,
  "inditipoente": "NR",
  "especial": 0,
  "indicedrif": "C",
  "cedrif": "87654321",
  "nombre": "CLIENTE NUEVO QA VOLTAJE",
  "email": "nuevoqa@voltaje.com",
  "telefono": "04121234567",
  "direccion": "Caracas, Venezuela",
  "diascredito": 0,
  "ivaidtarifadetalle": 15
}
```

**Resultado QA:** ✅ Cliente creado exitosamente
**Resultado Prod:** ❌ Error: `"No existe Cuenta por Cobrar créée en T-Virtual"`

### 🔑 Origen de los valores:

| Campo | ¿De dónde sale? | Valor |
|-------|----------------|-------|
| `indicacliente` | Manual Clientes (1=Cliente) | `1` |
| `inditipoente` | Manual Clientes (NR=Natural Residente) | `"NR"` |
| `indicedrif` | Manual Clientes (C=Cédula, R=RIF) | `"C"` |
| `cedrif` | Datos del usuario a registrar | Según cliente |
| `diascredito` | Manual Clientes (0=Sin crédito) | `0` |
| `ivaidtarifadetalle` | Manual Clientes (15=Ret. 75%) | `15` |

---

## ✅ Paso 2: Crear Factura (QA ✅ Funciona)

**Endpoint:** `POST /api/facturacion-digital/cargar`

**Payload de factura exitosa en QA (FA 00000092):**

```json
{
  "serie": "",
  "moneda": "VES",
  "tasa_cambio": 1,
  "rif_cliente": "87654321",
  "observaciones": "PRUEBA EXITOSA QA - POWER BANK DTN02901",
  "almacen": "VOLTAJE",
  "vendedor": "V0000001",
  "detalles": [
    {
      "codigo": "DTN02901",
      "cantidad": 1,
      "presentacion": 1,
      "precio_unit": 10.00,
      "lote": "",
      "descuento_monto": 0,
      "tasa_cambio": 1,
      "rif_tercero": ""
    }
  ],
  "cobros": [
    {
      "moneda": "VES",
      "monto": 10.00,
      "tasa_cambio": 1,
      "cuenta_asociada": "1112001",
      "referencia": "QA-EXITO-2"
    }
  ]
}
```

### 🔑 ¿De dónde sale cada valor?

| Campo | ¿Dónde lo encontré? | Valor en QA | Para producción... |
|-------|---------------------|-------------|-------------------|
| **`almacen`** | Panel T-Virtual → `Asignación de Almacén` → usuario MARCO JAIMES → Almacén: **VOLTAJE** | `"VOLTAJE"` | Preguntar a T-Virtual cuál existe |
| **`vendedor`** | Del Manual de Facturación (ejemplo `V16098733`) + prueba y error hasta encontrar `V0000001` que funciona | `"V0000001"` | Preguntar a T-Virtual cuál existe |
| **`rif_cliente`** | Creado en Paso 1 | `"87654321"` | Cliente registrado en producción |
| **`codigo` (detalles)** | Consulta: `POST /api/productos/buscar` → lista 44 productos | `"DTN02901"` | En prod es `"DTA43337"` (usalote:1) |
| **`cuenta_asociada` (cobros)** | Prueba y error usando valores del Manual (`1111009`, `1111004`) hasta encontrar `1112001` que funciona | `"1112001"` | Preguntar a T-Virtual cuál existe |
| **`lote`** | En QA es opcional (`usalote:0`). En prod es OBLIGATORIO (`usalote:1`) | `""` | En prod debe ser `"LOTE001"` |

---

## 🔬 API de Productos (Descubrimiento clave)

**Endpoint:** `POST /api/productos/buscar`

```
Content-Type: application/json
Authorization: Bearer {token}
Body: { "codigo": "DTA43337" }
```

**Respuesta en producción (sav.tvirtual.net):**

```json
{
  "productos": [{
    "codigo": "DTA43337",
    "articulo": "ZBJ SP12 SP ",
    "categoria": "SERVICIOS DE ALQUILER DE POWER BANK",
    "usalote": "1",
    "existencia": { "ALMACEN DE EQUIPOS ALQUILADOS": { "detal": 0, "mayor": 0 } }
  }]
}
```

**Respuesta en QA (qa.tvirtual.net):**

```json
{
  "productos": [{
    "codigo": "DTA43337",
    "articulo": "ALQUILER DE POWER BANK",
    "categoria": "",
    "usalote": "0",
    "existencia": {}
  }]
}
```

### ⚠️ Diferencia CRUCIAL

| Producto | QA (`usalote`) | Producción (`usalote`) |
|----------|---------------|------------------------|
| DTA43337 | **0** (lote opcional) | **1** (lote OBLIGATORIO) |
| DTN02901 | **0** (lote opcional) | No existe en prod |
| DTA43363 | **0** (lote opcional) | No verificado |
| Otros DTA* | **0** (lote opcional) | No verificado |

---

## 📊 Facturas Emitidas Exitosamente

### En QA (Mayo 12, 2026)

| # | Factura | Producto | Monto | URL |
|---|---------|----------|-------|-----|
| 1 | FA 00000091 | DTA43363 | 5.00 VES | [Ver](https://qa.unidigital.global/digitalinvoice-core/documents/view/2305acf9-f38f-42d9-b4f1-f82a90ba5312) |
| 2 | FA 00000092 | DTN02901 | 10.00 VES | [Ver](https://qa.unidigital.global/digitalinvoice-core/documents/view/d647e9e7-9120-4ca8-a100-1460f650479d) |
| 3 | FA 00000093 | DTA43337 | 7.50 VES | [Ver](https://qa.unidigital.global/digitalinvoice-core/documents/view/a36c08cf-d5d6-4cbd-b7de-1987c19c2029) |

### En Producción (Mayo 7, 2026)

| # | Factura | Producto | Lote |
|---|---------|----------|------|
| 1-6 | FA 00000001 a FA 00000006 | DTA43337 | LOTE001 |

---

## 🚧 Lo que debes pedir a T-Virtual/Imprenta Digital

Para que funcione en **producción**, necesitas que configuren:

### 🔴 URGENTE — Bloquea todo

1. **Cuenta por Cobrar** — Sin esto no se pueden crear clientes vía API
2. **Almacén** — Confirmar cuál existe (en QA es "VOLTAJE")
3. **Vendedor** — Confirmar cuál existe (en QA es "V0000001")
4. **Cuenta contable** — Confirmar cuál existe (en QA es "1112001")

### 🟡 IMPORTANTE — Para escalar

5. **Cambiar DTA43337 a `usalote: 0`** — Para no tener que enviar lote siempre
6. **Registrar más máquinas** — DTN02901 y otras que se necesiten

### 🟢 Lo que YA funciona

- ✅ Token: `3fC7a2rSBB8qTcY6b9jptUurfjly0LIFPfHcfxNPj3zrezTM` (el mismo para QA y Prod)
- ✅ API Productos: `POST /api/productos/buscar`
- ✅ API Clientes: `POST /api/prov-clientes/cargar`
- ✅ API Facturas: `POST /api/facturacion-digital/cargar`

---

## 🧪 Script de Prueba para Producción

Cuando T-Virtual configure todo, ejecuta esto para probar:

```javascript
const https = require('https');

const data = JSON.stringify({
  serie: "",
  moneda: "VES",
  tasa_cambio: 1,
  rif_cliente: "15567644",
  observaciones: "PRUEBA PRODUCCION - POWER BANK DTA43337",
  almacen: "ALMACEN DE EQUIPOS ALQUILADOS", // cambiar si necesario
  vendedor: "V0000001",                      // cambiar si necesario
  detalles: [{
    codigo: "DTA43337",
    cantidad: 1,
    presentacion: 1,
    precio_unit: 10.00,
    lote: "LOTE001",                         // OBLIGATORIO en prod
    descuento_monto: 0,
    tasa_cambio: 1,
    rif_tercero: ""
  }],
  cobros: [{
    moneda: "VES",
    monto: 10.00,
    tasa_cambio: 1,
    cuenta_asociada: "1112001",              // cambiar si necesario
    referencia: "PROD-TEST-001"
  }]
});

const options = {
  hostname: 'sav.tvirtual.net',
  port: 443,
  path: '/api/facturacion-digital/cargar',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': 'Bearer 3fC7a2rSBB8qTcY6b9jptUurfjly0LIFPfHcfxNPj3zrezTM',
    'Content-Length': Buffer.byteLength(data)
  }
};

const req = https.request(options, (res) => {
  let body = '';
  res.on('data', chunk => body += chunk);
  res.on('end', () => console.log(JSON.stringify(JSON.parse(body), null, 2)));
});
req.on('error', console.error);
req.write(data);
req.end();
```

---

> **📅 Fecha:** Mayo 2026  
> **⚡ Estado:** QA funcional — Pendiente configuración T-Virtual en producción  
> **⚠️ NO emitir facturas en producción sin autorización expresa del usuario**
