import 'package:cloud_functions/cloud_functions.dart';
import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import '../../../../core/constants/app_colors.dart';

class HistoryScreen extends StatefulWidget {
  const HistoryScreen({super.key});

  @override
  State<HistoryScreen> createState() => _HistoryScreenState();
}

class _HistoryScreenState extends State<HistoryScreen> {
  List<Map<String, dynamic>> _transactions = [];
  bool _isLoading = true;

  @override
  void initState() {
    super.initState();
    _loadHistory();
  }

  Future<void> _loadHistory() async {
    try {
      final callable = FirebaseFunctions.instance.httpsCallable('getTransactionHistory');
      final resp = await callable.call({});
      final list = resp.data['transactions'] as List<dynamic>? ?? [];
      if (mounted) {
        setState(() {
          _transactions = list.map((e) => Map<String, dynamic>.from(e)).toList();
          _isLoading = false;
        });
      }
    } catch (_) {
      if (mounted) setState(() => _isLoading = false);
    }
  }

  String _typeLabel(String type) {
    switch (type) {
      case 'P2P_VALIDATION':
        return 'Alquiler (Pago Móvil)';
      case 'C2P_PAYMENT':
        return 'Alquiler (C2P)';
      case 'P2C_WITHDRAWAL':
        return 'Retiro de Fondos';
      default:
        return type;
    }
  }

  IconData _typeIcon(String type) {
    if (type.contains('WITHDRAWAL')) return Icons.arrow_upward;
    return Icons.battery_charging_full;
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Colors.black,
      appBar: AppBar(
        title: const Text('Historial'),
        backgroundColor: Colors.black,
        leading: IconButton(
          icon: const Icon(Icons.arrow_back, color: AppColors.neonGreen),
          onPressed: () => context.pop(),
        ),
      ),
      body: _isLoading
          ? const Center(child: CircularProgressIndicator(color: AppColors.neonGreen))
          : _transactions.isEmpty
              ? Center(
                  child: Column(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      Icon(Icons.history, size: 60, color: Colors.grey[700]),
                      const SizedBox(height: 16),
                      const Text(
                        'No hay transacciones aún',
                        style: TextStyle(color: Colors.grey, fontSize: 16),
                      ),
                      const SizedBox(height: 8),
                      const Text(
                        'Tus alquileres y retiros aparecerán aquí.',
                        style: TextStyle(color: Colors.grey, fontSize: 13),
                      ),
                    ],
                  ),
                )
              : ListView.builder(
                  padding: const EdgeInsets.all(16),
                  itemCount: _transactions.length,
                  itemBuilder: (context, index) {
                    final tx = _transactions[index];
                    final type = tx['type']?.toString() ?? '';
                    final amount = (tx['amount'] as num?)?.toDouble() ?? 0;
                    final machine = tx['machineId']?.toString() ?? '';
                    final status = tx['unlockStatus']?.toString() ?? '';
                    final ref = tx['reference']?.toString() ?? tx['paymentRef']?.toString() ?? '';

                    return Container(
                      margin: const EdgeInsets.only(bottom: 12),
                      decoration: BoxDecoration(
                        color: const Color(0xFF121212),
                        borderRadius: BorderRadius.circular(12),
                        border: Border(
                          left: BorderSide(
                            color: type.contains('WITHDRAWAL') ? Colors.orange : AppColors.neonGreen,
                            width: 4,
                          ),
                        ),
                      ),
                      child: Padding(
                        padding: const EdgeInsets.all(16.0),
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Row(
                              children: [
                                Icon(_typeIcon(type), color: AppColors.neonGreen, size: 20),
                                const SizedBox(width: 8),
                                Expanded(
                                  child: Text(
                                    _typeLabel(type),
                                    style: const TextStyle(
                                      color: Colors.white,
                                      fontSize: 15,
                                      fontWeight: FontWeight.bold,
                                    ),
                                  ),
                                ),
                                Text(
                                  'Bs. ${amount.toStringAsFixed(2)}',
                                  style: TextStyle(
                                    color: AppColors.neonGreen,
                                    fontSize: 16,
                                    fontWeight: FontWeight.bold,
                                    shadows: [
                                      Shadow(
                                        color: AppColors.neonGreen.withValues(alpha: 0.5),
                                        blurRadius: 8,
                                      ),
                                    ],
                                  ),
                                ),
                              ],
                            ),
                            const SizedBox(height: 8),
                            if (machine.isNotEmpty)
                              Text('Máquina: $machine', style: const TextStyle(color: Colors.grey, fontSize: 13)),
                            if (ref.isNotEmpty)
                              Text('Ref: $ref', style: const TextStyle(color: Colors.grey, fontSize: 13)),
                            if (status.isNotEmpty)
                              Text(
                                status == 'UNLOCKED' ? 'Desbloqueado' : 'Pendiente',
                                style: TextStyle(
                                  color: status == 'UNLOCKED' ? AppColors.neonGreen : Colors.orange,
                                  fontSize: 12,
                                  fontWeight: FontWeight.bold,
                                ),
                              ),
                          ],
                        ),
                      ),
                    );
                  },
                ),
    );
  }
}
