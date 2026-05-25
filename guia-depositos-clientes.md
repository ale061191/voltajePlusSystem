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

## 2. Endpoint (CORREGIDO)

| Ambiente | URL |
|----------|-----|
| **QA** | `POST https://qa.tvirtual.net/api/cxc/registrar-anticipos` |
| **Producción** | `POST https://sav.tvirtual.net/api/cxc/registrar-anticipos` |

> ✅ El endpoint está en el **mismo dominio** que facturación (`tvirtual.net`), no en `virtualuxor.com`.

---

## 3. Autenticación

**Token QA:**
```
Authorization: Bearer eOu9ZOcjtLXfxP19Fq3Ij+D8KidlVDOKWuywwnSc7nJ62zLV
Content-Type: application/json
```

**Token Producción:**
```
Authorization: Bearer 3fC7a2rSBB8qTcY6b9jptUurfjly0LIFPfHcfxNPj3zrezTM
Content-Type: application/json
```

---

## 4. Payload

### Registrar anticipo (cliente recarga/paga depósito):

```json
{
  "cliente": "19932878",
  "cuenta_contable": "1111004",
  "monto": 50.00,
  "numero": "1234",
  "fecha": "2026-05-21",
  "clasificacion": "Anticipos Recibidos de los Clientes",
  "concepto": "Recarga de saldo wallet - Power Bank",
  "tasa": 1
}
```

### Campos:

| Campo | Tipo | Máx | Descripción | Ejemplo |
|-------|------|-----|-------------|---------|
| `cliente` | String | — | RIF/Cédula del cliente (solo números) | `"19932878"` |
| `cuenta_contable` | String | — | Cuenta de **banco/caja** en T-Virtual | `"1111004"` |
| `monto` | Number | 12 | Monto del anticipo | `50.00` |
| `numero` | String | 10 | Número de referencia (único) | `"1234"` |
| `fecha` | String | — | Fecha YYYY-MM-DD | `"2026-05-21"` |
| `clasificacion` | String | — | Debe existir en T-Virtual | `"Anticipos Recibidos de los Clientes"` |
| `concepto` | String | 100 | Descripción de la operación | `"Recarga de saldo wallet"` |
| `tasa` | Number | 12 | 1 = Bs, tasa BCV si es USD | `1` |

### ⚠️ Diferencia importante con facturación:
- **Facturación** usa `cuenta_asociada` de tipo **INGRESO** (ej: `1112001`)
- **Anticipo** usa `cuenta_contable` de tipo **BANCO/CAJA** (ej: `1111004`)

---

## 5. ⚠️ Requisito Previo

La clasificación **`"Anticipos Recibidos de los Clientes"`** debe existir en T-Virtual en:

> Bancos > Maestros > Clasificación de Flujo de Caja

Si no existe, solicitar a T-Virtual que la creen en QA y Producción.

---

## 6. Código (nueva función)

```typescript
const API_URL_QA = 'https://qa.tvirtual.net/api/cxc/registrar-anticipos';
const API_URL_PROD = 'https://sav.tvirtual.net/api/cxc/registrar-anticipos';
const TOKEN_QA = 'eOu9ZOcjtLXfxP19Fq3Ij+D8KidlVDOKWuywwnSc7nJ62zLV';
const TOKEN_PROD = process.env.TVIRTUAL_API_TOKEN;

interface AnticipoData {
  cliente: string;
  monto: number;
  referencia: string;
  fecha?: string;
  concepto: string;
  tasa?: number;
  env: 'qa' | 'prod';
}

async function registrarAnticipoCliente(data: AnticipoData) {
  const isProd = data.env === 'prod';
  const url = isProd ? API_URL_PROD : API_URL_QA;
  const token = isProd ? TOKEN_PROD : TOKEN_QA;

  const payload = {
    cliente: data.cliente,
    cuenta_contable: process.env.TVIRTUAL_CUENTA_BANCO || '1111004',
    monto: data.monto,
    numero: String(data.referencia).slice(0, 10),
    fecha: data.fecha || new Date().toISOString().split('T')[0],
    clasificacion: 'Anticipos Recibidos de los Clientes',
    concepto: String(data.concepto).slice(0, 100),
    tasa: data.tasa || 1
  };

  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify(payload)
  });

  return res.json();
}
```

---

## 7. Flujo Completo

```
FUNCIÓN: procesarAlquiler(ordenId, clienteRif, monto)
  1. Crear factura en T-Virtual   → POST /api/facturacion-digital/cargar
  2. Registrar anticipo           → POST /api/cxc/registrar-anticipos

FUNCIÓN: procesarDevolucion(ordenId, clienteRif, monto)
  1. Facturar si aplica
  2. Anticipo no se revierte (se descuenta del saldo a favor)
```

---

## ✅ Checklist

- [ ] Verificar que clasificación `"Anticipos Recibidos de los Clientes"` existe en T-Virtual
- [ ] Probar en QA con token `eOu9ZOcjtLXfxP19Fq3Ij+D8KidlVDOKWuywwnSc7nJ62zLV`
- [ ] Revisar que `cuenta_contable` sea de banco/caja (ej: `1111004`), NO de ingreso
- [ ] Una vez funcione en QA, probar en Producción

---

> **¿Dudas?** Preguntar a Marco. 😁
