# Cashea — Guía de Integración

## ¿Qué es Cashea?

Cashea es un método de pago que permite a los clientes **comprar hoy y pagar después en cuotas sin interés**. El cliente paga un porcentaje del total como **inicial** y el resto en cuotas cada 14 días.

**Para Voltaje Plus:** Cuando un cliente alquila un powerbank con Cashea:
1. Cashea evalúa al cliente y aprueba el financiamiento
2. El cliente paga solo la **inicial** (ej. 30%)
3. **Cashea le paga a Voltaje el 100% del rental** (menos comisión)
4. Cashea cobra las cuotas restantes al cliente
5. **Cashea asume el riesgo** — si el cliente no paga, Voltaje ya recibió su dinero

---

## Flujo de Integración (App Móvil + Backend)

```
Usuario app → Elige "Pagar con Cashea"
                  ↓
Backend Firebase → Crea order payload en Cashea API
                  ↓
Backend recibe orderPayloadId + URL de checkout
                  ↓
App abre WebView → https://web.cashea.app/checkout?order-payload-id=XXX
                  ↓
Usuario completa el financiamiento en Cashea
   (Cashea evalúa crédito, usuario acepta cuotas)
                  ↓
Cashea redirige de vuelta a la app (deep link / callback URL)
                  ↓
Backend Firebase → Confirma con Cashea que el pago fue aprobado
                  ↓
Backend Firebase → Desbloquea la máquina + Emite factura T-Virtual
```

---

## Estructura de la API

### Endpoints Cashea

| Endpoint | Método | Propósito |
|----------|--------|-----------|
| `{API_BASE}/config/web-checkout` | GET | Obtener config (monto mínimo, tasas) |
| `{API_BASE}/web-checkout/payload` | POST | Guardar payload de orden y obtener ID |

### Autenticación

Todas las requests usan **ApiKey** en el header:

```
Authorization: ApiKey {PUBLIC_API_KEY}
```

---

## Esquemas de Datos

### Store
```typescript
{
  id: number,
  name: string,
  enabled: boolean
}
```

### Product
```typescript
{
  id: string,
  name: string,
  sku: string,
  description: string,
  imageUrl: string,       // URL de la imagen del producto
  quantity: number,        // min 1
  price: number,           // min 0
  tax?: number,            // opcional
  discount?: number        // opcional
}
```

### Order
```typescript
{
  store: {
    id: number,
    name: string,
    enabled: boolean
  },
  products: Product[]       // min 1 producto
}
```

### Payload Completo (Web Checkout)
```typescript
{
  deliveryMethod: "IN_STORE" | "DELIVERY",
  redirectUrl: string,        // URL a donde redirigir tras pagar
  merchantName: string,       // Nombre del comercio (Voltaje Plus)
  orders: Order[],            // min 1 orden
  identificationNumber: string, // RIF del comercio
  invoiceId?: string,         // Nro de factura (opcional)
  externalClientId: string,   // ID del cliente en nuestro sistema
  deliveryPrice?: number      // Costo de delivery (opcional, min 0)
}
```

---

## Implementación en Firebase Functions

### 1. Configurar variables de entorno

```bash
# .env de Firebase Functions
CASHEA_API_URL=https://api.cashea.app    # Confirmar URL con Cashea
CASHEA_PUBLIC_API_KEY=tu_public_api_key
CASHEA_STORE_ID=123                      # ID de la tienda en Cashea
CASHEA_STORE_NAME=Voltaje Plus
CASHEA_RIF=J-XXXXXXXXX
```

### 2. Servicio Cashea

