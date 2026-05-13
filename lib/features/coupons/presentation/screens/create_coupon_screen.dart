import 'package:cloud_functions/cloud_functions.dart';
import 'package:flutter/material.dart';
import '../../../../core/constants/app_colors.dart';

class CreateCouponScreen extends StatefulWidget {
  const CreateCouponScreen({super.key});

  @override
  State<CreateCouponScreen> createState() => _CreateCouponScreenState();
}

class _CreateCouponScreenState extends State<CreateCouponScreen> {
  final _emailCtrl = TextEditingController();
  bool _isCreating = false;
  bool _isResetting = false;
  bool _quotaLoaded = false;
  int _used = 0;
  int _remaining = 10;
  final int _max = 10;

  @override
  void initState() {
    super.initState();
    _loadQuota();
  }

  @override
  void dispose() {
    _emailCtrl.dispose();
    super.dispose();
  }

  Future<void> _loadQuota() async {
    try {
      final resp = await FirebaseFunctions.instance.httpsCallable('getCouponQuota').call({});
      if (mounted) {
        setState(() {
          _used = (resp.data['used'] as num?)?.toInt() ?? 0;
          _remaining = (resp.data['remaining'] as num?)?.toInt() ?? 10;
          _quotaLoaded = true;
        });
      }
    } catch (_) {
      if (mounted) setState(() => _quotaLoaded = true);
    }
  }

  Future<void> _createCoupon() async {
    final email = _emailCtrl.text.trim();
    if (email.isEmpty || !email.contains('@')) {
      _showSnack('Ingresa un correo válido', false);
      return;
    }
    if (_remaining <= 0) {
      _showSnack('Alcanzaste el límite de cupones este mes', false);
      return;
    }

    setState(() => _isCreating = true);
    try {
      final resp = await FirebaseFunctions.instance
          .httpsCallable('createCoupon')
          .call({'recipientEmail': email});

      final msg = resp.data['message'] ?? 'Cupón creado';
      final remaining = (resp.data['remaining'] as num?)?.toInt() ?? (_remaining - 1);
      final usedNow = (resp.data['usedThisMonth'] as num?)?.toInt() ?? (_used + 1);

      setState(() {
        _remaining = remaining;
        _used = usedNow;
        _emailCtrl.clear();
      });

      if (mounted) _showSuccessDialog(msg, email);
    } catch (e) {
      final msg = e.toString().contains('not-found')
          ? 'No existe un usuario con ese correo'
          : e.toString().contains('resource-exhausted')
              ? 'Alcanzaste el límite de cupones este mes'
              : e.toString().contains('invalid-argument')
                  ? 'No puedes enviarte un cupón a ti mismo'
                  : 'Error: $e';
      _showSnack(msg, false);
    } finally {
      if (mounted) setState(() => _isCreating = false);
    }
  }

  Future<void> _resetQuota() async {
    setState(() => _isResetting = true);
    try {
      await FirebaseFunctions.instance.httpsCallable('resetCouponQuota').call({});
      setState(() {
        _used = 0;
        _remaining = _max;
      });
      _showSnack('Contador reiniciado', true);
    } catch (e) {
      _showSnack('Error: $e', false);
    } finally {
      if (mounted) setState(() => _isResetting = false);
    }
  }

