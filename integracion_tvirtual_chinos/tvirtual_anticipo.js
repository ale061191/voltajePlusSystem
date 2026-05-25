// ============================================================
// ANTICIPO DE CLIENTES - T-VIRTUAL
// 客户预付款 - T-VIRTUAL 集成
// ============================================================
//
// Endpoint: POST /api/cxc/registrar-anticipos
// 
// ¿Cuándo usar? Cuando el cliente paga por adelantado:
//   - Recarga de saldo (Wallet)
//   - Depósito de garantía (Power Bank)
//   - Pago anticipado de alquiler
//
// 何时使用? 当客户预付时:
//   - 余额充值 (钱包)
//   - 押金 (充电宝)
//   - 预付租金
//
// ============================================================

const fetch = require('node-fetch'); // npm install node-fetch@2

// ============================================================
// CONFIGURACIÓN / 配置
// ============================================================
const CONFIG = {
  QA: {
    URL: 'https://qa.tvirtual.net/api/cxc/registrar-anticipos',
    TOKEN: '3fC7a2rSBB8qTcY6b9jptUurfjly0LIFPfHcfxNPj3zrezTM',
    // Clasificación debe existir en T-Virtual:
    // Bancos > Maestros > Clasificacion de Flujo de Caja
    // 分类必须在 T-Virtual 中存在
    CLASIFICACION: 'anticipo de clientes',
  },
  PROD: {
    URL: 'https://sav.tvirtual.net/api/cxc/registrar-anticipos',
    TOKEN: '3fC7a2rSBB8qTcY6b9jptUurfjly0LIFPfHcfxNPj3zrezTM',
    CLASIFICACION: 'anticipo de clientes',
  }
};

