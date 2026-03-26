import 'package:cloud_functions/cloud_functions.dart';
import 'package:flutter/material.dart';
import 'package:mobile_scanner/mobile_scanner.dart';
import '../../../../core/constants/app_colors.dart';
import '../../../../services/location_tracking_service.dart';

class CouponScanScreen extends StatefulWidget {
  final String couponId;
  final int freeMinutes;

  const CouponScanScreen({
    super.key,
    required this.couponId,
    required this.freeMinutes,
  });

  @override
  State<CouponScanScreen> createState() => _CouponScanScreenState();
}

class _CouponScanScreenState extends State<CouponScanScreen> {
  final MobileScannerController _scannerCtrl = MobileScannerController();
  bool _scanned = false;

  @override
  void dispose() {
    _scannerCtrl.dispose();
    super.dispose();
  }

  String? _extractMachineId(String raw) {
    final trimmed = raw.trim();
    const knownKeys = [
      'qrcode',
      'sn',
      'cId',
      'cid',
      'machine',
      'deviceSn',
      'id',
    ];

    final uri = Uri.tryParse(trimmed);
    if (uri != null && uri.hasScheme) {
      for (final key in knownKeys) {
        final val = uri.queryParameters[key];
        if (val != null && val.isNotEmpty) return val;
      }
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
    if (RegExp(r'^[A-Za-z0-9_-]{4,30}$').hasMatch(trimmed)) return trimmed;
    return null;
  }

  void _onDetect(BarcodeCapture capture) {
    if (_scanned) return;
    final code = capture.barcodes.firstOrNull?.rawValue;
    if (code == null) return;

    final machineId = _extractMachineId(code);
    if (machineId != null) {
      _scanned = true;
      _scannerCtrl.stop();
      _showSlotSelection(machineId);
    }
  }

  void _showSlotSelection(String machineId) {
    Navigator.pushReplacement(
      context,
      MaterialPageRoute(
        builder: (_) => BatterySelectScreen(
          couponId: widget.couponId,
          machineId: machineId,
          freeMinutes: widget.freeMinutes,
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Colors.black,
      appBar: AppBar(
        backgroundColor: Colors.black,
        leading: IconButton(
          icon: const Icon(Icons.arrow_back, color: Colors.white),
          onPressed: () => Navigator.pop(context),
        ),
        title: const Text(
          'Escanear Máquina',
          style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold),
        ),
      ),
      body: Column(
        children: [
          Container(
            margin: const EdgeInsets.all(16),
            padding: const EdgeInsets.all(14),
            decoration: BoxDecoration(
              borderRadius: BorderRadius.circular(14),
              color: AppColors.neonGreen.withValues(alpha: 0.08),
              border: Border.all(
                color: AppColors.neonGreen.withValues(alpha: 0.3),
              ),
            ),
            child: Row(
              children: [
                const Icon(Icons.card_giftcard, color: AppColors.neonGreen),
                const SizedBox(width: 12),
                Expanded(
                  child: Text(
                    'Cupón de ${widget.freeMinutes} min gratis. Escanea el QR de la máquina.',
                    style: const TextStyle(color: Colors.white, fontSize: 14),
                  ),
                ),
              ],
            ),
          ),
          Expanded(
            child: ClipRRect(
              borderRadius: BorderRadius.circular(16),
              child: MobileScanner(
                controller: _scannerCtrl,
                onDetect: _onDetect,
              ),
            ),
          ),
          const SizedBox(height: 16),
        ],
      ),
    );
  }
}

// ──────────────────────────────────────────
// BATTERY SELECTION SCREEN
// ──────────────────────────────────────────

class BatterySelectScreen extends StatefulWidget {
  final String couponId;
  final String machineId;
  final int freeMinutes;

  const BatterySelectScreen({
    super.key,
    required this.couponId,
    required this.machineId,
    required this.freeMinutes,
  });

  @override
  State<BatterySelectScreen> createState() => _BatterySelectScreenState();
}

class _BatterySelectScreenState extends State<BatterySelectScreen> {
  int? _selectedSlot;
  bool _isUnlocking = false;
  final int _totalSlots = 8;

  Future<void> _expulsar() async {
    if (_selectedSlot == null) return;

    setState(() => _isUnlocking = true);

    try {
      final resp = await FirebaseFunctions.instance
          .httpsCallable('useCoupon')
          .call({
            'couponId': widget.couponId,
            'machineId': widget.machineId,
            'slotId': _selectedSlot,
          });

      final success = resp.data['success'] == true;
      final unlockOk = resp.data['unlockStatus'] == 'UNLOCKED';
      final msg = resp.data['message'] ?? '';

      if (mounted) {
        if (success && unlockOk) {
          LocationTrackingService().startTracking(widget.machineId);
          _showSuccessDialog(msg);
        } else {
          _showResultSnack(msg, false);
        }
      }
    } catch (e) {
      if (mounted) _showResultSnack('Error: $e', false);
    } finally {
      if (mounted) setState(() => _isUnlocking = false);
    }
  }

  void _showResultSnack(String msg, bool ok) {
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Text(msg),
        backgroundColor: ok ? Colors.green : Colors.red,
      ),
    );
  }

