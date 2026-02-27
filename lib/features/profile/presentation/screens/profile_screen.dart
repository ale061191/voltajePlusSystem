import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import '../../../../core/constants/app_colors.dart';
import '../../../../services/auth_service.dart';

class ProfileScreen extends StatelessWidget {
  const ProfileScreen({super.key});

  @override
  Widget build(BuildContext context) {
    final user = AuthService.currentUser;
    final displayName = user?.displayName ?? 'Usuario Voltaje';
    final email = user?.email ?? '';
    final photoUrl = user?.photoURL;

    return Scaffold(
      backgroundColor: Colors.black,
      appBar: AppBar(
        title: const Text('Mi Perfil'),
        backgroundColor: Colors.black,
        leading: IconButton(
          icon: const Icon(Icons.arrow_back, color: AppColors.neonGreen),
          onPressed: () => context.pop(),
        ),
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(20),
        child: Column(
          children: [
            Center(
              child: Container(
                width: 100,
                height: 100,
                decoration: BoxDecoration(
                  shape: BoxShape.circle,
                  border: Border.all(color: AppColors.neonGreen, width: 3),
                  boxShadow: [
                    BoxShadow(
                      color: AppColors.neonGreen.withValues(alpha: 0.3),
                      blurRadius: 15,
                    ),
                  ],
                ),
                child: ClipOval(
                  child: photoUrl != null
                      ? Image.network(
                          photoUrl,
                          fit: BoxFit.cover,
                          errorBuilder: (_, __, ___) => const Icon(
                            Icons.person,
                            size: 50,
                            color: Colors.white,
                          ),
                        )
                      : const Icon(Icons.person, size: 50, color: Colors.white),
                ),
              ),
            ),
            const SizedBox(height: 16),
            Text(
              displayName,
              style: const TextStyle(
                fontSize: 24,
                fontWeight: FontWeight.bold,
                color: Colors.white,
              ),
            ),
            Text(email, style: const TextStyle(color: Colors.grey)),
            const SizedBox(height: 40),

            _buildMenuItem(
              context,
              'Historial de Alquileres',
              Icons.history,
              () => context.push('/history'),
            ),
            _buildMenuItem(
              context,
              'Billetera',
              Icons.account_balance_wallet,
              () => context.push('/wallet'),
            ),
            _buildMenuItem(
              context,
              'Cupones',
              Icons.card_giftcard,
              () => context.push('/coupons'),
            ),
            _buildMenuItem(
              context,
              'Crear Cupones',
              Icons.confirmation_number,
              () => context.push('/create-coupon'),
            ),
            if (email == 'ezequielrodriguez1991@gmail.com')
              _buildMenuItem(
                context,
                'Rastreo GPS (Admin)',
                Icons.admin_panel_settings,
                () => context.push('/admin-active-rentals'),
              ),
            _buildMenuItem(
              context,
              'Soporte y Ayuda',
              Icons.help_outline,
              () {},
            ),
            const SizedBox(height: 20),
            _buildMenuItem(context, 'Cerrar Sesión', Icons.logout, () async {
              await AuthService.signOut();
              if (context.mounted) context.go('/login');
            }, isDestructive: true),
          ],
        ),
      ),
    );
  }

  Widget _buildMenuItem(
    BuildContext context,
    String title,
    IconData icon,
    VoidCallback onTap, {
    bool isDestructive = false,
  }) {
    return Container(
      margin: const EdgeInsets.only(bottom: 16),
      decoration: BoxDecoration(
        color: const Color(0xFF1A1A1A),
        borderRadius: BorderRadius.circular(16),
        border: Border.all(
          color: isDestructive
              ? AppColors.neonRed.withValues(alpha: 0.3)
              : Colors.white.withValues(alpha: 0.05),
        ),
      ),
      child: ListTile(
        leading: Icon(
          icon,
          color: isDestructive ? AppColors.neonRed : AppColors.neonGreen,
        ),
        title: Text(
          title,
          style: TextStyle(
            color: isDestructive ? AppColors.neonRed : Colors.white,
            fontWeight: FontWeight.bold,
          ),
        ),
        trailing: Icon(
          Icons.chevron_right,
          color: Colors.white.withValues(alpha: 0.3),
        ),
        onTap: onTap,
      ),
    );
  }
}
