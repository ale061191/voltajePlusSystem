# Error de Integración T-Virtual - Mayo 2026

## Resumen Ejecutivo

La integración con T-Virtual para facturación electrónica presenta errores en el ambiente de **producción (sav.tvirtual.net)**, mientras que el ambiente de **QA (qa.tvirtual.net)** funciona correctamente.

---

## Errores Encontrados

### Ambiente de Producción (sav.tvirtual.net)

| # | Error | Campo Afectado |
|---|------|---------------|
| 1 | El almacen indicado (ALMACEN DE EQUIPOS ALQUILADOS). No existe en T-Virtual. | almacen |
| 2 | El vendedor indicado (V0000001). No existe en T-Virtual. | vendedor |
| 3 | No existe un cliente registrado y activo en T-Virtual con el RIF: V15567644 | rif_cliente |
| 4 | No existe Cuenta por Cobrar creada en T-Virtual. | cuenta_asociada |

### Variantes Probadas (sin éxito)

Se probaron múltiples variantes del nombre del almacén:

- "ALMACEN DE EQUIPOS ALQUILADOS" ❌
- "Almacén de alquiler" ❌
- "ALMACEN DE ALQUILER" ❌
- "Almacen" ❌
- "ALMACEN" ❌
- Y más variantes... ❌

---

## Comparación: QA vs Producción

| Campo | QA (qa.tvirtual.net) | Producción (sav.tvirtual.net) |
|-------|---------------------|------------------------------|
| **Token** | eOu9ZOcjtLXfxP19Fq3Ij+D8KidlVDOKWuywwnSc7nJ62zLV | 3fC7a2rSBB8qTcY6b9jptUurfjly0LIFPfHcfxNPj3zrezTM |
| **URL API** | https://qa.tvirtual.net/api/facturacion-digital/cargar | https://sav.tvirtual.net/api/facturacion-digital/cargar |
| **Almacén** | ALMACEN DE EQUIPOS ALQUILADOS | ❌ NO EXISTE |
| **Vendedor** | V0000001 | ❌ NO EXISTE |
| **Cliente 19932878** | Registrado | ❌ NO EXISTE |
| **Cuenta por Cobrar** | Configurada | ❌ NO EXISTE |
| **Estado** | ✅ FUNCIONA | ❌ ERROR |

---

## Ejemplo de Factura Exitosa (QA)

```json
{
  "serie": "",
  "moneda": "VES",
  "tasa_cambio": 1,
  "rif_cliente": "19932878",
  "observaciones": "ALQUILER POWER BANK - MAQUINA DTN02901",
  "almacen": "ALMACEN DE EQUIPOS ALQUILADOS",
  "vendedor": "V0000001",
  "detalles": [
    {
      "codigo": "DTN02901",
      "cantidad": 1,
      "presentacion": 1,
      "precio_unit": 50.00,
      "lote": "",
      "descuento_monto": 0,
      "tasa_cambio": 1,
      "rif_tercero": "J409823334"
    }
  ],
  "cobros": [
    {
      "moneda": "VES",
      "mont o": 50.00,
      "tasa_cambio": 1,
      "cuenta_asociada": "1112001",
      "referencia": "ALQ-19932878-2026"
    }
  ]
}
```

**Resultado QA:** ✅ Factura creada exitosamente (FA 00000076)

---

## Ejemplo de Error en Producción

```json
{
  "serie": "",
  "moneda": "VES",
  "tasa_cambio": 1,
  "rif_cliente": "15567644",
  "observaciones": "Factura de Prueba",
  "almacen": "Almacen",
  "vendedor": "V16098733",
  "detalles": [
    {
      "codigo": "DTA43337",
      "cantidad": 1,
      "presentacion": 1,
      "precio_unit": 4.31,
      "lote": "",
      "descuento_monto": 0,
      "tasa_cambio": 1,
      "rif_tercero": ""
    }
  ]
}
```

**Respuesta de Error:**
```json
{
  "error": true,
  "mensaje": "[Validacion]: No existe Cuenta por Cobrar creada en T-Virtual."
}
```

---

## Solución Requerida

Para que funcione en **producción (sav.tvirtual.net)**, el equipo de Imprenta Digital / T-Virtual debe configurar:

1. **Almacén** - Crear un almacén para facturar equipos en alquiler
2. **Vendedor** - Asignar un vendedor válido al perfil del cliente
3. **Cuenta por Cobrar** - Configurar cuentas contables para los cobros
4. **Registrar Clientes** - Permitir el registro automático de clientes o registrarlos manualmente

---

## Script de Prueba Utilizado

```javascript
// Archivo: flujo_completo.js
const axios = require('axios');

const config = {
    token: '3fC7a2rSBB8qTcY6b9jptUurfjly0LIFPfHcfxNPj3zrezTM',
    urlClientes: 'https://sav.tvirtual.net/api/prov-clientes/cargar',
    urlFactura: 'https://sav.tvirtual.net/api/facturacion-digital/cargar'
};

const cliente = {
    indicacliente: 1,
    inditipoente: "NR",
    especial: 0,
    indicedrif: "C",
    cedrif: "15567644",
    nombre: "Cliente Prueba Voltaje",
    email: "test@voltaje.com",
    telefono: "04121234567",
    direccion: "Caracas",
    diascredito: 0,
    ivaidtarifadetalle: 15
};
```

---

## Fecha

Mayo 2026

## Estado

**ABIERTO** - Esperando configuración por parte de T-Virtual / Imprenta Digital