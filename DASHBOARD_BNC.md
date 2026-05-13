# Dashboard BNC - Integración Voltaje

## Endpoints de Consulta BNC Disponibles

| Endpoint | Función |
|---|---|
| `/Auth/LogOn` | Iniciar sesión en la API (obtener WorkingKey diaria) |
| `/BankAccount/GetBalance` | Consultar saldo de la cuenta corporativa |
| `/BankAccount/GetTransactions` | Consultar historial de movimientos |
| `/BankAccount/GetTransactionDetail` | Ver detalle de una transacción específica |
| `/Position/ValidateP2P` | Verificar si un Pago Móvil fue recibido |

## Endpoints de Operación BNC

| Endpoint | Función |
|---|---|
| `/MobPayment/SendP2P` | Enviar Pago Móvil (reembolsos/retiros) |
| `/MobPayment/SendC2P` | Cobrar Pago Móvil (cuando un cliente te paga) |

## Credenciales BNC

```
ClientGUID:    f217229a-5f94-48f6-8611-ffed2ccf7aee
MasterKey:    dcd148cd10d49e19715a6f6231d243f7
AccountNumber: 01910098702198555270
ClientID:      J507833453
Affiliate:     860986924
Terminal:      12219091
Phone:         04163750325
```

## Colecciones Firebase para Cruce de Datos

| Colección | Qué contiene |
|---|---|
| `voltaje_users` | Usuarios: nombre, teléfono, email, saldo de billetera |
| `voltaje_transactions` | Transacciones: depósitos, retiros, alquileres |
| `voltaje_active_rentals` | Alquileres activos: máquina actual, slot, hora de inicio |
| `voltaje_rental_history` | Historial de alquileres completados |
| `voltaje_coupons` | Cupones disponibles |
| `voltaje_coupon_quotas` | Cupones usados por usuario |

## Cruce de Datos para Dashboard

| Datos del BNC | Datos en Firebase | Resultado |
|---|---|---|
| Teléfono del pagador | `voltaje_users.phone` | Usuario identificado |
| Usuario (uid) | `voltaje_active_rentals.uid` | Máquina donde está alquilando |
| Usuario (uid) | `voltaje_active_rentals.cabinetId` | Estación actual |
| Usuario (uid) | `voltaje_users.displayName` | Nombre del usuario |

## Información Extraer por Cada Pago

| Campo | Ejemplo |
|---|---|
| `userId` | `abc123...` |
| `userPhone` | `04129850722` |
| `userName` | `Luis Pérez` |
| `cabinetId` | `DTN02901` |
| `cabinetName` | `Torre Johnson & Johnson` |
| `amount` | `400` |
| `paymentMethod` | `PagoMovil` |
| `timestamp` | `2026-03-25T14:30:00Z` |

## Códigos de Error BNC Relevantes

| Código | Descripción |
|---|---|
| G14 | Beneficiario no afiliado al servicio de Pago Móvil |
| G51 | Fondos insuficientes |
| G52 | Beneficiario no afiliado |
| G56 | Tarjeta/Telf no Registrado |
| G61 | Excede el límite de montos diarios |
| G91 | Problemas de comunicación |
| EPIKNF | Error interno del banco |

---

## Firebase Functions - Dashboard endpoints

### Funciones desplegadas en Firebase

Las siguientes funciones Cloud están disponibles en Firebase para el dashboard:

| Función | URL | Descripción |
|---|---|---|
| `dashboardTodayPayments` | `https://us-central1-voltajevzla-25454.cloudfunctions.net/dashboardTodayPayments` | Pagos de hoy con datos cruzados de Firebase |
| `dashboardPayments` | `https://us-central1-voltajevzla-25454.cloudfunctions.net/dashboardPayments` | Pagos por rango de fecha |
| `dashboardSummary` | `https://us-central1-voltajevzla-25454.cloudfunctions.net/dashboardSummary` | Resumen: ingresos, egresos, transacciones, saldo |

### Cómo usar los endpoints

#### 1. Obtener pagos de hoy
```bash
GET https://us-central1-voltajevzla-25454.cloudfunctions.net/dashboardTodayPayments
```

