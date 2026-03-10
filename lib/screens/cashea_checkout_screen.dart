import 'package:flutter/material.dart';
import 'package:cloud_functions/cloud_functions.dart';
import '../core/constants/app_colors.dart';
import 'cashea_webview_screen.dart';
import '../../services/location_tracking_service.dart';

/// Flujo Cashea:
/// 1. Llama al backend → obtiene checkoutUrl (web.cashea.app/?order-payload-id=X)
/// 2. Abre WebView interno (CasheaWebViewScreen) con esa URL
/// 3. El WebView intercepta voltaje://cashea/return?idNumber=XXX al confirmar
///    o   voltaje://cashea/cancel si el usuario cancela
/// 4. Se confirma el pago con el backend y se desbloquea la máquina
class CasheaCheckoutScreen extends StatefulWidget {
  final String machineId;
  final int slotId;
  final double amount;

  const CasheaCheckoutScreen({
    super.key,
    required this.machineId,
    this.slotId = 1,
    this.amount = 400.00,
  });

  @override
  State<CasheaCheckoutScreen> createState() => _CasheaCheckoutScreenState();
}

enum _CasheaStep {
  creatingOrder,  // llamando al backend
  confirming,     // recibido retorno del WebView, confirmando con el backend
  done,           // proceso terminado
  error,
}

class _CasheaCheckoutScreenState extends State<CasheaCheckoutScreen> {
  _CasheaStep _step = _CasheaStep.creatingOrder;
  String? _errorMessage;

  @override
  void initState() {
    super.initState();
    _createCasheaOrder();
  }

  // ─── Backend: crear orden ─────────────────────────────────────────────────

  Future<void> _createCasheaOrder() async {
    setState(() {
      _step = _CasheaStep.creatingOrder;
      _errorMessage = null;
    });

    try {
      final callable = FirebaseFunctions.instanceFor(region: 'us-central1')
          .httpsCallable(
        'createCasheaOrder',
        options: HttpsCallableOptions(timeout: const Duration(seconds: 45)),
      );

      debugPrint('Cashea: llamando createCasheaOrder...');
      final result = await callable.call({
        'amount': widget.amount,
        'machineId': widget.machineId,
        'slotId': widget.slotId,
      });
      debugPrint('Cashea: respuesta recibida: ${result.data}');

      final data = Map<String, dynamic>.from(result.data as Map);

      if (data['success'] == true && data['checkoutUrl'] != null) {
        final checkoutUrl = data['checkoutUrl'] as String;
        await _openWebView(checkoutUrl);
      } else {
        _setError(data['message'] ?? 'Error al crear la orden de Cashea');
      }
    } on FirebaseFunctionsException catch (e) {
      final msg = 'Error Firebase [${e.code}]: ${e.message}';
      debugPrint('Cashea createOrder FirebaseFunctionsException: $msg\nDetails: ${e.details}');
      _setError(msg);
    } catch (e, st) {
      debugPrint('Cashea createOrder Error: $e\n$st');
      _setError('Error: $e');
    }
  }

  // ─── Abrir WebView interno ────────────────────────────────────────────────

  Future<void> _openWebView(String url) async {
    if (!mounted) return;

    // Navegar al WebView y esperar el resultado
    final result = await Navigator.of(context).push<CasheaWebViewResult>(
      MaterialPageRoute(
        builder: (_) => CasheaWebViewScreen(checkoutUrl: url),
        fullscreenDialog: true,
      ),
    );

    if (!mounted) return;

    if (result == null || result.cancelled) {
      // Usuario cerró el WebView sin completar el pago
      _setError('Pago cancelado.');
      return;
    }

    if (result.success && result.idNumber != null) {
      _confirmCasheaOrder(result.idNumber!);
    } else if (result.success && result.idNumber == null) {
      // Cashea confirmó pero sin idNumber — puede que el pago ya se procesó
      _setError(
        'Cashea devolvió confirmación sin número de orden.\n'
        'Contacta a soporte si el pago fue procesado.',
      );
    }
  }

  // ─── Backend: confirmar pago ──────────────────────────────────────────────

