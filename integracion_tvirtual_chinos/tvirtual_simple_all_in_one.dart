// ============================================================
// 📱 T-VIRTUAL INTEGRATION - COPIAR Y PEGAR (Versión Simple)
// ============================================================
// Para los chinos: Copia este archivo completo en tu proyecto Flutter
// y llama a las funciones cuando el usuario complete su registro.
//
// Este código hace TODO automáticamente:
// 1. Crea el usuario en tu Firebase
// 2. Crea el cliente en T-Virtual
// 3. Lista para generar facturas
// ============================================================

import 'package:flutter/material.dart';
import 'package:http/http.dart' as http;
import 'dart:convert';

// ============================================================
// CONFIGURACIÓN - CAMBIA ESTOS VALORES
// ============================================================
class TVirtualConfig {
  // Token de T-Virtual (el que usamos en pruebas)
  static const String token =
      'eOu9ZOcjtLXfxP19Fq3Ij+D8KidlVDOKWuywwnSc7nJ62zLV';

  // URLs de T-Virtual (QA - pruebas)
  static const String urlCliente =
      'https://qa.tvirtual.net/api/prov-clientes/cargar';
  static const String urlFactura =
      'https://qa.tvirtual.net/api/facturacion-digital/cargar';

  // Datos para factura (iguales para todos)
  static const String almacen = 'ALMACEN DE EQUIPOS ALQUILADOS';
  static const String vendedor = 'V0000001';
  static const String cuentaContable = '1112001';
  static const String codigoServicio = 'DTN02901'; // Power Bank Rental
}

// ============================================================
// FUNCIONES DE API (No necesitas modificar esto)
// ============================================================

// 1. Crear cliente en T-Virtual
Future<Map<String, dynamic>> crearClienteEnTVirtual({
  required String cedula,
  required String nombre,
  required String telefono,
  required String email,
  String direccion = "Venezuela",
}) async {
  try {
    final response = await http.post(
      Uri.parse(TVirtualConfig.urlCliente),
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ${TVirtualConfig.token}',
      },
      body: jsonEncode({
        'indicacliente': 1,
        'inditipoente': 'NN',
        'especial': 0,
        'indicedrif': 'C',
        'cedrif': cedula,
        'nombre': nombre,
        'email': email,
        'telefono': telefono,
        'direccion': direccion,
        'diascredito': 0,
        'ivaidtarifadetalle': 15,
      }),
    );

    return jsonDecode(response.body);
  } catch (e) {
    return {'error': true, 'mensaje': e.toString()};
  }
}

// 2. Generar factura en T-Virtual
Future<Map<String, dynamic>> generarFacturaEnTVirtual({
  required String cedulaCliente,
  required double monto,
  String observaciones = "Alquiler Power Bank",
  String? referencia,
}) async {
  try {
    final response = await http.post(
      Uri.parse(TVirtualConfig.urlFactura),
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ${TVirtualConfig.token}',
      },
      body: jsonEncode({
        'serie': '',
        'moneda': 'VES',
        'tasa_cambio': 1,
        'rif_cliente': cedulaCliente,
        'observaciones': observaciones,
        'almacen': TVirtualConfig.almacen,
        'vendedor': TVirtualConfig.vendedor,
        'detalles': [
          {
            'codigo': TVirtualConfig.codigoServicio,
            'cantidad': 1,
            'presentacion': 1,
            'precio_unit': monto,
            'lote': '',
            'descuento_monto': 0,
            'tasa_cambio': 1,
            'rif_tercero': '',
          },
        ],
        'cobros': [
          {
            'moneda': 'VES',
            'monto': monto,
            'tasa_cambio': 1,
            'cuenta_asociada': TVirtualConfig.cuentaContable,
            'referencia':
                referencia ?? 'RENTAL-${DateTime.now().millisecondsSinceEpoch}',
          },
        ],
      }),
    );

    return jsonDecode(response.body);
  } catch (e) {
    return {'error': true, 'mensaje': e.toString()};
  }
}