  void _showSnack(String msg, bool ok) {
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Text(msg),
        backgroundColor: ok ? Colors.green : Colors.red,
      ),
    );
  }

  void _showSuccessDialog(String msg, String email) {
    showDialog(
      context: context,
      builder: (ctx) => Dialog(
        backgroundColor: AppColors.surfaceDark,
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(20),
          side: const BorderSide(color: AppColors.neonGreen, width: 1),
        ),
        child: Padding(
          padding: const EdgeInsets.all(28),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              Container(
                width: 65,
                height: 65,
                decoration: BoxDecoration(
                  shape: BoxShape.circle,
                  color: AppColors.neonGreen.withValues(alpha: 0.15),
                ),
                child: const Icon(Icons.card_giftcard, color: AppColors.neonGreen, size: 36),
              ),
              const SizedBox(height: 18),
              const Text(
                '¡Cupón Enviado!',
                style: TextStyle(color: Colors.white, fontSize: 20, fontWeight: FontWeight.bold),
              ),
              const SizedBox(height: 10),
              Text(
                'Le has regalado 50 min de carga gratis a\n$email',
                textAlign: TextAlign.center,
                style: const TextStyle(color: Colors.grey, fontSize: 14),
              ),
              const SizedBox(height: 10),
              Text(
                'Cupones restantes: $_remaining/$_max',
                style: const TextStyle(color: AppColors.neonGreen, fontWeight: FontWeight.bold),
              ),
              const SizedBox(height: 20),
              SizedBox(
                width: double.infinity,
                child: ElevatedButton(
                  onPressed: () => Navigator.pop(ctx),
                  style: ElevatedButton.styleFrom(
                    backgroundColor: AppColors.neonGreen,
                    padding: const EdgeInsets.symmetric(vertical: 14),
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                  ),
                  child: const Text('Aceptar', style: TextStyle(color: Colors.black, fontWeight: FontWeight.bold)),
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
    final bool canCreate = _remaining > 0 && !_isCreating;

    return Scaffold(
      backgroundColor: Colors.black,
      appBar: AppBar(
        backgroundColor: Colors.black,
        leading: IconButton(
          icon: const Icon(Icons.arrow_back, color: Colors.white),
          onPressed: () => Navigator.pop(context),
        ),
        title: const Text(
          'Crear Cupones',
          style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold),
        ),
      ),
      body: SafeArea(
        child: Padding(
          padding: const EdgeInsets.all(20),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              const Text(
                'Regala energía a alguien especial',
                style: TextStyle(color: Colors.white, fontSize: 18, fontWeight: FontWeight.bold),
              ),
              const SizedBox(height: 8),
              const Text(
                'Envía un cupón de 50 minutos de carga gratis a cualquier '
                'usuario registrado en Voltaje+. Solo necesitas su correo.',
                style: TextStyle(color: Colors.grey, fontSize: 14, height: 1.4),
              ),

              const SizedBox(height: 28),

              // Quota counter
              Container(
                padding: const EdgeInsets.all(16),
                decoration: BoxDecoration(
                  borderRadius: BorderRadius.circular(16),
                  color: AppColors.neonGreen.withValues(alpha: 0.06),
                  border: Border.all(color: AppColors.neonGreen.withValues(alpha: 0.2)),
                ),
                child: Row(
                  children: [
                    const Icon(Icons.confirmation_number, color: AppColors.neonGreen, size: 28),
                    const SizedBox(width: 14),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          const Text(
                            'Cupones disponibles este mes',
                            style: TextStyle(color: Colors.grey, fontSize: 12),
                          ),
                          const SizedBox(height: 4),
                          _quotaLoaded
                              ? Row(
                                  children: [
                                    Text(
                                      '$_remaining',
                                      style: TextStyle(
                                        color: _remaining > 0 ? AppColors.neonGreen : Colors.red,
                                        fontSize: 28,
                                        fontWeight: FontWeight.bold,
                                      ),
                                    ),
                                    Text(
                                      ' / $_max',
                                      style: const TextStyle(color: Colors.grey, fontSize: 18),
                                    ),
                                  ],
                                )
                              : const SizedBox(
                                  height: 20, width: 20,
                                  child: CircularProgressIndicator(color: AppColors.neonGreen, strokeWidth: 2),
                                ),
                        ],
                      ),
                    ),
                    // Progress ring
                    SizedBox(
                      width: 44,
                      height: 44,
                      child: Stack(
                        fit: StackFit.expand,
                        children: [
                          CircularProgressIndicator(
                            value: _quotaLoaded ? _remaining / _max : 0,
                            strokeWidth: 4,
                            backgroundColor: Colors.grey[800],
                            color: _remaining > 3 ? AppColors.neonGreen : Colors.orange,
                          ),
                          Center(
                            child: Text(
                              '$_used',
                              style: const TextStyle(color: Colors.white, fontSize: 14, fontWeight: FontWeight.bold),
                            ),
                          ),
                        ],
                      ),
                    ),
                  ],
                ),
              ),

              const SizedBox(height: 28),

              // Email input
              TextFormField(
                controller: _emailCtrl,
                keyboardType: TextInputType.emailAddress,
                style: const TextStyle(color: Colors.white),
                decoration: InputDecoration(
                  labelText: 'Correo del destinatario',
                  labelStyle: const TextStyle(color: Colors.grey),
                  hintText: 'ejemplo@correo.com',
                  hintStyle: TextStyle(color: Colors.grey[700]),
                  prefixIcon: const Icon(Icons.email_outlined, color: Colors.grey, size: 20),
                  enabledBorder: OutlineInputBorder(
                    borderRadius: BorderRadius.circular(12),
                    borderSide: BorderSide(color: Colors.grey[800]!),
                  ),
                  focusedBorder: OutlineInputBorder(
                    borderRadius: BorderRadius.circular(12),
                    borderSide: const BorderSide(color: AppColors.neonGreen),
                  ),
                  filled: true,
                  fillColor: Colors.grey[900],
                ),
              ),

              const SizedBox(height: 20),

              // Create button
              SizedBox(
                width: double.infinity,
                child: ElevatedButton.icon(
                  onPressed: canCreate ? _createCoupon : null,
                  icon: _isCreating
                      ? const SizedBox(
                          width: 20, height: 20,
                          child: CircularProgressIndicator(color: Colors.black, strokeWidth: 2.5),
                        )
                      : const Icon(Icons.card_giftcard, color: Colors.black),
                  label: Text(
                    _isCreating ? 'Enviando...' : 'Crear Cupón',
                    style: TextStyle(
                      color: canCreate ? Colors.black : Colors.grey[600],
                      fontSize: 16,
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                  style: ElevatedButton.styleFrom(
                    backgroundColor: canCreate ? AppColors.neonGreen : Colors.grey[800],
                    disabledBackgroundColor: Colors.grey[800],
                    padding: const EdgeInsets.symmetric(vertical: 16),
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
                  ),
                ),
              ),

              const Spacer(),

              // Dev reset button
              Center(
                child: TextButton.icon(
                  onPressed: _isResetting ? null : _resetQuota,
                  icon: _isResetting
                      ? const SizedBox(
                          width: 14, height: 14,
                          child: CircularProgressIndicator(color: Colors.orange, strokeWidth: 2),
                        )
                      : const Icon(Icons.refresh, color: Colors.orange, size: 18),
                  label: Text(
                    _isResetting ? 'Reiniciando...' : 'Reiniciar contador (DEV)',
                    style: const TextStyle(color: Colors.orange, fontSize: 13),
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
