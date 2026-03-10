import 'dart:async';
import 'package:flutter/material.dart';
import 'package:cloud_functions/cloud_functions.dart';
import 'package:url_launcher/url_launcher.dart';
import 'package:app_links/app_links.dart';
import '../core/constants/app_colors.dart';
import '../../services/location_tracking_service.dart';

/// Flujo Cashea:
/// 1. Llama al backend → obtiene checkoutUrl (web.cashea.app/?orderPayloadId=X)
/// 2. Abre Chrome (navegador externo) con esa URL
/// 3. Cashea redirige a voltaje://cashea/return?idNumber=XXX al confirmar
///    o   voltaje://cashea/cancel si el usuario cancela
/// 4. La app captura el deep link y confirma el pago con el backend
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
  creatingOrder,   // llamando al backend
  waitingUser,     // Chrome abierto, esperando que el usuario complete el pago
  confirming,      // recibido deep link, confirmando con el backend
  done,            // proceso terminado (éxito o error)
  error,
}

class _CasheaCheckoutScreenState extends State<CasheaCheckoutScreen>
    with WidgetsBindingObserver {
  _CasheaStep _step = _CasheaStep.creatingOrder;
  String? _errorMessage;
  String? _checkoutUrl;

  // Deep link listener
  final _appLinks = AppLinks();
  StreamSubscription<Uri>? _deepLinkSub;

  // Evitar doble confirmación
  bool _confirmationHandled = false;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addObserver(this);
    _listenDeepLinks();
    _createCasheaOrder();
  }

  @override
  void dispose() {
    _deepLinkSub?.cancel();
    WidgetsBinding.instance.removeObserver(this);
    super.dispose();
  }

  // ─── Deep link listener ───────────────────────────────────────────────────

  void _listenDeepLinks() {
    _deepLinkSub = _appLinks.uriLinkStream.listen((uri) {
      debugPrint('Deep link recibido: $uri');
      _handleDeepLink(uri);
    }, onError: (e) {
      debugPrint('Error deep link: $e');
    });
  }

  void _handleDeepLink(Uri uri) {
    if (_confirmationHandled) return;
    if (uri.scheme != 'voltaje' || uri.host != 'cashea') return;

    if (uri.path == '/return') {
      final idNumber = uri.queryParameters['idNumber'];
      if (idNumber != null && idNumber.isNotEmpty) {
        _confirmationHandled = true;
        _confirmCasheaOrder(idNumber);
      } else {
        // Retorno sin idNumber — Cashea confirmó pero sin ID en la URL
        // Intentar usar el orderId que tenemos
        _setError(
          'Cashea devolvió una respuesta sin número de orden.\n'
          'Contacta a soporte si el pago fue procesado.',
        );
      }
    } else if (uri.path == '/cancel') {
      _confirmationHandled = true;
      _setError('Pago cancelado por el usuario.');
    }
  }

  // ─── Backend: crear orden ─────────────────────────────────────────────────

  Future<void> _createCasheaOrder() async {
    setState(() {
      _step = _CasheaStep.creatingOrder;
      _errorMessage = null;
      _confirmationHandled = false;
    });

    try {
      // Especificar región explícita para evitar ambigüedad en el cliente
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
        _checkoutUrl = data['checkoutUrl'] as String;
        await _openCheckout(_checkoutUrl!);
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

  // ─── Abrir checkout en Chrome ─────────────────────────────────────────────

  Future<void> _openCheckout(String url) async {
    final uri = Uri.parse(url);
    bool launched = false;

    // Intento 1: abrir la app nativa de Cashea (App Links).
    // Puede lanzar PlatformException(ACTIVITY_NOT_FOUND) si Cashea no está instalada.
    try {
      launched = await launchUrl(
        uri,
        mode: LaunchMode.externalNonBrowserApplication,
      );
      debugPrint('Cashea: externalNonBrowserApplication launched=$launched');
    } catch (e) {
      debugPrint('Cashea: app nativa no disponible, fallback a Chrome. Error: $e');
      launched = false;
    }

    // Intento 2: abrir en el navegador externo (Chrome).
    if (!launched) {
      try {
        launched = await launchUrl(
          uri,
          mode: LaunchMode.externalApplication,
        );
        debugPrint('Cashea: externalApplication launched=$launched');
      } catch (e) {
        debugPrint('Cashea: externalApplication también falló: $e');
        launched = false;
      }
    }

    // Intento 3: modo por defecto del sistema (última opción).
    if (!launched) {
      try {
        launched = await launchUrl(uri);
        debugPrint('Cashea: platformDefault launched=$launched');
      } catch (e) {
        debugPrint('Cashea: platformDefault falló: $e');
        launched = false;
      }
    }

    if (!launched) {
      _setError(
        'No se pudo abrir el navegador.\n'
        'Instala Chrome e intenta de nuevo.\nURL: $url',
      );
      return;
    }
    if (mounted) {
      setState(() => _step = _CasheaStep.waitingUser);
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

      final data = Map<String, dynamic>.from(result.data);

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

      // ── Chrome abierto, esperando usuario ──
      case _CasheaStep.waitingUser:
        return Center(
          child: Padding(
            padding: const EdgeInsets.all(32),
            child: Column(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                Container(
                  width: 80,
                  height: 80,
                  decoration: BoxDecoration(
                    color: AppColors.surfaceDark,
                    borderRadius: BorderRadius.circular(20),
                  ),
                  child: const Icon(
                    Icons.open_in_browser,
                    size: 44,
                    color: AppColors.neonCyan,
                  ),
                ),
                const SizedBox(height: 24),
                const Text(
                  'Completa el pago en Cashea',
                  style: TextStyle(
                    color: Colors.white,
                    fontSize: 18,
                    fontWeight: FontWeight.bold,
                  ),
                  textAlign: TextAlign.center,
                ),
                const SizedBox(height: 12),
                Text(
                  'Se abrió el navegador con la pantalla de pago.\n'
                  'Cuando confirmes el pago, la app se actualizará automáticamente.',
                  style: TextStyle(
                    color: Colors.white.withValues(alpha: 0.6),
                    fontSize: 14,
                    height: 1.5,
                  ),
                  textAlign: TextAlign.center,
                ),
                const SizedBox(height: 32),
                // Botón para reabrir Chrome si el usuario lo cerró
                OutlinedButton.icon(
                  onPressed: _checkoutUrl != null
                      ? () => _openCheckout(_checkoutUrl!)
                      : null,
                  icon: const Icon(Icons.open_in_new, size: 18),
                  label: const Text('Volver a abrir Cashea'),
                  style: OutlinedButton.styleFrom(
                    foregroundColor: AppColors.neonCyan,
                    side: const BorderSide(color: AppColors.neonCyan),
                    padding: const EdgeInsets.symmetric(
                      horizontal: 24, vertical: 12,
                    ),
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(12),
                    ),
                  ),
                ),
              ],
            ),
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
