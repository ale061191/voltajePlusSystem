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
MasterKey:     dcd148cd10d49e19715a6f6231d243f7
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
