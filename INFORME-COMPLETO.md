# Informe Completo — Voltaje Plus System

## Integración T-Virtual, BNC e Infraestructura

> **Fecha:** 21 de Mayo 2026
> **Propósito:** Documentar todo lo trabajado para continuar desde otro entorno

---

## Índice

1. [Resumen General](#1-resumen-general)
2. [T-Virtual / Unidigital — Facturación Digital](#2-t-virtual--unidigital--facturación-digital)
3. [BNC — Pagos Electrónicos](#3-bnc--pagos-electrónicos)
4. [Infraestructura de Servidores](#4-infraestructura-de-servidores)
5. [Anticipo a Proveedores / Depósitos Clientes](#5-anticipo-a-proveedores--depósitos-clientes)
6. [Setup del Proyecto Nuevo](#6-setup-del-proyecto-nuevo)
7. [Archivos Creados](#7-archivos-creados)

---

## 1. Resumen General

Se integró Voltaje Plus con **T-Virtual/Unidigital** para facturación digital de alquiler de powerbanks, funcionando en QA y documentado para producción. También se trabajó en la integración **BNC** (pagos) y se diagnosticaron problemas de infraestructura.

### Estado General

| Sistema | QA | Producción | Estado |
|---------|----|------------|--------|
| T-Virtual Facturación | ✅ Emitidas FA 91-94 | ✅ Emitidas 6 facturas reales | Documentado |
| T-Virtual Clientes | ✅ RIF 87654321 creado | ⚠️ Falta "Cuenta por Cobrar" | Bloqueado en prod |
| T-Virtual Productos | ✅ DTN02901 funciona | ✅ DTA43337 requiere lote:"LOTE001" | Documentado |
| BNC Pagos | ❌ No aplica | ⚠️ Error EPIRWK (WorkingKey) | Requiere cron job |
| BNC LogOn | ❌ No aplica | ⚠️ ClientGUID inválido (bb9de856) | Verificar GUID |
| Anticipo Proveedores | ❌ Token inválido | ❌ Token inválido | Esperando Unidigital |
| Servidores Voltaje | — | ❌ m.voltajevzla.com caído | Revisar AWS |

---

## 2. T-Virtual / Unidigital — Facturación Digital

### 2.1 Endpoints Documentados

| Endpoint | QA | Producción |
|----------|----|------------|
| Crear Factura | `POST https://qa.tvirtual.net/api/facturacion-digital/cargar` | `POST https://sav.tvirtual.net/api/facturacion-digital/cargar` |
| Crear Cliente | `POST https://qa.tvirtual.net/api/prov-clientes/cargar` | `POST https://sav.tvirtual.net/api/prov-clientes/cargar` |
| Buscar Productos | `POST https://qa.tvirtual.net/api/productos/buscar` | `POST https://sav.tvirtual.net/api/productos/buscar` |

### 2.2 Token

```
Bearer 3fC7a2rSBB8qTcY6b9jptUurfjly0LIFPfHcfxNPj3zrezTM
```

Funciona en **QA** (`qa.tvirtual.net`) y **Producción** (`sav.tvirtual.net`). NO funciona en `virtualuxor.com`.

### 2.3 Credenciales Clave

| Parámetro | Valor |
|-----------|-------|
| Clasificador | `VOLTAJE001` |
| Almacén QA | `VOLTAJE` |
| Almacén Producción | `ALMACEN DE EQUIPOS ALQUILADOS` |
| Producto QA | `DTN02901` (lote opcional) |
| Producto Producción | `DTA43337` (requiere `lote:"LOTE001"`) |
| Sucursal QA | `PRINCIPAL` |
| Sucursal Producción | `MATRIZ` |
| SucursalStrongId | `a46c4d07-3792-4711-aac0-8fbab1c3b50d` |
| Company StrongId | `1f30e59f-8e35-4436-897a-e05219ed5cc8` |
| Usuario Portal | `joeliscarolina86@gmail.com` |

### 2.4 Payload de Factura (Producción)

```json
{
  "Clasificador": "VOLTAJE001",
  "Almacen": "ALMACEN DE EQUIPOS ALQUILADOS",
  "Sucursal": "MATRIZ",
  "SucursalStrongId": "a46c4d07-3792-4711-aac0-8fbab1c3b50d",
  "CompanyStrongId": "1f30e59f-8e35-4436-897a-e05219ed5cc8",
  "Fecha": "2026-05-07 16:16:00",
  "FechaVencimiento": "2026-05-07",
  "TipoOperacion": "2",
  "RifCliente": "15567644",
  "RazonSocial": "CLIENTE DE PRUEBA PRODUCCION",
  "Email": "test@voltaje.com",
  "Direccion": "DIRECCION DE PRUEBA",
  "Telefono": "04121234567",
  "CodicionesPago": " Contado",
  "Observaciones": "FACTURACION ELECTRONICA DESDE EL SISTEMA DE GESTION",
  "Detalle": [
    {
      "IdProducto": "DTA43337",
      "NombreProducto": "ALQUILER DE POWER BANK",
      "Cantidad": 1,
      "Precio": 20,
      "Impuesto": 0,
      "lote": "LOTE001"
    }
  ],
  "cobros": [
    {
      "codigo": "EFE",
      "nombre": "Efectivo",
      "monto": 20
    }
  ]
}
```

### 2.5 Pendientes T-Virtual

1. Crear **"Cuenta por Cobrar"** en T-Virtual producción (necesario para registrar clientes nuevos vía API)
2. Deshabilitar envío de email duplicado desde Voltaje (Unidigital ya envía su propio email)
3. Token de QA expirado — solicitar renovación
4. Crear clasificación **"DepositosClientes"** en T-Virtual

### 2.6 Guías Creadas

| Archivo | Contenido |
|---------|-----------|
| `paso-a-paso-tvirtual.md` | Guía completa de integración paso a paso |
| `guia-cobros-desarrolladores.md` | Estructura del array `cobros` |
| `guia-sucursales-desarrolladores.md` | Campo SucursalStrongId |
| `guia-depositos-clientes.md` | Endpoint de depósitos (corregido) |
| `guia-anticipo-proveedores.md` | API de anticipos en virtualuxor.com |
| `referencia-credenciales-unidigital.md` | Tokens, GUIDs, endpoints |
| `definitive-test-tvirtual.js` | Script verificad que emite factura en producción |

---

## 3. BNC — Pagos Electrónicos

### 3.1 Errores Diagnosticados

#### Error 1: LogOn falla con `EPICNF` (HTTP 409)

```
Request:
  ClientGUID: "bb9de856-dcc8-4f55-8d4f-8c1c9fa6e9b6"

Response:
  EPICNF — "No es posible encontrar al cliente especificado, 
            o el mismo no se encuentra activo."
```

**Causa:** El `ClientGUID` `bb9de856-...` no es reconocido por BNC o está desactivado. El GUID documentado en el proyecto es otro: `f217229a-5f94-48f6-8611-ffed2ccf7aee`.

**Acción:** Verificar con BNC cuál es el `ClientGUID` correcto del comercio.

#### Error 2: Pagos fallan con `EPIRWK` (HTTP 409)

```
Response:
  EPIRWK — "Petición denegada por medidas de seguridad."
```

**Causa:** La **WorkingKey** expiró. BNC asigna una WorkingKey diaria vía `/Auth/LogOn` que vence a la medianoche. El backend la obtiene una sola vez al arrancar y nunca la renueva.

**Solución:** Implementar un **cron job** diario que ejecute LogOn y renueve la WorkingKey. Opciones:

1. **Spring `@Scheduled`** — Tarea a las 6:00 AM
   ```java
   @Scheduled(cron = "0 0 6 * * ?")
   public void refreshWorkingKey() {
       WorkingKey nueva = bncApi.logon();
       BncEnLineaManager.setWorkingKey(nueva);
   }
   ```

2. **Cron del sistema operativo** — Script curl a las 5:00 AM
   ```bash
   0 5 * * * curl -X POST https://servicios.bncenlinea.com:16100/api/Auth/LogOn ...
   ```

3. **Auto-detección con reintento** — Si detecta EPIRWK, renueva automáticamente y reintenta

### 3.2 Detalles Técnicos de Encriptación BNC

- **Cifrado:** AES-256, modo CBC
- **Encoding:** UTF-16LE
- **Key derivation:** PBKDF2, 1000 iteraciones, SHA1, salt "Ivan Medvedev"
- **Validation:** SHA256 del payload JSON
- **Puerto:** 16100
- **Base URL:** `https://servicios.bncenlinea.com:16100/api`

### 3.3 Endpoints BNC

| Endpoint | Método | Propósito |
|----------|--------|-----------|
| `/Auth/LogOn` | POST | Obtener WorkingKey |
| `/MobPayment/SendP2P` | POST | Pago persona a persona |
| `/MobPayment/SendC2P` | POST | Cobro comercio a persona |
| `/Position/ValidateP2P` | POST | Validar pago recibido |
| `/BankAccount/GetBalance` | POST | Consultar saldo |
| `/BankAccount/GetTransactions` | POST | Historial de transacciones |
| `/welcome/home` | GET | Health check |

---

## 4. Infraestructura de Servidores

### 4.1 Mapeo de Infraestructura

| Dominio | IP | Proveedor | Estado |
|---------|----|-----------|--------|
| `voltajevzla.com` | `34.174.49.51` | Google Cloud (us-east1) | ⚠️ HTTP 202 + Captcha Siteground |
| `m.voltajevzla.com` | `18.230.37.154` | AWS EC2 (sa-east-1) | ❌ Sin respuesta |
| Siteground (DNS/CDN) | — | Siteground | Proxy con captcha bloqueante |

### 4.2 Anomalías Detectadas

1. **`m.voltajevzla.com` caído** — El backend chino en AWS EC2 no responde en puertos 80/443. Posibles causas: instancia stopped, security group cerrado, servicio caído, o corte de servicio AWS.

2. **`voltajevzla.com` bloqueado por captcha** — Siteground intercepta con `SG-Captcha: challenge` incluso en peticiones curl simples. HTTP 202 (no 200 OK).

3. **Arquitectura híbrida no documentada** — Tres proveedores (Siteground, GCP, AWS) sin una arquitectura clara.

### 4.3 Acciones Recomendadas

- Verificar instancia AWS EC2 (estado, security group, servicio web)
- Desactivar o configurar captcha de Siteground
- Unificar proveedor cloud
- Implementar health checks (UptimeRobot, Pingdom)

---

## 5. Anticipo a Proveedores / Depósitos Clientes

### 5.1 API en virtualuxor.com

| Entorno | Endpoint |
|---------|----------|
| QA | `POST https://qa.virtualuxor.com/api/anticipos/proveedores` |
| Producción | `POST https://virtualuxor.com/api/anticipos/proveedores` |

### 5.2 Estado

- **Token actual (`3fC7a2rSBB8qTcY6b9jptUurfjly0LIFPfHcfxNPj3zrezTM`) NO funciona** en `virtualuxor.com` — responde "Invalid key supplied"
- Se necesita un token diferente emitido específicamente para `virtualuxor.com`
- Se necesita crear la clasificación **"DepositosClientes"** en T-Virtual

### 5.3 Pendientes

1. Solicitar a Unidigital un token válido para `virtualuxor.com`
2. Solicitar creación de clasificación "DepositosClientes"
3. Los desarrolladores chinos implementarán el tracking de depósitos según `guia-depositos-clientes.md`

---

## 6. Setup del Proyecto Nuevo

Para configurar un entorno nuevo desde cero, copiar `SETUP-NUEVO-PROYECTO.md` al proyecto y seguir las instrucciones:

1. **GitNexus** — `gitnexus analyze` para indexar el código
2. **GSD** — `/gsd-new-project` en el chat del agente para definir requisitos
3. **UI UX Pro Max** — Se activa al pedir diseño UI
4. **awesome-design-md** — Copiar `DESIGN.md` deseado para estilos

---

## 7. Archivos Creados

### Guías y Documentación

| Archivo | Descripción |
|---------|-------------|
| `analisis-error-epirwk-bnc.md` | Análisis completo del error EPIRWK y solución cron job |
| `analisis-servidores-chinos.md` | Diagnóstico de infraestructura (GCP, AWS, Siteground) |
| `guia-anticipo-proveedores.md` | API de anticipos en virtualuxor.com |
| `guia-cobros-desarrolladores.md` | Array cobros para desarrolladores chinos |
| `guia-depositos-clientes.md` | Tracking de depósitos de clientes (versión corregida) |
| `guia-sucursales-desarrolladores.md` | Campo SucursalStrongId |
| `paso-a-paso-tvirtual.md` | Guía completa de integración T-Virtual |
| `referencia-credenciales-unidigital.md` | Tokens, GUIDs, endpoints |
| `SETUP-NUEVO-PROYECTO.md` | Instrucciones para configurar un proyecto nuevo |
| `t-virtual-produccion-config.md` | Estado de configuración en producción |

### Scripts

| Archivo | Descripción |
|---------|-------------|
| `definitive-test-tvirtual.js` | Script verificad que emite factura en producción |
| `test-qa-conectividad.js` | Test de conectividad contra QA y producción |
| `test-qa-facturas-exitosas.js` | Emisión de FA 91, 92, 93, 94 en QA |

### Configuración

| Archivo | Descripción |
|---------|-------------|
| `CLAUDE.md` | Instrucciones para el agente IA en OpenCode |
| `AGENTS.md` | Reglas y configuración de GitNexus |

---

*Fin del informe. Para cualquier duda, contactar al equipo.*