```typescript
// functions/src/services/cashea.service.ts

import axios from 'axios';
import * as functions from 'firebase-functions';

const CONFIG = {
  API_URL: process.env.CASHEA_API_URL || 'https://api.cashea.app',
  PUBLIC_API_KEY: process.env.CASHEA_PUBLIC_API_KEY || '',
  STORE_ID: Number(process.env.CASHEA_STORE_ID) || 0,
  STORE_NAME: process.env.CASHEA_STORE_NAME || 'Voltaje Plus',
  RIF: process.env.CASHEA_RIF || ''
};

interface Product {
  id: string;
  name: string;
  sku: string;
  description: string;
  imageUrl: string;
  quantity: number;
  price: number;
  tax?: number;
  discount?: number;
}

interface OrderPayload {
  deliveryMethod: 'IN_STORE' | 'DELIVERY';
  redirectUrl: string;
  merchantName: string;
  orders: Array<{
    store: { id: number; name: string; enabled: boolean };
    products: Product[];
  }>;
  identificationNumber: string;
  invoiceId?: string;
  externalClientId: string;
  deliveryPrice?: number;
}

interface CasheaConfig {
  minAmount: number | null;
  // otros campos de config
}

export class CasheaService {
  private apiKey: string;
  private baseUrl: string;

  constructor() {
    this.apiKey = CONFIG.PUBLIC_API_KEY;
    this.baseUrl = CONFIG.API_URL;

    if (!this.apiKey) {
      console.warn('⚠️ Cashea: CASHEA_PUBLIC_API_KEY no configurada');
    }
  }

  private getHeaders() {
    return {
      'Accept': 'application/json',
      'Content-Type': 'application/json',
      'Authorization': `ApiKey ${this.apiKey}`
    };
  }

  /**
   * Obtener configuración de Cashea (monto mínimo, cuotas, etc.)
   */
  async getConfig(): Promise<CasheaConfig> {
    try {
      const res = await axios.get(`${this.baseUrl}/config/web-checkout`, {
        headers: this.getHeaders()
      });
      return res.data;
    } catch (e: any) {
      console.error('Error obteniendo config Cashea:', e.message);
      return { minAmount: null };
    }
  }

  /**
   * Crear payload de orden y obtener URL de checkout
   */
  async createCheckout(params: {
    amount: number;
    productName: string;
    productDescription: string;
    productImageUrl: string;
    quantity: number;
    clientId: string;
    clientName: string;
    invoiceId?: string;
    redirectUrl: string;
  }): Promise<{ success: boolean; checkoutUrl?: string; error?: string }> {
    try {
      const payload: OrderPayload = {
        deliveryMethod: 'IN_STORE',
        redirectUrl: params.redirectUrl,
        merchantName: CONFIG.STORE_NAME,
        orders: [
          {
            store: {
              id: CONFIG.STORE_ID,
              name: CONFIG.STORE_NAME,
              enabled: true
            },
            products: [
              {
                id: `RENTAL_${Date.now()}`,
                name: params.productName,
                sku: `SKU_${Date.now()}`,
                description: params.productDescription,
                imageUrl: params.productImageUrl,
                quantity: params.quantity,
                price: params.amount / params.quantity,
                tax: 0
              }
            ]
          }
        ],
        identificationNumber: CONFIG.RIF,
        externalClientId: params.clientId,
        ...(params.invoiceId && { invoiceId: params.invoiceId })
      };

      const res = await axios.post(
        `${this.baseUrl}/web-checkout/payload`,
        payload,
        { headers: this.getHeaders() }
      );

      // La respuesta contiene el orderPayloadId
      const orderPayloadId = res.data;

      if (!orderPayloadId || typeof orderPayloadId !== 'number') {
        return { success: false, error: 'Respuesta inválida de Cashea' };
      }

      const checkoutUrl = `https://web.cashea.app/checkout?order-payload-id=${orderPayloadId}`;

      return { success: true, checkoutUrl };
    } catch (e: any) {
      console.error('Error creating Cashea checkout:', e.response?.data || e.message);
      return {
        success: false,
        error: e.response?.data?.message || e.message
      };
    }
  }
}
```

### 3. Endpoint en Firebase Functions

```typescript
// functions/src/index.ts — agregar

import { CasheaService } from './services/cashea.service';

export const initiateCasheaPayment = functions.https.onCall(async (data, context) => {
  const uid = context.auth?.uid;
  if (!uid) throw new functions.https.HttpsError('unauthenticated', 'Debes iniciar sesión.');

  const { amount, machineId, slotId, productName, productImageUrl } = data;

  if (!amount || !machineId) {
    throw new functions.https.HttpsError('invalid-argument', 'Faltan datos del pago.');
  }

  const cashea = new CasheaService();
  const bajieService = new BajieService();

  try {
    // 1. Crear checkout en Cashea
    const checkout = await cashea.createCheckout({
      amount: Number(amount),
      productName: productName || `Alquiler Power Bank ${machineId}`,
      productDescription: `Alquiler de power bank por tiempo indefinido`,
      productImageUrl: productImageUrl || 'https://voltajevzla.com/logo.png',
      quantity: 1,
      clientId: uid,
      clientName: 'Usuario',
      redirectUrl: `https://voltajevzla.com/cashea/callback?uid=${uid}&machineId=${machineId}${slotId ? `&slotId=${slotId}` : ''}`
    });

    if (!checkout.success) {
      throw new functions.https.HttpsError('aborted', `Cashea: ${checkout.error}`);
    }

    // 2. Devolver URL para que la app la abra en WebView
    return {
      success: true,
      checkoutUrl: checkout.checkoutUrl,
      message: 'Redirigiendo a Cashea...'
    };

  } catch (e: any) {
    console.error('Error en Cashea payment:', e);
    throw e;
  }
});
```

### 4. Webhook / Callback (cuando Cashea redirige al usuario)

```typescript
// functions/src/index.ts

