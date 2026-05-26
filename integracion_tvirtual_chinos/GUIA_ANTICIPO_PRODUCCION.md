# Anticipo de Clientes — Implementación en Producción
# 客户预付款 — 生产环境实施指南

---

## 1. Endpoint

```
POST https://sav.tvirtual.net/api/cxc/registrar-anticipos
```

## 2. Autenticación

```
Authorization: Bearer 3fC7a2rSBB8qTcY6b9jptUurfjly0LIFPfHcfxNPj3zrezTM
Content-Type: application/json
```

> ⚠️ Mismo token para QA y PRODUCCIÓN
> 测试环境和生产环境使用相同令牌

## 3. Payload (PRODUCCIÓN)

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

## 4. Campos

| Campo | Tipo | Max | Descripción | Producción |
|-------|------|-----|-------------|------------|
| `cliente` | String | - | RIF del cliente (solo números, sin letras) | Ej: `"19932878"` |
| `cuenta_contable` | String | - | Cuenta banco/caja en T-Virtual | **`"1112001"`** |
| `monto` | Number | 12 | Monto del anticipo | Ej: `50.00` |
| `numero` | String | **10 dígitos** | Referencia única del anticipo | Ej: `"1234"` |
| `fecha` | String | - | YYYY-MM-DD | `"2026-05-25"` |
| `clasificacion` | String | - | Debe existir en T-Virtual | **`"Anticipo de Clientes"`** |
| `concepto` | String | 100 | Descripción | Ej: `"Recarga de saldo wallet"` |
| `tasa` | Number | 12 | 1 = Bs, o tasa BCV para USD | `1` |

## 5. Valores específicos de PRODUCCIÓN

| Elemento | Valor |
|----------|-------|
| Cuenta contable (banco) | **`1112001`** — BANCO NACIONAL DE CRÉDITO (única cuenta activa) |
| Clasificación | **`"Anticipo de Clientes"`** — con mayúsculas iniciales |
| Token | `3fC7a2rSBB8qTcY6b9jptUurfjly0LIFPfHcfxNPj3zrezTM` |

## 6. Diferencias QA vs PRODUCCIÓN

| Aspecto | QA | PRODUCCIÓN |
|---------|----|------------|
| URL | `https://qa.tvirtual.net` | `https://sav.tvirtual.net` |
| Clasificación | `"anticipo de clientes"` (minúsculas) | `"Anticipo de Clientes"` (mayúsculas) |
| Cuenta banco | `1112001` | `1112001` |

## 7. Ejemplo de respuesta exitosa

```json
{
  "error": false,
  "mensaje": "Anticipo registrado exitosamente"
}
```

## 8. Variables de entorno (.env)

```env
TVIRTUAL_ANTICIPO_URL=https://sav.tvirtual.net/api/cxc/registrar-anticipos
TVIRTUAL_TOKEN=3fC7a2rSBB8qTcY6b9jptUurfjly0LIFPfHcfxNPj3zrezTM
TVIRTUAL_CUENTA_BANCO_PROD=1112001
TVIRTUAL_CLASIFICACION_ANTICIPO_PROD=Anticipo de Clientes
```

## 9. Notas importantes

- `numero` máximo **10 dígitos** — usar algo como `Date.now() % 10000000000` o un correlativo
- `cuenta_contable` debe ser cuenta de **BANCO/CAJA**, no de ingreso
- `clasificacion` debe coincidir EXACTAMENTE con lo configurado en T-Virtual (`"Anticipo de Clientes"`)
- Este endpoint **NO genera factura** — solo registra el anticipo como movimiento de banco/caja

---

> ✅ Probado en PRODUCCIÓN el 2026-05-25 — todas las validaciones pasaron correctamente.
