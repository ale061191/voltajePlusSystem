import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import '../core/constants/app_colors.dart';
import '../services/payment_service.dart';
import '../services/location_tracking_service.dart';

class PaymentScreen extends StatefulWidget {
  final String machineId;
  const PaymentScreen({super.key, required this.machineId});

  @override
  State<PaymentScreen> createState() => _PaymentScreenState();
}

class _PaymentScreenState extends State<PaymentScreen> {
  final _formKey = GlobalKey<FormState>();
  final _phoneController = TextEditingController();
  final _bankController = TextEditingController();
  final _referenceController = TextEditingController();
  final _amountController = TextEditingController(text: '400.00');

  int _selectedSlot = 1;
  bool _isLoading = false;
  String? _message;

  @override
  void dispose() {
    _phoneController.dispose();
    _bankController.dispose();
    _referenceController.dispose();
    _amountController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Reportar Pago Móvil'),
        backgroundColor: AppColors.surfaceDark,
      ),
      body: Padding(
        padding: const EdgeInsets.all(16.0),
        child: Form(
          key: _formKey,
          child: ListView(
            children: [
              // Machine ID display
              Container(
                padding: const EdgeInsets.symmetric(
                  vertical: 10,
                  horizontal: 16,
                ),
                decoration: BoxDecoration(
                  color: AppColors.surfaceDark,
                  borderRadius: BorderRadius.circular(10),
                  border: Border.all(
                    color: AppColors.neonGreen.withValues(alpha: 0.5),
                  ),
                ),
                child: Row(
                  children: [
                    const Icon(Icons.qr_code, color: AppColors.neonGreen),
                    const SizedBox(width: 10),
                    Expanded(
                      child: Text(
                        'Máquina: ${widget.machineId}',
                        style: const TextStyle(
                          color: Colors.white,
                          fontSize: 15,
                          fontWeight: FontWeight.bold,
                        ),
                      ),
                    ),
                  ],
                ),
              ),
              const SizedBox(height: 16),

              // Amount field (editable)
              TextFormField(
                controller: _amountController,
                decoration: InputDecoration(
                  labelText: 'Monto a Pagar (VES)',
                  border: const OutlineInputBorder(),
                  prefixIcon: const Icon(Icons.attach_money),
                  suffixText: 'VES',
                  helperText: 'Precio estándar: 400 VES / 30 min',
                  helperStyle: TextStyle(
                    color: AppColors.neonGreen.withValues(alpha: 0.7),
                  ),
                ),
                keyboardType: const TextInputType.numberWithOptions(
                  decimal: true,
                ),
                validator: (v) {
                  if (v == null || v.isEmpty) return 'Ingresa el monto';
                  final amount = double.tryParse(v);
                  if (amount == null || amount <= 0) return 'Monto inválido';
                  return null;
                },
              ),
              const SizedBox(height: 16),

              // Bank details card
              Card(
                color: AppColors.surfaceDark,
                shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(12),
                  side: BorderSide(
                    color: AppColors.neonGreen.withValues(alpha: 0.3),
                  ),
                ),
                child: Padding(
                  padding: const EdgeInsets.all(16.0),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Row(
                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                        children: [
                          const Text(
                            "Datos para Pago Móvil:",
                            style: TextStyle(color: Colors.white70, fontSize: 14),
                          ),
                          GestureDetector(
                            onTap: () {
                              const allData =
                                  'Banco: BNC (0191)\n'
                                  'Teléfono: 0412-7866892\n'
                                  'RIF: J-507833453';
                              Clipboard.setData(
                                const ClipboardData(text: allData),
                              );
                              ScaffoldMessenger.of(context).showSnackBar(
                                const SnackBar(
                                  content: Text('Todos los datos copiados'),
                                  backgroundColor: AppColors.neonGreen,
                                  duration: Duration(milliseconds: 1500),
                                ),
                              );
                            },
                            child: Container(
                              padding: const EdgeInsets.symmetric(
                                horizontal: 10,
                                vertical: 5,
                              ),
                              decoration: BoxDecoration(
                                color: AppColors.neonGreen.withValues(alpha: 0.12),
                                borderRadius: BorderRadius.circular(8),
                                border: Border.all(
                                  color: AppColors.neonGreen.withValues(alpha: 0.5),
                                ),
                              ),
                              child: const Row(
                                mainAxisSize: MainAxisSize.min,
                                children: [
                                  Icon(
                                    Icons.copy_all,
                                    size: 14,
                                    color: AppColors.neonGreen,
                                  ),
                                  SizedBox(width: 4),
                                  Text(
                                    'Copiar todo',
                                    style: TextStyle(
                                      color: AppColors.neonGreen,
                                      fontSize: 12,
                                      fontWeight: FontWeight.bold,
                                    ),
                                  ),
                                ],
                              ),
                            ),
                          ),
                        ],
                      ),
                      const SizedBox(height: 8),
                      _buildCopyableRow("Banco:", "BNC (0191)"),
                      _buildCopyableRow("Teléfono:", "0412-7866892"),
                      _buildCopyableRow("RIF:", "J-507833453"),
                    ],
                  ),
                ),
              ),
              const SizedBox(height: 16),

              // Slot selection — oculto: la estación decide qué slot expulsar
              Offstage(
                offstage: true,
                child: Container(
                padding: const EdgeInsets.all(12),
                decoration: BoxDecoration(
                  color: AppColors.surfaceDark,
                  borderRadius: BorderRadius.circular(12),
                  border: Border.all(color: Colors.white24),
                ),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const Text(
                      'Slot del Powerbank:',
                      style: TextStyle(color: Colors.white70, fontSize: 14),
                    ),
                    const SizedBox(height: 8),
                    Wrap(
                      spacing: 8,
                      runSpacing: 8,
                      children: List.generate(8, (index) {
                        final slot = index + 1;
                        final isSelected = slot == _selectedSlot;
                        return GestureDetector(
                          onTap: () => setState(() => _selectedSlot = slot),
                          child: Container(
                            width: 50,
                            height: 50,
                            decoration: BoxDecoration(
                              color: isSelected
                                  ? AppColors.neonGreen
                                  : Colors.transparent,
                              borderRadius: BorderRadius.circular(10),
                              border: Border.all(
                                color: isSelected
                                    ? AppColors.neonGreen
                                    : Colors.white24,
                                width: isSelected ? 2 : 1,
                              ),
                            ),
                            alignment: Alignment.center,
                            child: Text(
                              '$slot',
                              style: TextStyle(
                                color: isSelected ? Colors.black : Colors.white,
                                fontWeight: FontWeight.bold,
                                fontSize: 18,
                              ),
                            ),
                          ),
                        );
                      }),
                    ),
                  ],
                ),
              ),
              ),
              const SizedBox(height: 16),

              // Bank selector
              DropdownButtonFormField<String>(
                value: _bankController.text.isNotEmpty
                    ? _bankController.text
                    : null,
                items: const [
                  DropdownMenuItem(
                    value: '0102',
                    child: Text('0102 - Venezuela'),
                  ),
                  DropdownMenuItem(
                    value: '0105',
                    child: Text('0105 - Mercantil'),
                  ),
                  DropdownMenuItem(
                    value: '0108',
                    child: Text('0108 - Provincial'),
                  ),
                  DropdownMenuItem(
                    value: '0134',
                    child: Text('0134 - Banesco'),
                  ),
                  DropdownMenuItem(value: '0191', child: Text('0191 - BNC')),
                  DropdownMenuItem(
                    value: '0172',
                    child: Text('0172 - Bancamiga'),
                  ),
                  DropdownMenuItem(
                    value: '0175',
                    child: Text('0175 - Bicentenario'),
                  ),
                  DropdownMenuItem(
                    value: '0104',
                    child: Text('0104 - Venezolano de Crédito'),
                  ),
                  DropdownMenuItem(
                    value: '0114',
                    child: Text('0114 - Bancaribe'),
                  ),
                  DropdownMenuItem(value: '0171', child: Text('0171 - Activo')),
                  DropdownMenuItem(
                    value: '0174',
                    child: Text('0174 - Banplus'),
                  ),
                  DropdownMenuItem(
                    value: '0163',
                    child: Text('0163 - Banco del Tesoro'),
                  ),
                  DropdownMenuItem(
                    value: '0169',
                    child: Text('0169 - Mi Banco'),
                  ),
                  DropdownMenuItem(
                    value: '0115',
                    child: Text('0115 - Exterior'),
                  ),
                  DropdownMenuItem(value: '0138', child: Text('0138 - Plaza')),
                  DropdownMenuItem(value: '0151', child: Text('0151 - BFC')),
                  DropdownMenuItem(
                    value: '0156',
                    child: Text('0156 - 100% Banco'),
                  ),
                  DropdownMenuItem(
                    value: '0168',
                    child: Text('0168 - Bancrecer'),
                  ),
                  DropdownMenuItem(
                    value: '0177',
                    child: Text('0177 - BANFANB'),
                  ),
                  DropdownMenuItem(value: '0166', child: Text('0166 - BOD')),
                ],
                onChanged: (v) => setState(() => _bankController.text = v!),
                decoration: const InputDecoration(
                  labelText: 'Banco de Origen',
                  border: OutlineInputBorder(),
                  prefixIcon: Icon(Icons.account_balance),
                ),
                validator: (v) => v == null ? 'Seleccione un banco' : null,
              ),
              const SizedBox(height: 10),

              TextFormField(
                controller: _phoneController,
                decoration: const InputDecoration(
                  labelText: 'Teléfono de Origen (Ej: 04141234567)',
                  border: OutlineInputBorder(),
                  prefixIcon: Icon(Icons.phone),
                ),
                keyboardType: TextInputType.phone,
                validator: (v) {
                  if (v == null || v.isEmpty) return 'Requerido';
                  if (v.length < 10) return 'Teléfono inválido';
                  return null;
                },
              ),
              const SizedBox(height: 10),

              TextFormField(
                controller: _referenceController,
                decoration: const InputDecoration(
                  labelText: 'Referencia (Últimos 4-6 dígitos)',
                  border: OutlineInputBorder(),
                  prefixIcon: Icon(Icons.numbers),
                ),
                keyboardType: TextInputType.number,
                validator: (v) =>
                    v != null && v.length >= 4 ? null : 'Mínimo 4 dígitos',
              ),
              const SizedBox(height: 30),

              _isLoading
                  ? const Center(
                      child: CircularProgressIndicator(
                        color: AppColors.neonGreen,
                      ),
                    )
                  : SizedBox(
                      height: 55,
                      child: ElevatedButton(
                        onPressed: _submitPayment,
                        style: ElevatedButton.styleFrom(
                          backgroundColor: AppColors.neonGreen,
                          shadowColor: AppColors.neonGreen.withValues(
                            alpha: 0.5,
                          ),
                          elevation: 8,
                          shape: RoundedRectangleBorder(
                            borderRadius: BorderRadius.circular(12),
                          ),
                        ),
                        child: const Text(
                          'VALIDAR PAGO Y LIBERAR',
                          style: TextStyle(
                            color: Colors.black,
                            fontWeight: FontWeight.bold,
                            fontSize: 16,
                          ),
                        ),
                      ),
                    ),

              if (_message != null && !_isLoading) ...[
                const SizedBox(height: 20),
                Container(
                  padding: const EdgeInsets.all(12),
                  decoration: BoxDecoration(
                    color: _message!.contains('Error')
                        ? Colors.red.withValues(alpha: 0.1)
                        : Colors.green.withValues(alpha: 0.1),
                    borderRadius: BorderRadius.circular(8),
                    border: Border.all(
                      color: _message!.contains('Error')
                          ? Colors.red
                          : AppColors.neonGreen,
                    ),
                  ),
                  child: Text(
                    _message!,
                    style: TextStyle(
                      color: _message!.contains('Error')
                          ? Colors.red
                          : AppColors.neonGreen,
                    ),
                  ),
                ),
              ],
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildCopyableRow(String label, String value) {
    return GestureDetector(
      onTap: () {
        Clipboard.setData(ClipboardData(text: value));
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Copiado: $value'),
            backgroundColor: AppColors.neonGreen,
            duration: const Duration(milliseconds: 500),
          ),
        );
      },
      child: Padding(
        padding: const EdgeInsets.symmetric(vertical: 4),
        child: Row(
          children: [
            Text(
              "$label ",
              style: const TextStyle(
                color: AppColors.textSecondary,
                fontWeight: FontWeight.bold,
              ),
            ),
            Expanded(
              child: Text(
                value,
                style: const TextStyle(
                  color: Colors.white,
                  fontWeight: FontWeight.bold,
                ),
              ),
            ),
            const Icon(Icons.copy, size: 14, color: AppColors.neonGreen),
          ],
        ),
      ),
    );
  }

  Future<void> _submitPayment() async {
    if (!_formKey.currentState!.validate()) return;

    setState(() {
      _isLoading = true;
      _message = null;
    });

    try {
      final amount = double.parse(_amountController.text);

      final result = await PaymentService.validateP2P(
        amount: amount,
        bankCode: _bankController.text,
        phoneNumber: _phoneController.text,
        reference: _referenceController.text,
        machineId: widget.machineId,
        // slotId eliminado → backend usa findAvailableSlot() automáticamente
      );

      setState(() {
        _isLoading = false;
        _message = 'Pago Verificado';
      });

      if (!mounted) return;
      if (result['unlockStatus'] == 'UNLOCKED') {
        LocationTrackingService().startTracking(widget.machineId);
      }
      _showSuccessDialog(result);
    } catch (e) {
      setState(() {
        _isLoading = false;
        _message = 'Error: ${e.toString().replaceAll("Exception:", "").trim()}';
      });
    }
  }

  void _showSuccessDialog(Map<String, dynamic> result) {
    showDialog(
      context: context,
      barrierDismissible: false,
      builder: (ctx) => Dialog(
        backgroundColor: Colors.transparent,
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
        child: Container(
          padding: const EdgeInsets.all(20),
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
              const SizedBox(height: 10),
              Container(
                padding: const EdgeInsets.all(16),
                decoration: BoxDecoration(
                  shape: BoxShape.circle,
                  border: Border.all(color: AppColors.neonGreen, width: 3),
                  boxShadow: [
                    BoxShadow(
                      color: AppColors.neonGreen.withValues(alpha: 0.5),
                      blurRadius: 15,
                      spreadRadius: 2,
                    ),
                  ],
                ),
                child: const Icon(
                  Icons.check,
                  color: AppColors.neonGreen,
                  size: 50,
                ),
              ),
              const SizedBox(height: 20),
              const Text(
                'PAGO EXITOSO',
                style: TextStyle(
                  color: AppColors.neonGreen,
                  fontSize: 22,
                  fontWeight: FontWeight.bold,
                  shadows: [Shadow(color: AppColors.neonGreen, blurRadius: 10)],
                ),
              ),
              const SizedBox(height: 10),
              Text(
                 result['unlockStatus'] == 'UNLOCKED'
                    ? 'Tu Powerbank ha sido liberado.\nRetíralo de la máquina.'
                    : 'Pago validado.\nDesbloqueo pendiente - contacta soporte.',
                style: const TextStyle(color: Colors.white, fontSize: 15),
                textAlign: TextAlign.center,
              ),
              const SizedBox(height: 5),
              if (result['paymentRef'] != null)
                Text(
                  'Ref: ${result['paymentRef']}',
                  style: const TextStyle(
                    color: Colors.white70,
                    fontWeight: FontWeight.bold,
                    fontSize: 13,
                  ),
                ),
              const SizedBox(height: 25),
              SizedBox(
                width: double.infinity,
                height: 50,
                child: ElevatedButton(
                  style: ElevatedButton.styleFrom(
                    backgroundColor: AppColors.neonGreen,
                    foregroundColor: Colors.black,
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(12),
                    ),
                    elevation: 5,
                    shadowColor: AppColors.neonGreen.withValues(alpha: 0.5),
                  ),
                  onPressed: () {
                    Navigator.of(ctx).pop();
                    Navigator.of(context).popUntil((route) => route.isFirst);
                  },
                  child: const Text(
                    'ACEPTAR',
                    style: TextStyle(fontWeight: FontWeight.bold, fontSize: 16),
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
