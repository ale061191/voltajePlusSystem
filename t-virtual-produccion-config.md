# Configuración T-Virtual Producción — Estado Actualizado

## Resumen Ejecutivo

La integración de Voltaje con T-Virtual en **producción (sav.tvirtual.net)** fue probada exitosamente el **7 de Mayo 2026**. Se lograron emitir **6 facturas reales** en el sistema de producción. A continuación se documenta el estado completo de cada sección y lo que falta por configurar.

---

## Estado de las Secciones en Producción

| # | Sección | Estado | Valor en Producción | Notas |
|---|---------|--------|---------------------|-------|
| 1 | **Token API** | ✅ Funciona | `3fC7a2rSBB8qTcY6b9jptUurfjly0LIFPfHcfxNPj3zrezTM` | Permisos completos |
| 2 | **Almacén** | ✅ Existe | `ALMACEN DE EQUIPOS ALQUILADOS` | Mismo nombre que QA |
| 3 | **Vendedor** | ✅ Existe | `V0000001` | Mismo código que QA |
| 4 | **Producto DTA43337** | ✅ Existe | `DTA43337` | **Requiere campo `lote` no vacío** |
| 5 | **Cuenta Contable (Cobros)** | ✅ Existe | `1112001` | Para sección `cobros` de factura |
| 6 | **Cliente 15567644** | ✅ Existe | RIF `15567644` | Registrado y activo |
| 7 | **Facturación Digital** | ✅ Funciona | 6 facturas emitidas | FA 00000001 a FA 00000006 |
| 8 | **Cuenta por Cobrar (Clientes)** | ❌ No configurada | — | Bloquea creación de **nuevos** clientes |
| 9 | **Token QA** | ❌ Expirado | — | `qa.tvirtual.net` devuelve "Token inválido" |

---

## Facturas Emitidas Exitosamente en Producción

Se emitieron las siguientes facturas de prueba el 7 de Mayo de 2026:

| # | Número Factura | Número Control | Monto | Lote | Cobros |
|---|---------------|----------------|-------|------|--------|
| 1 | FA 00000001 | 00-00000001 | 50.00 VES | LOTE001 | Sin cobros |
| 2 | FA 00000002 | 00-00000002 | 50.00 VES | N/A | Sin cobros |
| 3 | FA 00000003 | 00-00000003 | 50.00 VES | 1 | Sin cobros |
| 4 | FA 00000004 | 00-00000004 | 50.00 VES | LOTE001 | Con cobros (1112001) + rif_tercero |
| 5 | FA 00000005 | 00-00000005 | 50.00 VES | LOTE001 | Con cobros (1112001) sin rif_tercero |
| 6 | FA 00000006 | 00-00000006 | 1.00 VES | LOTE001 | Con cobros (1112001) |

---

## Payload de Factura que Funciona en Producción

### Factura Completa (con cobros)

```json
{
  "serie": "",
  "moneda": "VES",
  "tasa_cambio": 1,
  "rif_cliente": "15567644",
  "observaciones": "ALQUILER POWER BANK - MAQUINA DTA43337",
  "almacen": "ALMACEN DE EQUIPOS ALQUILADOS",
  "vendedor": "V0000001",
  "detalles": [
    {
      "codigo": "DTA43337",
      "cantidad": 1,
      "presentacion": 1,
      "precio_unit": 50.00,
      "lote": "LOTE001",
      "descuento_monto": 0,
      "tasa_cambio": 1,
      "rif_tercero": "J409823334"
    }
  ],
  "cobros": [
    {
      "moneda": "VES",
      "monto": 50.00,
      "tasa_cambio": 1,
      "cuenta_asociada": "1112001",
      "referencia": "ALQ-15567644-2026"
    }
  ]
}
```

### Factura Mínima (sin cobros — también funciona)

```json
{
  "serie": "",
  "moneda": "VES",
  "tasa_cambio": 1,
  "rif_cliente": "15567644",
  "observaciones": "ALQUILER POWER BANK - MAQUINA DTA43337",
  "almacen": "ALMACEN DE EQUIPOS ALQUILADOS",
  "vendedor": "V0000001",
  "detalles": [
    {
      "codigo": "DTA43337",
      "cantidad": 1,
      "presentacion": 1,
      "precio_unit": 50.00,
      "lote": "LOTE001",
      "descuento_monto": 0,
      "tasa_cambio": 1,
      "rif_tercero": ""
    }
  ]
}
```

### curl para Probar

```bash
curl -X POST https://sav.tvirtual.net/api/facturacion-digital/cargar \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer 3fC7a2rSBB8qTcY6b9jptUurfjly0LIFPfHcfxNPj3zrezTM" \
  -d '{
    "serie": "",
    "moneda": "VES",
    "tasa_cambio": 1,
    "rif_cliente": "15567644",
    "observaciones": "ALQUILER POWER BANK - MAQUINA DTA43337",
    "almacen": "ALMACEN DE EQUIPOS ALQUILADOS",
    "vendedor": "V0000001",
    "detalles": [{
      "codigo": "DTA43337",
      "cantidad": 1,
      "presentacion": 1,
      "precio_unit": 50.00,
      "lote": "LOTE001",
      "descuento_monto": 0,
      "tasa_cambio": 1,
      "rif_tercero": "J409823334"
    }],
    "cobros": [{
      "moneda": "VES",
      "monto": 50.00,
      "tasa_cambio": 1,
      "cuenta_asociada": "1112001",
      "referencia": "ALQ-15567644-2026"
    }]
  }'
```

---

## Diferencia Clave: QA vs Producción