// ============================================================
// UI DEL MODAL - COPIA ESTO A TU PANTALLA DE REGISTRO
// ============================================================

// Llamar así cuando el usuario termine de llenar el formulario:
// showDialog(
//   context: context,
//   builder: (context) => UserInfoModal(
//     onConfirm: (nombre, cedula, telefono, direccion, email) async {
//       // 1. Crear usuario en tu Firebase (tu código actual)
//       await tuFuncionGuardarUsuario(...);
//
//       // 2. Crear cliente en T-Virtual (esto es nuevo)
//       final result = await crearClienteEnTVirtual(
//         cedula: cedula,
//         nombre: nombre,
//         telefono: telefono,
//         email: email,
//         direccion: direccion,
//       );
//
//       if (result['error'] == false) {
//         print('Cliente creado en T-Virtual!');
//       }
//     },
//   ),
// );

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
            BoxShadow(color: Colors.black.withOpacity(0.1), blurRadius: 20),
          ],
        ),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Text(
              'Completar información del usuario',
              style: TextStyle(fontSize: 24, fontWeight: FontWeight.w700),
            ),
            const SizedBox(height: 20),
            _buildInput(_nombreController, 'Nombre'),
            const SizedBox(height: 12),
            _buildInput(_cedulaController, 'Cédula'),
            const SizedBox(height: 12),
            _buildInput(_telefonoController, 'Teléfono'),
            const SizedBox(height: 12),
            _buildInput(_direccionController, 'Dirección corta'),
            const SizedBox(height: 12),
            _buildInput(_emailController, 'Correo electrónico'),
            const SizedBox(height: 24),
            Row(
              mainAxisAlignment: MainAxisAlignment.end,
              children: [
                TextButton(
                  onPressed: widget.onCancel,
                  child: const Text(
                    'Cancelar',
                    style: TextStyle(color: Color(0xFF7C4DFF), fontSize: 16),
                  ),
                ),
                const SizedBox(width: 16),
                ElevatedButton(
                  onPressed: () => widget.onConfirm(
                    _nombreController.text.trim(),
                    _cedulaController.text.trim(),
                    _telefonoController.text.trim(),
                    _direccionController.text.trim(),
                    _emailController.text.trim(),
                  ),
                  style: ElevatedButton.styleFrom(
                    backgroundColor: Colors.white,
                    foregroundColor: const Color(0xFF7C4DFF),
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(50),
                      side: const BorderSide(
                        color: Color(0xFF7C4DFF),
                        width: 1.5,
                      ),
                    ),
                  ),
                  child: const Text('Confirmado'),
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildInput(TextEditingController controller, String hint) {
    return TextField(
      controller: controller,
      decoration: InputDecoration(
        hintText: hint,
        hintStyle: TextStyle(color: Colors.grey[400]),
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
      ),
    );
  }
}

// ============================================================
// EJEMPLO COMPLETO DE USO:
// ============================================================
//
// class TuPaginaRegistro extends StatelessWidget {
//   void _guardarUsuario() async {
//     // Tu código para guardar en Firebase (el que ya tienes)
//     await guardarEnTuFirebase(nombre, cedula, telefono, direccion, email);
//
//     // Nuevo: Crear cliente en T-Virtual
//     final result = await crearClienteEnTVirtual(
//       cedula: cedula,
//       nombre: nombre,
//       telefono: telefono,
//       email: email,
//       direccion: direccion,
//     );
//
//     if (result['error'] == false) {
//       print('✅ Cliente creado en T-Virtual exitosamente!');
//     } else {
//       print('❌ Error: ${result['mensaje']}');
//     }
//   }
//
//   @override
//   Widget build(BuildContext context) {
//     return Scaffold(
//       body: TuFormularioDeRegistro(
//         onSubmit: (datos) {
//           _guardarUsuario();
//         },
//       ),
//     );
//   }
// }
