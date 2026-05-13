import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:cloud_functions/cloud_functions.dart';
import '../../../../core/constants/app_colors.dart';
import '../../../../services/auth_service.dart';

class CompleteProfileScreen extends StatefulWidget {
  const CompleteProfileScreen({super.key});

  @override
  State<CompleteProfileScreen> createState() => _CompleteProfileScreenState();
}

class _CompleteProfileScreenState extends State<CompleteProfileScreen> {
  final _formKey = GlobalKey<FormState>();
  final _nameController = TextEditingController();
  final _idController = TextEditingController();
  final _phoneController = TextEditingController();
  bool _isLoading = false;
  String? _errorMessage;

  @override
  void initState() {
    super.initState();
    // Pre-fill name if available via Google Auth
    final user = AuthService.currentUser;
    if (user != null &&
        user.displayName != null &&
        user.displayName!.isNotEmpty) {
      _nameController.text = user.displayName!;
    }
  }

  @override
  void dispose() {
    _nameController.dispose();
    _idController.dispose();
    _phoneController.dispose();
    super.dispose();
  }

  Future<void> _submitProfile() async {
    if (!_formKey.currentState!.validate()) return;

    setState(() {
      _isLoading = true;
      _errorMessage = null;
    });

    try {
      final HttpsCallable callable = FirebaseFunctions.instance.httpsCallable(
        'completeUserProfile',
      );

      await callable.call({
        'name': _nameController.text.trim(),
        'idNumber': _idController.text.trim(),
        'phone': _phoneController.text.trim(),
      });

      // Update Firebase Auth Display Name if needed
      if (AuthService.currentUser != null) {
        await AuthService.currentUser!.updateDisplayName(
          _nameController.text.trim(),
        );
        await AuthService.currentUser!.reload();
      }

      if (mounted) {
        context.go('/home');
      }
    } on FirebaseFunctionsException catch (e) {
      setState(() => _errorMessage = e.message ?? 'Error al servidor.');
    } catch (e) {
      setState(() => _errorMessage = 'Error de conexión. Intenta de nuevo.');
    } finally {
      if (mounted) setState(() => _isLoading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.backgroundBlack,
      appBar: AppBar(
        title: const Text('Completa tu Perfil'),
        backgroundColor: Colors.transparent,
        automaticallyImplyLeading: false, // Force them to complete it
      ),
      body: SafeArea(
        child: Padding(
          padding: const EdgeInsets.symmetric(horizontal: 24.0),
          child: SingleChildScrollView(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                const SizedBox(height: 20),
                const Icon(
                  Icons.person_add_alt_1,
                  size: 80,
                  color: AppColors.neonGreen,
                ),
                const SizedBox(height: 16),
                const Text(
                  'Casi listos 🎉',
                  textAlign: TextAlign.center,
                  style: TextStyle(
                    fontSize: 28,
                    fontWeight: FontWeight.bold,
                    color: Colors.white,
                    fontFamily: 'Space Grotesk',
                  ),
                ),
                const SizedBox(height: 8),
                const Text(
                  'Para garantizar la seguridad de nuestra red de Power Banks, necesitamos confirmar algunos datos antes de alquilar.',
                  textAlign: TextAlign.center,
                  style: TextStyle(color: Colors.grey, fontSize: 14),
                ),
                const SizedBox(height: 32),
                Form(
                  key: _formKey,
                  child: Column(
                    children: [
                      TextFormField(
                        controller: _nameController,
                        style: const TextStyle(color: Colors.white),
                        decoration: _inputDecor(
                          'Nombre y Apellido',
                          Icons.person,
                        ),
                        validator: (value) {
                          if (value == null || value.trim().isEmpty)
                            return 'Este campo es obligatorio';
                          if (value.trim().length <= 3)
                            return 'Ingresa un nombre válido';
                          return null;
                        },
                      ),
                      const SizedBox(height: 16),
                      TextFormField(
                        controller: _idController,
                        style: const TextStyle(color: Colors.white),
                        keyboardType: TextInputType.number,
                        decoration: _inputDecor(
                          'Cédula de Identidad (solo números)',
                          Icons.badge,
                        ),
                        validator: (value) {
                          if (value == null || value.trim().isEmpty)
                            return 'La cédula es obligatoria';
                          if (value.trim().length < 6)
                            return 'Ingresa una cédula válida';
                          return null;
                        },
                      ),
                      const SizedBox(height: 16),
                      TextFormField(
                        controller: _phoneController,
                        style: const TextStyle(color: Colors.white),
                        keyboardType: TextInputType.phone,
                        decoration: _inputDecor(
                          'Número de Teléfono (ej. 04121234567)',
                          Icons.phone,
                        ),
                        validator: (value) {
                          if (value == null || value.trim().isEmpty)
                            return 'El teléfono es obligatorio';
                          if (value.trim().length < 10)
                            return 'Ingresa un número válido';
                          return null;
                        },
                      ),
                    ],
                  ),
                ),
                if (_errorMessage != null) ...[
                  const SizedBox(height: 16),
                  Text(
                    _errorMessage!,
                    style: const TextStyle(
                      color: Colors.redAccent,
                      fontSize: 13,
                    ),
                    textAlign: TextAlign.center,
                  ),
                ],
                const SizedBox(height: 32),
                ElevatedButton(
                  onPressed: _isLoading ? null : _submitProfile,
                  style: ElevatedButton.styleFrom(
                    backgroundColor: AppColors.neonGreen,
                    foregroundColor: Colors.black,
                    padding: const EdgeInsets.symmetric(vertical: 16),
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(12),
                    ),
                  ),
                  child: _isLoading
                      ? const SizedBox(
                          height: 20,
                          width: 20,
                          child: CircularProgressIndicator(
                            color: Colors.black,
                            strokeWidth: 2,
                          ),
                        )
                      : const Text(
                          'GUARDAR PERFIL',
                          style: TextStyle(
                            fontWeight: FontWeight.bold,
                            fontSize: 16,
                          ),
                        ),
                ),
                const SizedBox(height: 16),
                TextButton(
                  onPressed: () async {
                    await AuthService.signOut();
                    if (context.mounted) context.go('/login');
                  },
                  child: const Text(
                    'Cerrar Sesión por ahora',
                    style: TextStyle(color: Colors.grey),
                  ),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }

  InputDecoration _inputDecor(String hint, IconData icon) {
    return InputDecoration(
      hintText: hint,
      hintStyle: const TextStyle(color: Colors.white30),
      prefixIcon: Icon(icon, color: AppColors.neonGreen),
      filled: true,
      fillColor: AppColors.surfaceLight,
      border: OutlineInputBorder(
        borderRadius: BorderRadius.circular(12),
        borderSide: BorderSide.none,
      ),
      focusedBorder: OutlineInputBorder(
        borderRadius: BorderRadius.circular(12),
        borderSide: const BorderSide(color: AppColors.neonGreen, width: 2),
      ),
      errorBorder: OutlineInputBorder(
        borderRadius: BorderRadius.circular(12),
        borderSide: const BorderSide(color: Colors.redAccent, width: 1),
      ),
    );
  }
}
