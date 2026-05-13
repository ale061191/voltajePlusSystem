# T-Virtual Integration for Flutter App (Chinese Team)

## Overview

This document explains how to integrate T-Virtual ERP with a Flutter app to automatically:
1. Create users in Firebase
2. Create clients in T-Virtual
3. Generate digital invoices

---

## API Endpoints

### 1. Create Client in T-Virtual
**URL:** `POST https://qa.tvirtual.net/api/prov-clientes/cargar`

**Headers:**
```
Content-Type: application/json
Authorization: Bearer {TOKEN}
```

**Request Body:**
```json
{
  "indicacliente": 1,
  "inditipoente": "NN",
  "especial": 0,
  "indicedrif": "C",
  "cedrif": "12345678",
  "nombre": "Juan Perez",
  "email": "juan@email.com",
  "telefono": "04121234567",
  "direccion": "Caracas, Venezuela",
  "diascredito": 0,
  "ivaidtarifadetalle": 15
}
```

**Field Description:**
| Field | Type | Description |
|-------|------|-------------|
| indicacliente | Number | 1=Client, 2=Supplier, 3=Both |
| inditipoente | String | NR, NN, JD, JN |
| especial | Number | 0=Ordinary, 1=Special |
| indicedrif | String | C=ID, R=RIF, I=International |
| cedrif | String | ID number (without letters) |
| nombre | String | Client name |
| email | String | Email |
| telefono | String | Phone number |
| direccion | String | Address |
| diascredito | Number | Credit days (0) |
| ivaidtarifadetalle | Number | 15=75%, 16=100% |

**Response:**
```json
{
  "error": false,
  "mensaje": "El Registro se ha realizado de manera exitosa"
}
```

---

### 2. Generate Invoice in T-Virtual
**URL:** `POST https://qa.tvirtual.net/api/facturacion-digital/cargar`

**Headers:**
```
Content-Type: application/json
Authorization: Bearer {TOKEN}
```

**Request Body:**
```json
{
  "serie": "",
  "moneda": "VES",
  "tasa_cambio": 1,
  "rif_cliente": "12345678",
  "observaciones": "Alquiler Power Bank",
  "almacen": "ALMACEN DE EQUIPOS ALQUILADOS",
  "vendedor": "V0000001",
  "detalles": [
    {
      "codigo": "DTN02901",
      "cantidad": 1,
      "presentacion": 1,
      "precio_unit": 50.00,
      "lote": "",
      "descuento_monto": 0,
      "tasa_cambio": 1,
      "rif_tercero": ""
    }
  ],
  "cobros": [
    {
      "moneda": "VES",
      "monto": 50.00,
      "tasa_cambio": 1,
      "cuenta_asociada": "1112001",
      "referencia": "RENTAL-12345"
    }
  ]
}
```

**Field Description:**
| Field | Description |
|-------|-------------|
| rif_client | Customer ID (must exist in T-Virtual) |
| observaciones | Invoice description |
| almacen | Warehouse name |
| vendedor | Seller code |
| detalles | Products/services (codigo=service code) |
| cobros | Payment details (cuenta_asociada=bank account) |

**Response:**
```json
{
  "error": false,
  "mensaje": "Factura Emitida.",
  "numero": "00000046",
  "control": "00-00000041",
  "url": "https://qa.unidigital.global/digitalinvoice..."
}
```

---

## Complete Flow

### When user completes registration in app:

1. **App sends data to Firebase Cloud Function**
   - nombre, cedula, telefono, direccion, email

2. **Firebase Cloud Function executes:**
   - Save user in Firestore
   - Call T-Virtual API to create client
   - Return success to app

### When user makes a rental and returns battery:

1. **App calls generateInvoice Cloud Function**
   - Send: machineId, rentalMinutes, amount

2. **Firebase Cloud Function:**
   - Look up T-Virtual code for machine
   - Call T-Virtual API to create invoice
   - Return invoice URL to app

---

## Firebase Cloud Function Example (Node.js)

