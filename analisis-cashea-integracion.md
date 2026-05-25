# Análisis: Cashea — Integración con Voltaje Plus

## ¿Qué es Cashea?

Cashea es una plataforma de financiamiento al consumo en Venezuela. Funciona como un **"compra hoy, paga después en cuotas sin interés"**. El cliente paga un porcentaje del producto como **inicial** y el resto en **cuotas iguales sin interés** cada 14 días.

**Dato clave:** Cashea asume el riesgo de impago. Si el cliente no paga sus cuotas, **Cashea le paga al comercio igual**. El comercio siempre recibe su dinero completo (menos comisión).

---

## Modelo de Negocio

```
Cliente → Elige producto en tienda/online
              ↓
       Escanea QR de Cashea (o checkout online)
              ↓
       Cashea evalúa línea de crédito del cliente
              ↓
       Cliente paga INICIAL (ej. 30% en tienda)
              ↓
       Comercio recibe el pago completo - comisión
              ↓
       Cliente paga cuotas en app Cashea (c/14 días)
              ↓
       Cashea cubre si el cliente no paga
```

### Roles

| Quién | Qué hace |
|-------|----------|
| **Cliente** | Descarga app Cashea, aplica por línea de crédito, paga inicial + cuotas |
| **Comercio (Voltaje)** | Se afilia a Cashea, muestra QR en punto de venta, recibe pago completo |
| **Cashea** | Evalúa clientes, financia cuotas, asume riesgo de impago, cobra comisión |

### Comisiones
- Comisión fija por compra (negociada en contrato, aprox 4-6%)
- **Sin costos fijos** — ni suscripción, ni integración
- Las solicitudes no aprobadas **no generan costo**

---

## Requisitos para Afiliarse

### Documentos
- Registro mercantil / estatutos sociales
- Acta de asamblea donde se designe al representante legal
- RIF actualizado (en PDF, uno por sucursal si hay razones sociales distintas)
- Cédula vigente del/los representante(s) legal(es)
- Factura fiscal (capacidad de emitir factura fiscal)
- Sistema de ventas POS
- Cuenta bancaria receptora en Bs (con Pago Móvil activado) y en USD

### Para ventas online (adicional)
- URL activa (que no redirija a otro sitio)
- Todos los enlaces funcionando sin errores

### Perfil de comercio que Cashea busca
- Preferiblemente con local físico
- Trayectoria comprobable
- Tipo de productos (evalúan si es compatible con su modelo)
- Presencia de sistemas administrativos

---

## Formas de Integración Técnica

### 1. QR en Tienda Física (la más simple)

Cada caja registradora recibe un **QR único y dinámico** de Cashea. El cliente:
1. Llega a la caja y dice "pago con Cashea"
2. Escanea el QR con su app Cashea
3. Cashea evalúa su línea de crédito en ese momento
4. El cliente paga la **inicial** en la caja (efectivo, punto, pago móvil — lo que la tienda acepte)
5. ¡Listo! El comercio recibe el pago completo (menos comisión)

**No requiere integración técnica** — solo el QR impreso y que el cajero sepa procesarlo.

### 2. Web Checkout SDK (para tienda online)

Paquete npm: **`cashea-web-checkout-sdk`** v1.1.19

```bash
npm install cashea-web-checkout-sdk
```

Se integra en el checkout de una tienda web. Cuando el cliente elige "Financiar con Cashea":
1. El SDK abre el checkout de Cashea en un modal/redirect
2. El cliente completa el financiamiento en Cashea
3. Cashea redirige de vuelta a la tienda
4. El monto financiado se descuenta del total (técnicamente se aplica como "cupón de descuento")
5. El cliente paga solo la inicial por la pasarela de pago normal

### 3. API + Portal Web de Aliados (para sistemas administrativos)

Cashea tiene un **Portal Web de Aliados** donde el comercio puede:
- Ver historial de transacciones
- Gestionar órdenes abiertas
- Validar identidad del cliente
- Gestionar cambios y notas de crédito
- Invitar/eliminar usuarios (administradores y cajeros)
- Ver historial de pagos de Cashea al comercio, saldo a favor
- Descargar reportes en CSV y PDF

La **API** permite sincronizar automáticamente las ventas desde el sistema administrativo del comercio (como Hybrid POS ya lo hace).

---

## Integración con Voltaje Plus

### Cómo encaja

