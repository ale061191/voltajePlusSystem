import 'package:flutter/material.dart';
import 'package:mobile_scanner/mobile_scanner.dart';
import 'package:go_router/go_router.dart';
import 'package:cloud_functions/cloud_functions.dart';
import '../../../../core/constants/app_colors.dart';
import '../../../../services/location_tracking_service.dart';

class QRReturnScanScreen extends StatefulWidget {
  const QRReturnScanScreen({super.key});

  @override
  State<QRReturnScanScreen> createState() => _QRReturnScanScreenState();
}

class _QRReturnScanScreenState extends State<QRReturnScanScreen> {
  bool _isProcessing = false;

  void _onDetect(BarcodeCapture capture) async {
    if (_isProcessing) return;

    final List<Barcode> barcodes = capture.barcodes;
    if (barcodes.isNotEmpty) {
      final String? code = barcodes.first.rawValue;
      if (code != null) {
        setState(() => _isProcessing = true);

        // Match the cabinet ID format (like QRScanScreen does)
        final match = RegExp(r'id=([A-Z0-9]+)').firstMatch(code);
        final machineId = match != null ? match.group(1)! : code;

        try {
          // Call Backend to verify
          final HttpsCallable callable = FirebaseFunctions.instance
              .httpsCallable('verifyBatteryReturn');
          final result = await callable.call({'machineId': machineId});

          if (result.data['success'] == true) {
            // Stop GPS Tracking
            LocationTrackingService().stopTracking();

            if (mounted) {
              ScaffoldMessenger.of(context).showSnackBar(
                SnackBar(
                  content: Text(result.data['message']),
                  backgroundColor: AppColors.neonGreen,
                  action: SnackBarAction(
                    label: 'OK',
                    textColor: Colors.black,
                    onPressed: () {},
                  ),
                ),
              );
              context.go('/home');
            }
          } else {
            if (mounted) {
              ScaffoldMessenger.of(context).showSnackBar(
                SnackBar(
                  content: Text(result.data['message'] ?? 'Error desconocido'),
                  backgroundColor: Colors.red,
                ),
              );
              setState(() => _isProcessing = false);
            }
          }
        } catch (e) {
          if (mounted) {
            ScaffoldMessenger.of(context).showSnackBar(
              const SnackBar(
                content: Text(
                  'Error al procesar la devolución. Intenta de nuevo.',
                ),
                backgroundColor: Colors.red,
              ),
            );
            setState(() => _isProcessing = false);
          }
        }
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Colors.black,
      appBar: AppBar(
        title: const Text('Devolver Batería'),
        backgroundColor: Colors.black,
        leading: IconButton(
          icon: const Icon(Icons.arrow_back, color: AppColors.neonGreen),
          onPressed: () => context.pop(),
        ),
      ),
      body: Stack(
        children: [
          MobileScanner(onDetect: _onDetect),

          // Custom Overlay
          ColorFiltered(
            colorFilter: ColorFilter.mode(
              Colors.black.withValues(alpha: 0.8),
              BlendMode.srcOut,
            ),
            child: Stack(
              children: [
                Container(
                  decoration: const BoxDecoration(
                    color: Colors.black,
                    backgroundBlendMode: BlendMode.dstOut,
                  ),
                ),
                Center(
                  child: Container(
                    height: 250,
                    width: 250,
                    decoration: BoxDecoration(
                      color: Colors.red,
                      borderRadius: BorderRadius.circular(20),
                    ),
                  ),
                ),
              ],
            ),
          ),

          const Align(
            alignment: Alignment.topCenter,
            child: Padding(
              padding: EdgeInsets.only(top: 80),
              child: Text(
                'Escanea el QR de la máquina\ndonde devolviste el PowerBank',
                textAlign: TextAlign.center,
                style: TextStyle(
                  color: Colors.white,
                  fontSize: 18,
                  fontWeight: FontWeight.bold,
                ),
              ),
            ),
          ),

          if (_isProcessing)
            Container(
              color: Colors.black.withValues(alpha: 0.7),
              child: const Center(
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    CircularProgressIndicator(color: AppColors.neonGreen),
                    SizedBox(height: 20),
                    Text(
                      'Verificando devolución...',
                      style: TextStyle(color: Colors.white, fontSize: 16),
                    ),
                  ],
                ),
              ),
            ),
        ],
      ),
    );
  }
}
