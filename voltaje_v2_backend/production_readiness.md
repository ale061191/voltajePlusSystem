# Estado Actual vs. Producción (100% Funcional)

Actualmente, tenemos una **Integración "End-to-End" Simulada (Mocked)**. El flujo funciona lógicomente (App -> Backend -> Respuesta), pero no mueve dinero real ni desbloquea máquinas físicas.

Para llegar al **100% Funcional**, faltan los siguientes componentes críticos:

## 1. Pasarela de Pagos (BNC Real) 💰
*   **Faltante:** La URL de Producción Correcta para la API del Banco.
    *   *Estado:* Probamos `16500` (Sandbox - Error 409), `16501/16502` (Timeout).
    *   *Solución:* Confirmar con BNC el **Puerto Exacto** y si requieren **Whitelisting de IP** pública.
*   **Faltante:** Pruebas con Dinero Real.
    *   *Acción:* Una vez tengamos conexión, cambiar `BNC_USE_MOCK=false` en el `.env` y realizar un pago de prueba de bajo monto (ej. 1 VES).

## 2. Control de Máquinas (IoT Real) 🔋
*   **Faltante:** Documentación del Open API (`cdb-open-api`).
    *   *Estado:* El endpoint `/login` falla (`401 Token Error`) porque no sabemos el nombre correcto de los parámetros (`appId` vs `username`, etc).
    *   *Impacto:* No podemos desbloquear la máquina automáticamente sin esta documentación.
    *   *Solución:* Conseguir el PDF de integración del proveedor chino o usar las credenciales correctas.
*   **Alternativa Temporal:** Usar el Token Legacy (`IOT_TOKEN`), pero este expira cada pocas horas, lo cual **no** sirve para producción (requiere login manual constante).

## 3. Infraestructura y Base de Datos ☁️
*   **Faltante:** Base de Datos Real (PostgreSQL / MongoDB).
    *   *Estado:* Actualmente las transacciones solo se imprimen en la consola (`console.log`). Si el servidor se reinicia, se pierden.
    *   *Necesidad:* Guardar historial de pagos y alquileres.
*   **Faltante:** Despliegue en la Nube (AWS / DigitalOcean / Heroku).
    *   *Estado:* Corriendo en `localhost`.
    *   *Necesidad:* Un servidor accesible públicamente para que la App móvil funcione fuera de tu red WiFi local.

## 4. Experiencia de Usuario (App Móvil) 📱
*   **Faltante:** Gestión de Sesión / Perfil.
    *   *Estado:* El usuario debe escribir su Cédula, Teléfono y Banco *cada vez* que alquila.
    *   *Mejora:* Guardar estos datos en el almacenamiento local seguro del teléfono para agilizar futuros pagos.
*   **Faltante:** Historial de Alquileres en la App.

---

### Resumen de Prioridades
1.  **🔴 CRÍTICO:** Documentación Open API (para desbloquear máquinas).
2.  **🔴 CRÍTICO:** URL Producción BNC (para cobrar dinero real).
3.  **🟡 IMPORTANTE:** Desplegar Backend en Nube (para que la App funcione remota).
4.  **🟢 MEJORA:** Guardar datos de usuario en la App.