export const casheaCallback = functions.https.onRequest(async (req, res) => {
  const { uid, machineId, slotId } = req.query;

  if (!uid || !machineId) {
    res.status(400).send('Missing params');
    return;
  }

  try {
    const bajieService = new BajieService();

    // 1. Desbloquear máquina
    const deviceId = await bajieService.resolveQrToDeviceId(machineId as string);
    const targetSlot = slotId || await bajieService.findAvailableSlot(deviceId);
    await bajieService.unlockSlot(deviceId, targetSlot);

    // 2. Registrar en Firestore
    await db.collection('voltaje_transactions').add({
      uid,
      machineId,
      paymentMethod: 'CASHEA',
      amount: 0, // Cashea paga después, registrar monto real aquí
      status: 'FINANCED',
      createdAt: admin.firestore.FieldValue.serverTimestamp()
    });

    // 3. Emitir factura T-Virtual (opcional, diferido)
    // tvirtualService.createInvoice({...});

    // Redirigir al usuario a pantalla de éxito
    res.redirect(`https://voltajevzla.com/success?machineId=${machineId}`);

  } catch (e: any) {
    console.error('Error en callback Cashea:', e);
    res.redirect(`https://voltajevzla.com/error?message=${encodeURIComponent(e.message)}`);
  }
});
```

---

## Integración en la App Flutter

### Opción 1: WebView (recomendada para empezar)

```dart
// Abrir Cashea checkout en WebView

import 'package:flutter/material.dart';
import 'package:webview_flutter/webview_flutter.dart';

class CasheaCheckoutScreen extends StatelessWidget {
  final String checkoutUrl;

  const CasheaCheckoutScreen({super.key, required this.checkoutUrl});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Pagar con Cashea')),
      body: WebViewWidget(
        controller: WebViewController()
          ..loadRequest(Uri.parse(checkoutUrl))
          ..setNavigationDelegate(
            NavigationDelegate(
              onUrlChange: (change) {
                // Detectar cuando Cashea redirige de vuelta
                if (change.url?.contains('/cashea/callback') ?? false) {
                  Navigator.of(context).pop(true); // éxito
                }
              },
            ),
          ),
      ),
    );
  }
}
```

### Opción 2: URL Launch (abre el navegador del teléfono)

```dart
import 'package:url_launcher/url_launcher.dart';

Future<void> openCasheaCheckout(String url) async {
  final uri = Uri.parse(url);
  if (await canLaunchUrl(uri)) {
    await launchUrl(uri, mode: LaunchMode.externalApplication);
  }
}
```

---

## Variables de Entorno Necesarias

```bash
# Firebase Functions .env
CASHEA_API_URL=https://api.cashea.app
CASHEA_PUBLIC_API_KEY=tu_public_api_key
CASHEA_STORE_ID=123
CASHEA_STORE_NAME=Voltaje Plus
CASHEA_RIF=J-XXXXXXXXX
```

---

## Resumen para el Desarrollador

```
1. Cashea es un financiamiento externo — el cliente paga en cuotas, 
   Voltaje recibe el 100% inmediato.

2. La integración tiene 3 partes:
   - Backend (Firebase Functions): Crea el order payload en Cashea API
   - App (Flutter WebView): Muestra el checkout de Cashea
   - Callback: Cuando Cashea redirige, desbloqueamos la máquina

3. Datos que necesita Cashea:
   - ApiKey (en header Authorization: ApiKey XXX)
   - Payload con: productos, tienda, monto, RIF, redirectUrl
   - El SDK devuelve un orderPayloadId → construimos la URL de checkout

4. Flujo completo:
   Usuario elige Cashea → Backend crea payload → 
   App abre webview con URL de Cashea → Usuario financia →
   Cashea redirige al callback → Backend desbloquea máquina

5. Para dudas: el equipo de Cashea asignó un ejecutivo de cuenta.
```

---

## Checklist para Producción

- [ ] Solicitar `PUBLIC_API_KEY` y `STORE_ID` a Cashea
- [ ] Confirmar `CASHEA_API_URL` correcta (probablemente `https://api.cashea.app`)
- [ ] Configurar `redirectUrl` con un dominio que Cashea tenga en whitelist
- [ ] Probar en QA primero (si Cashea tiene ambiente de pruebas)
- [ ] Configurar deep link en la app para que el callback regrese a la app y no al navegador
- [ ] Emitir factura T-Virtual después de confirmación de Cashea
