import 'package:cloud_functions/cloud_functions.dart';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import '../../../../core/constants/app_colors.dart';
import '../../../../services/auth_service.dart';

class WalletScreen extends StatefulWidget {
  const WalletScreen({super.key});

  @override
  State<WalletScreen> createState() => _WalletScreenState();
}

class _WalletScreenState extends State<WalletScreen> {
  bool _isLoading = false;
  double _balance = 0;
  bool _balanceLoaded = false;

  @override
  void initState() {
    super.initState();
    _loadBalance();
  }

  Future<void> _loadBalance() async {
    try {
      final callable = FirebaseFunctions.instance.httpsCallable('getWalletBalance');
      final resp = await callable.call({});
      if (mounted) {
        setState(() {
          _balance = (resp.data['balance'] as num?)?.toDouble() ?? 0;
          _balanceLoaded = true;
        });
      }
    } catch (_) {
      if (mounted) setState(() => _balanceLoaded = true);
    }
  }

  void _openWithdrawScreen() {
    if (_balance <= 0) return;
    Navigator.push(
      context,
      MaterialPageRoute(
        builder: (_) => WithdrawScreen(
          maxAmount: _balance,
          onSuccess: (newBalance) {
            setState(() => _balance = newBalance);
          },
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final bool canWithdraw = _balanceLoaded && _balance > 0;

    return Scaffold(
      backgroundColor: Colors.black,
      appBar: AppBar(
        backgroundColor: Colors.black,
        title: const Text(
          "Mi Billetera",
          style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold),
        ),
        leading: IconButton(
          icon: const Icon(Icons.arrow_back, color: Colors.white),
          onPressed: () => Navigator.pop(context),
        ),
      ),
      body: _isLoading
          ? const Center(child: CircularProgressIndicator(color: AppColors.neonGreen))
          : SingleChildScrollView(
              child: Padding(
                padding: const EdgeInsets.all(20.0),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.center,
                  children: [
                    // 1. Virtual Card
                    _buildVoltajeCard(),
                    const SizedBox(height: 40),

                    // 2. Balance
                    const Text(
                      "Saldo Disponible",
                      style: TextStyle(color: Colors.grey, fontSize: 16),
                    ),
                    const SizedBox(height: 8),
                    _balanceLoaded
                        ? Text(
                            "Bs. ${_balance.toStringAsFixed(2)}",
                            style: const TextStyle(
                              color: Colors.white,
                              fontSize: 40,
                              fontWeight: FontWeight.bold,
                            ),
                          )
                        : const SizedBox(
                            height: 40,
                            width: 40,
                            child: CircularProgressIndicator(
                              color: AppColors.neonGreen,
                              strokeWidth: 2,
                            ),
                          ),
                    const SizedBox(height: 40),

                    // 3. Actions
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceEvenly,
                      children: [
                        _buildActionButton(
                          icon: Icons.add,
                          label: "Recargar",
                          enabled: true,
                          onTap: () {},
                        ),
                        _buildActionButton(
                          icon: Icons.arrow_upward,
                          label: "Retirar",
                          enabled: canWithdraw,
                          onTap: _openWithdrawScreen,
                        ),
                      ],
                    ),
                  ],
                ),
              ),
            ),
    );
  }

