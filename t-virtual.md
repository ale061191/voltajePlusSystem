# 📄 Documentación: Integración de Voltaje App con ERP T-Virtual

Este documento detalla la lógica, arquitectura y próximos pasos para conectar la aplicación de Voltaje con el sistema administrativo-contable **T-Virtual**, permitiendo la facturación automática de los alquileres de Power Banks según distintos modelos de negocio.

---

## 1. Contexto y Modelos de Negocio

La empresa maneja un parque de aproximadamente 400 máquinas de Power Banks, operando bajo dos modelos de facturación distintos:
1. **Modelo Propio (100%):** Todo el ingreso generado por la máquina pertenece a Voltaje.
2. **Modelo de Alianza (Split 70/30):** La máquina se ubica en el local de un aliado comercial. El ingreso se divide (ej. 70% para el aliado y 30% para Voltaje), y se debe facturar la comisión correspondiente + IVA.

**Gran ventaja descubierta:** T-Virtual ya permite registrar cada máquina física como un "Servicio" individual (ej. Códigos `DTA43337`, `DTN02901`) y tiene la capacidad nativa de parametrizar internamente la regla del 70/30. 

Por lo tanto, **la aplicación no necesita calcular porcentajes**, solo debe informar qué máquina realizó la venta y por qué monto. T-Virtual hará la división contable y emitirá las facturas automáticamente.

---

## 2. La Solución: ¿Cómo se comunican la App y T-Virtual?

La arquitectura funciona bajo el principio de "Delegación de Responsabilidades":
*   **La App (Firebase):** Actúa como el "Mesero". Toma el pedido (el cliente devuelve la batería y paga), busca cómo se llama esa máquina en el menú, y le manda la orden al Cajero.
*   **T-Virtual:** Actúa como el "Cajero/Contador". Recibe el código de la máquina, reconoce que ese código tiene una regla del 70/30 (o del 100%), y genera las facturas con todos los impuestos de ley.

---

## 3. Paso a Paso Técnico

### A. El "Diccionario" en Firebase (Mapeo)
Las máquinas físicas tienen un ID de proveedor (ej. `B_12345` que se lee del QR). T-Virtual las conoce por su propio Código de Servicio (ej. `DTA43337`). Necesitamos un diccionario para traducirlos.

En **Firestore (Base de datos)** crearemos una colección llamada `voltaje_machines_erp`. Cada documento representará una máquina:
*   **ID del Documento:** `B_12345` (ID del QR)
*   **Campo:** `tVirtualCode: "DTA43337"`

### B. El Llamado a la API (Backend)
Cuando un cliente finaliza un alquiler, la función `calculateRentalCharge` en Firebase calculará el costo total en Bolívares (ej. 30 Bs). Justo después de descontar el saldo del usuario, Firebase hará una petición (Request) silenciosa a la API de T-Virtual.

---

## 4. Código Propuesto para el Backend (Cloud Functions)

Este es el bloque de código que se integrará dentro de la función `calculateRentalCharge` en `functions/src/index.ts`:

```typescript
// SOLAMENTE SI HUBO COBRO (chargeVES > 0) PROCEDEMOS A FACTURAR
if (chargeVES > 0) {
    try {
        // 1. Buscamos en el diccionario de Firebase cómo se llama esta máquina en T-Virtual
        const erpDoc = await db.collection('voltaje_machines_erp').doc(machineId).get();
        
        if (erpDoc.exists && erpDoc.data()?.tVirtualCode) {
            const tVirtualCode = erpDoc.data()!.tVirtualCode; // Ejemplo: Atrapa "DTA43337"

            // 2. ARMAMOS LA ORDEN PARA T-VIRTUAL
            // (El formato exacto dependerá del manual de API de T-Virtual)
            const payload = {
                cliente_documento: "V00000000", // Consumidor final
                cliente_nombre: "Consumidor Final",
                moneda: "VES",
                detalles: [
                    {
                        codigo_servicio: tVirtualCode, // ---> Se envía "DTA43337"
                        cantidad: 1,
                        precio_unitario: chargeVES,    // ---> Total cobrado en la app (ej. 30 Bs)
                        // NOTA: T-Virtual recibirá el total y, al detectar el código DTA43337, 
                        // aplicará automáticamente su regla interna (100% o 70/30) para facturar.
                    }
                ]
            };

            // 3. HACEMOS EL LLAMADO A LA API DE T-VIRTUAL
            const tvirtual_api_url = "https://api.tvirtual.net/crearFactura"; // URL ilustrativa
            const tvirtual_token = process.env.TVIRTUAL_API_KEY;
            
            const response = await axios.post(tvirtual_api_url, payload, {
                headers: { 'Authorization': `Bearer ${tvirtual_token}` }
            });

            console.log(`✅ Factura enviada a T-Virtual para la máquina ${tVirtualCode}.`);

        } else {
            console.warn(`⚠️ La máquina ${machineId} no tiene un código de T-Virtual asignado en la base de datos.`);
        }
    } catch (error) {
        // El proceso falla silenciosamente para no impedir que la app del usuario termine de funcionar.
        // La factura quedará pendiente de procesamiento manual.
        console.error("❌ Error comunicándose con T-Virtual:", error);
    }
}
```

---

## 5. Beneficios de este Enfoque

1. **Delegación Total:** La App no necesita saber matemáticas de alianzas. Se vuelve más rápida y menos propensa a errores financieros.
2. **Control Centralizado:** Si se desea cambiar la comisión de un local de 30% a 40%, el cambio se hace exclusivamente en T-Virtual. **No hay que reprogramar ni actualizar la App de Voltaje.**
3. **Manejo de Errores Seguro (Try/Catch):** Si los servidores de T-Virtual se caen temporalmente, la App de Voltaje sigue funcionando con normalidad; el cliente devuelve su batería sin notar ninguna falla.

---

## 6. Próximos Pasos para Implementación

Para escribir el código definitivo e integrarlo a producción, se requiere la siguiente información del equipo de T-Virtual:
1. **Endpoint (URL):** La dirección web exacta a la que Firebase debe enviar la petición para crear la factura.
2. **Formato JSON (Payload):** Un ejemplo exacto de cómo T-Virtual espera recibir los datos (nombres exactos de las variables como `precio`, `codigo_item`, `cliente`, etc.).
3. **Credenciales (Tokens/Keys):** Claves de autorización para realizar pruebas y posteriormente pasar a entorno de producción.
