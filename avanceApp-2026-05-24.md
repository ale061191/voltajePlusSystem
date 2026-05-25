# Avance App — 2026-05-24

## Anticipo de Clientes — Correcciones y Pruebas en QA

### Problemas encontrados y soluciones

| Aspecto | Antes (erróneo) | Ahora (correcto) |
|---------|-----------------|-------------------|
| Token QA | `eOu9ZOcjtLXfxP19Fq3Ij+D8KidlVDOKWuywwnSc7nJ62zLV` (expirado) | `3fC7a2rSBB8qTcY6b9jptUurfjly0LIFPfHcfxNPj3zrezTM` (mismo que PROD) |
| Clasificación | `"Anticipos Recibidos de los Clientes"` | `"anticipo de clientes"` (confirmado en panel T-Virtual) |
| Cuenta contable QA | `1111004` (no activa) | `1112001` (Banco Mercantil, funciona en QA) |
| Cuenta contable PROD | — | `1111004` (Banco Provincial) |

### Endpoint verificado
```
POST https://qa.tvirtual.net/api/cxc/registrar-anticipos
```

### Payload funcional (QA)
```json
{
  "cliente": "19932878",
  "cuenta_contable": "1112001",
  "monto": 50.00,
  "numero": "1234",
  "fecha": "2026-05-25",
  "clasificacion": "anticipo de clientes",
  "concepto": "Recarga de saldo wallet - Power Bank",
  "tasa": 1
}
```

### Estado de las validaciones
- Token ✅
- Clasificación `"anticipo de clientes"` ✅
- Cuenta `1112001` como banco ✅
- Períodos contables 2026 en QA ❌ (cerrados)
- Desarrollador chino confirmó implementación correcta del endpoint

### Archivos actualizados
- `integracion_tvirtual_chinos/tvirtual_anticipo.js` — token, clasificación y cuentas corregidos
- `integracion_tvirtual_chinos/README_INTEGRACION.md` — payloads, env vars y notas actualizados
- `integracion_tvirtual_chinos/GUIA_RAPIDA.txt` — env vars y token corregidos
