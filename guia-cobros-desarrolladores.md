# 📋 Integración de Cobros — Guía para Desarrolladores

## 🇪🇸 Español / 🇨🇳 中文

---

## 1. Regla de Negocio: Contado vs Crédito

| Tipo de factura | ¿Lleva cobros? | Ejemplo |
|----------------|----------------|---------|
| **Al Contado** | ✅ Sí, incluye `cobros[]` | Pago inmediato (parcial o total) |
| **A Crédito** | ❌ No incluye `cobros[]` | Factura sin pago en el momento |

El sistema detecta automáticamente:
- Si `cobros[]` tiene datos → **Contado**
- Si no hay `cobros[]` → **Crédito**

---

## 2. Estructura del Array `cobros`

Es un array que puede contener **uno o más métodos de pago** (pago mixto).

```json
"cobros": [
  {
    "moneda": "VES",
    "monto": 100.00,
    "tasa_cambio": 1,
    "cuenta_asociada": "1112001",
    "referencia": "ALQ-001"
  }
]
```

### Campos:

| Campo | Tipo | Descripción | Ejemplo |
|-------|------|-------------|---------|
| `moneda` | String | Código ISO de la moneda | `"VES"`, `"USD"`, `"EUR"` |
| `monto` | Number | Monto a cobrar en esa moneda | `100.00` |
| `tasa_cambio` | Number | Tasa de cambio usada | `1` (VES), `297.56` (USD) |
| `cuenta_asociada` | String | Código de cuenta contable | `"1112001"` |
| `referencia` | String | Número de referencia del pago | `"ALQ-19932878-2026"` |

---

## 3. Pago Mixto (múltiples monedas)

Se pueden enviar varios cobros en un mismo array:

```json
"cobros": [
  {
    "moneda": "USD",
    "monto": 50,
    "tasa_cambio": 297.56,
    "cuenta_asociada": "1111004",
    "referencia": "4124123"
  },
  {
    "moneda": "VES",
    "monto": 5543.35,
    "tasa_cambio": 1,
    "cuenta_asociada": "1111009",
    "referencia": "4124123"
  }
]
```

---

## 4. Dónde se hace el cambio en el código

### Archivo actual (donde funciona):

```
definitive-test-tvirtual.js:118-126
```

```javascript
cobros: [
  {
    moneda: "VES",
    monto: monto,
    tasa_cambio: 1,
    cuenta_asociada: "1112001",    // ← Cuenta contable correcta en QA
    referencia: `ALQ-${rifCliente}-${Date.now()}`
  }
]
```

### Integrar en el código principal:

En `voltaje_v2_backend/src/services/bajie.service.ts` (o donde se construye la factura), al armar el payload agrega el array `cobros`:

```typescript
const payload = {
  serie: "",
  moneda: "VES",
  tasa_cambio: 1,
  rif_cliente: cedulaCliente,
  observaciones: "ALQUILER POWER BANK",
  almacen: "VOLTAJE",                      // QA
  almacen: "ALMACEN DE EQUIPOS ALQUILADOS", // Producción
  vendedor: "V0000001",
  sucursalId: process.env.SUCURSAL_GUID || "",
  detalles: [
    {
      codigo: "DTN02901",     // QA
      // codigo: "DTA43337",  // Producción
      cantidad: 1,
      presentacion: 1,
      precio_unit: monto,
      lote: "",               // QA (usalote: 0)
      // lote: "LOTE001",     // Producción (usalote: 1)
      descuento_monto: 0,
      tasa_cambio: 1,
      rif_tercero: ""
    }
  ],
  cobros: [
    {
      moneda: "VES",
      monto: monto,
      tasa_cambio: 1,
      cuenta_asociada: "1112001",    // QA
      // cuenta_asociada: "1112001", // Producción (la misma)
      referencia: `ALQ-${cedulaCliente}-${new Date().getFullYear()}`
    }
  ]
};
```

---

## 5. Diferencias QA vs Producción

| Parámetro | QA (qa.tvirtual.net) | Producción (sav.tvirtual.net) |
|-----------|---------------------|------------------------------|
| `almacen` | `"VOLTAJE"` | `"ALMACEN DE EQUIPOS ALQUILADOS"` |
| `vendedor` | `"V0000001"` | `"V0000001"` |
| `cuenta_asociada` | `"1112001"` | `"1112001"` |
| `lote` | `""` (vacío) | `"LOTE001"` (obligatorio) |
| `codigo` (producto) | `"DTN02901"` | `"DTA43337"` |

---

## 6. Resumen

| Concepto | Explicación |
|----------|-------------|
| **Contado** | Factura CON cobros → pago inmediato |
| **Crédito** | Factura SIN cobros → pago futuro |
| **Pago mixto** | Múltiples objetos en `cobros[]` con distintas monedas |
| **Campo clave** | `cuenta_asociada` = cuenta contable configurada en T-Virtual |
| **Referencia** | Siempre incluir un número de referencia único |

---

## ✅ Checklist

- [ ] Agregar array `cobros[]` al payload de factura
- [ ] Usar `cuenta_asociada` correcta según QA o Producción
- [ ] Incluir `referencia` única por transacción
- [ ] Si es crédito, omitir `cobros[]` completamente
- [ ] Probar en QA antes de producción

---

> **¿Dudas?** Preguntar a Marco.
