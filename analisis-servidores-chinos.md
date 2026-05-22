# Análisis Técnico: Infraestructura de Servidores Voltaje

## Fecha del Análisis
20 de Mayo 2026

## Resumen Ejecutivo
Se detectaron **3 anomalías críticas** en la infraestructura de Voltaje:

1. **Backend legacy chino (`m.voltajevzla.com`) INACCESIBLE** — timeout total
2. **Dominio principal (`voltajevzla.com`) BLOQUEADO** tras captcha de Siteground
3. **Infraestructura híbrida** entre Siteground, Google Cloud y AWS sin coordinación aparente

---

## 1. Mapeo de Servidores

| Dominio | IP | Proveedor Cloud | Ubicación | Estado |
|---------|----|-----------------|-----------|--------|
| `voltajevzla.com` | `34.174.49.51` | **Google Cloud** (GCP) | `us-east1` | ⚠️ HTTP 202 + Captcha |
| `m.voltajevzla.com` | `18.230.37.154` | **AWS EC2** | `sa-east-1` (São Paulo) | ❌ Sin respuesta |
| Siteground Dashboard | — | Siteground (proxy/CDN) | — | Solo registro/DNS |

## 2. Detalle de Anomalías

### 2.1 `m.voltajevzla.com` — Backend Chino Caído

- **IP:** `18.230.37.154` (AWS EC2, São Paulo)
- **Puerto 443:** Sin respuesta (timeout)
- **Puerto 80:** Sin respuesta
- **Impacto:** La aplicación móvil y las máquinas no pueden comunicarse con el backend chino. Las operaciones de alquiler, desbloqueo y facturación están afectadas.

Posibles causas:
- Servidor EC2 apagado (stopped) o terminado
- Security Group bloqueando tráfico entrante (puertos 80/443 cerrados)
- Servicio web (nginx/apache/tomcat) caído dentro del servidor
- Deuda/corte del servicio AWS
- Nameserver/DNS no actualizado

### 2.2 `voltajevzla.com` — Captcha Bloqueante

- **IP:** `34.174.49.51` (Google Cloud)
- **HTTP Status:** `202 Accepted` (no es 200 OK)
- **Headers anómalos:**
  ```
  SG-Captcha: challenge
  Host-Header: 8441280b0c35cbc1147f8ba998a563a7
  ```
- **Comportamiento:** Siteground (el proxy/CDN) intercepta la petición con un captcha antes de llegar al servidor real en GCP

Esto significa que Siteground está actuando como **reverse proxy** delante de GCP, pero su seguridad bloquea incluso peticiones curl simples. Para acceder al sitio real, cualquier visitante debe resolver un captcha primero.

### 2.3 Arquitectura Híbrida no Documentada

Se identificaron **tres proveedores** involucrados sin una arquitectura clara:

| Proveedor | Rol Actual |
|-----------|-----------|
| **Siteground** | Registro de dominio + CDN/proxy con captcha |
| **Google Cloud (GCP)** | Servidor real del sitio principal (`34.174.49.51`) |
| **AWS (EC2)** | Servidor del backend chino (`18.230.37.154`) |

El flujo actual sería:
```
Usuario → Siteground (proxy/captcha) → GCP (voltajevzla.com)
Máquinas/App → AWS EC2 (m.voltajevzla.com) [CAÍDO]
```

## 3. Recomendaciones para Desarrolladores Chinos

### Acción Inmediata
1. **Verificar AWS EC2** (`18.230.37.154`):
   - Revisar si la instancia está running o stopped
   - Verificar Security Group (puertos 80/443 abiertos)
   - Verificar que el servicio web (Tomcat/Nginx) esté activo

2. **Verificar GCP** (`34.174.49.51`):
   - Confirmar que la instancia VM está activa
   - Verificar que el firewall permite tráfico desde Siteground

3. **Desactivar captcha de Siteground** para `voltajevzla.com`:
   - Acceder a Siteground → Security → SG-Captcha
   - Deshabilitar o configurar whitelist de IPs

### A Largo Plazo
1. **Unificar proveedor cloud** — Elegir entre GCP, AWS o Siteground, no los tres
2. **Monitoreo** — Implementar health checks (UptimeRobot, Pingdom)
3. **Migración del backend legacy** de AWS EC2 a la misma plataforma que el backend v2
4. **Documentar la arquitectura** para evitar depender de memoria institucional

## 4. Comandos de Verificación

```bash
# DNS
nslookup voltajevzla.com
nslookup m.voltajevzla.com

# Conectividad
curl -v https://voltajevzla.com
curl -v https://m.voltajevzla.com
curl -v https://m.voltajevzla.com/cdb-web-api/v1

# Headers completos
curl -s -D - https://voltajevzla.com -o /dev/null
```

## 5. Notas Adicionales

- El token de T-Virtual (`3fC7a2rSBB8qTcY6b9jptUurfjly0LIFPfHcfxNPj3zrezTM`) funciona correctamente en `qa.tvirtual.net` y `sav.tvirtual.net` (facturación digital)
- La API de Anticipos en `virtualuxor.com` no funciona con el token actual
- La integración con T-Virtual para facturación digital es independiente de estos servidores y sigue operativa