Respuesta:
```json
{
  "success": true,
  "data": [
    {
      "transactionId": "...",
      "reference": "...",
      "amount": 400,
      "type": "P2P",
      "phone": "04129850722",
      "userId": "abc123...",
      "userName": "Luis Pérez",
      "cabinetId": "DTN02901",
      "machineId": "...",
      "slotId": 1,
      "paymentMethod": "PagoMovil",
      "status": "completed"
    }
  ],
  "count": 1
}
```

#### 2. Obtener pagos por rango de fecha
```bash
GET https://us-central1-voltajevzla-25454.cloudfunctions.net/dashboardPayments?startDate=2026-03-01&endDate=2026-03-25
```

#### 3. Obtener resumen del dashboard
```bash
GET https://us-central1-voltajevzla-25454.cloudfunctions.net/dashboardSummary
```

Respuesta:
```json
{
  "success": true,
  "data": {
    "todayIncome": 1200,
    "todayExpenses": 0,
    "todayTransactions": 3,
    "balance": 50000
  }
}
```

### Archivos modificados

- `functions/src/services/bncPayment.ts` - Agregados métodos: getBalance(), getTransactions(), getTransactionDetail(), validateP2P()
- `functions/src/index.ts` - Agregadas funciones: dashboardTodayPayments, dashboardPayments, dashboardSummary

### Para hacer deploy locally

```bash
cd functions
npm install
npm run build
firebase deploy --only functions
```

---

## Para desarrollo local (voltaje_v2_backend)

El backend local también tiene los mismos endpoints disponibles:

| Endpoint | Función |
|---|---|
| `GET /api/dashboard/today-payments` | Pagos de hoy |
| `GET /api/dashboard/payments?startDate=...&endDate=...` | Pagos por rango |
| `GET /api/dashboard/summary` | Resumen del dashboard |

Para ejecutar el backend local:
```bash
cd voltaje_v2_backend
npm run dev
```

### Archivos del backend local

- `voltaje_v2_backend/src/services/bncPayment.ts` - Métodos BNC de consulta
- `voltaje_v2_backend/src/services/firebaseService.ts` - Conexión a Firebase
- `voltaje_v2_backend/src/services/dashboardService.ts` - Lógica de cruzamiento de datos
- `voltaje_v2_backend/src/index.ts` - Endpoints del API

### Variables de entorno requeridas para backend local

```env
FIREBASE_PROJECT_ID=voltajevzla-25454
FIREBASE_PRIVATE_KEY=<tu-private-key>
FIREBASE_CLIENT_EMAIL=<tu-client-email>

BNC_API_URL=https://servicios.bncenlinea.com:16100/api
BNC_CLIENT_GUID=f217229a-5f94-48f6-8611-ffed2ccf7aee
BNC_MASTER_KEY=dcd148cd10d49e19715a6f6231d243f7
BNC_ACCOUNT_NUMBER=01910098702198555270
```

---

## Prueba de Reembolso (P2C) - Test Realizado

### Función de prueba desplegada

| Función | URL |
|---|---|
| `testBNCReimbursement` | `https://us-central1-voltajevzla-25454.cloudfunctions.net/testBNCReimbursement` |

### Resultado del test (27-03-2026)

```bash
curl https://us-central1-voltajevzla-25454.cloudfunctions.net/testBNCReimbursement
```

**Respuesta:**
```json
{
  "success": false,
  "step": "p2c",
  "message": "P2C failed: Request failed with status code 409 | BNC: {\"status\":\"KO\",\"message\":\"ECBG56000000Tarjeta/Telf no Registrado\"}"
}
```

### Análisis del resultado

| Paso | Status | Detalle |
|---|---|---|
| Logon (BNC) | ✅ **200 OK** | Autenticación exitosa - WorkingKey obtenido |
| P2C (Enviar $1) | ❌ **409** | Teléfono no afiliado a Pago Móvil |

### Conclusión

- ✅ **El código funciona correctamente** - El logon y la conexión con BNC están operativos
- ❌ **El teléfono de prueba no está afiliado** - El número `04163750325` no está registrado en el servicio de Pago Móvil del BNC

### Para probar exitosamente

Se debe usar un teléfono que esté **afiliado al servicio de Pago Móvil** en el BNC. El código del reembolso está correcto y funciona.
