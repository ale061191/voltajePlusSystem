# 📋 Integración Anticipo a Proveedores — Guía para Desarrolladores

## 🇪🇸 Español / 🇨🇳 中文

---

## 1. ¿Qué es?

Registrar pagos adelantados a proveedores en T-Virtual.

**Ejemplo:** Voltaje paga por adelantado a un aliado comercial o proveedor de power banks.

---

## 2. Endpoint

| Ambiente | URL |
|----------|-----|
| **QA** | `POST https://qa.virtualuxor.com/api/anticipos/proveedores` |
| **Producción** | `POST https://virtualuxor.com/api/anticipos/proveedores` |

**⚠️ Este es un servidor diferente** (`virtualuxor.com`, no `tvirtual.net`).

---

## 3. Autenticación

**Mismo token** que facturación:

```
Authorization: Bearer 3fC7a2rSBB8qTcY6b9jptUurfjly0LIFPfHcfxNPj3zrezTM
Content-Type: application/json
```

---

## 4. Payload

```json
{
  "numerodocumento": "000055",
  "fechadocumento": "2025-11-19",
  "tipo_movimiento": "ND",
  "ctacontable_banco": "1112010",
  "rif_proveedor": "J401210031",
  "monto": 12480.26,
  "tasa_cambio": 1,
  "clasificacion": "Administracion",
  "concepto": "Prueba Anticipo a Proveedor"
}
```

### Campos:

| Campo | Tipo | Descripción | Ejemplo |
|-------|------|-------------|---------|
| `numerodocumento` | String (10) | Número del anticipo | `"000055"` |
| `fechadocumento` | String | Fecha (YYYY-MM-DD) | `"2025-11-19"` |
| `tipo_movimiento` | String (2) | `"ND"` = Nota de Débito | `"ND"` |
| `ctacontable_banco` | String | Cuenta contable del banco/caja | `"1112010"` |
| `rif_proveedor` | String | RIF del proveedor | `"J401210031"` |
| `monto` | Number | Monto total del anticipo | `12480.26` |
| `tasa_cambio` | Number | 1 si es Bs, tasa si es USD | `1` |
| `clasificacion` | String | **Debe existir en T-Virtual** | `"Administracion"` |
| `concepto` | String (100) | Descripción de la operación | `"Anticipo a Proveedor"` |

---

## 5. ⚠️ Requisito Previo (IMPORTANTE)

La `clasificacion` debe estar **creada en T-Virtual** en:

> Bancos > Maestros > Clasificación de Pagos/Cobros

Si la clasificación no existe, la API fallará.

Una vez creada, avisar al equipo para actualizar la variable de entorno.

---

## 6. Dónde va el código

**Archivo nuevo o función nueva en el backend actual:**

```
voltaje_v2_backend/src/services/
  └── (nuevo) anticipo.service.ts
```

O puedes agregar una función en `index.ts`:

```typescript
async function registrarAnticipoProveedor(datos: {
  numerodocumento: string;
  fechadocumento: string;
  tipo_movimiento: string;
  ctacontable_banco: string;
  rif_proveedor: string;
  monto: number;
  tasa_cambio: number;
  clasificacion: string;
  concepto: string;
}) {
  const url = process.env.ANTICIPO_URL || 'https://qa.virtualuxor.com/api/anticipos/proveedores';
  
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${process.env.TVIRTUAL_TOKEN}`
    },
    body: JSON.stringify(datos)
  });

  return response.json();
}
```

---

## 7. Diferencias con Facturación

| Aspecto | Facturación | Anticipo Proveedores |
|---------|------------|---------------------|
| **Host** | `qa.tvirtual.net` | `qa.virtualuxor.com` |
| **Path** | `/api/facturacion-digital/cargar` | `/api/anticipos/proveedores` |
| **Token** | El mismo | El mismo |
| **Requiere clasificación previa** | ❌ No | ✅ Sí |

---

## ✅ Checklist

- [ ] Solicitar al equipo T-Virtual crear la `clasificacion` en QA
- [ ] Crear nueva función en el backend para este endpoint
- [ ] Probar en QA con clasificación existente
- [ ] Una vez funcione en QA, crear clasificación en Producción

---

> **¿Dudas?** Preguntar a Marco.
