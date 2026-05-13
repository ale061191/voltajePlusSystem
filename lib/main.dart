import 'package:firebase_core/firebase_core.dart';
import 'firebase_options.dart';
// import 'package:cloud_functions/cloud_functions.dart'; // Needed only for emulator
import 'package:flutter/foundation.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_dotenv/flutter_dotenv.dart';
import 'core/router/app_router.dart';
import 'package:flutter/material.dart';
import 'core/theme/app_theme.dart';

void main() async {
  WidgetsFlutterBinding.ensureInitialized();

  await dotenv.load(fileName: ".env");

  try {
    await Firebase.initializeApp(
      options: DefaultFirebaseOptions.currentPlatform,
    );
  } catch (e) {
    debugPrint("Firebase initialization failed: $e");
  }

  // Emulador deshabilitado — la app usa Cloud Functions reales en produccion.
  // Para usar el emulador local, descomenta las siguientes lineas:
  // if (kDebugMode) {
  //   String host = 'localhost';
  //   if (!kIsWeb && defaultTargetPlatform == TargetPlatform.android) {
  //     host = '10.0.2.2';
  //   }
  //   FirebaseFunctions.instance.useFunctionsEmulator(host, 5001);
  //   debugPrint('Connected to Firebase Functions Emulator at $host:5001');
  // }

  runApp(const ProviderScope(child: VoltajeApp()));
}

class VoltajeApp extends ConsumerWidget {
  const VoltajeApp({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    return MaterialApp.router(
      title: 'Voltaje+',
      debugShowCheckedModeBanner: false,
      theme: AppTheme.darkTheme,
      routerConfig: appRouter,
    );
  }
}
