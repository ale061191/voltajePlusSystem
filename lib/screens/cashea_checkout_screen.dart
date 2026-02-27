import 'package:flutter/material.dart';
import 'package:cloud_functions/cloud_functions.dart';
import 'package:webview_flutter/webview_flutter.dart';
import '../core/constants/app_colors.dart';
import '../../services/location_tracking_service.dart';

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

class _CasheaCheckoutScreenState extends State<CasheaCheckoutScreen> {
  bool _isLoadingOrder = true;
  bool _isConfirming = false;
  bool _orderCreated = false;
  String? _checkoutUrl;
  String? _errorMessage;
  String? _orderId;
  WebViewController? _webViewController;

  @override
  void initState() {
    super.initState();
    _createCasheaOrder();
  }

  Future<void> _createCasheaOrder() async {
    try {
      setState(() {
        _isLoadingOrder = true;
        _errorMessage = null;
      });

      final HttpsCallable callable = FirebaseFunctions.instance.httpsCallable(
        'createCasheaOrder',
      );

      final result = await callable.call({
        'amount': widget.amount,
        'machineId': widget.machineId,
        'slotId': widget.slotId,
      });

      final data = Map<String, dynamic>.from(result.data);

      if (data['success'] == true && data['checkoutUrl'] != null) {
        setState(() {
          _checkoutUrl = data['checkoutUrl'];
          _orderId = data['orderId'];
          _orderCreated = true;
          _isLoadingOrder = false;
        });
        _initWebView();
      } else {
        setState(() {
          _errorMessage =
              data['message'] ?? 'Error al crear la orden de Cashea';
          _isLoadingOrder = false;
        });
      }
    } catch (e) {
      setState(() {
        _errorMessage = 'Error: $e';
        _isLoadingOrder = false;
      });
      debugPrint('Cashea Order Error: $e');
    }
  }

  void _initWebView() {
    if (_checkoutUrl == null) return;

    _webViewController = WebViewController()
      ..setJavaScriptMode(JavaScriptMode.unrestricted)
      ..setBackgroundColor(AppColors.backgroundBlack)
      ..setNavigationDelegate(
        NavigationDelegate(
          onNavigationRequest: (NavigationRequest request) {
            // Detect redirect back from Cashea with idNumber
            final uri = Uri.tryParse(request.url);
            if (uri != null && uri.queryParameters.containsKey('idNumber')) {
              final idNumber = uri.queryParameters['idNumber']!;
              _confirmCasheaOrder(idNumber);
              return NavigationDecision.prevent;
            }
            return NavigationDecision.navigate;
          },
          onPageFinished: (String url) {
            // Also check the final URL after page loads
            final uri = Uri.tryParse(url);
            if (uri != null && uri.queryParameters.containsKey('idNumber')) {
              final idNumber = uri.queryParameters['idNumber']!;
              _confirmCasheaOrder(idNumber);
            }
          },
        ),
      )
      ..loadRequest(Uri.parse(_checkoutUrl!));
  }

  Future<void> _confirmCasheaOrder(String idNumber) async {
    if (_isConfirming) return;

    setState(() {
      _isConfirming = true;
      _orderCreated = false; // hide webview
    });

    try {
      final HttpsCallable callable = FirebaseFunctions.instance.httpsCallable(
        'confirmCasheaOrder',
      );

      final result = await callable.call({
        'idNumber': idNumber,
        'machineId': widget.machineId,
        'slotId': widget.slotId,
      });

      final data = Map<String, dynamic>.from(result.data);

      if (mounted) {
        if (data['unlockStatus'] == 'UNLOCKED') {
          LocationTrackingService().startTracking(widget.machineId);
        }
        _showResultDialog(
          success: data['unlockStatus'] == 'UNLOCKED',
          message: data['message'] ?? 'Proceso completado',
        );
      }
    } catch (e) {
      if (mounted) {
        _showResultDialog(
          success: false,
          message: 'Error al confirmar el pago. Contacta soporte.',
        );
      }
    } finally {
      if (mounted) {
        setState(() => _isConfirming = false);
      }
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
              // Pop back to home
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
    // Loading state: creating order
    if (_isLoadingOrder) {
      return Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            const CircularProgressIndicator(color: AppColors.neonCyan),
            const SizedBox(height: 24),
            const Text(
              'Preparando tu pago con Cashea...',
              style: TextStyle(color: Colors.white, fontSize: 16),
            ),
            const SizedBox(height: 8),
            Text(
              'Máquina: ${widget.machineId}',
              style: TextStyle(
                color: Colors.white.withValues(alpha: 0.5),
                fontSize: 13,
              ),
            ),
          ],
        ),
      );
    }

    // Error state
    if (_errorMessage != null) {
      return Center(
        child: Padding(
          padding: const EdgeInsets.all(32),
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              const Icon(
                Icons.error_outline,
                color: AppColors.neonRed,
                size: 56,
              ),
              const SizedBox(height: 16),
              Text(
                _errorMessage!,
                style: const TextStyle(color: Colors.white, fontSize: 16),
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
                    horizontal: 32,
                    vertical: 14,
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
    }

    // Confirming state
    if (_isConfirming) {
      return Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            const CircularProgressIndicator(color: AppColors.neonGreen),
            const SizedBox(height: 24),
            const Text(
              'Confirmando pago y desbloqueando...',
              style: TextStyle(color: Colors.white, fontSize: 16),
            ),
            const SizedBox(height: 8),
            Text(
              'No cierres la aplicación',
              style: TextStyle(
                color: AppColors.neonGreen.withValues(alpha: 0.7),
                fontSize: 13,
              ),
            ),
          ],
        ),
      );
    }

    // WebView state
    if (_orderCreated && _webViewController != null) {
      return WebViewWidget(controller: _webViewController!);
    }

    // Fallback
    return const Center(
      child: Text('Estado desconocido', style: TextStyle(color: Colors.white)),
    );
  }
}