  Future<void> _confirmCasheaOrder(String idNumber) async {
    if (!mounted) return;
    setState(() => _step = _CasheaStep.confirming);

    try {
      final callable = FirebaseFunctions.instanceFor(region: 'us-central1')
          .httpsCallable(
        'confirmCasheaOrder',
        options: HttpsCallableOptions(timeout: const Duration(seconds: 45)),
      );

      final result = await callable.call({
        'idNumber': idNumber,
        'machineId': widget.machineId,
        'slotId': widget.slotId,
      });

      final data = Map<String, dynamic>.from(result.data as Map);

      if (!mounted) return;

      if (data['unlockStatus'] == 'UNLOCKED') {
        LocationTrackingService().startTracking(widget.machineId);
      }

      setState(() => _step = _CasheaStep.done);

      _showResultDialog(
        success: data['unlockStatus'] == 'UNLOCKED',
        message: data['message'] ?? 'Proceso completado',
      );
    } catch (e) {
      if (mounted) {
        _showResultDialog(
          success: false,
          message: 'Error al confirmar el pago. Contacta soporte.',
        );
      }
      debugPrint('Cashea confirmOrder Error: $e');
    }
  }

  // ─── Helpers ──────────────────────────────────────────────────────────────

  void _setError(String message) {
    if (mounted) {
      setState(() {
        _step = _CasheaStep.error;
        _errorMessage = message;
      });
    }
  }

  void _showResultDialog({required bool success, required String message}) {
    showDialog(
      context: context,
      barrierDismissible: false,
      builder: (ctx) => AlertDialog(
        backgroundColor: AppColors.surfaceDark,
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(16),
          side: BorderSide(
            color: success
                ? AppColors.neonGreen.withValues(alpha: 0.5)
                : AppColors.neonRed.withValues(alpha: 0.5),
          ),
        ),
        title: Icon(
          success ? Icons.check_circle : Icons.error,
          color: success ? AppColors.neonGreen : AppColors.neonRed,
          size: 56,
        ),
        content: Text(
          message,
          style: const TextStyle(color: Colors.white, fontSize: 16),
          textAlign: TextAlign.center,
        ),
        actions: [
          TextButton(
            onPressed: () {
              Navigator.of(ctx).pop();
              Navigator.of(context).popUntil((route) => route.isFirst);
            },
            child: Text(
              'Aceptar',
              style: TextStyle(
                color: success ? AppColors.neonGreen : AppColors.neonCyan,
                fontWeight: FontWeight.bold,
              ),
            ),
          ),
        ],
      ),
    );
  }

  // ─── UI ───────────────────────────────────────────────────────────────────

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.backgroundBlack,
      appBar: AppBar(
        title: const Text('Pago con Cashea'),
        backgroundColor: AppColors.surfaceDark,
        leading: IconButton(
          icon: const Icon(Icons.arrow_back),
          onPressed: () => Navigator.pop(context),
        ),
      ),
      body: _buildBody(),
    );
  }

  Widget _buildBody() {
    switch (_step) {
      // ── Creando la orden ──
      case _CasheaStep.creatingOrder:
        return const Center(
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              CircularProgressIndicator(color: AppColors.neonCyan),
              SizedBox(height: 20),
              Text(
                'Preparando pago con Cashea...',
                style: TextStyle(color: Colors.white, fontSize: 15),
              ),
            ],
          ),
        );

      // ── Confirmando con el backend ──
      case _CasheaStep.confirming:
        return const Center(
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              CircularProgressIndicator(color: AppColors.neonGreen),
              SizedBox(height: 20),
              Text(
                'Confirmando pago y desbloqueando...',
                style: TextStyle(color: Colors.white, fontSize: 15),
              ),
              SizedBox(height: 8),
              Text(
                'No cierres la aplicación',
                style: TextStyle(color: AppColors.neonGreen, fontSize: 13),
              ),
            ],
          ),
        );

      // ── Error ──
      case _CasheaStep.error:
        return Center(
          child: Padding(
            padding: const EdgeInsets.all(32),
            child: Column(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                const Icon(Icons.error_outline,
                    color: AppColors.neonRed, size: 56),
                const SizedBox(height: 16),
                Text(
                  _errorMessage ?? 'Error desconocido',
                  style: const TextStyle(color: Colors.white, fontSize: 15),
                  textAlign: TextAlign.center,
                ),
                const SizedBox(height: 24),
                ElevatedButton.icon(
                  onPressed: _createCasheaOrder,
                  icon: const Icon(Icons.refresh),
                  label: const Text('Reintentar'),
                  style: ElevatedButton.styleFrom(
                    backgroundColor: AppColors.neonCyan,
                    foregroundColor: Colors.black,
                    padding: const EdgeInsets.symmetric(
                        horizontal: 32, vertical: 14),
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(12),
                    ),
                  ),
                ),
              ],
            ),
          ),
        );

      case _CasheaStep.done:
        return const Center(
          child: CircularProgressIndicator(color: AppColors.neonGreen),
        );
    }
  }
}