Hoy Voltaje tiene:
- **BNC Pago Móvil** — para cobrar rentals (con problemas de WorkingKey)
- **T-Virtual** — para facturación digital

Cashea podría agregar un **nuevo método de pago** que además **financia** al cliente:

| Escenario | Hoy (solo BNC) | Con Cashea |
|-----------|----------------|------------|
| Pago único | ✅ El cliente paga todo de una | ✅ Sigue disponible |
| Pago en cuotas | ❌ No disponible | ✅ El cliente paga inicial + cuotas c/14 días |
| Riesgo de impago | ❌ Voltaje asume el riesgo | ✅ Cashea asume el riesgo |
| Flujo de caja | ❌ Puede haber retrasos | ✅ Voltaje recibe completo al instante |
| Nuevos clientes | ❌ Algunos no pagan todo upfront | ✅ Atrae clientes que necesitan financiamiento |

### Opciones de implementación

#### Opción A: QR en cada máquina/punto de alquiler (recomendada para empezar)

```
Cliente quiere alquilar powerbank
              ↓
       Pagaría la INICIAL con Cashea (ej. 30% del rental)
              ↓
       Las cuotas restantes Cashea se las cobra al cliente
              ↓
       Voltaje recibe el 100% del rental - comisión
              ↓
       Se emite factura en T-Virtual por el total
```

**Ventaja:** No requiere desarrollo. Solo el QR físico y entrenar al personal de caja.
**Desventaja:** Voltaje necesita un punto físico de cobro (caja) donde el cliente pague la inicial.

#### Opción B: Integración via API (para alquiler desde la app)

Cuando el usuario elige "Pagar con Cashea" en la app:
1. La app llama a nuestra API
2. Nuestra API se comunica con la API de Cashea para iniciar el financiamiento
3. Cashea evalúa al usuario y aprueba o rechaza
4. Si aprueba, Cashea genera una orden
5. El usuario paga la inicial en la app (vía BNC Pago Móvil o transferencia)
6. Cashea confirma y Voltaje recibe el pago completo
7. Se desbloquea la máquina
8. Se emite factura en T-Virtual

**Ventaja:** Experiencia completamente digital. No requiere caja física.
**Desventaja:** Requiere desarrollo de integración API con Cashea.

#### Opción C: Modelo híbrido (recomendado)

- **Tiendas físicas:** QR de Cashea en cada caja (Opción A — sin desarrollo)
- **App móvil:** Integración API (Opción B — con desarrollo futuro)

---

## Pasos para Afiliarse a Cashea

1. **Aplicar** en https://cashea.app/comercios — formulario con datos del comercio
2. **Esperar evaluación** — el equipo de Cashea revisa (puede tomar varios días)
3. **Reunión comercial** — si pasan la evaluación inicial
4. **Cargar documentos** — RIF, acta constitutiva, cédula, etc.
5. **Firmar contrato digital**
6. **Recibir kit** — QRs, material promocional, credenciales API
7. **Activar sucursales y cajas** — cada QR se asocia a una caja específica
8. **Comenzar a operar**

---

## Comparativa: Cashea vs BNC

| Aspecto | BNC (Pago Móvil) | Cashea |
|---------|-----------------|--------|
| Tipo | Pago único de persona a comercio | Financiamiento/compra en cuotas |
| Integración | API vía servicios.bncenlinea.com:16100 | QR físico + SDK web + API |
| Riesgo de impago | Lo asume el comercio | Lo asume Cashea |
| Cobro al comercio | Comisión por transacción | Comisión por transacción |
| Costos fijos | No | No |
| Documentación técnica | Compleja (AES/SHA256/PBKDF2) | SDK simple (npm package) |
| Estado actual | ⚠️ Error EPIRWK (WorkingKey) | ✅ No aplica (no integrado aún) |
| Ideal para | Pagos directos de rentals | Financiamiento de rentals grandes |

---

## Recomendación

1. **Corto plazo:** Aplicar para ser aliado Cashea. Mientras llega la aprobación, se resuelve el error EPIRWK de BNC.
2. **Mediano plazo:** Implementar QR en puntos físicos de cobro (sin desarrollo).
3. **Largo plazo:** Integrar API de Cashea en la app móvil para financiamiento 100% digital.
4. **Facturación:** Los montos financiados por Cashea deben facturarse completos en T-Virtual (Voltaje recibe el total, Cashea descuenta su comisión aparte).
