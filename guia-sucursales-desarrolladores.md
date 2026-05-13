# 📋 Integración de Sucursales — Guía para Desarrolladores

## 🇪🇸 Español / 🇨🇳 中文

---

## 1. ¿Qué hay que hacer?

Agregar un campo **`sucursalId`** (GUID) en el JSON que enviamos a T-Virtual al crear una factura.

---

## 2. Dónde se hace el cambio

**Archivo principal:**
```
voltaje_v2_backend/src/services/bajie.service.ts
```
(o donde se construye el payload de T-Virtual)

**Buscar esta función** donde se arma el JSON de la factura y agregar el campo.

---

## 3. Cómo queda el payload (antes vs después)

### ANTES (sin sucursal):

```json
{
  "serie": "",
  "moneda": "VES",
  "tasa_cambio": 1,
  "rif_cliente": "87654321",
  "observaciones": "ALQUILER POWER BANK",
  "almacen": "VOLTAJE",
  "vendedor": "V0000001",
  "detalles": [...],
  "cobros": [...]
}
```

### DESPUÉS (con sucursal):

```json
{
  "serie": "",
  "moneda": "VES",
  "tasa_cambio": 1,
  "rif_cliente": "87654321",
  "observaciones": "ALQUILER POWER BANK",
  "almacen": "VOLTAJE",
  "vendedor": "V0000001",
  "sucursalId": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
  "detalles": [...],
  "cobros": [...]
}
```

---

## 4. ¿De dónde sale el GUID?

Todavía no lo tenemos. Unidigital va a darnos el rol en su portal para crear sucursales y obtener el GUID.

**Una vez creada la sucursal, el GUID se guarda en:**

- Opción A: Variable de entorno (`.env`)
- Opción B: Firebase / Firestore (configuración global)
- Opción C: Hardcodeado temporalmente hasta que tengamos el portal listo

---

## 5. Código de ejemplo (TypeScript)

```typescript
// En la función que construye el payload de T-Virtual
const payload = {
  serie: "",
  moneda: "VES",
  tasa_cambio: 1,
  rif_cliente: cedulaCliente,
  observaciones: `ALQUILER POWER BANK - ${maquinaId}`,
  almacen: "VOLTAJE",
  vendedor: "V0000001",
  sucursalId: process.env.SUCURSAL_GUID || "",  // ← NUEVO CAMPO
  detalles: [...],
  cobros: [...]
};
```

---

## 6. Resumen

| Item | Detalle |
|------|---------|
| **Campo nuevo** | `sucursalId` (string, GUID) |
| **Dónde va** | En el body del POST a `/api/facturacion-digital/cargar` |
| **Quién lo crea** | Unidigital da el rol, Voltaje crea sucursales en el portal |
| **Valor** | Se obtiene del portal de Unidigital (pendiente) |
| **API para listar** | `GET https://qa.unidigital.global/digitalinvoice-core/commercialOffice` (token distinto) |

---

## ✅ Checklist

- [ ] Agregar campo `sucursalId` al payload de factura
- [ ] Obtener GUID de la sucursal desde variable de entorno o config
- [ ] Probar en QA con el nuevo campo
- [ ] Validar que la factura muestre la sucursal correcta

---

> **¿Dudas?** Preguntar a Marco o al equipo de Unidigital.
