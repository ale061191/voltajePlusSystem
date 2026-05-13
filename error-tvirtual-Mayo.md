# Error de Integración T-Virtual - Mayo 2026

## Estado: 🟢 RESUELTO (PARCIAL)

**Actualización 7 Mayo 2026:** La mayoría de los errores fueron resueltos. La facturación en producción **FUNCIONA**. Se emitieron 6 facturas exitosas.

---

## Errores Originales vs Estado Actual

| # | Error Original | Estado Actual | Solución |
|---|---------------|---------------|----------|
| 1 | El almacén no existe en T-Virtual | ✅ **RESUELTO** | El almacén `ALMACEN DE EQUIPOS ALQUILADOS` **SÍ existe** en producción |
| 2 | El vendedor no existe en T-Virtual | ✅ **RESUELTO** | El vendedor `V0000001` **SÍ existe** en producción |
| 3 | No existe un cliente registrado | ⚠️ **PARCIAL** | El RIF `15567644` **SÍ existe**. No se pueden crear clientes nuevos |
| 4 | No existe Cuenta por Cobrar | ❌ **PENDIENTE** | Aún bloquea la creación de clientes nuevos vía API |

---

## Causa Raíz de los Errores Originales

Los errores reportados inicialmente se debían a:

1. **El campo `lote` era obligatorio** en producción (en QA podía ser vacío `""`). Al enviar `lote: ""`, la API daba errores confusos sobre otros campos.
2. **El formato del RIF del cliente** importa: `15567644` funciona, pero `V15567644` no.
3. **El producto DTN02901 no existe** en producción (sí existía en QA). El producto correcto en producción es **DTA43337**.

---

## Facturas Emitidas Exitosamente

| # | Número | Control | Observación |
|---|--------|---------|-------------|
| 1 | FA 00000001 | 00-00000001 | Sin cobros, lote LOTE001 |
| 2 | FA 00000002 | 00-00000002 | Sin cobros, lote N/A |
| 3 | FA 00000003 | 00-00000003 | Sin cobros, lote 1 |
| 4 | FA 00000004 | 00-00000004 | Con cobros completos + rif_tercero |
| 5 | FA 00000005 | 00-00000005 | Con cobros sin rif_tercero |
| 6 | FA 00000006 | 00-00000006 | Con cobros, monto 1.00 VES |

---

## Error Pendiente: Cuenta por Cobrar

Al intentar crear clientes nuevos en `/api/prov-clientes/cargar`:

```json
{
  "error": true,
  "mensaje": "No existe Cuenta por Cobrar creada en T-Virtual."
}
```

**Este error es una configuración del sistema**, no del payload. El equipo de T-Virtual / Imprenta Digital debe crear la Cuenta por Cobrar directamente en el panel administrativo.

**No existe endpoint API** para crear cuentas contables.

---

## Fecha

Mayo 2026

## Estado

**PARCIAL** — Facturación funciona ✅ | Creación de clientes bloqueada ❌