# Blueprint de Migración VoltajeVzla V2.0

## Objetivo Central
Reemplazar el sistema actual (SaaS Chino "White Label") por una plataforma propietaria en **Flutter + Firebase** para el **15 de Marzo**.

## 1. Estrategia de Prueba "Sidecar" (Fase 0 - No Destructiva) 🧪
*   **Antes de Tocar Nada:**
    *   No tocaremos los DNS ni los QRs físicos.
    *   La App Vieja y el Sistema Chino siguen funcionando al 100%.
*   **La Prueba:**
    *   Instalamos la **APK Nueva** en tu teléfono.
    *   Esta APK se conecta a nuestro **Backend Firebase**.
    *   El Backend Firebase se conecta al Sistema Chino usando el "Token Admin" (como si fueras tú dando clic en el panel).
*   **Resultado:** Podrás escanear, pagar y liberar la batería con la App Nueva, sin interrumpir a los clientes de la App Vieja.

## 2. Estrategia de "Kill Switch" (DNS Hijacking - Fase Final)
*   **Punto de Entrada Actual:** Las máquinas y la App vieja apuntan a `https://m.voltajevzla.com`.
*   **Acción:** Redirigir el DNS de este dominio hacia **Firebase Hosting**.
*   **Efecto:**
    1.  **Máquinas:** Enviarán sus "latidos" a nuestras Cloud Functions en lugar del servidor chino.
    2.  **Usuarios App Vieja:** La App fallará (crash controlado) al no recibir la respuesta esperada.
    3.  **Usuarios Web:** Verán la nueva PWA Flutter V2.0.

## 2. Arquitectura Técnica (El "Tesla" Venezolano)

### A. El Cerebro (Backend IoT)
Las máquinas actuales ("CDB Web") hablan con `/cdb-web-api/v1`. Debemos crear **Cloud Functions** que "imiten" o intercepten estas rutas:

1.  **Ruta Crítica:** `/cdb-web-api/v1/**` -> redirige a `iotHandler`.
2.  **Lógica `iotHandler`:**
    - Recibe el `device_id` de la máquina.
    - Consulta Firestore (`collection: machines`).
    - Si `status == 'unlock_requested'` -> Responde con el JSON de desbloqueo (obtenido por sniffing).
    - Si no -> Responde `{ "code": 200, "msg": "wait" }` (Heartbeat).

### B. El Dinero (Integración BNC)
Aquí entra mi análisis previo de la API SNP/BNC:
- **Cloud Function `bncCallback`:**
    - Endpoint público para recibir Webhooks del banco.
    - Valida `x-api-key`.
    - Desencripta el payload (AES+SHA256).
    - Si es exitoso -> Actualiza saldo en Firestore -> Dispara evento de "Desbloquear Batería".

### C. La Nueva Experiencia (Frontend)
- **Tecnología:** Flutter Web (PWA) + Mobile (iOS/Android).
- **Mapa:** Google Maps (Usando Key propia, no la china).
- **Pagos:**
    - Botón "Pago Móvil" (Genera código/instrucciones).
    - Botón "Binance Pay".
    - Botón "Reintegro" (C2P/Vuelto Digital).

### D. Estrategia de Diseño & UX (Basado en Referencias) 🎨
Analizando la carpeta `referenciasAppMobile`, la nueva App debe seguir estos lineamientos estrictos:

1.  **Map-First Experience:** La App NO usa un "BottomNavigationBar" tradicional. Usa una **Interfaz Flotante (Stack Widget)** sobre el mapa a pantalla completa.
2.  **Marcadores Personalizados:** Nada de "pines rojos" de Google. Usaremos `BitmapDescriptor` con el ícono de la **Torre de Carga** (como se ve en la publicidad) para que el usuario reconozca el hardware físico.
3.  **Botón Central "Píldora":** El botón "Escanear código QR" debe ser una **Píldora Flotante Gigante** en la parte inferior, accesible con el pulgar (Colores: Blanco/Verde Voltaje).
4.  **Paleta de Colores:**
    - **Primario:** Verde Voltaje (#Hex por definir del logo).
    - **Secundario:** Naranja Vibrante (Gradientes).
    - **Modo Oscuro:** "Industrial Dark" para mapas nocturnos.

## 3. Riesgos Detectados & Mitigaciones
1.  **Protocolo IoT Desconocido:**
    - *Riesgo:* No sabemos *exactamente* qué JSON espera la máquina para soltar la batería.
    - *Solución:* Necesitamos hacer "Sniffing" (captura de tráfico) de una máquina real operando con el sistema viejo antes de cambiar el DNS.

2.  **Seguridad BNC:**
    - *Riesgo:* Fallar la certificación de "Ping".
    - *Solución:* Implementar el endpoint de prueba `bnc_ping` en la primera semana.

3.  **Mapas:**
    - *Riesgo:* La App vieja tiene estilos hardcoded (`google_map_style.json`).
    - *Solución:* La nueva App tendrá su propio estilo "Cyberpunk/Industrial".

## 4. Cronograma Ajustado (30 Días)
- **Semana 1:** Setup Firebase + Cloud Functions (IoT Mock) + Sniffing de Máquina.
- **Semana 2:** Integración BNC (Cifrado + Webhooks) + Base de Datos Firestore.
- **Semana 3:** Desarrollo Frontend Flutter (Login, Mapa, Billetera).
- **Semana 4:** Pruebas de Campo con Testers + Cambio DNS (El Gran Salto).

---
*Este documento fusiona la visión del informe previo con el análisis técnico de las APIs BNC y el sistema legacy.*

### E. Análisis Forense del APK (Decompilado) 🕵️‍♂️
Tras analizar la estructura interna de la App `com.voltajevzla.charge` (Flutter), confirmamos:

1.  **Firebase Project ID:** `voltajevzla-25454`. (Deberemos crear uno nuevo para tener control total).
2.  **Estilos de Mapa:** Hemos extraído el archivo `google_map_style.json` original. Podemos replicar *exactamente* el modo oscuro actual si lo deseas.
3.  **Seguridad:** No se encontraron claves de API en texto plano para el backend chino en los assets. Esto confirma que la lógica crítica está compilada en binario (`libapp.so`), reforzando que la única vía viable de migración es la **Interceptación DNS** y el **Proxy Admin (Token)**.
