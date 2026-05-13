import 'package:firebase_auth/firebase_auth.dart';
import 'package:google_sign_in/google_sign_in.dart';
import 'package:flutter/foundation.dart';
import 'package:cloud_functions/cloud_functions.dart';

class AuthService {
  static final FirebaseAuth _auth = FirebaseAuth.instance;
  static final GoogleSignIn _googleSignIn = GoogleSignIn();

  static User? get currentUser => _auth.currentUser;
  static Stream<User?> get authStateChanges => _auth.authStateChanges();
  static bool get isLoggedIn => _auth.currentUser != null;

  static Future<UserCredential> signInWithEmail({
    required String email,
    required String password,
  }) async {
    try {
      debugPrint('[AUTH] signInWithEmail called for: $email');
      final result = await _auth.signInWithEmailAndPassword(
        email: email.trim(),
        password: password,
      );
      debugPrint('[AUTH] signIn SUCCESS: uid=${result.user?.uid}');
      return result;
    } on FirebaseAuthException catch (e) {
      debugPrint(
        '[AUTH] FirebaseAuthException: code=${e.code}, message=${e.message}',
      );
      throw _mapAuthError(e.code, e.message);
    } catch (e, stackTrace) {
      debugPrint('[AUTH] UNEXPECTED ERROR: type=${e.runtimeType}, error=$e');
      debugPrint('[AUTH] Stack: $stackTrace');
      throw 'Error inesperado (${e.runtimeType}): $e';
    }
  }

  static Future<UserCredential> registerWithEmail({
    required String name,
    required String email,
    required String password,
  }) async {
    try {
      debugPrint('[AUTH] registerWithEmail called for: $email');
      final credential = await _auth.createUserWithEmailAndPassword(
        email: email.trim(),
        password: password,
      );
      debugPrint('[AUTH] register SUCCESS: uid=${credential.user?.uid}');

      await credential.user?.updateDisplayName(name.trim());
      await credential.user?.reload();

      return credential;
    } on FirebaseAuthException catch (e) {
      debugPrint(
        '[AUTH] FirebaseAuthException: code=${e.code}, message=${e.message}',
      );
      throw _mapAuthError(e.code, e.message);
    } catch (e, stackTrace) {
      debugPrint('[AUTH] UNEXPECTED ERROR: type=${e.runtimeType}, error=$e');
      debugPrint('[AUTH] Stack: $stackTrace');
      throw 'Error inesperado (${e.runtimeType}): $e';
    }
  }

  static Future<UserCredential?> signInWithGoogle() async {
    try {
      final GoogleSignInAccount? googleUser = await _googleSignIn.signIn();
      if (googleUser == null) return null;

      final GoogleSignInAuthentication googleAuth =
          await googleUser.authentication;

      final credential = GoogleAuthProvider.credential(
        accessToken: googleAuth.accessToken,
        idToken: googleAuth.idToken,
      );

      return await _auth.signInWithCredential(credential);
    } on FirebaseAuthException catch (e) {
      throw _mapAuthError(e.code, e.message);
    } catch (e) {
      debugPrint('Google Sign-In error: $e');
      throw 'Error al iniciar con Google. Intenta de nuevo.';
    }
  }

  static Future<void> sendPasswordReset(String email) async {
    try {
      await _auth.sendPasswordResetEmail(email: email.trim());
    } on FirebaseAuthException catch (e) {
      throw _mapAuthError(e.code, e.message);
    }
  }

  static Future<void> signOut() async {
    await Future.wait([_auth.signOut(), _googleSignIn.signOut()]);
  }

  static Future<bool> isProfileComplete() async {
    try {
      if (currentUser == null) return false;
      final callable = FirebaseFunctions.instance.httpsCallable(
        'getUserProfile',
      );
      final result = await callable.call();
      final data = Map<String, dynamic>.from(result.data);
      return data['isComplete'] == true;
    } catch (e) {
      debugPrint('Error verificando perfil: $e');
      return false; // Fallback to asking them
    }
  }

  static String _mapAuthError(String code, [String? message]) {
    switch (code) {
      case 'user-not-found':
        return 'No existe una cuenta con ese correo.';
      case 'wrong-password':
      case 'invalid-credential':
        return 'Correo o contraseña incorrectos.';
      case 'email-already-in-use':
        return 'Ya existe una cuenta con ese correo.';
      case 'weak-password':
        return 'La contraseña debe tener al menos 6 caracteres.';
      case 'invalid-email':
        return 'El correo no es válido.';
      case 'too-many-requests':
        return 'Demasiados intentos. Espera un momento.';
      case 'network-request-failed':
        return 'Sin conexión a internet.';
      case 'user-disabled':
        return 'Esta cuenta ha sido deshabilitada.';
      case 'unknown':
        return 'Error de autenticación: ${message ?? "Desconocido"}';
      default:
        return 'Error de autenticación ($code). ${message ?? ""}';
    }
  }
}
