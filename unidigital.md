# DigitalInvoice - Facturación Digital

## Descripción General

REST API de Facturación Digital para Corporación Unidigital, Imprenta Digital en Venezuela autorizada por SENIAT. Permite a los desarrolladores interactuar con la creación, anulación, búsqueda y distribución de documentos fiscales.

## Información de Contacto

| Dato | Valor |
|------|-------|
| Empresa | Corporación Unidigital 1220 C.A |
| Web | https://www.unidigital.global |
| Soporte API | api@unidigital.global |
| URL API Producción | https://www.unidigital.global/digitalinvoice-core |
| URL API QA | https://qa.unidigital.global/digitalinvoice-core |
| Portal Producción | https://www.unidigital.global/digitalinvoice-portal |
| Portal QA | https://qa.unidigital.global/digitalinvoice-portal |

## Aspectos Técnicos

### ¿Por qué un REST API?
Ofrecer servicios de facturación digital a través de un REST API para conectar ERP, Sitios Web o Aplicaciones Móviles.

### Solicitud de acceso a Empresa SandBox
Enviar correo a api@unidigital.global indicando nombre, apellido, cédula y datos fiscales de la empresa.

## Códigos HTTP de Respuesta

| Código | Descripción |
|--------|-------------|
| 200 OK | Solicitud procesada correctamente |
| 400 Bad Request | Error en datos enviados o regla de negocio |
| 401 Unauthorized | Token no proporcionado o vencido |
| 402 Not Found | Entidad no encontrada |
| 429 Too Many Request | Solicitud anterior en proceso |
| 500 Internal Server Error | Error del servidor (notificar a Unidigital) |

**Estructura de error (400):**
```json
{
    "result": null,
    "errors": [
        {
            "code": "0000",
            "message": "Mensaje explicativo del error",
            "extra": null
        }
    ],
    "success": [],
    "information": [],
    "haserrors": true
}
```

## Entidades Principales

### Documento (Document)
Representa un documento fiscal (Factura, Nota de Crédito, Nota de Débito, Guía de Despacho, Comprobante de Retención).

Dos procesos de validación:
1. **Validación de Estructura**: Nombres del JSON y tipos de datos
2. **Validación de Reglas de Negocio**: Requisitos de LEY (correlativos, alícuotas, etc.)

### Ciclo o Lote (Batch)
Agrupa uno o muchos documentos.

**Estados del Ciclo:**
| Estatus | Valor | Descripción |
|---------|-------|-------------|
| Open | 1 | Abierto, puede agregar documentos |
| Closed | 2 | Cerrado, no puede recibir documentos |
| Approved | 3 | Aprobado, en espera de asignación de números de control |
| Assigned | 4 | Asignado, documentos con números de control |
| Canceled | 5 | Cancelado, documentos eliminados |

## Aspectos Generales

### Documentos fiscales soportados
Facturas, Notas de Crédito, Notas de Débito, Guías de Despacho, Comprobantes de Retención de IVA e ISLR.

### Números de documento
Cada tipo de documento tiene su propia numeración correlativa independiente.

### Números de Control
Entero generado por la Imprenta Digital, único e irrepetible. La asignación no es inmediata (1-5 min).

### Talonarios Digitales
Agrupan una cantidad de números de control. Asociados a una serie.

### Series de facturación
- **Serie 0 (cero)**: Por defecto para todas las empresas
- **Serie A**: Series adicionales (requieren aprobación legal)

## Endpoints

### POST Cancelar Ciclo
```
POST https://qa.unidigital.global/digitalinvoice-core/batch/cancel
Authorization: Bearer {token}
Body: { "Id": "...", "Errors": "" }
```

### GET Obtener Nros. de Control
```
GET https://qa.unidigital.global/digitalinvoice-core/batch/{strongId}/documents?number=1&size=10
Authorization: Bearer {token}
```

### POST Anular documento
```
POST https://qa.unidigital.global/digitalinvoice-core/documents/anulled
Authorization: Bearer {token}
Body: { "Control": 100 }
```

### GET Sucursales (Commercial Office)
```
GET https://qa.unidigital.global/digitalinvoice-core/commercialOffice
Authorization: Bearer {token}
Params: Name (opcional), State (opcional, -1 = todos)
```
