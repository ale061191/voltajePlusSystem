import 'package:flutter/material.dart';

class AppTheme {
  // --- Colores Principales (Neon/Cyberpunk) ---
  static const Color primaryGreen = Color(0xFF00E676); // Verde Neón (Acción)
  static const Color secondaryOrange = Color(0xFFFF9100); // Naranja (Alerta)
  static const Color darkBackground = Color(0xFF121212); // Gris Muy Oscuro
  static const Color surfaceBlack = Color(0xFF1E1E1E); // Negro Superficie
  static const Color electricBlue = Color(0xFF00B0FF); // Azul Eléctrico (Info)

  // --- Tema Oscuro (Principal) ---
  static final ThemeData darkTheme = ThemeData(
    brightness: Brightness.dark,
    primaryColor: primaryGreen,
    scaffoldBackgroundColor: darkBackground,
    
    // AppBar
    appBarTheme: const AppBarTheme(
      backgroundColor: surfaceBlack,
      elevation: 0,
      centerTitle: true,
      titleTextStyle: TextStyle(
        color: Colors.white,
        fontSize: 20,
        fontWeight: FontWeight.bold,
        letterSpacing: 1.2,
      ),
      iconTheme: IconThemeData(color: Colors.white),
    ),

    // Botones (Elevated)
    elevatedButtonTheme: ElevatedButtonThemeData(
      style: ElevatedButton.styleFrom(
        backgroundColor: primaryGreen,
        foregroundColor: Colors.black, // Texto negro sobre verde
        textStyle: const TextStyle(
          fontWeight: FontWeight.bold,
          fontSize: 16,
          letterSpacing: 1.0,
        ),
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(12),
        ),
        padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 16),
      ),
    ),

    // Botones Flotantes (FAB)
    floatingActionButtonTheme: const FloatingActionButtonThemeData(
      backgroundColor: primaryGreen,
      foregroundColor: Colors.black,
    ),

    // Inputs
    inputDecorationTheme: InputDecorationTheme(
      filled: true,
      fillColor: surfaceBlack,
      border: OutlineInputBorder(
        borderRadius: BorderRadius.circular(12),
        borderSide: BorderSide.none,
      ),
      focusedBorder: OutlineInputBorder(
        borderRadius: BorderRadius.circular(12),
        borderSide: const BorderSide(color: primaryGreen, width: 2),
      ),
      labelStyle: const TextStyle(color: Colors.white70),
    ),

    // Textos
    textTheme: const TextTheme(
      displayLarge: TextStyle(color: Colors.white, fontWeight: FontWeight.bold),
      bodyLarge: TextStyle(color: Colors.white70, fontSize: 16),
      bodyMedium: TextStyle(color: Colors.white60, fontSize: 14),
    ), colorScheme: ColorScheme.fromSwatch(brightness: Brightness.dark).copyWith(secondary: secondaryOrange),
  );
}
