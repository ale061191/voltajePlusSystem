import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import '../../features/auth/presentation/screens/splash_screen.dart';
import '../../features/auth/presentation/screens/login_screen.dart';
import '../../features/auth/presentation/screens/register_screen.dart';
import '../../features/map/presentation/screens/home_screen.dart';
import '../../features/profile/presentation/screens/profile_screen.dart';
import '../../features/profile/presentation/screens/complete_profile_screen.dart';
import '../../features/history/presentation/screens/history_screen.dart';
import '../../screens/payment_method_screen.dart';
import '../../features/wallet/presentation/screens/wallet_screen.dart';
import '../../features/map/presentation/screens/qr_scan_screen.dart';
import '../../features/coupons/presentation/screens/coupons_screen.dart';
import '../../features/coupons/presentation/screens/create_coupon_screen.dart';
import '../../features/coupons/presentation/screens/coupon_scan_screen.dart';
import '../../features/admin/presentation/screens/admin_active_rentals_screen.dart';
import '../../features/admin/presentation/screens/admin_user_map_screen.dart';
import '../../features/map/presentation/screens/qr_return_scan_screen.dart';
import '../../services/auth_service.dart';

final _rootNavigatorKey = GlobalKey<NavigatorState>();

const _publicRoutes = {'/', '/login', '/register', '/complete_profile'};

final appRouter = GoRouter(
  navigatorKey: _rootNavigatorKey,
  initialLocation: '/',
  redirect: (context, state) {
    final loggedIn = AuthService.isLoggedIn;
    final path = state.matchedLocation;
    final isPublic = _publicRoutes.contains(path);

    if (!loggedIn && !isPublic) return '/login';
    // Let the UI decide where to go between /home and /complete_profile
    if (loggedIn && (path == '/login' || path == '/register')) return '/home';

    return null;
  },
  routes: [
    GoRoute(path: '/', builder: (context, state) => const SplashScreen()),
    GoRoute(path: '/login', builder: (context, state) => const LoginScreen()),
    GoRoute(
      path: '/register',
      builder: (context, state) => const RegisterScreen(),
    ),
    GoRoute(
      path: '/complete_profile',
      builder: (context, state) => const CompleteProfileScreen(),
    ),
    GoRoute(path: '/home', builder: (context, state) => const HomeScreen()),
    GoRoute(
      path: '/profile',
      builder: (context, state) => const ProfileScreen(),
    ),
    GoRoute(
      path: '/history',
      builder: (context, state) => const HistoryScreen(),
    ),
    GoRoute(
      path: '/payment/:machineId',
      builder: (context, state) {
        final machineId = state.pathParameters['machineId']!;
        return PaymentMethodScreen(machineId: machineId);
      },
    ),
    GoRoute(path: '/wallet', builder: (context, state) => const WalletScreen()),
    GoRoute(path: '/scan', builder: (context, state) => const QRScanScreen()),
    GoRoute(
      path: '/scan-return',
      builder: (context, state) => const QRReturnScanScreen(),
    ),
    GoRoute(
      path: '/coupons',
      builder: (context, state) => const CouponsScreen(),
    ),
    GoRoute(
      path: '/create-coupon',
      builder: (context, state) => const CreateCouponScreen(),
    ),
    GoRoute(
      path: '/coupon-scan/:couponId/:freeMinutes',
      builder: (context, state) {
        final couponId = state.pathParameters['couponId']!;
        final freeMinutes =
            int.tryParse(state.pathParameters['freeMinutes'] ?? '50') ?? 50;
        return CouponScanScreen(couponId: couponId, freeMinutes: freeMinutes);
      },
    ),
    GoRoute(
      path: '/admin-active-rentals',
      builder: (context, state) => const AdminActiveRentalsScreen(),
    ),
    GoRoute(
      path: '/admin-user-map',
      builder: (context, state) {
        final rental = state.extra as Map<String, dynamic>;
        return AdminUserMapScreen(rentalData: rental);
      },
    ),
  ],
);