  Widget _buildVoltajeCard() {
    return Container(
      width: double.infinity,
      height: 200,
      decoration: BoxDecoration(
        gradient: LinearGradient(
          colors: [Colors.grey[900]!, Colors.black],
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
        ),
        borderRadius: BorderRadius.circular(20),
        border: Border.all(
          color: AppColors.neonGreen.withValues(alpha: 0.5),
          width: 1,
        ),
        boxShadow: [
          BoxShadow(
            color: AppColors.neonGreen.withValues(alpha: 0.2),
            blurRadius: 20,
            offset: const Offset(0, 10),
          ),
        ],
      ),
      child: Stack(
        children: [
          Positioned(
            right: -50,
            top: -50,
            child: Container(
              width: 200,
              height: 200,
              decoration: BoxDecoration(
                shape: BoxShape.circle,
                color: AppColors.neonGreen.withValues(alpha: 0.05),
              ),
            ),
          ),
          Padding(
            padding: const EdgeInsets.all(24.0),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    const Text(
                      "VOLTAJE CARD",
                      style: TextStyle(
                        color: AppColors.neonGreen,
                        fontWeight: FontWeight.bold,
                        letterSpacing: 2,
                        fontFamily: 'Space Grotesk',
                      ),
                    ),
                    Icon(Icons.nfc, color: Colors.white.withValues(alpha: 0.5)),
                  ],
                ),
                Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      (AuthService.currentUser?.uid ?? '').length >= 12
                          ? '${AuthService.currentUser!.uid.substring(0, 4)}  ****  ****  ${AuthService.currentUser!.uid.substring(AuthService.currentUser!.uid.length - 4)}'
                          : '**** **** **** ****',
                      style: const TextStyle(
                        color: Colors.white,
                        fontSize: 22,
                        letterSpacing: 4,
                        fontFamily: 'Courier',
                      ),
                    ),
                    const SizedBox(height: 10),
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        Text(
                          (AuthService.currentUser?.displayName ?? 'USUARIO').toUpperCase(),
                          style: const TextStyle(color: Colors.white70, fontSize: 14),
                        ),
                        const Text(
                          "VOLTAJE+",
                          style: TextStyle(color: Colors.white70, fontSize: 14),
                        ),
                      ],
                    ),
                  ],
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildActionButton({
    required IconData icon,
    required String label,
    required bool enabled,
    required VoidCallback onTap,
  }) {
    final color = enabled ? AppColors.neonGreen : Colors.grey[700]!;
    return Column(
      children: [
        GestureDetector(
          onTap: enabled ? onTap : null,
          child: AnimatedContainer(
            duration: const Duration(milliseconds: 200),
            width: 70,
            height: 70,
            decoration: BoxDecoration(
              color: enabled ? AppColors.surfaceLight : Colors.grey[900],
              borderRadius: BorderRadius.circular(20),
              border: Border.all(color: color.withValues(alpha: 0.3)),
            ),
            child: Icon(icon, color: color, size: 30),
          ),
        ),
        const SizedBox(height: 8),
        Text(
          label,
          style: TextStyle(
            color: enabled ? Colors.white : Colors.grey[600],
            fontWeight: FontWeight.bold,
          ),
        ),
      ],
    );
  }
}

// ──────────────────────────────────────────────
// WITHDRAWAL FULL SCREEN
// ──────────────────────────────────────────────

class WithdrawScreen extends StatefulWidget {
  final double maxAmount;
  final ValueChanged<double> onSuccess;

  const WithdrawScreen({
    super.key,
    required this.maxAmount,
    required this.onSuccess,
  });

  @override
  State<WithdrawScreen> createState() => _WithdrawScreenState();
}

class _WithdrawScreenState extends State<WithdrawScreen> {
  final _formKey = GlobalKey<FormState>();
  final _amountCtrl = TextEditingController();
  final _phoneCtrl = TextEditingController();
  final _idCtrl = TextEditingController();

  bool _isProcessing = false;
  bool _amountValid = false;

  String? _selectedBankCode;
  String? _selectedBankName;

