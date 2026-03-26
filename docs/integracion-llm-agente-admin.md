# Integración de LLM al Sistema Voltaje Plus

## Objetivo

Construir un agente de inteligencia artificial que se conecte al sistema administrativo de Voltaje Plus y responda preguntas en lenguaje natural sobre el estado operativo del negocio en tiempo real.

---

## ¿Qué puede responder el agente?

- ¿Cuántas máquinas están activas / offline?
- ¿Cuántos power banks están dentro de las cabinas y cuántos por fuera?
- ¿Cuáles son las ganancias del día / semana / mes?
- ¿Ha habido fallas recientes? (unlocks con error 401, retiros fallidos, etc.)
- ¿Qué usuarios tienen alquileres activos en este momento?
- ¿Cuántas transacciones hubo por método de pago (P2P, Cashea, PayPal)?

---

## Arquitectura elegida: Agente con IA (Opción C)

```
Administrador escribe:
"¿Cuántos power banks están fuera de las cabinas?"
        ↓
Firebase Function "voltajeAgent"
        ↓
1. Consulta Bajie API  → estado de gabinetes y slots en tiempo real
2. Consulta Firestore  → voltaje_active_rentals, voltaje_transactions,
                         voltaje_users, rental_history
3. Construye un contexto con los datos reales
        ↓
Gemini 1.5 Flash API (Google AI)
        ↓
Respuesta en español natural:
"Actualmente hay 3 power banks fuera de las cabinas,
 todos con alquileres activos. El más antiguo lleva
 2 horas fuera desde la estación DTA34039."
```

---

## Fuentes de datos disponibles

| Fuente | Datos |
|---|---|
| `voltaje_active_rentals` | Alquileres activos en tiempo real |
| `voltaje_transactions` | Historial de pagos (P2P, Cashea, PayPal, retiros) |
| `voltaje_users` | Usuarios registrados y saldos de billetera |
| `rental_history` | Devoluciones completadas |
| `voltaje_withdrawal_locks` | Retiros procesados (idempotencia) |
| Bajie API `/cdb/cabinet/queryAll` | Estado de gabinetes, slots, power banks |
| Bajie API `/cdb/batcab/queryAll` | Slots por gabinete, batteries dentro/fuera |

---

## Opciones descartadas

### Opción B — Google Sheets + GPT personalizado
- Exportar datos a Google Sheets periódicamente
- Conectar un "My GPT" de ChatGPT al sheet
- **Descartada:** datos no son en tiempo real, requiere intervención manual para exportar

### Opción C (solo dashboard) — Sin IA
- Pantalla de métricas en la app admin
- **Descartada como única solución:** no permite preguntas libres en lenguaje natural

---

## Plan de implementación

### Paso 1 — Firebase Function `voltajeAgent`
- Recibe `{ question: string }` del admin autenticado
- Recopila datos de Firestore + Bajie API según el tipo de pregunta
- Construye un prompt con el contexto real
- Llama a Gemini 1.5 Flash API
- Devuelve la respuesta en texto

### Paso 2 — Credencial Gemini
- Crear API Key en https://aistudio.google.com/app/apikey
- Agregar al `.env` de functions: `GEMINI_API_KEY=...`
- Plan gratuito: **1,500 consultas/día** — suficiente para uso admin personal

### Paso 3 — Pantalla de chat en la app admin
- Nueva pantalla `admin_agent_screen.dart`
- Campo de texto para escribir la pregunta
- Historial de preguntas y respuestas en la sesión
- Acceso solo para usuarios con rol admin

---

## Costo estimado

| Servicio | Plan | Costo |
|---|---|---|
| Gemini 1.5 Flash | Gratuito hasta 1,500 req/día | $0 |
| Firebase Functions | Spark plan (gratuito) | $0 |
| Firestore reads | Incluidas en plan actual | $0 |
| **Total** | | **$0/mes** |

---

## Dependencias a instalar en `functions/`

```bash
npm install @google/generative-ai
```

---

## Ejemplo de prompt al LLM

```
Eres el asistente administrativo de Voltaje Plus, un sistema de alquiler
de power banks en Venezuela. Tienes acceso a los siguientes datos en
tiempo real:

GABINETES BAJIE:
- DTA34039: en línea, 7 slots ocupados, 1 disponible

ALQUILERES ACTIVOS: 2
- uid: abc123, inicio: hace 45 min, máquina: DTA34039
- uid: xyz789, inicio: hace 2h 10min, máquina: DTA34039

TRANSACCIONES HOY: 5
- 3x P2P_DEPOSIT (total: 1200 VES)
- 1x CASHEA (400 VES)
- 1x P2C_WITHDRAWAL (400 VES)

GANANCIAS NETAS HOY: 1200 VES

Responde la siguiente pregunta del administrador en español, de forma
clara y concisa:

"¿Cuánto hemos ganado hoy?"
```

---

## Estado actual

- [ ] Crear Firebase Function `voltajeAgent`
- [ ] Agregar `GEMINI_API_KEY` al `.env`
- [ ] Instalar `@google/generative-ai` en functions
- [ ] Crear pantalla `admin_agent_screen.dart`
- [ ] Conectar pantalla al router de admin
- [ ] Deploy y prueba

---

## Notas

- El agente solo es accesible para usuarios con rol admin (verificado en el backend)
- Las credenciales Gemini van en `.env` — nunca en el APK ni en git
- Si en el futuro se quiere más capacidad, Gemini 1.5 Pro cuesta ~$0.075 por 1M tokens (muy barato)
