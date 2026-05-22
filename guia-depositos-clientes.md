# 📋 Registro de Depósitos de Clientes — Guía para Desarrolladores

## 🇪🇸 Español / 🇨🇳 中文

---

## 1. ¿Qué necesitamos?

Llevar un **control interno de los depósitos** que los clientes hacen al alquilar un power bank, y de los reembolsos cuando devuelven la batería.

**Flujo completo:**

```
Cliente alquila → Paga depósito en la app
                      ↓
              1. SE EMITE FACTURA  (API Facturación - ya funciona ✅)
              2. SE REGISTRA DEPÓSITO (API Anticipo - guía actual 📄)

Cliente devuelve → Se le reembolsa
                      ↓
              3. SE REGISTRA EGRESO/DEVOLUCIÓN (misma API)
```

---

## 2. Endpoint

| Ambiente | URL |
|----------|-----|
| **QA** | `POST https://qa.virtualuxor.com/api/anticipos/proveedores` |
| **Producción** | `POST https://virtualuxor.com/api/anticipos/proveedores` |

> ⚠️ **El nombre del endpoint dice "proveedores" pero lo usaremos para clientes.** T-Virtual registra el movimiento contable sin importar si el RIF es de cliente o proveedor.

---

## 3. Autenticación

```
Authorization: Bearer 3fC7a2rSBB8qTcY6b9jptUurfjly0LIFPfHcfxNPj3zrezTM
Content-Type: application/json
```

---

## 4. Payload

### Registrar depósito (cliente paga):

```json
{
  "numerodocumento": "DEP-001",
  "fechadocumento": "2026-05-13",
  "tipo_movimiento": "ND",
  "ctacontable_banco": "1112010",
  "rif_proveedor": "V15567644",
  "monto": 50.00,
  "tasa_cambio": 1,
  "clasificacion": "DepositosClientes",
  "concepto": "Depósito alquiler Power Bank - Orden 260513..."
}
```

### Registrar egreso/devolución (cliente devuelve):

```json
{
  "numerodocumento": "DEV-001",
  "fechadocumento": "2026-05-13",
  "tipo_movimiento": "ND",
  "ctacontable_banco": "1112010",
  "rif_proveedor": "V15567644",
  "monto": -50.00,
  "tasa_cambio": 1,
  "clasificacion": "DepositosClientes",
  "concepto": "Devolución depósito - Orden 260513..."
}
```

### Campos:

| Campo | Tipo | Descripción | Ejemplo |
|-------|------|-------------|---------|
| `numerodocumento` | String (10) | ID único del movimiento | `"DEP-001"` |
| `fechadocumento` | String | Fecha (YYYY-MM-DD) | `"2026-05-13"` |
| `tipo_movimiento` | String | `"ND"` = Nota de Débito | `"ND"` |
| `ctacontable_banco` | String | Cuenta contable del banco | `"1112010"` |
| `rif_proveedor` | String | **RIF/Cédula del cliente** | `"V15567644"` |
| `monto` | Number | Positivo = depósito, Negativo = devolución | `50.00` |
| `tasa_cambio` | Number | 1 si es Bs | `1` |
| `clasificacion` | String | Debe existir en T-Virtual | `"DepositosClientes"` |
| `concepto` | String | Descripción + ID de orden | `"Depósito - Orden 260513..."` |

---

## 5. ⚠️ Requisito Previo

La `clasificacion` debe estar **creada en T-Virtual** en:

> Bancos > Maestros > Clasificación de Pagos/Cobros

Solicitar crear `"DepositosClientes"` en QA y Producción.

---

## 6. Código (nueva función)

**Crear archivo:** `voltaje_v2_backend/src/services/deposito.service.ts`

```typescript
const API_URL = process.env.ANTICIPO_URL || 'https://qa.virtualuxor.com/api/anticipos/proveedores';
const TOKEN = process.env.TVIRTUAL_TOKEN;

interface DepositoData {
  numerodocumento: string;
  fechadocumento: string;
  rif_cliente: string;
  monto: number;
  orderId: string;
  esDeposito: boolean; // true = depósito, false = devolución
}

async function registrarDeposito(data: DepositoData) {
  const payload = {
    numerodocumento: data.numerodocumento,
    fechadocumento: data.fechadocumento,
    tipo_movimiento: "ND",
    ctacontable_banco: process.env.CUENTA_CONTABLE_BANCO || "1112010",
    rif_proveedor: data.rif_cliente,
    monto: data.esDeposito ? data.monto : -data.monto,
    tasa_cambio: 1,
    clasificacion: "DepositosClientes",
    concepto: `${data.esDeposito ? "Depósito" : "Devolución"} - Orden ${data.orderId}`
  };

  const res = await fetch(API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${TOKEN}`
    },
    body: JSON.stringify(payload)
  });

  return res.json();
}
```

---

## 7. Flujo Completo en Código

```
FUNCIÓN: procesarAlquiler(ordenId, clienteRif, monto)
  1. Crear factura en T-Virtual    →  API Facturación (YA EXISTE)
  2. Registrar depósito en T-Virtual →  API Anticipo (NUEVA)
  
FUNCIÓN: procesarDevolucion(ordenId, clienteRif, monto)
  1. Registrar devolución en T-Virtual →  API Anticipo (NUEVA, monto negativo)
```

---

## ✅ Checklist

- [ ] Solicitar crear clasificación `"DepositosClientes"` en T-Virtual QA
- [ ] Crear `deposito.service.ts` con la nueva función
- [ ] Llamar a la API después de cada factura exitosa
- [ ] Probar en QA
- [ ] Solicitar clasificación en Producción

---

> **¿Dudas?** Preguntar a Marco. 😁