| Campo | QA (qa.tvirtual.net) | Producción (sav.tvirtual.net) |
|-------|---------------------|-------------------------------|
| **Token** | ~~eOu9ZOcjtLXfxP19Fq3Ij+...~~ (EXPIRADO) | `3fC7a2rSBB8qTcY6b9jptUurfjly0LIFPfHcfxNPj3zrezTM` |
| **URL Factura** | `https://qa.tvirtual.net/api/facturacion-digital/cargar` | `https://sav.tvirtual.net/api/facturacion-digital/cargar` |
| **URL Clientes** | `https://qa.tvirtual.net/api/prov-clientes/cargar` | `https://sav.tvirtual.net/api/prov-clientes/cargar` |
| **Almacén** | ALMACEN DE EQUIPOS ALQUILADOS | ✅ ALMACEN DE EQUIPOS ALQUILADOS |
| **Vendedor** | V0000001 | ✅ V0000001 |
| **Cuenta Contable** | 1112001 | ✅ 1112001 |
| **Campo `lote`** | Puede estar vacío `""` | ⚠️ **OBLIGATORIO** (no puede ser `""`) |
| **Crear clientes** | ✅ Funciona | ❌ Error: "No existe Cuenta por Cobrar" |
| **Facturar** | ✅ Funciona | ✅ **FUNCIONA** |

---

## Lo que Falta por Configurar

### 1. Cuenta por Cobrar para Creación de Clientes (ÚNICO BLOQUEANTE)

El endpoint `/api/prov-clientes/cargar` devuelve:

```json
{
  "error": true,
  "mensaje": "No existe Cuenta por Cobrar creada en T-Virtual."
}
```

**Esto NO es un problema del payload** — es una configuración interna del sistema T-Virtual que debe ser creada por el equipo de Imprenta Digital / T-Virtual directamente en el panel administrativo.

**Impacto:** No se pueden registrar clientes nuevos vía API. Mientras tanto, las facturas pueden emitirse para clientes que ya estén registrados (como RIF `15567644`).

**No existe endpoint API** para crear cuentas contables, almacenes ni vendedores. Todas estas son configuraciones del panel administrativo.

### 2. Registrar Más Productos/Máquinas

Actualmente solo se confirmó que **DTA43337** existe. Si se necesitan más máquinas (ej. DTN02901 y otras), deben ser registradas directamente en T-Virtual por el equipo de Imprenta Digital.

**Producto DTN02901:** ❌ No existe en producción (sí existía en QA).

---

## Datos de la Empresa (para referencia)

| Campo | Valor |
|-------|-------|
| RIF | J409823334 |
| Nombre | Voltaje Plus |
| Dirección | Caracas, Venezuela |
| Teléfono | 04121234567 |

---

## Cuentas Contables Verificadas

| Cuenta | Estado | Uso |
|--------|--------|-----|
| 1112001 | ✅ Existe | Para `cuenta_asociada` en sección `cobros` |
| 1111001 | ❌ No existe | — |
| 1111004 | ❌ No existe | — |
| 1111009 | ❌ No existe | — |
| 1120001 | ❌ No existe | — |

---

## Próximos Pasos

### ✅ Completado
1. ~~Verificar que el token de producción tenga permisos~~ → **FUNCIONA**
2. ~~Configurar almacén en producción~~ → **YA EXISTE** (`ALMACEN DE EQUIPOS ALQUILADOS`)
3. ~~Configurar vendedor en producción~~ → **YA EXISTE** (`V0000001`)
4. ~~Verificar cuenta contable para cobros~~ → **YA EXISTE** (`1112001`)
5. ~~Emitir factura de prueba~~ → **6 FACTURAS EMITIDAS EXITOSAMENTE**

### ⏳ Pendiente (requiere acción de T-Virtual / Imprenta Digital)
1. **Configurar Cuenta por Cobrar** en el sistema para habilitar la creación automática de clientes vía API
2. **Registrar producto DTN02901** (y otros códigos de máquinas) si se necesitan
3. **Solicitar nuevo token de QA** (el actual expiró)

### 📝 Ajustes al Código de Integración
1. **Agregar campo `lote` obligatorio** en producción (en QA podía ser vacío)
2. **Actualizar la URL base** de `qa.tvirtual.net` a `sav.tvirtual.net`
3. **Actualizar el token** en las variables de entorno
4. **Manejar el flujo de clientes**: verificar si el cliente existe antes de facturar, y si no existe, mostrar un error amigable hasta que se configure la Cuenta por Cobrar

---

## Solicitud para T-Virtual / Imprenta Digital

Para completar la integración en producción, necesitamos que el equipo de T-Virtual configure:

1. **URGENTE:** Crear una **Cuenta por Cobrar** en el sistema administrativo de producción. Sin ella, no podemos registrar clientes nuevos vía API. El endpoint `/api/prov-clientes/cargar` falla con: `"No existe Cuenta por Cobrar creada en T-Virtual."`

2. **OPCIONAL:** Registrar el producto/servicio **DTN02901** en producción (actualmente solo existe DTA43337).

> **NOTA:** Ya se confirmó que NO existen endpoints API para crear estas configuraciones. Los endpoints `/api/almacenes/cargar`, `/api/vendedores/cargar`, `/api/cuentas/cargar`, etc. devuelven 404. Estas configuraciones deben hacerse directamente en el panel administrativo de T-Virtual.

---

## Contacto

Si tienen preguntas sobre la integración, estamos disponibles para coordinar una llamada.

**Voltaje Plus**  
Mayo 2026