```javascript
const functions = require('firebase-functions');
const admin = require('firebase-admin');
const axios = require('axios');

admin.initializeApp();
const db = admin.firestore();

// ============================================================
// Create User + Register in T-Virtual
// ============================================================
exports.createUserAndTVirtualClient = functions.https.onCall(async (data, context) => {
  const { nombre, cedula, telefono, direccion, email } = data;

  if (!cedula) {
    throw new functions.https.HttpsError('invalid-argument', 'Cédula requerida');
  }

  // 1. Save user in Firebase
  const uid = `user_${cedula}`;
  await db.collection('users').doc(uid).set({
    uid,
    nombre,
    cedula,
    telefono,
    direccion,
    email,
    createdAt: admin.firestore.FieldValue.serverTimestamp()
  });

  // 2. Create client in T-Virtual
  const tvirtualUrl = 'https://qa.tvirtual.net/api/prov-clientes/cargar';
  const tvirtualToken = process.env.TVIRTUAL_API_TOKEN;

  const clientPayload = {
    indicacliente: 1,
    inditipoente: "NN",
    especial: 0,
    indicedrif: "C",
    cedrif: cedula,
    nombre: nombre,
    email: email,
    telefono: telefono,
    direccion: direccion || "Venezuela",
    diascredito: 0,
    ivaidtarifadetalle: 15
  };

  await axios.post(tvirtualUrl, clientPayload, {
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${tvirtualToken}`
    },
    timeout: 15000
  });

  return { success: true, uid };
});

// ============================================================
// Generate Invoice
// ============================================================
exports.generateInvoice = functions.https.onCall(async (data, context) => {
  const { cedula, machineId, amount, orderId } = data;

  const tvirtualUrl = 'https://qa.tvirtual.net/api/facturacion-digital/cargar';
  const tvirtualToken = process.env.TVIRTUAL_API_TOKEN;

  const invoicePayload = {
    serie: "",
    moneda: "VES",
    tasa_cambio: 1,
    rif_cliente: cedula,
    observaciones: `Alquiler Power Bank - ${machineId}`,
    almacen: "ALMACEN DE EQUIPOS ALQUILADOS",
    vendedor: "V0000001",
    detalles: [
      {
        codigo: "DTN02901",
        cantidad: 1,
        presentacion: 1,
        precio_unit: amount,
        lote: "",
        descuento_monto: 0,
        tasa_cambio: 1,
        rif_tercero: ""
      }
    ],
    cobros: [
      {
        moneda: "VES",
        monto: amount,
        tasa_cambio: 1,
        cuenta_asociada: "1112001",
        referencia: orderId || `RENTAL-${Date.now()}`
      }
    ]
  };

  const response = await axios.post(tvirtualUrl, invoicePayload, {
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${tvirtualToken}`
    },
    timeout: 30000
  });

  const result = response.data;
  return {
    success: !result.error,
    invoiceNumber: result.numero,
    controlNumber: result.control,
    invoiceUrl: result.url
  };
});
```

---

## Environment Variables (.env)

```
# T-Virtual Configuration
TVIRTUAL_API_URL=https://qa.tvirtual.net/api/facturacion-digital/cargar
TVIRTUAL_CLIENTE_API_URL=https://qa.tvirtual.net/api/prov-clientes/cargar
TVIRTUAL_API_TOKEN=your_token_here
TVIRTUAL_ALMACEN=ALMACEN DE EQUIPOS ALQUILADOS
TVIRTUAL_VENDEDOR=V0000001
TVIRTUAL_CUENTA_CONTABLE=1112001
TVIRTUAL_MONEDA=VES
```

---

## Testing

1. Use token: `eOu9ZOcjtLXfxP19Fq3Ij+D8KidlVDOKWuywwnSc7nJ62zLV`
2. Test URL: `https://qa.tvirtual.net/`
3. Both APIs work in QA environment

---

## Notes

- T-Virtual creates client automatically on first invoice if not exists
- Client must exist before generating invoice
- All amounts in VES (Bolívar)
- Service code: `DTN02901` (Power Bank Rental)

---

**For questions, contact the development team.**