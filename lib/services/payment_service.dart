import 'package:cloud_functions/cloud_functions.dart';

class PaymentService {
  static Future<Map<String, dynamic>> initiatePayment({
    required double amount,
    required String payerPhone,
    required String payerId,
    required String payerBankCode,
    required String payerToken,
    required String machineId,
  }) async {
    try {
      final HttpsCallable callable = FirebaseFunctions.instance.httpsCallable(
        'initiatePayment',
      );

      final result = await callable.call({
        'amount': amount,
        'payerPhone': payerPhone,
        'payerId': payerId,
        'payerBankCode': payerBankCode,
        'payerToken': payerToken,
        'machineId': machineId,
      });

      return Map<String, dynamic>.from(result.data);
    } catch (e) {
      if (e is FirebaseFunctionsException) {
        throw Exception('Payment Error (${e.code}): ${e.message}');
      }
      throw Exception('Network error: $e');
    }
  }

  static Future<Map<String, dynamic>> validateP2P({
    required double amount,
    required String bankCode,
    required String phoneNumber,
    required String reference,
    required String machineId,
    String? payerId,
    // slotId eliminado — el backend usa findAvailableSlot() automáticamente
  }) async {
    try {
      final HttpsCallable callable = FirebaseFunctions.instance.httpsCallable(
        'validateP2P',
      );

      final result = await callable.call({
        'amount': amount,
        'bankCode': bankCode,
        'phoneNumber': phoneNumber,
        'reference': reference,
        'machineId': machineId,
        'payerId': payerId,
        // slotId no se envía → backend decide con findAvailableSlot()
      });

      return Map<String, dynamic>.from(result.data);
    } catch (e) {
      if (e is FirebaseFunctionsException) {
        throw Exception('Payment Error (${e.code}): ${e.message}');
      }
      throw Exception('Network error: $e');
    }
  }
}
