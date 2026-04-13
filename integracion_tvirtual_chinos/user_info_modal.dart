import 'package:flutter/material.dart';

class UserInfoModal extends StatefulWidget {
  final Function(
    String nombre,
    String cedula,
    String telefono,
    String direccion,
    String email,
  )
  onConfirm;
  final VoidCallback onCancel;

  const UserInfoModal({
    super.key,
    required this.onConfirm,
    required this.onCancel,
  });

  @override
  State<UserInfoModal> createState() => _UserInfoModalState();
}

class _UserInfoModalState extends State<UserInfoModal> {
  final _nombreController = TextEditingController();
  final _cedulaController = TextEditingController();
  final _telefonoController = TextEditingController();
  final _direccionController = TextEditingController();
  final _emailController = TextEditingController();

  @override
  void dispose() {
    _nombreController.dispose();
    _cedulaController.dispose();
    _telefonoController.dispose();
    _direccionController.dispose();
    _emailController.dispose();
    super.dispose();
  }

  void _handleConfirm() {
    widget.onConfirm(
      _nombreController.text.trim(),
      _cedulaController.text.trim(),
      _telefonoController.text.trim(),
      _direccionController.text.trim(),
      _emailController.text.trim(),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Dialog(
      backgroundColor: Colors.transparent,
      child: Container(
        margin: const EdgeInsets.symmetric(horizontal: 16),
        padding: const EdgeInsets.all(24),
        decoration: BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.circular(24),
          boxShadow: [
            BoxShadow(
              color: Colors.black.withOpacity(0.1),
              blurRadius: 20,
              offset: const Offset(0, 10),
            ),
          ],
        ),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Título
            const Text(
              'Completar información del usuario',
              style: TextStyle(
                fontSize: 24,
                fontWeight: FontWeight.w700,
                color: Color(0xFF1A1A1A),
              ),
            ),
            const SizedBox(height: 20),

            // Input: Nombre
            _buildInput(controller: _nombreController, hintText: 'Nombre'),
            const SizedBox(height: 12),

            // Input: Cédula
            _buildInput(controller: _cedulaController, hintText: 'Cédula'),
            const SizedBox(height: 12),

            // Input: Teléfono
            _buildInput(controller: _telefonoController, hintText: 'Teléfono'),
            const SizedBox(height: 12),

            // Input: Dirección corta
            _buildInput(
              controller: _direccionController,
              hintText: 'Dirección corta',
            ),
            const SizedBox(height: 12),

            // Input: Correo electrónico
            _buildInput(
              controller: _emailController,
              hintText: 'Correo electrónico',
            ),
            const SizedBox(height: 24),

            // Botones
            Row(
              mainAxisAlignment: MainAxisAlignment.end,
              children: [
                // Botón Cancelar
                TextButton(
                  onPressed: widget.onCancel,
                  child: const Text(
                    'Cancelar',
                    style: TextStyle(
                      color: Color(0xFF7C4DFF),
                      fontSize: 16,
                      fontWeight: FontWeight.w500,
                    ),
                  ),
                ),
                const SizedBox(width: 16),
                // Botón Confirmado
                ElevatedButton(
                  onPressed: _handleConfirm,
                  style: ElevatedButton.styleFrom(
                    backgroundColor: Colors.white,
                    foregroundColor: const Color(0xFF7C4DFF),
                    elevation: 2,
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(50),
                      side: const BorderSide(
                        color: Color(0xFF7C4DFF),
                        width: 1.5,
                      ),
                    ),
                    padding: const EdgeInsets.symmetric(
                      horizontal: 24,
                      vertical: 14,
                    ),
                  ),
                  child: const Text(
                    'Confirmado',
                    style: TextStyle(fontWeight: FontWeight.w600),
                  ),
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildInput({
    required TextEditingController controller,
    required String hintText,
  }) {
    return TextField(
      controller: controller,
      style: const TextStyle(fontSize: 16, color: Color(0xFF1A1A1A)),
      decoration: InputDecoration(
        hintText: hintText,
        hintStyle: TextStyle(color: Colors.grey[400], fontSize: 16),
        contentPadding: const EdgeInsets.symmetric(
          horizontal: 20,
          vertical: 16,
        ),
        filled: true,
        fillColor: Colors.white,
        border: OutlineInputBorder(
          borderRadius: BorderRadius.circular(50),
          borderSide: const BorderSide(color: Color(0xFF4CAF50), width: 1.5),
        ),
        enabledBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(50),
          borderSide: const BorderSide(color: Color(0xFF4CAF50), width: 1.5),
        ),
        focusedBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(50),
          borderSide: const BorderSide(color: Color(0xFF4CAF50), width: 2),
        ),
      ),
    );
  }
}

// ============================================================
// EJEMPLO DE USO:
// ============================================================
//
// void _showUserInfoModal() {
//   showDialog(
//     context: context,
//     builder: (context) => UserInfoModal(
//       onConfirm: (nombre, cedula, telefono, direccion, email) {
//         // Aquí llamas a tu API de Firebase para:
//         // 1. Crear el usuario en Firebase
//         // 2. Crear el cliente en T-Virtual
//         // 3. Generar la factura
//         print('Datos: $nombre, $cedula, $telefono, $direccion, $email');
//       },
//       onCancel: () => Navigator.pop(context),
//     ),
//   );
// }
