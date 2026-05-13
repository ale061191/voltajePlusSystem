# 🔐 Referencia de Credenciales — Unidigital / T-Virtual

> ⚠️ **No incluir en commits.** Las claves reales van en `.env` o en un gestor de contraseñas.

---

## Variables de Entorno (`.env`)

```env
# ============================================================
# T-VIRTUAL (QA y Producción usan el mismo token)
# ============================================================
TVIRTUAL_TOKEN=3fC7a2rSBB8qTcY6b9jptUurfjly0LIFPfHcfxNPj3zrezTM

# QA
TVIRTUAL_URL_QA=https://qa.tvirtual.net/api/facturacion-digital/cargar
TVIRTUAL_CLIENTES_QA=https://qa.tvirtual.net/api/prov-clientes/cargar
TVIRTUAL_PRODUCTOS_QA=https://qa.tvirtual.net/api/productos/buscar

# Producción
TVIRTUAL_URL_PROD=https://sav.tvirtual.net/api/facturacion-digital/cargar
TVIRTUAL_CLIENTES_PROD=https://sav.tvirtual.net/api/prov-clientes/cargar
TVIRTUAL_PRODUCTOS_PROD=https://sav.tvirtual.net/api/productos/buscar

# Almacén y vendedor
TVIRTUAL_ALMACEN_QA=VOLTAJE
TVIRTUAL_ALMACEN_PROD=ALMACEN DE EQUIPOS ALQUILADOS
TVIRTUAL_VENDEDOR=V0000001
TVIRTUAL_CUENTA_CONTABLE=1112001

# Productos
TVIRTUAL_PRODUCTO_QA=DTN02901
TVIRTUAL_PRODUCTO_PROD=DTA43337

# Lote (obligatorio en producción)
TVIRTUAL_LOTE_PROD=LOTE001

# Empresa
TVIRTUAL_RIF_EMPRESA=J409823334

# ============================================================
# UNIDIGITAL (Portal)
# ============================================================
UNIDIGITAL_COMPANY_STRONGID=1f30e59f-8e35-4436-897a-e05219ed5cc8
UNIDIGITAL_PORTAL_QA=https://qa.unidigital.global/digitalinvoice-portal
UNIDIGITAL_API_QA=https://qa.unidigital.global/digitalinvoice-core
UNIDIGITAL_API_PORTAL_QA=https://qa.unidigital.global/digitalinvoice-api-portal

# Sucursal
UNIDIGITAL_SUCURSAL_GUID=a46c4d07-3792-4711-aac0-8fbab1c3b50d
UNIDIGITAL_SUCURSAL_NOMBRE=Municipio Sucre

# Usuario portal
UNIDIGITAL_PORTAL_USER=joeliscarolina86@gmail.com
```

---

## Endpoints Útiles

### T-Virtual

| Endpoint | URL | Autenticación |
|----------|-----|---------------|
| Crear factura (QA) | `POST https://qa.tvirtual.net/api/facturacion-digital/cargar` | Bearer token |
| Crear factura (Prod) | `POST https://sav.tvirtual.net/api/facturacion-digital/cargar` | Bearer token |
| Crear cliente | `POST https://qa.tvirtual.net/api/prov-clientes/cargar` | Bearer token |
| Buscar productos | `POST https://sav.tvirtual.net/api/productos/buscar` | Bearer token |

### Unidigital

| Endpoint | URL | Autenticación |
|----------|-----|---------------|
| Listar sucursales | `GET https://qa.unidigital.global/digitalinvoice-core/commercialOffice` | Bearer token + X-Company-StrongId |
| Portal web | `https://qa.unidigital.global/digitalinvoice-portal` | Login de usuario |
| API Portal | `https://qa.unidigital.global/digitalinvoice-api-portal` | Bearer token JWT |

---

## Payload de Factura con Sucursal

El campo correcto es **`SucursalStrongId`** (no `sucursalId`):

```json
{
    "serie": "",
    "moneda": "VES",
    "tasa_cambio": 1,
    "rif_cliente": "87654321",
    "observaciones": "ALQUILER POWER BANK",
    "almacen": "VOLTAJE",
    "vendedor": "V0000001",
    "SucursalStrongId": "a46c4d07-3792-4711-aac0-8fbab1c3b50d",
    "detalles": [...],
    "cobros": [...]
}
```

---

## Notas

- **El mismo token** (`3fC7...`) funciona en QA y Producción de T-Virtual
- **Para Unidigital** se necesita un token diferente (JWT de sesión del portal)
- La sucursal está creada en QA con GUID `a46c4d07-3792-4711-aac0-8fbab1c3b50d` y nombre "Municipio Sucre"
- **El campo correcto es `SucursalStrongId`** (confirmado por Unidigital)
- ⚠️ Unidigital preguntó "cuando dices API de T-Virtual a qué te refieres?" — puede que el campo vaya en su API directamente
