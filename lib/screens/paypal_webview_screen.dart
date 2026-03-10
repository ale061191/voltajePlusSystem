import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:webview_flutter/webview_flutter.dart';
import '../core/constants/app_colors.dart';

/// WebView que renderiza el botón de PayPal Hosted Button via SDK JS.
///
/// En vez de abrir una URL externa directamente, cargamos un HTML inline
/// que incluye el SDK de PayPal y renderiza el botón oficial.
///
/// Cuando el usuario completa el pago, PayPal llama a nuestro canal JS
/// `PaypalChannel.postMessage('success')` y disparamos [onSuccess].
/// Si cancela, se llama `PaypalChannel.postMessage('cancel')`.
class PaypalWebViewScreen extends StatefulWidget {
  final VoidCallback onSuccess;
  final VoidCallback onCancel;

  // ─── IDs del Hosted Button de PayPal ──────────────────────────────────────
  static const String _clientId =
      'ARLh4FmU7q0mPgeackVbOQJpGmUZOIfqCD_E6ZfJuUf4wSuTpqiAUMrQDDnaEJxdajO0MONHiunsjRL3';
  static const String _hostedButtonId = 'Q6GUDGHXLHQQA';
  // ──────────────────────────────────────────────────────────────────────────

  const PaypalWebViewScreen({
    super.key,
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

  /// HTML que carga el SDK de PayPal y renderiza el Hosted Button.
  /// El resultado del pago se comunica a Flutter via JavaScriptChannel.
  static String _buildPaypalHtml() {
    return '''
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0">
  <title>Recarga con PayPal</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      background: #f5f5f5;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      min-height: 100vh;
      padding: 24px;
    }
    .card {
      background: #ffffff;
      border-radius: 16px;
      padding: 32px 24px;
      width: 100%;
      max-width: 400px;
      box-shadow: 0 4px 24px rgba(0,0,0,0.10);
      text-align: center;
    }
    .logo {
      margin-bottom: 8px;
    }
    .logo svg { width: 100px; height: auto; }
    h2 {
      color: #003087;
      font-size: 18px;
      font-weight: 700;
      margin-bottom: 6px;
    }
    p {
      color: #555;
      font-size: 13px;
      margin-bottom: 24px;
      line-height: 1.5;
    }
    #paypal-container-${PaypalWebViewScreen._hostedButtonId} {
      width: 100%;
    }
    .cancel-btn {
      margin-top: 20px;
      background: none;
      border: 1px solid #ccc;
      border-radius: 8px;
      padding: 10px 24px;
      font-size: 14px;
      color: #666;
      cursor: pointer;
      width: 100%;
    }
    .cancel-btn:active { background: #f0f0f0; }
    #status {
      margin-top: 16px;
      font-size: 13px;
      color: #009CDE;
      min-height: 20px;
    }
  </style>
</head>
<body>
  <div class="card">
    <div class="logo">
      <!-- Logo PayPal SVG oficial -->
      <svg viewBox="0 0 124 33" xmlns="http://www.w3.org/2000/svg">
        <path fill="#009CDE" d="M46.2 10.2h-5.6c-.4 0-.7.3-.8.7l-2.3 14.4c0 .3.2.5.5.5h2.7c.4 0 .7-.3.8-.7l.6-3.9c.1-.4.4-.7.8-.7h1.8c3.7 0 5.8-1.8 6.4-5.3.2-1.5 0-2.7-.7-3.6-.8-.9-2.1-1.4-3.9-1.4zm.6 5.2c-.3 2-1.8 2-3.3 2h-.8l.6-3.7c0-.2.2-.4.4-.4h.4c1 0 2 0 2.5.6.3.3.4.9.2 1.5z"/>
        <path fill="#003087" d="M22.5 10.2h-5.6c-.4 0-.7.3-.8.7L13.8 25.3c0 .3.2.5.5.5h2.7c.4 0 .7-.3.8-.7l.6-3.9c.1-.4.4-.7.8-.7h1.8c3.7 0 5.8-1.8 6.4-5.3.2-1.5 0-2.7-.7-3.6-.8-.9-2.1-1.4-3.9-1.4zm.6 5.2c-.3 2-1.8 2-3.3 2h-.8l.6-3.7c0-.2.2-.4.4-.4h.4c1 0 2 0 2.5.6.3.3.4.9.2 1.5z"/>
        <path fill="#003087" d="M34.5 15.3h-2.7c-.2 0-.4.2-.4.4l-.1.7-.2-.3c-.6-.9-2-1.2-3.3-1.2-3.1 0-5.8 2.4-6.3 5.7-.3 1.7.1 3.3 1 4.3.9 1 2.1 1.4 3.6 1.4 2.5 0 3.9-1.6 3.9-1.6l-.1.7c0 .3.2.5.5.5h2.4c.4 0 .7-.3.8-.7l1.4-9c.1-.3-.2-.9-.5-.9zm-3.8 5.5c-.3 1.6-1.5 2.7-3.1 2.7-.8 0-1.5-.3-1.9-.7-.4-.5-.5-1.1-.4-1.8.3-1.6 1.5-2.7 3.1-2.7.8 0 1.4.3 1.9.8.4.4.5 1.1.4 1.7z"/>
        <path fill="#009CDE" d="M58.4 15.3h-2.7c-.2 0-.4.2-.4.4l-.1.7-.2-.3c-.6-.9-2-1.2-3.3-1.2-3.1 0-5.8 2.4-6.3 5.7-.3 1.7.1 3.3 1 4.3.9 1 2.1 1.4 3.6 1.4 2.5 0 3.9-1.6 3.9-1.6l-.1.7c0 .3.2.5.5.5h2.4c.4 0 .7-.3.8-.7l1.4-9c.1-.3-.2-.9-.5-.9zm-3.8 5.5c-.3 1.6-1.5 2.7-3.1 2.7-.8 0-1.5-.3-1.9-.7-.4-.5-.5-1.1-.4-1.8.3-1.6 1.5-2.7 3.1-2.7.8 0 1.4.3 1.9.8.4.4.5 1.1.4 1.7z"/>
        <path fill="#003087" d="M68.7 10.4h-2.7c-.2 0-.5.2-.6.4l-3.5 10.6-1.5-10.2c-.1-.4-.4-.7-.8-.7h-2.6c-.3 0-.5.3-.5.6l2.8 16.7-2.6 3.7c-.2.3 0 .7.4.7h2.7c.4 0 .5-.1.7-.4l8.6-12.4c.1-.3-.1-.7-.4-.7z"/>
      </svg>
    </div>
    <h2>Recarga tu Voltaje Card</h2>
    <p>Completa tu pago de forma segura con PayPal.<br>El saldo se acreditará automáticamente.</p>

    <div id="paypal-container-${PaypalWebViewScreen._hostedButtonId}"></div>

    <button class="cancel-btn" onclick="onCancel()">Cancelar</button>
    <p id="status"></p>
  </div>

  <script
    src="https://www.paypal.com/sdk/js?client-id=${PaypalWebViewScreen._clientId}&components=hosted-buttons&disable-funding=venmo&currency=USD">
  </script>
  <script>
    function setStatus(msg) {
      document.getElementById('status').textContent = msg;
    }

    function onCancel() {
      try { PaypalChannel.postMessage('cancel'); } catch(e) {}
    }

    paypal.HostedButtons({
      hostedButtonId: "${PaypalWebViewScreen._hostedButtonId}",
      onApprove: function(data) {
        setStatus('Procesando pago...');
        try { PaypalChannel.postMessage('success:' + JSON.stringify(data)); } catch(e) {}
      },
      onCancel: function() {
        onCancel();
      },
      onError: function(err) {
        setStatus('Error al procesar el pago. Intenta de nuevo.');
        console.error(err);
      }
    }).render("#paypal-container-${PaypalWebViewScreen._hostedButtonId}");
  </script>
</body>
</html>
''';
  }

  @override
  void initState() {
    super.initState();
    _initWebView();
  }

  void _initWebView() {
    _controller = WebViewController()
      ..setJavaScriptMode(JavaScriptMode.unrestricted)
      ..setBackgroundColor(Colors.white)
      ..setUserAgent(
        'Mozilla/5.0 (Linux; Android 12; Pixel 6) '
        'AppleWebKit/537.36 (KHTML, like Gecko) '
        'Chrome/120.0.0.0 Mobile Safari/537.36',
      )
      ..addJavaScriptChannel(
        'PaypalChannel',
        onMessageReceived: (message) {
          final msg = message.message;
          debugPrint('PayPal JS → Flutter: $msg');
          if (msg == 'cancel') {
            if (mounted) widget.onCancel();
          } else if (msg.startsWith('success')) {
            debugPrint('PayPal: pago aprobado: $msg');
            if (mounted) widget.onSuccess();
          }
        },
      )
      ..setNavigationDelegate(
        NavigationDelegate(
          onPageStarted: (_) {
            if (mounted) setState(() { _isLoading = true; _hasError = false; });
          },
          onProgress: (p) {
            if (mounted) setState(() => _loadProgress = p);
          },
          onPageFinished: (_) {
            if (mounted) setState(() => _isLoading = false);
          },
          onWebResourceError: (error) {
            // Ignorar errores de sub-recursos (fuentes, tracking pixels, etc.)
            if (error.isForMainFrame == true) {
              debugPrint('PayPal WebView error principal: ${error.description}');
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
            final url = request.url;
            // Permitir paypal.com y about:blank (necesario para el SDK)
            if (url.startsWith('https://') ||
                url.startsWith('http://') ||
                url == 'about:blank') {
              return NavigationDecision.navigate;
            }
            debugPrint('PayPal WebView: bloqueando scheme: $url');
            return NavigationDecision.prevent;
          },
        ),
      )
      ..loadHtmlString(
        _buildPaypalHtml(),
        // baseUrl es necesario para que el SDK de PayPal pueda hacer
        // peticiones cross-origin correctamente
        baseUrl: 'https://www.paypal.com',
      );
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
        backgroundColor: const Color(0xFF003087),
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
                  CircularProgressIndicator(color: Color(0xFF009CDE)),
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
                setState(() { _hasError = false; _isLoading = true; });
                _initWebView();
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
