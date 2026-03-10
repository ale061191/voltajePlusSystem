import 'package:flutter/material.dart';
import 'package:webview_flutter/webview_flutter.dart';
import '../core/constants/app_colors.dart';

/// WebView que carga el Payment Link de PayPal.
///
/// Intercepta las URLs de retorno de PayPal:
///   - success → onSuccess() callback
///   - cancel  → onCancel() callback
///
/// PayPal redirige a estas URLs según la configuración del Payment Link.
/// Por defecto usa las URLs estándar de paypal.com/checkoutnow/success
/// y paypal.com/checkoutnow/cancel, pero si configuras Return URL en
/// el panel de PayPal, pon tu URL personalizada en [_successPatterns] / [_cancelPatterns].
class PaypalWebViewScreen extends StatefulWidget {
  final String paymentLink;
  final VoidCallback onSuccess;
  final VoidCallback onCancel;

  const PaypalWebViewScreen({
    super.key,
    required this.paymentLink,
    required this.onSuccess,
    required this.onCancel,
  });

  @override
  State<PaypalWebViewScreen> createState() => _PaypalWebViewScreenState();
}

class _PaypalWebViewScreenState extends State<PaypalWebViewScreen> {
  late final WebViewController _controller;
  bool _isLoading = true;
  bool _hasError = false;
  String? _errorMessage;
  int _loadProgress = 0;

  // Patrones de URL que PayPal usa al completar o cancelar el pago.
  // PayPal Payment Links redirigen a estas rutas al terminar.
  static const List<String> _successPatterns = [
    'paypal.com/checkoutnow/success',
    'paypal.com/ncp/payment/success',
    '/payment/success',
    'return=success',
  ];
  static const List<String> _cancelPatterns = [
    'paypal.com/checkoutnow/cancel',
    'paypal.com/ncp/payment/cancel',
    '/payment/cancel',
    'return=cancel',
  ];

  @override
  void initState() {
    super.initState();
    _initWebView();
  }

  void _initWebView() {
    _controller = WebViewController()
      ..setJavaScriptMode(JavaScriptMode.unrestricted)
      ..setBackgroundColor(Colors.white) // PayPal usa fondo blanco
      ..setUserAgent(
        // Chrome en Android para que PayPal sirva la versión móvil
        'Mozilla/5.0 (Linux; Android 12; Pixel 6) '
        'AppleWebKit/537.36 (KHTML, like Gecko) '
        'Chrome/120.0.0.0 Mobile Safari/537.36',
      )
      ..setNavigationDelegate(
        NavigationDelegate(
          onPageStarted: (url) {
            if (mounted) {
              setState(() {
                _isLoading = true;
                _hasError = false;
              });
            }
            debugPrint('PayPal WebView: cargando $url');
          },
          onProgress: (progress) {
            if (mounted) setState(() => _loadProgress = progress);
          },
          onPageFinished: (_) {
            if (mounted) setState(() => _isLoading = false);
          },
          onWebResourceError: (error) {
            if (error.isForMainFrame == true) {
              debugPrint('PayPal WebView error: ${error.description}');
              if (mounted) {
                setState(() {
                  _hasError = true;
                  _errorMessage = error.description;
                  _isLoading = false;
                });
              }
            }
          },
          onNavigationRequest: (request) {
            final url = request.url.toLowerCase();
            debugPrint('PayPal WebView navegando a: $url');

            // Detectar pago exitoso
            for (final pattern in _successPatterns) {
              if (url.contains(pattern)) {
                debugPrint('PayPal: pago exitoso detectado');
                if (mounted) widget.onSuccess();
                return NavigationDecision.prevent;
              }
            }

            // Detectar cancelación
            for (final pattern in _cancelPatterns) {
              if (url.contains(pattern)) {
                debugPrint('PayPal: pago cancelado detectado');
                if (mounted) widget.onCancel();
                return NavigationDecision.prevent;
              }
            }

            // Bloquear apps externas — forzar todo dentro del WebView
            if (!url.startsWith('http://') && !url.startsWith('https://')) {
              debugPrint('PayPal WebView: bloqueando scheme no-http: $url');
              return NavigationDecision.prevent;
            }

            return NavigationDecision.navigate;
          },
        ),
      )
      ..loadRequest(Uri.parse(widget.paymentLink));
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Colors.white,
      appBar: AppBar(
        title: const Text(
          'Pago con PayPal',
          style: TextStyle(color: Colors.white),
        ),
        backgroundColor: const Color(0xFF003087), // azul oscuro PayPal
        iconTheme: const IconThemeData(color: Colors.white),
        leading: IconButton(
          icon: const Icon(Icons.close),
          onPressed: widget.onCancel,
        ),
        bottom: _isLoading
            ? PreferredSize(
                preferredSize: const Size.fromHeight(3),
                child: LinearProgressIndicator(
                  value: _loadProgress > 0 ? _loadProgress / 100 : null,
                  backgroundColor: const Color(0xFF002070),
                  color: const Color(0xFF009CDE),
                ),
              )
            : null,
      ),
      body: _hasError ? _buildError() : _buildWebView(),
    );
  }

  Widget _buildWebView() {
    return Stack(
      children: [
        WebViewWidget(controller: _controller),
        if (_isLoading && _loadProgress < 15)
          Container(
            color: Colors.white,
            child: const Center(
              child: Column(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  CircularProgressIndicator(
                    color: Color(0xFF009CDE),
                  ),
                  SizedBox(height: 16),
                  Text(
                    'Cargando PayPal...',
                    style: TextStyle(
                      color: Color(0xFF003087),
                      fontSize: 15,
                      fontWeight: FontWeight.w500,
                    ),
                  ),
                ],
              ),
            ),
          ),
      ],
    );
  }

  Widget _buildError() {
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(32),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            const Icon(Icons.error_outline, color: AppColors.neonRed, size: 56),
            const SizedBox(height: 16),
            Text(
              'No se pudo cargar PayPal.\n${_errorMessage ?? 'Verifica tu conexión a internet.'}',
              style: const TextStyle(color: Colors.black87, fontSize: 14),
              textAlign: TextAlign.center,
            ),
            const SizedBox(height: 24),
            ElevatedButton.icon(
              onPressed: () {
                setState(() {
                  _hasError = false;
                  _isLoading = true;
                });
                _controller.reload();
              },
              icon: const Icon(Icons.refresh),
              label: const Text('Reintentar'),
              style: ElevatedButton.styleFrom(
                backgroundColor: const Color(0xFF009CDE),
                foregroundColor: Colors.white,
              ),
            ),
          ],
        ),
      ),
    );
  }
}
