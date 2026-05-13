import 'package:flutter/material.dart';
import 'package:webview_flutter/webview_flutter.dart';
import '../core/constants/app_colors.dart';

/// Resultado que devuelve CasheaWebViewScreen al hacer pop.
class CasheaWebViewResult {
  final bool success;
  final String? idNumber; // presente si Cashea redirigió a voltaje://cashea/return
  final bool cancelled;   // true si redirigió a voltaje://cashea/cancel

  const CasheaWebViewResult({
    required this.success,
    this.idNumber,
    this.cancelled = false,
  });
}

/// Pantalla WebView que carga web.cashea.app e intercepta el deep link de retorno.
///
/// Cuando Cashea redirige a:
///   voltaje://cashea/return?idNumber=XXX  → pop con CasheaWebViewResult(success:true, idNumber:XXX)
///   voltaje://cashea/cancel               → pop con CasheaWebViewResult(cancelled:true)
class CasheaWebViewScreen extends StatefulWidget {
  final String checkoutUrl;

  const CasheaWebViewScreen({super.key, required this.checkoutUrl});

  @override
  State<CasheaWebViewScreen> createState() => _CasheaWebViewScreenState();
}

class _CasheaWebViewScreenState extends State<CasheaWebViewScreen> {
  late final WebViewController _controller;
  bool _isLoading = true;
  bool _hasError = false;
  String? _errorMessage;
  int _loadProgress = 0;

  @override
  void initState() {
    super.initState();
    _initWebView();
  }

  void _initWebView() {
    _controller = WebViewController()
      ..setJavaScriptMode(JavaScriptMode.unrestricted)
      ..setBackgroundColor(Colors.black)
      ..setUserAgent(
        // User-Agent de Chrome en Android — necesario para que web.cashea.app
        // sirva la versión móvil correctamente
        'Mozilla/5.0 (Linux; Android 12; Pixel 6) '
        'AppleWebKit/537.36 (KHTML, like Gecko) '
        'Chrome/120.0.0.0 Mobile Safari/537.36',
      )
      ..setNavigationDelegate(
        NavigationDelegate(
          onPageStarted: (_) {
            if (mounted) setState(() { _isLoading = true; _hasError = false; });
          },
          onProgress: (progress) {
            if (mounted) setState(() => _loadProgress = progress);
          },
          onPageFinished: (_) {
            if (mounted) setState(() => _isLoading = false);
          },
          onWebResourceError: (error) {
            // Ignorar errores de sub-recursos (fonts, imágenes, etc.)
            // Solo mostrar error si es el recurso principal
            if (error.isForMainFrame == true) {
              debugPrint('Cashea WebView error (main frame): ${error.description}');
              if (mounted) {
                setState(() {
                  _hasError = true;
                  _errorMessage = error.description;
                  _isLoading = false;
                });
              }
            } else {
              debugPrint('Cashea WebView sub-resource error (ignored): ${error.description}');
            }
          },
          onNavigationRequest: (request) {
            final url = request.url;
            debugPrint('Cashea WebView navegando a: $url');

            // Interceptar deep link de retorno
            if (url.startsWith('voltaje://cashea/')) {
              final uri = Uri.parse(url);
              if (uri.host == 'cashea' && uri.path == '/return') {
                final idNumber = uri.queryParameters['idNumber'];
                debugPrint('Cashea: retorno exitoso, idNumber=$idNumber');
                if (mounted) {
                  Navigator.of(context).pop(
                    CasheaWebViewResult(success: true, idNumber: idNumber),
                  );
                }
              } else if (uri.host == 'cashea' && uri.path == '/cancel') {
                debugPrint('Cashea: pago cancelado por usuario');
                if (mounted) {
                  Navigator.of(context).pop(
                    const CasheaWebViewResult(success: false, cancelled: true),
                  );
                }
              }
              return NavigationDecision.prevent;
            }

            // Permitir todo lo demás (web.cashea.app, auth, etc.)
            return NavigationDecision.navigate;
          },
        ),
      )
      ..loadRequest(Uri.parse(widget.checkoutUrl));
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Colors.black,
      appBar: AppBar(
        title: const Text('Pago con Cashea'),
        backgroundColor: AppColors.surfaceDark,
        leading: IconButton(
          icon: const Icon(Icons.close),
          onPressed: () => Navigator.of(context).pop(
            const CasheaWebViewResult(success: false, cancelled: true),
          ),
        ),
        bottom: _isLoading
            ? PreferredSize(
                preferredSize: const Size.fromHeight(3),
                child: LinearProgressIndicator(
                  value: _loadProgress / 100,
                  backgroundColor: AppColors.surfaceDark,
                  color: AppColors.neonCyan,
                ),
              )
            : null,
      ),
      body: _hasError
          ? _buildError()
          : Stack(
              children: [
                WebViewWidget(controller: _controller),
                if (_isLoading && _loadProgress < 10)
                  const Center(
                    child: Column(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        CircularProgressIndicator(color: AppColors.neonCyan),
                        SizedBox(height: 16),
                        Text(
                          'Cargando Cashea...',
                          style: TextStyle(color: Colors.white, fontSize: 14),
                        ),
                      ],
                    ),
                  ),
              ],
            ),
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
              'No se pudo cargar Cashea.\n${_errorMessage ?? ''}',
              style: const TextStyle(color: Colors.white, fontSize: 14),
              textAlign: TextAlign.center,
            ),
            const SizedBox(height: 24),
            ElevatedButton.icon(
              onPressed: () {
                setState(() { _hasError = false; _isLoading = true; });
                _controller.reload();
              },
              icon: const Icon(Icons.refresh),
              label: const Text('Reintentar'),
              style: ElevatedButton.styleFrom(
                backgroundColor: AppColors.neonCyan,
                foregroundColor: Colors.black,
              ),
            ),
          ],
        ),
      ),
    );
  }
}
