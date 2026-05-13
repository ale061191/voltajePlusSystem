# Lista de Tareas

- [x] Explorar estructura del proyecto y documentación <!-- id: 0 -->
- [x] Diseño de App con Stitch (Diseño Aprobado) <!-- id: 15 -->
    - [x] Generar y validar diseños Dark/Neon <!-- id: 21 -->
- [x] **Implementación de Diseño Dark Neon** <!-- id: 25 -->
    - [x] **Fundación**: Actualizar `app_theme.dart` (Negro/Neón) <!-- id: 26 -->
    - [x] **Fundación**: Configurar `assets/style.json` (Mapa Oscuro) <!-- id: 27 -->
    - [x] **Screens:** `HomeScreen` (Map), `ProfileScreen`, `HistoryScreen` (Mock)
- [x] **Detailed:** `PaymentScreen` (P2P logic), `ScanScreen` (QR logic)
- [x] **Feedback (New):**
    - [x] Fix Map Screen (Custom marker, search bar)
    - [x] Fix Payment Screen (Tap to Copy)
    - [x] Billetera (Wallet) Implementation
    - [x] Search Screen (Basic)
- [/] **Migración a Firebase Serverless** <!-- id: 33 -->
    - [x] **Setup**: Inicializar Firebase (`firebase init functions`) <!-- id: 34 -->
    - [x] **Backend**: Portar lógica BNC a `functions/src/bnc.ts` <!-- id: 35 -->
    - [x] **Backend**: Portar lógica Bajie a `functions/src/bajie.ts` <!-- id: 36 -->
    - [x] **Backend**: Crear función `initiatePayment` <!-- id: 37 -->
    - [x] **Frontend**: Actualizar `payment_service.dart` para usar Cloud Functions <!-- id: 38 -->
    - [/] **Verificación**: Pruebas locales en Chrome (Manual requerida - Agente falló por env var) <!-- id: 39 -->
    - [x] **Refinamiento UI**: Ajustes Validación Login y Registro (Campos vacíos, Títulos) <!-- id: 40 -->
    - [x] **Backend**: Implementar `ValidateP2P` en `bncPayment.ts` <!-- id: 41 -->
    - [x] **Frontend**: Actualizar `PaymentScreen` para P2P (Ref, Tlf, Monto) <!-- id: 42 -->
    - [x] **Debugging**: Análisis profundo con scripts directos (Fixed: package.json main field) <!-- id: 43 -->
    - [x] **UI**: Implementar Modal Neon de Éxito en Pago <!-- id: 44 -->

- [ ] **Fase 4: Despliegue y Entrega** <!-- id: 45 -->
    - [x] **Limpieza**: Eliminar logs de debug y código muerto <!-- id: 46 -->
    - [x] **Auth**: Cambiar a cuenta de Google del Cliente (con Billing) <!-- id: 49 -->
    - [x] **Despliegue**: Subir Cloud Functions a Firebase Production
    - [x] **Build APK**: Generar la aplicación para Android
    - [ ] **Prueba de Campo**: Ir a una máquina real, escanear un QR y ver si la batería sale.bas físicas <!-- id: 48 -->

- [ ] **Fase 5: Mapa en Tiempo Real (Bonus)** <!-- id: 50 -->
    - [x] **Backend**: Crear función `getStations` (Proxy a Bajie) <!-- id: 51 -->
    - [x] **Frontend**: Consumir servicio y pintar marcadores dinámicos (Updated with Lat/Lng) <!-- id: 52 -->

- [x] **Refactorización** <!-- id: 53 -->
    - [x] Fix `app_theme.dart` (colorScheme, withOpacity)
    - [x] Fix `home_screen.dart` (dart:ui, fromAssetImage)
    - [x] Fix `login_screen.dart` & `register_screen.dart` (withOpacity)
    - [x] Fix `history` & `profile` screens (withOpacity)
    - [x] Fix `payment_screen.dart` (withOpacity, value)
    - [x] Verificar `flutter analyze`

- [x] **Finalización (Últimos detalles)** <!-- id: 54 -->
    - [x] Implementar Lógica de Registro (Mock)
    - [x] Validar formato QR (Mock/Regex)

