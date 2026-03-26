import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:mobile_scanner/mobile_scanner.dart';

import '../../../../core/constants/app_colors.dart';

class QRScanScreen extends StatefulWidget {
  const QRScanScreen({super.key});

  @override
  State<QRScanScreen> createState() => _QRScanScreenState();
}

class _QRScanScreenState extends State<QRScanScreen> {
  final MobileScannerController controller = MobileScannerController();
  bool _hasNavigated = false;

  @override
  void dispose() {
    controller.dispose();
    super.dispose();
  }

  /// Extracts a device serial number (machineId) from QR content.
  /// Bajie QR codes may appear as:
  ///   - URL: https://m.voltajevzla.com/...?sn=DTA34039
  ///   - URL with cId param: ...?cId=DTA34039
  ///   - Raw serial: DTA34039
  ///   - JSON: {"sn":"DTA34039",...}
  ///   - Any URL containing the serial as a path segment
  String? _extractMachineId(String raw) {
    final trimmed = raw.trim();
    const knownKeys = ['qrcode', 'sn', 'cId', 'cid', 'machine', 'deviceSn', 'id'];

    final uri = Uri.tryParse(trimmed);
    if (uri != null && uri.hasScheme) {
      for (final key in knownKeys) {
        final val = uri.queryParameters[key];
        if (val != null && val.isNotEmpty) return val;
      }

      // Hash-fragment URLs like https://host/#/?qrcode=123
      if (uri.fragment.contains('?')) {
        final fragQuery = Uri.splitQueryString(uri.fragment.split('?').last);
        for (final key in knownKeys) {
          final val = fragQuery[key];
          if (val != null && val.isNotEmpty) return val;
        }
      }

      final segments = uri.pathSegments.where((s) => s.isNotEmpty).toList();
      if (segments.isNotEmpty) {
        final last = segments.last;
        if (RegExp(r'^[A-Za-z0-9_-]{4,}$').hasMatch(last)) return last;
      }
    }

    // 2. Raw alphanumeric serial (e.g. DTA34039, CDB-001)
    if (RegExp(r'^[A-Za-z0-9_-]{4,30}$').hasMatch(trimmed)) return trimmed;

    // 3. Try JSON
    try {
      if (trimmed.startsWith('{')) {
        final map = Uri.splitQueryString(trimmed.replaceAll(RegExp(r'[{}"\s]'), '').replaceAll(',', '&').replaceAll(':', '='));
        for (final key in ['sn', 'cId', 'cid', 'machine', 'deviceSn']) {
          if (map[key] != null && map[key]!.isNotEmpty) return map[key];
        }
      }
    } catch (_) {}

    return null;
  }

  void _onQRDetected(String rawValue) {
    if (_hasNavigated) return;

    final machineId = _extractMachineId(rawValue);

    if (machineId != null) {
      _hasNavigated = true;
      controller.stop();
      context.push('/payment/$machineId');
    } else {
      // Unknown format — show what we scanned and let user decide
      controller.stop();
      _hasNavigated = true;
      showDialog(
        context: context,
        builder: (ctx) => AlertDialog(
          backgroundColor: Colors.grey[900],
          title: const Text('QR Detectado', style: TextStyle(color: Colors.white)),
          content: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              const Text('Contenido del QR:', style: TextStyle(color: Colors.grey)),
              const SizedBox(height: 8),
              SelectableText(rawValue, style: const TextStyle(color: AppColors.neonGreen, fontSize: 13)),
              const SizedBox(height: 16),
              const Text(
                'No se pudo identificar un ID de máquina automáticamente. '
                '¿Deseas usar este código como ID?',
                style: TextStyle(color: Colors.white70, fontSize: 13),
              ),
            ],
          ),
          actions: [
            TextButton(
              onPressed: () {
                Navigator.pop(ctx);
                _hasNavigated = false;
                controller.start();
              },
              child: const Text('Escanear otro', style: TextStyle(color: Colors.grey)),
            ),
            TextButton(
              onPressed: () {
                Navigator.pop(ctx);
                context.push('/payment/${Uri.encodeComponent(rawValue)}');
              },
              child: const Text('Usar este código', style: TextStyle(color: AppColors.neonGreen, fontWeight: FontWeight.bold)),
            ),
          ],
        ),
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Colors.black,
      appBar: AppBar(
        title: const Text('Escanear QR', style: TextStyle(color: Colors.white)),
        backgroundColor: Colors.black,
        iconTheme: const IconThemeData(color: Colors.white),
        actions: [
          IconButton(
            icon: ValueListenableBuilder(
              valueListenable: controller,
              builder: (context, state, child) {
                return Icon(
                  state.torchState == TorchState.on ? Icons.flash_on : Icons.flash_off,
                  color: state.torchState == TorchState.on ? Colors.yellow : Colors.grey,
                );
              },
            ),
            onPressed: () => controller.toggleTorch(),
          ),
          IconButton(
            icon: ValueListenableBuilder(
              valueListenable: controller,
              builder: (context, state, child) {
                return Icon(
                  state.cameraDirection == CameraFacing.front ? Icons.camera_front : Icons.camera_rear,
                );
              },
            ),
            onPressed: () => controller.switchCamera(),
          ),
        ],
      ),
      body: Stack(
        children: [
          MobileScanner(
            controller: controller,
            onDetect: (capture) {
              for (final barcode in capture.barcodes) {
                if (barcode.rawValue != null && barcode.rawValue!.isNotEmpty) {
                  _onQRDetected(barcode.rawValue!);
                  return;
                }
              }
            },
          ),
          Center(
            child: Container(
              width: 250,
              height: 250,
              decoration: BoxDecoration(
                border: Border.all(color: AppColors.neonGreen, width: 3),
                borderRadius: BorderRadius.circular(12),
              ),
            ),
          ),
          const Positioned(
            bottom: 50,
            left: 0,
            right: 0,
            child: Text(
              "Apunta al código QR de la estación",
              textAlign: TextAlign.center,
              style: TextStyle(color: Colors.white, fontSize: 16),
            ),
          ),
        ],
      ),
    );
  }
}