  void _showSuccessDialog(String message) {
    showDialog(
      context: context,
      barrierDismissible: false,
      builder: (ctx) => Dialog(
        backgroundColor: Colors.transparent,
        child: Container(
          padding: const EdgeInsets.all(24),
          decoration: BoxDecoration(
            color: Colors.black.withValues(alpha: 0.95),
            borderRadius: BorderRadius.circular(20),
            border: Border.all(color: AppColors.neonGreen, width: 2),
            boxShadow: [
              BoxShadow(
                color: AppColors.neonGreen.withValues(alpha: 0.5),
                blurRadius: 20,
                spreadRadius: 2,
              ),
            ],
          ),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              Container(
                padding: const EdgeInsets.all(16),
                decoration: BoxDecoration(
                  shape: BoxShape.circle,
                  border: Border.all(color: AppColors.neonGreen, width: 3),
                  boxShadow: [
                    BoxShadow(
                      color: AppColors.neonGreen.withValues(alpha: 0.5),
                      blurRadius: 15,
                    ),
                  ],
                ),
                child: const Icon(
                  Icons.bolt,
                  color: AppColors.neonGreen,
                  size: 44,
                ),
              ),
              const SizedBox(height: 20),
              const Text(
                '¡CUPÓN CANJEADO!',
                style: TextStyle(
                  color: AppColors.neonGreen,
                  fontSize: 20,
                  fontWeight: FontWeight.bold,
                  shadows: [Shadow(color: AppColors.neonGreen, blurRadius: 10)],
                ),
              ),
              const SizedBox(height: 12),
              Text(
                message,
                textAlign: TextAlign.center,
                style: const TextStyle(color: Colors.white, fontSize: 15),
              ),
              const SizedBox(height: 8),
              Text(
                'Retíralo del slot $_selectedSlot',
                style: const TextStyle(color: Colors.white70, fontSize: 14),
              ),
              const SizedBox(height: 24),
              SizedBox(
                width: double.infinity,
                child: ElevatedButton(
                  onPressed: () {
                    Navigator.of(ctx).pop();
                    Navigator.of(context).popUntil((route) => route.isFirst);
                  },
                  style: ElevatedButton.styleFrom(
                    backgroundColor: AppColors.neonGreen,
                    padding: const EdgeInsets.symmetric(vertical: 14),
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(12),
                    ),
                  ),
                  child: const Text(
                    'ACEPTAR',
                    style: TextStyle(
                      color: Colors.black,
                      fontWeight: FontWeight.bold,
                      fontSize: 16,
                    ),
                  ),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Colors.black,
      appBar: AppBar(
        backgroundColor: Colors.black,
        leading: IconButton(
          icon: const Icon(Icons.arrow_back, color: Colors.white),
          onPressed: () => Navigator.pop(context),
        ),
        title: const Text(
          'Seleccionar Batería',
          style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold),
        ),
      ),
      body: SafeArea(
        child: Padding(
          padding: const EdgeInsets.all(20),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              // Coupon info
              Container(
                padding: const EdgeInsets.all(16),
                decoration: BoxDecoration(
                  borderRadius: BorderRadius.circular(14),
                  color: AppColors.neonGreen.withValues(alpha: 0.06),
                  border: Border.all(
                    color: AppColors.neonGreen.withValues(alpha: 0.2),
                  ),
                ),
                child: Row(
                  children: [
                    const Icon(Icons.card_giftcard, color: AppColors.neonGreen),
                    const SizedBox(width: 12),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            'Cupón: ${widget.freeMinutes} min gratis',
                            style: const TextStyle(
                              color: AppColors.neonGreen,
                              fontWeight: FontWeight.bold,
                            ),
                          ),
                          const SizedBox(height: 2),
                          Text(
                            'Máquina: ${widget.machineId}',
                            style: const TextStyle(
                              color: Colors.grey,
                              fontSize: 13,
                            ),
                          ),
                        ],
                      ),
                    ),
                  ],
                ),
              ),

              const SizedBox(height: 24),

              const Text(
                'Elige un slot disponible',
                style: TextStyle(
                  color: Colors.white,
                  fontSize: 16,
                  fontWeight: FontWeight.bold,
                ),
              ),
              const SizedBox(height: 6),
              const Text(
                'Selecciona de cuál ranura quieres sacar tu power bank.',
                style: TextStyle(color: Colors.grey, fontSize: 13),
              ),

              const SizedBox(height: 20),

              // Slot grid
              Expanded(
                child: GridView.builder(
                  gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
                    crossAxisCount: 4,
                    crossAxisSpacing: 12,
                    mainAxisSpacing: 12,
                    childAspectRatio: 1,
                  ),
                  itemCount: _totalSlots,
                  itemBuilder: (context, index) {
                    final slot = index + 1;
                    final selected = _selectedSlot == slot;

                    return GestureDetector(
                      onTap: () => setState(() => _selectedSlot = slot),
                      child: AnimatedContainer(
                        duration: const Duration(milliseconds: 200),
                        decoration: BoxDecoration(
                          borderRadius: BorderRadius.circular(16),
                          color: selected
                              ? AppColors.neonGreen.withValues(alpha: 0.15)
                              : Colors.grey[900],
                          border: Border.all(
                            color: selected
                                ? AppColors.neonGreen
                                : Colors.grey[800]!,
                            width: selected ? 2 : 1,
                          ),
                          boxShadow: selected
                              ? [
                                  BoxShadow(
                                    color: AppColors.neonGreen.withValues(
                                      alpha: 0.2,
                                    ),
                                    blurRadius: 8,
                                  ),
                                ]
                              : [],
                        ),
                        child: Column(
                          mainAxisAlignment: MainAxisAlignment.center,
                          children: [
                            Icon(
                              Icons.battery_charging_full,
                              color: selected
                                  ? AppColors.neonGreen
                                  : Colors.grey[600],
                              size: 28,
                            ),
                            const SizedBox(height: 6),
                            Text(
                              'Slot $slot',
                              style: TextStyle(
                                color: selected
                                    ? AppColors.neonGreen
                                    : Colors.grey,
                                fontSize: 13,
                                fontWeight: selected
                                    ? FontWeight.bold
                                    : FontWeight.normal,
                              ),
                            ),
                          ],
                        ),
                      ),
                    );
                  },
                ),
              ),

              const SizedBox(height: 16),

              // Expulsar button
              SizedBox(
                width: double.infinity,
                child: ElevatedButton.icon(
                  onPressed: (_selectedSlot != null && !_isUnlocking)
                      ? _expulsar
                      : null,
                  icon: _isUnlocking
                      ? const SizedBox(
                          width: 22,
                          height: 22,
                          child: CircularProgressIndicator(
                            color: Colors.black,
                            strokeWidth: 2.5,
                          ),
                        )
                      : const Icon(Icons.eject, color: Colors.black, size: 24),
                  label: Text(
                    _isUnlocking ? 'Expulsando...' : 'Expulsar',
                    style: TextStyle(
                      color: _selectedSlot != null
                          ? Colors.black
                          : Colors.grey[600],
                      fontSize: 18,
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                  style: ElevatedButton.styleFrom(
                    backgroundColor: _selectedSlot != null
                        ? AppColors.neonGreen
                        : Colors.grey[800],
                    disabledBackgroundColor: Colors.grey[800],
                    padding: const EdgeInsets.symmetric(vertical: 18),
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(16),
                    ),
                  ),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