// ============================================================
// 1. REGISTRAR ANTICIPO / 注册预付款
// ============================================================
//
// Parámetros / 参数:
//   cliente       - RIF del cliente (ej: "J401210031" o "12345678")
//                    客户RIF
//   cuentaBanco   - Cuenta contable del banco/efectivo en T-Virtual
//                    银行/现金科目代码
//   monto         - Monto del anticipo (ej: 100.00)
//                    金额
//   referencia    - Número de referencia (máx 10 dígitos)
//                    参考号 (最多10位)
//   fecha         - Fecha YYYY-MM-DD (ej: "2026-05-21")
//                    日期
//   concepto      - Descripción (máx 100 chars)
//                    描述
//   tasa          - Tasa BCV (1 si es Bs, tasa del día si es USD)
//                    汇率 (Bs=1, USD=BCV汇率)
//   env           - "qa" o "prod"
// ============================================================
async function registrarAnticipo({
  cliente,
  cuentaBanco,
  monto,
  referencia,
  fecha,
  concepto,
  tasa = 1,
  env = 'qa'
}) {
  const config = env === 'prod' ? CONFIG.PROD : CONFIG.QA;

  // Payload según documentación T-Virtual / 按T-Virtual文档
  const payload = {
    cliente: cliente,                    // RIF del cliente
    cuenta_contable: cuentaBanco,        // Cuenta de banco/efectivo
    monto: monto,                        // Monto total
    numero: String(referencia).slice(0, 10), // Ref num, máx 10 dígitos
    fecha: fecha,                        // YYYY-MM-DD
    clasificacion: config.CLASIFICACION, // Debe existir en T-Virtual
    concepto: String(concepto).slice(0, 100), // Máx 100 caracteres
    tasa: tasa                           // 1 = Bs, o tasa BCV para USD
  };

  console.log(`[${env.toUpperCase()}] Enviando anticipo... / 发送预付款...`);
  console.log('Payload:', JSON.stringify(payload, null, 2));

  const response = await fetch(config.URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${config.TOKEN}`
    },
    body: JSON.stringify(payload)
  });

  const data = await response.json();
  console.log('Respuesta / 响应:', JSON.stringify(data, null, 2));

  return { status: response.status, data };
}

// ============================================================
// 2. EJEMPLOS DE USO / 使用示例
// ============================================================

// --- EJEMPLO 1: Anticipo en Bs (recarga de saldo) ---
// --- 示例1: 玻利瓦尔预付 (余额充值) ---
async function ejemploRecargaSaldo() {
  console.log('\n═══════════════════════════════════════════');
  console.log('  RECARGA DE SALDO / 余额充值');
  console.log('═══════════════════════════════════════════\n');

  const result = await registrarAnticipo({
    cliente: '19932878',              // RIF del cliente (sin V)
    cuentaBanco: '1112001',           // Cuenta de banco en T-Virtual
    monto: 50.00,                     // Bs. 50,00
    referencia: Date.now() % 10000000000, // Número único
    fecha: new Date().toISOString().split('T')[0], // Hoy
    concepto: 'Recarga de saldo wallet - Power Bank',
    tasa: 1,                          // Bs
    env: 'qa'
  });

  if (!result.data.error) {
    console.log('\n✅ ANTICIPO REGISTRADO / 预付款已登记');
  } else {
    console.log('\n❌ ERROR / 错误:', result.data.mensaje || result.data.error);
  }
}

// --- EJEMPLO 2: Anticipo en USD (depósito de garantía) ---
// --- 示例2: 美元预付 (押金) ---
async function ejemploDepositoGarantia() {
  console.log('\n═══════════════════════════════════════════');
  console.log('  DEPÓSITO DE GARANTÍA / 押金');
  console.log('═══════════════════════════════════════════\n');

  const result = await registrarAnticipo({
    cliente: '26673475',
    cuentaBanco: '1112001',
    monto: 10.00,
    referencia: 5555,
    fecha: '2026-05-21',
    concepto: 'Depósito garantía Power Bank',
    tasa: 504.55,                     // Tasa BCV del día
    env: 'qa'
  });

  if (!result.data.error) {
    console.log('\n✅ ANTICIPO REGISTRADO / 预付款已登记');
  } else {
    console.log('\n❌ ERROR / 错误:', result.data.mensaje || result.data.error);
  }
}

// --- EJEMPLO 3: Desde Flutter (cómo llamar) ---
// --- 示例3: 从Flutter调用 ---
//
// En Flutter usarías Firebase Callable Function:
// 在Flutter中使用Firebase Callable Function:
//
// ```dart
// final HttpsCallable callable = FirebaseFunctions.instance
//     .httpsCallable('registrarAnticipoTVirtual');
// final result = await callable({
//   'cliente': clienteRif,
//   'cuentaBanco': '1112001',
//   'monto': monto,
//   'referencia': referencia,
//   'fecha': fecha,
//   'concepto': 'Recarga de saldo',
//   'tasa': 1,
//   'env': 'prod'
// });
// ```

// ============================================================
// 3. VALIDACIONES IMPORTANTES / 重要验证
// ============================================================
//
// ✅ La "cuenta_contable" debe ser de BANCO/CAJA, no de ingreso
//    科目必须是银行/现金科目, 不是收入科目
//    - Facturación usa cuenta de INGRESO (ej: 1112001)
//    - Anticipo usa cuenta de BANCO (ej: 1111004)
//
// ✅ "clasificacion" debe existir en T-Virtual:
//    分类必须在T-Virtual中创建:
//    Bancos > Maestros > Clasificacion de Flujo de Caja
//
// ✅ "numero" es la referencia del anticipo (máx 10 dígitos)
//    预付款参考号 (最多10位数字)
//
// ✅ "tasa" = 1 si es en Bolívares
//    如果是玻利瓦尔, 汇率=1
//    Si es USD, usar tasa BCV del día
//    如果是美元, 使用当天的BCV汇率

// ============================================================
// 4. LISTA DE CUENTAS CONTABLES POSIBLES / 可能的科目列表
// ============================================================
//
// Estas cuentas deben estar configuradas en T-Virtual como
// cuentas de banco/caja:
// 这些科目必须在T-Virtual中配置为银行/现金科目:
//
//   1111004 - Banco Provincial (PROD)
//   1112001 - Banco Mercantil (QA ✅)
//   1113001 - Banco Venezuela
//   1101001 - Caja Principal
//   1131001 - Efectivo
//
// ⚠️ En QA solo 1112001 funciona como cuenta bancaria
// ⚠️ 在QA环境中只有1112001可以作为银行账户使用
// ⚠️ En PROD se debe usar 1111004
// ⚠️ 在生产环境中应使用1111004
//
// ⚠️ QA tiene períodos contables cerrados para 2026
// ⚠️ QA环境的2026会计期间已关闭
//    Solicitar a Unidigital que abra el período en QA
//    请向Unidigital请求在QA中打开会计期间
//
// Pregunta a T-Virtual qué cuentas de banco tienen disponibles
// 请询问T-Virtual有哪些银行科目可用

// ============================================================
// EXPORT / 导出
// ============================================================
module.exports = { CONFIG, registrarAnticipo };

// ============================================================
// EJECUTAR / 运行
// ============================================================
// Descomenta para probar / 取消注释以测试:
//
// ejemploRecargaSaldo().catch(console.error);
// ejemploDepositoGarantia().catch(console.error);