- [ ] **Fase 6: Feedback y Billetera (Post-APK v2)** <!-- id: 55 -->
    - [x] **Map Fix**: Diagnosticar pantalla blanca (API Key/SHA-1) <!-- id: 56 -->
    - [x] **Map Fix - Parte 2**: Habilitar "Maps SDK for Android" en Restricciones de API Key <!-- id: 56c -->
    - [x] **Confirmación Final**: Verificar que el mapa carga en v6 <!-- id: 57 -->

    - [x] **UI Map**: Aumentar tamaño del Pin/Marcador (120x120) <!-- id: 61 -->
    - [x] **UI Map**: Eliminar barra de navegación superior (Búsqueda) <!-- id: 62 -->
    - [x] **Data Intelligence**: Implementar `slots` array en `BajieService` (Mock detallado) <!-- id: 64 -->
    - [x] **Data Model**: Actualizar `StationModel` en Flutter para soportar `slots` <!-- id: 65 -->
    - [x] **UI Detail**: Crear BottomSheet para mostrar matriz de slots al tocar marcador <!-- id: 66 -->
    - [x] **Real Connection**: Inyectar tokens en `BajieService` y mapear endpoints `/cabinet/list` y `/batcab/queryAll` <!-- id: 67 -->

- [x] **Navigation & UI Polish**
    - [x] Fix Map Markers Disappearing
    - [x] Implement "My Location" (Blue Dot)
    - [x] Zoom to User Location on Start
    - [x] Detailed Station Bottom Sheet
    - [x] Implement Navigation (Polyline via HTTP)

- [-] **User Feedback v8 (In Progress)**
    - [ ] **Data & Scan**: Fix `/scan` route, verify `getStations` real data (slots status). <!-- id: 70 -->
    - [ ] **UI Polish**: Black theme for Bottom Sheet, Real Station Image, Fix "Hidden Button" (Hide FAB). <!-- id: 71 -->
    - [ ] **Navigation**: Fix "No Route Found" error (Debug API response). <!-- id: 72 -->

- [x] **Investigate Web App (`https://m.voltajevzla.com/#/`)** <!-- id: 14 -->
    - [x] Extract API endpoints and configuration. <!-- id: 15 -->
    - [x] Document findings in `voltaje_api_docs.md`. <!-- id: 16 -->

- [x] **Implement Real Voltaje API** <!-- id: 17 -->
    - [x] Create `VoltajeApiClient` (Dio). <!-- id: 18 -->
    - [x] Create `VoltajeStationDto`. <!-- id: 19 -->
    - [-] ~~Authentication (Reverse Auth via OTP)~~ (Failed - API Rejected/No SMS)
    - [x] **Authentication (Traffic Capture Strategy)** <!-- id: 17b -->
        - [x] Obtain `cURL` from User (Web App).
        - [x] Extract `token` and `userId`.
        - [x] Verify token with `probe_user_info.py` (Success).
    - [x] Create `VoltajeApiClient` (Dio). <!-- id: 18 -->
    - [x] Create `VoltajeStationDto`. <!-- id: 19 -->
    - [x] Integrate `StationService` with fallback logic. <!-- id: 20 -->
    - [/] Verify connectivity and data flow (Unit Tested). <!-- id: 21 -->
    - [x] **DEBUG**: 500 Internal Error. Resolved. Cause: Crash in mapping logic + Incorrect Hyphen. Fix: Safe Mapping + Full-width Hyphen. Status: Stable (Returns 200). <!-- id: 21-debug -->
    - [x] **Data Refinement**: Implement Dynamic Pricing (Price, Unit, Free Minutes) from API. <!-- id: 22 -->
    - [x] **P2P Readiness**: Verified `bncPayment.ts` is in MOCK MODE (Not ready for real money). <!-- id: 23 -->

- [x] **Fase 7: Producción BNC y Billetera (Reintegros)** <!-- id: 70 -->
    - [x] **Security**: Migrar credenciales BNC a Environment Variables (`process.env`). <!-- id: 71 -->
    - [x] **Backend**: Implementar `sendP2C` (Pago Móvil Saliente/Reintegro) en `bncPayment.ts`. <!-- id: 72 -->
    - [x] **Backend**: Crear Cloud Function `withdrawFunds`. <!-- id: 73 -->
    - [x] **Frontend**: Conectar botón "Retirar" en Billetera a `withdrawFunds`. <!-- id: 74 -->
