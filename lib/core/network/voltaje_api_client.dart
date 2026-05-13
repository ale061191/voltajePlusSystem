import 'package:dio/dio.dart';
import 'package:flutter/foundation.dart';

class VoltajeApiClient {
  static const String _baseUrl =
      'https://m.voltajevzla.com/cdb-app-api/v1/app/';
  final Dio _dio;

  VoltajeApiClient({Dio? dio})
    : _dio =
          dio ??
          Dio(
            BaseOptions(
              baseUrl: _baseUrl,
              connectTimeout: const Duration(seconds: 10),
              receiveTimeout: const Duration(seconds: 10),
              headers: {
                'User-Agent':
                    'Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/114.0.0.0 Mobile Safari/537.36',
                'Origin': 'https://m.voltajevzla.com',
                'Referer': 'https://m.voltajevzla.com/',
                'Accept': 'application/json, text/plain, */*',
              },
            ),
          );

  Future<List<dynamic>> getNearbyStations({
    required double lat,
    required double lng,
    int zoomLevel = 10,
  }) async {
    try {
      final formData = FormData.fromMap({
        'coordType': '1', // 1: GCJ02 (Common in Chinese apps), 2: WGS84
        'mapType': '1',
        'lat': lat.toString(),
        'lng': lng.toString(),
        'zoomLevel': zoomLevel.toString(),
        'showPrice': '1',
        'usePriceUnit': '1',
      });

      debugPrint(
        '🔌 Probing Real API: $_baseUrl/cdb/shop/listnear Params: lat=$lat, lng=$lng',
      );

      final response = await _dio.post('cdb/shop/listnear', data: formData);

      if (response.statusCode == 200) {
        final data = response.data;
        if (data is Map<String, dynamic> && data['code'] == 0) {
          final List<dynamic> list = data['list'] ?? [];
          debugPrint('🔌 Real API Success: Found ${list.length} stations.');
          return list;
        } else {
          debugPrint(
            '⚠️ Real API Error: Unexpected format or code. Data: $data',
          );
          return [];
        }
      } else {
        debugPrint('❌ Real API HTTP Error: ${response.statusCode}');
        return [];
      }
    } catch (e) {
      debugPrint('❌ Real API Exception: $e');
      return [];
    }
  }
}