  static const _banks = [
    {'code': '0102', 'name': 'Banco de Venezuela'},
    {'code': '0104', 'name': 'Venezolano de Crédito'},
    {'code': '0105', 'name': 'Mercantil'},
    {'code': '0108', 'name': 'BBVA Provincial'},
    {'code': '0114', 'name': 'Bancaribe'},
    {'code': '0115', 'name': 'Banco Exterior'},
    {'code': '0116', 'name': 'BOD'},
    {'code': '0128', 'name': 'Banco Caroní'},
    {'code': '0134', 'name': 'Banesco'},
    {'code': '0137', 'name': 'Banco Sofitasa'},
    {'code': '0138', 'name': 'Banco Plaza'},
    {'code': '0146', 'name': 'Bangente'},
    {'code': '0151', 'name': 'BFC Banco Fondo Común'},
    {'code': '0156', 'name': '100% Banco'},
    {'code': '0157', 'name': 'Delsur'},
    {'code': '0163', 'name': 'Banco del Tesoro'},
    {'code': '0166', 'name': 'Banco Agrícola'},
    {'code': '0168', 'name': 'Bancrecer'},
    {'code': '0169', 'name': 'Mi Banco'},
    {'code': '0171', 'name': 'Activo'},
    {'code': '0172', 'name': 'Bancamiga'},
    {'code': '0174', 'name': 'Banplus'},
    {'code': '0175', 'name': 'Bicentenario'},
    {'code': '0177', 'name': 'Banfanb'},
    {'code': '0191', 'name': 'BNC'},
  ];

  @override
  void initState() {
    super.initState();
    _amountCtrl.addListener(_validateAmount);
  }

  @override
  void dispose() {
    _amountCtrl.dispose();
    _phoneCtrl.dispose();
    _idCtrl.dispose();
    super.dispose();
  }

  void _validateAmount() {
    final text = _amountCtrl.text.trim();
    final parsed = double.tryParse(text);
    final valid = parsed != null && parsed > 0 && parsed <= widget.maxAmount;
    if (valid != _amountValid) {
      setState(() => _amountValid = valid);
    }
  }

  bool get _canSubmit =>
      _amountValid &&
      _selectedBankCode != null &&
      _phoneCtrl.text.trim().length >= 11 &&
      _idCtrl.text.trim().isNotEmpty &&
      !_isProcessing;

  Future<void> _submit() async {
    if (!_formKey.currentState!.validate() || !_canSubmit) return;

    setState(() => _isProcessing = true);

    try {
      final callable = FirebaseFunctions.instance.httpsCallable('withdrawFunds');
      final resp = await callable.call({
        'amount': double.parse(_amountCtrl.text.trim()),
        'bankCode': _selectedBankCode,
        'phoneNumber': _phoneCtrl.text.trim(),
        'personalId': _idCtrl.text.trim(),
        'beneficiaryName': AuthService.currentUser?.displayName ?? '',
        'description': 'Retiro App Voltaje',
      });

      final success = resp.data['success'] == true;
      final message = resp.data['message'] ?? 'Procesado';
      final newBalance = (resp.data['newBalance'] as num?)?.toDouble() ?? 0;

      if (!mounted) return;

      if (success) {
        widget.onSuccess(newBalance);
        _showSuccessDialog(message, newBalance);
      } else {
        _showErrorSnack(message);
      }
    } catch (e) {
      if (mounted) _showErrorSnack("$e");
    } finally {
      if (mounted) setState(() => _isProcessing = false);
    }
  }

