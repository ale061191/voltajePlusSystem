# Anticipo de Clientes — Explicación del Negocio
# 客户预付款 — 业务说明

---

### 🇪🇸 ¿Para qué sirve "Anticipo de Clientes"?

Es un **control administrativo interno** para rastrear el dinero que entra y sale de cada usuario por el servicio de alquiler.

**Ejemplo del flujo:**

1. **Usuario paga 12.000 Bs** → se registra como `"Anticipo de Clientes"` → sabemos cuánto dinero ingresó de ese usuario
2. **Usuario alquila power bank** → se descuenta de su saldo (factura)
3. **Usuario finaliza y retira saldo restante** → se registra como egreso con la misma clasificación `"Anticipo de Clientes"` → sabemos cuánto dinero le devolvimos

**Resumen:** La clasificación `"Anticipo de Clientes"` nos permite saber en todo momento cuánto dinero ha ingresado y egresado por cada usuario.

---

### 🇨🇳 业务说明：什么是"客户预付款"？

这是一个**内部管理控制**，用于追踪每个用户因租用服务产生的资金流入和流出。

**流程示例：**

1. **用户支付 12,000 Bs** → 记录为 `"Anticipo de Clientes"`（客户预付款）→ 我们知道该用户存入了多少钱
2. **用户租用充电宝** → 从余额中扣除（生成发票）
3. **用户结束租用并提取余额** → 使用相同的 `"Anticipo de Clientes"` 分类记录支出 → 我们知道退还了多少钱给该用户

**总结：** `"Anticipo de Clientes"` 分类让我们随时知道每个用户的资金流入和流出情况。

---

### 📌 Código

```javascript
// Registra cuando el usuario paga / 记录用户付款时
const payload = {
  cliente: "19932878",
  cuenta_contable: "1112001",
  monto: 12000,           // Pago del usuario / 用户付款
  numero: "1234567890",
  fecha: "2026-05-25",
  clasificacion: "Anticipo de Clientes",
  concepto: "Pago inicial servicio power bank",
  tasa: 1
};
// POST https://sav.tvirtual.net/api/cxc/registrar-anticipos
```
