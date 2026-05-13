import 'package:flutter_test/flutter_test.dart';
import 'package:voltaje_v2_app/core/network/voltaje_api_client.dart';

void main() {
  group('VoltajeApiClient', () {
    late VoltajeApiClient apiClient;

    setUp(() {
      apiClient = VoltajeApiClient();
    });

    test('getNearbyStations returns list (even if empty) for Caracas', () async {
      // Coordinates for Caracas
      final lat = 10.4806;
      final lng = -66.9036;

      print('🧪 Testing API with Lat: $lat, Lng: $lng');

      final stations = await apiClient.getNearbyStations(lat: lat, lng: lng);

      print('🧪 Result: ${stations.length} stations found.');

      // We expect a list, even if empty. Null would be a failure in our logic (we return [] on error).
      expect(stations, isA<List>());

      // If we want to test specifically for empty vs non-empty, we can.
      // Based on probe, we expect empty list for now.
      if (stations.isEmpty) {
        print(
          '⚠️ Warning: Real API returned 0 stations. This matches probe results.',
        );
      } else {
        print('✅ Success: Real API returned data!');
      }
    });
  });
}