  void _showSuccessDialog(String message, double newBalance) {
    showDialog(
      context: context,
      barrierDismissible: false,
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
                width: 70,
                height: 70,
                decoration: BoxDecoration(
                  shape: BoxShape.circle,
                  color: AppColors.neonGreen.withValues(alpha: 0.15),
                ),
                child: const Icon(Icons.check_circle, color: AppColors.neonGreen, size: 50),
              ),
              const SizedBox(height: 20),
              const Text(
                "Retiro Exitoso",
                style: TextStyle(color: Colors.white, fontSize: 22, fontWeight: FontWeight.bold),
              ),
              const SizedBox(height: 8),
              Text(
                message,
                textAlign: TextAlign.center,
                style: const TextStyle(color: Colors.grey, fontSize: 14),
              ),
              const SizedBox(height: 16),
              Text(
                "Nuevo saldo: Bs. ${newBalance.toStringAsFixed(2)}",
                style: const TextStyle(
                  color: AppColors.neonGreen,
                  fontSize: 18,
                  fontWeight: FontWeight.bold,
                ),
              ),
              const SizedBox(height: 24),
              SizedBox(
                width: double.infinity,
                child: ElevatedButton(
                  onPressed: () {
                    Navigator.pop(ctx);
                    Navigator.pop(context);
                  },
                  style: ElevatedButton.styleFrom(
                    backgroundColor: AppColors.neonGreen,
                    padding: const EdgeInsets.symmetric(vertical: 14),
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                  ),
                  child: const Text(
                    "Aceptar",
                    style: TextStyle(color: Colors.black, fontWeight: FontWeight.bold, fontSize: 16),
                  ),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  void _showErrorSnack(String msg) {
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(content: Text(msg), backgroundColor: Colors.red),
    );
  }

  InputDecoration _fieldDecor(String label, {IconData? icon}) {
    return InputDecoration(
      labelText: label,
      labelStyle: const TextStyle(color: Colors.grey),
      prefixIcon: icon != null ? Icon(icon, color: Colors.grey, size: 20) : null,
      enabledBorder: OutlineInputBorder(
        borderRadius: BorderRadius.circular(12),
        borderSide: BorderSide(color: Colors.grey[800]!),
      ),
      focusedBorder: OutlineInputBorder(
        borderRadius: BorderRadius.circular(12),
        borderSide: const BorderSide(color: AppColors.neonGreen),
      ),
      errorBorder: OutlineInputBorder(
        borderRadius: BorderRadius.circular(12),
        borderSide: const BorderSide(color: Colors.red),
      ),
      focusedErrorBorder: OutlineInputBorder(
        borderRadius: BorderRadius.circular(12),
        borderSide: const BorderSide(color: Colors.red),
      ),
      filled: true,
      fillColor: Colors.grey[900],
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
          "Solicitar Retiro",
          style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold),
        ),
      ),
      body: SafeArea(
        child: Form(
          key: _formKey,
          child: ListView(
            padding: const EdgeInsets.all(20),
            children: [
              // Available balance header
              Container(
                padding: const EdgeInsets.all(16),
                decoration: BoxDecoration(
                  borderRadius: BorderRadius.circular(16),
                  border: Border.all(color: AppColors.neonGreen.withValues(alpha: 0.3)),
                  color: AppColors.neonGreen.withValues(alpha: 0.05),
                ),
                child: Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    const Text(
                      "Disponible",
                      style: TextStyle(color: Colors.grey, fontSize: 14),
                    ),
                    Text(
                      "Bs. ${widget.maxAmount.toStringAsFixed(2)}",
                      style: const TextStyle(
                        color: AppColors.neonGreen,
                        fontSize: 20,
                        fontWeight: FontWeight.bold,
                      ),
                    ),
                  ],
                ),
              ),
              const SizedBox(height: 28),

              // Amount
              TextFormField(
                controller: _amountCtrl,
                keyboardType: const TextInputType.numberWithOptions(decimal: true),
                style: const TextStyle(color: Colors.white, fontSize: 18),
                inputFormatters: [
                  FilteringTextInputFormatter.allow(RegExp(r'^\d*\.?\d{0,2}')),
                ],
                decoration: _fieldDecor("Monto a retirar (Bs.)", icon: Icons.attach_money).copyWith(
                  helperText: "Máximo: Bs. ${widget.maxAmount.toStringAsFixed(2)}",
                  helperStyle: TextStyle(color: Colors.grey[600]),
                ),
                validator: (v) {
                  if (v == null || v.isEmpty) return "Ingresa un monto";
                  final parsed = double.tryParse(v);
                  if (parsed == null || parsed <= 0) return "Monto inválido";
                  if (parsed > widget.maxAmount) return "Excede el saldo disponible";
                  return null;
                },
                onChanged: (_) => setState(() {}),
              ),
              const SizedBox(height: 20),

              // Bank selector
              DropdownButtonFormField<String>(
                value: _selectedBankCode,
                dropdownColor: Colors.grey[900],
                style: const TextStyle(color: Colors.white),
                decoration: _fieldDecor("Banco destino", icon: Icons.account_balance),
                items: _banks.map((b) {
                  return DropdownMenuItem(
                    value: b['code'],
                    child: Text(
                      "${b['code']} - ${b['name']}",
                      style: const TextStyle(color: Colors.white, fontSize: 14),
                    ),
                  );
                }).toList(),
                onChanged: (val) => setState(() {
                  _selectedBankCode = val;
                  _selectedBankName = _banks.firstWhere((b) => b['code'] == val)['name'];
                }),
                validator: (v) => v == null ? "Selecciona un banco" : null,
              ),
              const SizedBox(height: 20),

              // Phone
              TextFormField(
                controller: _phoneCtrl,
                keyboardType: TextInputType.phone,
                style: const TextStyle(color: Colors.white),
                inputFormatters: [
                  FilteringTextInputFormatter.digitsOnly,
                  LengthLimitingTextInputFormatter(11),
                ],
                decoration: _fieldDecor("Teléfono (04XX-XXXXXXX)", icon: Icons.phone),
                validator: (v) => v != null && v.length >= 11 ? null : "Mínimo 11 dígitos",
                onChanged: (_) => setState(() {}),
              ),
              const SizedBox(height: 20),

              // ID / Cedula
              TextFormField(
                controller: _idCtrl,
                style: const TextStyle(color: Colors.white),
                textCapitalization: TextCapitalization.characters,
                decoration: _fieldDecor("Cédula (V12345678)", icon: Icons.badge),
                validator: (v) => v != null && v.isNotEmpty ? null : "Requerido",
                onChanged: (_) => setState(() {}),
              ),

              const SizedBox(height: 36),

              // Submit button
              AnimatedContainer(
                duration: const Duration(milliseconds: 200),
                child: ElevatedButton(
                  onPressed: _canSubmit ? _submit : null,
                  style: ElevatedButton.styleFrom(
                    backgroundColor: _canSubmit ? AppColors.neonGreen : Colors.grey[800],
                    disabledBackgroundColor: Colors.grey[800],
                    padding: const EdgeInsets.symmetric(vertical: 16),
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
                  ),
                  child: _isProcessing
                      ? const SizedBox(
                          height: 22,
                          width: 22,
                          child: CircularProgressIndicator(
                            color: Colors.black,
                            strokeWidth: 2.5,
                          ),
                        )
                      : Text(
                          "Solicitar Retiro",
                          style: TextStyle(
                            color: _canSubmit ? Colors.black : Colors.grey[600],
                            fontSize: 17,
                            fontWeight: FontWeight.bold,
                          ),
                        ),
                ),
              ),

              if (_selectedBankName != null) ...[
                const SizedBox(height: 20),
                Container(
                  padding: const EdgeInsets.all(14),
                  decoration: BoxDecoration(
                    borderRadius: BorderRadius.circular(12),
                    color: Colors.grey[900],
                  ),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      const Text(
                        "Resumen",
                        style: TextStyle(color: Colors.grey, fontSize: 12),
                      ),
                      const SizedBox(height: 8),
                      _summaryRow("Banco", _selectedBankName!),
                      _summaryRow("Teléfono", _phoneCtrl.text),
                      _summaryRow("Cédula", _idCtrl.text),
                      _summaryRow(
                        "Monto",
                        _amountCtrl.text.isNotEmpty
                            ? "Bs. ${_amountCtrl.text}"
                            : "—",
                      ),
                    ],
                  ),
                ),
              ],
            ],
          ),
        ),
      ),
    );
  }

  Widget _summaryRow(String label, String value) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 3),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Text(label, style: const TextStyle(color: Colors.grey, fontSize: 13)),
          Text(
            value.isEmpty ? "—" : value,
            style: const TextStyle(color: Colors.white, fontSize: 13),
          ),
        ],
      ),
    );
  }
}
