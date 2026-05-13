import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import '../../../../core/constants/app_colors.dart';
import '../../../../services/auth_service.dart';

class SplashScreen extends StatefulWidget {
  const SplashScreen({super.key});

  @override
  State<SplashScreen> createState() => _SplashScreenState();
}

class _SplashScreenState extends State<SplashScreen> {
  @override
  void initState() {
    super.initState();
    _checkAuth();
  }

  Future<void> _checkAuth() async {
    await Future.delayed(const Duration(seconds: 2));
    if (!mounted) return;

    if (AuthService.isLoggedIn) {
      final isComplete = await AuthService.isProfileComplete();
      if (!mounted) return;
      if (isComplete) {
        context.go('/home');
      } else {
        context.go('/complete_profile');
      }
    } else {
      context.go('/login');
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.backgroundBlack,
      body: Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Image.asset(
              'assets/images/logo.png',
              width: 180,
              errorBuilder: (context, error, stackTrace) {
                return const Icon(
                  Icons.electric_bolt,
                  size: 100,
                  color: AppColors.neonCyan,
                );
              },
            ),
            const SizedBox(height: 24),
            const CircularProgressIndicator(color: AppColors.neonCyan),
          ],
        ),
      ),
    );
  }
}
