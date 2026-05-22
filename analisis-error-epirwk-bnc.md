# Análisis: Error BNC `EPIRWK` en Pagos desde la App

## 1. Resumen
Los pagos desde la app están fallando con el error **`EPIRWK`** ("Petición denegada por medidas de seguridad"). El equipo de auditoría de BNC ya confirmó la causa y la solución. Este documento explica ambos y sugiere formas de optimizar la implementación actual.

---

## 2. ¿Qué es la WorkingKey?

El Banco Nacional de Crédito (BNC) usa un sistema de **doble llave**:

| Llave | Cómo se obtiene | Duración | Uso |
|-------|----------------|----------|-----|
| **MasterKey** | Te la da BNC al registrarte | Permanente | Solo para hacer LogOn (obtener WorkingKey) |
| **WorkingKey** | Se obtiene vía `/Auth/LogOn` | **24 horas** (hasta medianoche) | Para cifrar todas las operaciones (P2P, C2P, ValidateP2P, Balance, etc.) |

**Flujo correcto:**
```
MasterKey → LogOn() → WorkingKey (válida hoy)
                              ↓
               Cifra todas las operaciones del día
                              ↓
                   Al llegar medianoche → EXPIRA
                              ↓
               Se necesita LogOn() de nuevo para obtener
               una WorkingKey fresca
```

---

## 3. Evidencia del Error

### 3.1 Lo que devuelve BNC
```
Status: 409 Conflict
Response Body: EPIRWKPetición denegada por medidas de seguridad.
```

- **`EPI`** = Prefijo de error estándar de BNC
- **`RWK`** = WorkingKey rechazada
- **Mensaje**: "Petición denegada por medidas de seguridad"

### 3.2 Lo que registra el backend
```
JSONException: syntax error, pos 1, line 1, column 2
  at ... BncEnLineaManager.validateP2P(BncEnLineaManager.java:415)
```

El código espera que BNC devuelva **JSON** pero recibe texto plano (`EPIRWK...`). El error de JSON es un **efecto secundario** — el problema real es que la WorkingKey ya expiró.

---

## 4. Causa Raíz

Actualmente la WorkingKey se obtiene al iniciar el servidor y se guarda en memoria para usarse en todas las operaciones subsecuentes. Esto funciona bien el mismo día, pero al llegar la medianoche la WorkingKey expira y BNC la rechaza.

No es un error de lógica ni de implementación — es simplemente que la WorkingKey tiene una **fecha de vencimiento** y necesita renovarse periódicamente.

---

## 5. Solución Recomendada por BNC: Cron Job

BNC recomienda implementar una **tarea programada** (cron job) que ejecute `/Auth/LogOn` cada madrugada para renovar la WorkingKey antes de que expire.

### Opción A: Usar `@Scheduled` de Spring (si el proyecto usa Spring Boot)

```java
@Component
public class BncWorkingKeyJob {
    
    @Autowired private BncEnLineaManager bnc;
    
    // Se ejecuta a las 6:00 AM todos los días
    @Scheduled(cron = "0 0 6 * * ?")
    public void refreshWorkingKey() {
        try {
            WorkingKey nuevaWK = bnc.logon();
            BncEnLineaManager.actualizarWorkingKey(nuevaWK);
            log.info("✅ WorkingKey renovada correctamente");
        } catch (Exception e) {
            log.error("❌ No se pudo renovar WorkingKey: {}", e.getMessage());
        }
    }
}
```

### Opción B: Cron del sistema operativo (más simple, sin modificar código)

```bash
# En el servidor Linux, agregar a crontab -e:
# Ejecuta todas las madrugadas a las 5:00 AM
0 5 * * * curl -X POST https://servicios.bncenlinea.com:16100/api/Auth/LogOn \
  -H "Content-Type: application/json" \
  -d '{"ClientGUID":"bb9de856-...", "Reference":"CRON_$(date +%Y%m%d)", "Value":"...", "Validation":"..."}'
```

El endpoint `/Auth/LogOn` respondera con la nueva WorkingKey que el servidor debe almacenar y empezar a usar.

---

## 6. Optimización Sugerida

Además del cron job diario, hay una mejora que se podría considerar para hacer el sistema más robusto:

### Detectar WorkingKey expirada y renovar automáticamente

En lugar de depender solo del cron, se puede modificar `validateP2P` (y métodos similares) para que, si reciben `EPIRWK`, intenten un LogOn automático y reintenten la operación:

```java
public Response validateP2P(Payload pago) {
    for (int intento = 0; intento < 2; intento++) {
        Response res = bncApi.call("/Position/ValidateP2P", cifrar(pago, this.workingKey));
        
        if (res.isOk()) {
            return res;
        }
        
        // Si el error es EPIRWK, renovar y reintentar una vez
        if (res.getCode().equals("EPIRWK")) {
            log.warn("⚠️ WorkingKey expirada, renovando...");
            this.workingKey = bncApi.logon();
            continue;  // reintenta con la nueva WorkingKey
        }
        
        // Otro error, no reintentar
        break;
    }
    throw new RuntimeException("Pago rechazado después de reintentar");
}
```

Esto funciona como **respaldo** por si el cron falla un día (mantenimiento del servidor, reinicio, etc.). El cron sigue siendo la solución principal, pero este mecanismo evita que un fallo del cron detenga los pagos.

### Otra mejora: cachear la WorkingKey con expiración programada

Si se prefiere evitar el cron externo, se puede usar un caché con tiempo de vida (TTL):

```java
// La WorkingKey se refresca automáticamente cada 23 horas
private static final long WORKING_KEY_TTL = 23 * 60 * 60 * 1000; // 23 horas
private static String workingKey;
private static long workingKeyExpiresAt = 0;

private String getWorkingKey() {
    if (System.currentTimeMillis() > workingKeyExpiresAt || workingKey == null) {
        workingKey = bncApi.logon();
        workingKeyExpiresAt = System.currentTimeMillis() + WORKING_KEY_TTL;
        log.info("🔄 WorkingKey renovada automáticamente");
    }
    return workingKey;
}
```

Cada vez que se necesita la WorkingKey, se verifica si sigue vigente; si no, se renueva sola.

---

## 7. Notas Técnicas (por si son útiles)

- El endpoint `/Auth/LogOn` usa `MasterKey` para cifrar. Las operaciones posteriores (`ValidateP2P`, `SendP2P`, etc.) usan `WorkingKey`. Son llaves independientes.
- La `Validation` es un SHA256 del payload JSON. El `Value` es el mismo payload cifrado con AES-256 (UTF-16LE, PBKDF2 con salt "Ivan Medvedev").
- La WorkingKey se recibe en el campo `WorkingKey` dentro del `value` descifrado de la respuesta de LogOn.
- El `Reference` de LogOn debe ser único cada vez (ej. `LOGON_20260521_001`, `CRON_0600`).

Si se requiere apoyo con la implementación del cron, los detalles de encriptación, o cualquier ajuste, cuenten con nosotros para lo que necesiten. ¡Quedamos atentos! 🙌
