import 'package:cloud_functions/cloud_functions.dart';
import 'package:flutter/foundation.dart';
import 'station_model.dart';
// import '../../../../core/network/voltaje_api_client.dart'; // Unused
// import 'dtos/voltaje_station_dto.dart'; // Unused

class StationService {
  final FirebaseFunctions _functions = FirebaseFunctions.instance;
  // final VoltajeApiClient _apiClient = VoltajeApiClient(); // Unused

  Future<List<StationModel>> getStations({double? lat, double? lng}) async {
    try {
      debugPrint('☁️ Calling Cloud Function getStations($lat, $lng)...');

      final HttpsCallable callable = _functions.httpsCallable('getStations');
      final HttpsCallableResult result = await callable.call({
        'lat': lat,
        'lng': lng,
      });

      if (result.data['success'] == true) {
        final List<dynamic> list = result.data['stations'];
        debugPrint('✅ Cloud Function returned ${list.length} stations.');

        return list
            .map((e) => StationModel.fromJson(Map<String, dynamic>.from(e)))
            .toList();
      } else {
        throw Exception(
          result.data['error'] ?? 'Server returned success: false',
        );
      }
    } catch (e) {
      debugPrint('❌ Error fetching stations from Cloud: $e');
      // Return empty list instead of throwing to avoid crashing UI
      return [];
    }
  }
}
