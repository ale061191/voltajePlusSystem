# Avance App — 2026-05-25

## Anticipo de Clientes — Prueba en Producción Exitosa

### Prueba en PROD (sav.tvirtual.net)

Endpoint: `POST https://sav.tvirtual.net/api/cxc/registrar-anticipos`

Payload probado:
```json
{
  "cliente": "19932878",
  "cuenta_contable": "1112001",
  "monto": 50.00,
  "numero": "1234",
  "fecha": "2026-05-25",
  "clasificacion": "Anticipo de Clientes",
  "concepto": "Recarga de saldo wallet - Power Bank",
  "tasa": 1
}
```

Resultado: `"Este anticipo se encuentra dentro de un mes ya conciliado"` — la API validó correctamente todos los campos y solo rechazó por período cerrado.

### Correcciones vs. lo que asumíamos inicialmente

| Aspecto | Suposición inicial | Realidad (confirmado en panel PROD) |
|---------|--------------------|--------------------------------------|
| Clasificación | `"Anticipo de Clientes"` | `"Anticipo de Clientes"` ✅ |
| Cuenta contable PROD | `1111004` (Banco Provincial) | `1112001` (BNC, única cuenta activa) |
| Cuenta contable QA | `1111004` | `1112001` (Banco Mercantil) |

### Diferencias QA vs PROD

| Aspecto | QA | PROD |
|---------|----|------|
| Host | qa.tvirtual.net | sav.tvirtual.net |
| Clasificación | `"anticipo de clientes"` (minúsculas) | `"Anticipo de Clientes"` (mayúsculas) |
| Cuenta banco | `1112001` (Mercantil) | `1112001` (BNC) |
| Estado API | Rota (SQL error `$9,)` desde hoy) | ✅ Funcional |
| Períodos 2026 | Cerrados | Cerrados |

### Estado de las validaciones en PROD
- Token `3fC7a2r...` ✅
- Clasificación `"Anticipo de Clientes"` ✅
- Cuenta `1112001` como banco ✅
- Período mayo 2026 ❌ (conciliado)

### Observaciones
- La API de QA se rompió entre el 24 y 25 de mayo (probablemente un deploy con bug). El mismo payload que ayer respondía `"mes ya conciliado"` ahora da un SQL error (`$9,)`). Reportar a Unidigital.
- Esto no afecta a PROD — los servidores son independientes.
- Los desarrolladores chinos deben usar `"Anticipo de Clientes"` (con mayúsculas) para PROD.
- La cuenta `1111004` (Banco Provincial) no está configurada en PROD; la única cuenta bancaria activa es `1112001` (BNC).

### Incidente QA — API rota (25/05)
- El endpoint `POST /api/cxc/registrar-anticipos` en QA empezó a devolver SQL error (`$9,)` — coma colgante por `idclasificacion` no resuelto)
- El mismo payload que el 24/05 funcionaba (`"mes ya conciliado"`) ahora falla con error de sintaxis SQL
- Afecta cualquier payload, independientemente de `clasificacion`, `numero` o fecha
- Causa probable: deploy o cambio en backend de QA por parte de Unidigital
- Reportado al equipo para que lo escalen a Unidigital

### Factura en PROD emitida por desarrollador chino
- Se emitió factura **#00000040** en `sav.tvirtual.net` para cliente `J445687996`
- URL: `https://www.unidigital.global/digitalinvoice-core/documents/view/b0f1401d-049a-4b1c-bb66-55a69372094b`
- El PDF es accesible con el token Bearer y contiene todos los datos fiscales
- BNC solicitó el payload + respuesta para verificar el cobro

### Archivos creados hoy
- `integracion_tvirtual_chinos/GUIA_ANTICIPO_PRODUCCION.md` — guía completa para implementar Anticipo en PROD (endpoint, token, clasificación, cuenta, payload, env vars)
- `integracion_tvirtual_chinos/EXPLICACION_ANTICIPO.md` — explicación del negocio en español y chino para desarrolladores
- `avanceApp-2026-05-25.md` — este archivo

### Archivos actualizados
- `integracion_tvirtual_chinos/tvirtual_anticipo.js` — token, clasificación y cuentas corregidos
- `integracion_tvirtual_chinos/README_INTEGRACION.md` — payloads, env vars y notas actualizados
- `integracion_tvirtual_chinos/GUIA_RAPIDA.txt` — env vars y token corregidos
