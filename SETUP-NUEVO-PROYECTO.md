# 🚀 Setup Inicial — Nuevo Proyecto

## Instrucciones para el Agente IA

Lee y ejecuta esto en orden al iniciar un proyecto nuevo.

---

## Paso 1: Indexar con GitNexus

```bash
cd /ruta/del/proyecto
gitnexus analyze --skip-git
```

Esto crea el grafo de conocimiento del proyecto. El agente lo usará automáticamente para responder preguntas sobre el código.

---

## Paso 2: Inicializar GSD

Ejecutar en el chat del agente:

```
/gsd-new-project
```

Esto guiará la definición de requisitos, investigación y creación del roadmap.

---

## Paso 3: Copiar DESIGN.md (opcional)

Si se desea un estilo visual específico, copiar un `DESIGN.md` a la raíz del proyecto:

```
design-md/stripe/DESIGN.md  →  ./DESIGN.md
```

Luego pedir al agente: "genera UI con este diseño".

---

## Herramientas Instaladas (Globales)

| Herramienta | Comando / Uso |
|-------------|---------------|
| **GitNexus** | `gitnexus analyze` una vez por proyecto |
| **GSD** | `/gsd-new-project` al iniciar |
| **UI UX Pro Max** | Se activa solo al pedir diseño UI |
| **awesome-design-md** | Copiar `DESIGN.md` deseado al proyecto |
