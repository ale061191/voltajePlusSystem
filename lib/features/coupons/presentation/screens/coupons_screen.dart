import 'package:cloud_functions/cloud_functions.dart';
import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import '../../../../core/constants/app_colors.dart';

class CouponsScreen extends StatefulWidget {
  const CouponsScreen({super.key});

  @override
  State<CouponsScreen> createState() => _CouponsScreenState();
}

class _CouponsScreenState extends State<CouponsScreen> {
  List<Map<String, dynamic>> _coupons = [];
  bool _isLoading = true;

  @override
  void initState() {
    super.initState();
    _loadCoupons();
  }

  Future<void> _loadCoupons() async {
    try {
      final resp = await FirebaseFunctions.instance.httpsCallable('getMyCoupons').call({});
      final list = (resp.data['coupons'] as List<dynamic>?) ?? [];

      if (mounted) {
        setState(() {
          _coupons = list.map((e) => Map<String, dynamic>.from(e as Map)).toList();
          _isLoading = false;
        });
      }
    } catch (e) {
      debugPrint('Error loading coupons: $e');
      if (mounted) setState(() => _isLoading = false);
    }
  }

  void _onCouponTap(Map<String, dynamic> coupon) {
    if (coupon['used'] == true) return;

    context.push('/coupon-scan/${coupon['id']}/${coupon['freeMinutes']}');
  }

  String _formatDate(String? iso) {
    if (iso == null || iso.isEmpty) return '';
    try {
      final d = DateTime.parse(iso);
      return '${d.day}/${d.month}/${d.year}';
    } catch (_) {
      return '';
    }
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
          'Mis Cupones',
          style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold),
        ),
      ),
      body: _isLoading
          ? const Center(child: CircularProgressIndicator(color: AppColors.neonGreen))
          : _coupons.isEmpty
              ? _buildEmptyState()
              : _buildCouponList(),
    );
  }

  Widget _buildEmptyState() {
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(40),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(Icons.card_giftcard, size: 60, color: Colors.grey[700]),
            const SizedBox(height: 16),
            const Text(
              'Aún no tienes cupones',
              style: TextStyle(color: Colors.white, fontSize: 18, fontWeight: FontWeight.bold),
            ),
            const SizedBox(height: 8),
            const Text(
              'Cuando alguien te regale un cupón de carga gratis, aparecerá aquí.',
              textAlign: TextAlign.center,
              style: TextStyle(color: Colors.grey, fontSize: 14),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildCouponList() {
    return ListView(
      padding: const EdgeInsets.all(20),
      children: [
        const Text(
          'Tus regalos de energía',
          style: TextStyle(color: Colors.white, fontSize: 18, fontWeight: FontWeight.bold),
        ),
        const SizedBox(height: 6),
        const Text(
          'Toca un cupón activo para escanearlo y disfrutar de carga gratis.',
          style: TextStyle(color: Colors.grey, fontSize: 14),
        ),
        const SizedBox(height: 20),
        ..._coupons.map(_buildCouponCard),
      ],
    );
  }

  Widget _buildCouponCard(Map<String, dynamic> coupon) {
    final bool used = coupon['used'] == true;
    final fromName = coupon['fromName'] ?? 'Alguien especial';
    final minutes = coupon['freeMinutes'] ?? 50;
    final date = _formatDate(coupon['createdAt']);

    return GestureDetector(
      onTap: used ? null : () => _onCouponTap(coupon),
      child: AnimatedOpacity(
        duration: const Duration(milliseconds: 300),
        opacity: used ? 0.4 : 1.0,
        child: Container(
          margin: const EdgeInsets.only(bottom: 16),
          decoration: BoxDecoration(
            borderRadius: BorderRadius.circular(18),
            gradient: used
                ? LinearGradient(colors: [Colors.grey[900]!, Colors.grey[850]!])
                : const LinearGradient(
                    colors: [Color(0xFF1A2A1A), Color(0xFF0D1A0D)],
                    begin: Alignment.topLeft,
                    end: Alignment.bottomRight,
                  ),
            border: Border.all(
              color: used ? Colors.grey[800]! : AppColors.neonGreen.withValues(alpha: 0.4),
              width: 1,
            ),
            boxShadow: used
                ? []
                : [
                    BoxShadow(
                      color: AppColors.neonGreen.withValues(alpha: 0.08),
                      blurRadius: 12,
                      offset: const Offset(0, 4),
                    ),
                  ],
          ),
          child: Stack(
            children: [
              Padding(
                padding: const EdgeInsets.all(20),
                child: Row(
                  children: [
                    Container(
                      width: 52,
                      height: 52,
                      decoration: BoxDecoration(
                        shape: BoxShape.circle,
                        color: used
                            ? Colors.grey[800]
                            : AppColors.neonGreen.withValues(alpha: 0.12),
                      ),
                      child: Icon(
                        used ? Icons.check_circle : Icons.bolt,
                        color: used ? Colors.grey[600] : AppColors.neonGreen,
                        size: 28,
                      ),
                    ),
                    const SizedBox(width: 16),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            used
                                ? 'Cupón utilizado'
                                : '¡$minutes min de carga gratis!',
                            style: TextStyle(
                              color: used ? Colors.grey : Colors.white,
                              fontSize: 16,
                              fontWeight: FontWeight.bold,
                            ),
                          ),
                          const SizedBox(height: 4),
                          Text(
                            used
                                ? 'Canjeado el ${_formatDate(coupon['usedAt'])}'
                                : 'Un regalo de $fromName para ti. Toca para usarlo y recarga tu día.',
                            style: TextStyle(
                              color: used ? Colors.grey[700] : Colors.grey,
                              fontSize: 13,
                              height: 1.3,
                            ),
                          ),
                          if (date.isNotEmpty) ...[
                            const SizedBox(height: 6),
                            Text(
                              'Recibido: $date',
                              style: TextStyle(color: Colors.grey[700], fontSize: 11),
                            ),
                          ],
                        ],
                      ),
                    ),
                    if (!used)
                      const Icon(Icons.chevron_right, color: AppColors.neonGreen, size: 24),
                  ],
                ),
              ),
              if (used)
                Positioned(
                  top: 10,
                  right: 10,
                  child: Container(
                    padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                    decoration: BoxDecoration(
                      color: Colors.grey[800],
                      borderRadius: BorderRadius.circular(8),
                    ),
                    child: const Text(
                      'Usado',
                      style: TextStyle(color: Colors.grey, fontSize: 10, fontWeight: FontWeight.bold),
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
