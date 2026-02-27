import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import '../constants/app_colors.dart';

class AppTheme {
  static ThemeData get darkTheme {
    return ThemeData(
      useMaterial3: true,
      brightness: Brightness.dark,
      scaffoldBackgroundColor: Colors.black, // Pure black background
      primaryColor: AppColors.neonGreen,

      // Color Scheme
      colorScheme: const ColorScheme.dark(
        primary: AppColors.neonGreen,
        secondary: AppColors.neonCyan,
        // background: Colors.black, // Deprecated, using surface/scaffoldBackgroundColor
        surface: Color(0xFF1A1A1A), // Dark Grey for cards
        error: AppColors.neonRed,
        onPrimary: Colors.black,
        onSurface: Colors.white,
      ),

      // Typography (Outfit - Modern Geometric)
      textTheme: GoogleFonts.spaceGroteskTextTheme().apply(
        bodyColor: Colors.white,
        displayColor: Colors.white,
      ),

      // AppBar Theme
      appBarTheme: const AppBarTheme(
        backgroundColor: Colors.black,
        elevation: 0,
        centerTitle: true,
        titleTextStyle: TextStyle(
          color: Colors.white,
          fontSize: 20,
          fontWeight: FontWeight.bold,
          fontFamily: 'Space Grotesk',
        ),
        iconTheme: IconThemeData(color: AppColors.neonGreen),
      ),

      // Component Styles
      cardTheme: CardThemeData(
        color: const Color(0xFF1A1A1A),
        elevation: 4, // Subtle elevation
        shadowColor: AppColors.neonGreen.withValues(
          alpha: 0.2,
        ), // Neon glow effect
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(16),
          side: BorderSide(
            color: AppColors.neonGreen.withValues(alpha: 0.1),
            width: 1,
          ),
        ),
        margin: EdgeInsets.zero,
      ),

      inputDecorationTheme: InputDecorationTheme(
        filled: true,
        fillColor: const Color(0xFF1A1A1A),
        contentPadding: const EdgeInsets.symmetric(
          horizontal: 20,
          vertical: 16,
        ),
        border: OutlineInputBorder(
          borderRadius: BorderRadius.circular(12),
          borderSide: BorderSide.none,
        ),
        enabledBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(12),
          borderSide: BorderSide(color: Colors.white.withValues(alpha: 0.1)),
        ),
        focusedBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(12),
          borderSide: const BorderSide(color: AppColors.neonGreen, width: 2),
        ),
        hintStyle: TextStyle(color: Colors.white.withValues(alpha: 0.4)),
        prefixIconColor: AppColors.neonGreen,
      ),

      elevatedButtonTheme: ElevatedButtonThemeData(
        style: ElevatedButton.styleFrom(
          backgroundColor: AppColors.neonGreen,
          foregroundColor: Colors.black,
          minimumSize: const Size(double.infinity, 56),
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(30),
          ),
          textStyle: const TextStyle(
            fontSize: 16,
            fontWeight: FontWeight.bold,
            fontFamily: 'Space Grotesk',
          ),
          elevation: 8,
          shadowColor: AppColors.neonGreen.withValues(alpha: 0.4),
        ),
      ),

      outlinedButtonTheme: OutlinedButtonThemeData(
        style: OutlinedButton.styleFrom(
          foregroundColor: AppColors.neonGreen,
          side: const BorderSide(color: AppColors.neonGreen),
          minimumSize: const Size(double.infinity, 56),
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(30),
          ),
          textStyle: const TextStyle(
            fontSize: 16,
            fontWeight: FontWeight.bold,
            fontFamily: 'Space Grotesk',
          ),
        ),
      ),
    );
  }
}
