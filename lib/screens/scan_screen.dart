import 'package:flutter/material.dart';
import 'package:mobile_scanner/mobile_scanner.dart';
import 'payment_method_screen.dart';

class ScanScreen extends StatefulWidget {
  const ScanScreen({super.key});

  @override
  State<ScanScreen> createState() => _ScanScreenState();
}

class _ScanScreenState extends State<ScanScreen> {
  bool _isScanned = false;

  void _onDetect(BarcodeCapture capture) {
    if (_isScanned) return;
    final List<Barcode> barcodes = capture.barcodes;

    for (final barcode in barcodes) {
      if (barcode.rawValue != null) {
        setState(() {
          _isScanned = true;
        });

        final String code = barcode.rawValue!;
        debugPrint('QR Scanned: $code');

        // Validate and Parse QR Code
        String machineId = code;
        final Uri? uri = Uri.tryParse(code);

        if (uri != null && uri.scheme.startsWith('http')) {
          // Extract ID from URL path (assuming last segment is ID)
          // Example: https://voltaje.app/rent/DTA34039 -> DTA34039
          if (uri.pathSegments.isNotEmpty) {
            machineId = uri.pathSegments.last;
          }
        }
        // Basic validation: Ensure ID is alphanumeric and of expected length
        // e.g., DTA + 5 digits or similar. For now, just ensuring it's not empty/garbage.
        if (machineId.length < 5) {
          ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(
              content: Text('Código QR inválido. Intente nuevamente.'),
            ),
          );
          setState(() => _isScanned = false);
          return;
        }

        Navigator.pushReplacement(
          context,
          MaterialPageRoute(
            builder: (context) => PaymentMethodScreen(machineId: machineId),
          ),
        );
        break;
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Escanear QR'),
        backgroundColor: Colors.black,
        leading: IconButton(
          icon: const Icon(Icons.arrow_back),
          onPressed: () => Navigator.pop(context),
        ),
      ),
      body: MobileScanner(
        onDetect: _onDetect,
        overlayBuilder: (context, constraints) {
          return Container(
            decoration: BoxDecoration(
              border: Border.all(color: const Color(0xFF00E676), width: 2),
              borderRadius: BorderRadius.circular(12),
            ),
          );
        },
      ),
    );
  }
}
