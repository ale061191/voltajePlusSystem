import '../../../../features/map/data/station_model.dart';
// import '../../../../features/map/domain/entities/station.dart'; // Removed invalid import

class VoltajeStationDto {
  final String id;
  final String name;
  final String address;
  final double latitude;
  final double longitude;
  final int totalCount;
  final int availableCount;
  final String? imageUrl;

  VoltajeStationDto({
    required this.id,
    required this.name,
    required this.address,
    required this.latitude,
    required this.longitude,
    required this.totalCount,
    required this.availableCount,
    this.imageUrl,
  });

  factory VoltajeStationDto.fromJson(Map<String, dynamic> json) {
    // Inferred mapping based on common Chinese IoT/Rental attributes found in JS
    // Adjust these keys as we see real data.
    return VoltajeStationDto(
      id: json['id']?.toString() ?? json['shopId']?.toString() ?? '0',
      name: json['shopname'] ?? json['name'] ?? 'Punto Voltaje',
      address: json['address'] ?? '',
      latitude: _parseDouble(json['lat'] ?? json['latitude']),
      longitude: _parseDouble(json['lng'] ?? json['longitude']),
      totalCount:
          int.tryParse(json['totalCount']?.toString() ?? '0') ??
          10, // Default if missing
      availableCount:
          int.tryParse(json['canRent']?.toString() ?? '0') ??
          5, // 'canRent' is common
      imageUrl: json['shoplogo'] ?? json['picture'],
    );
  }

  static double _parseDouble(dynamic value) {
    if (value == null) return 0.0;
    if (value is num) return value.toDouble();
    return double.tryParse(value.toString()) ?? 0.0;
  }

  StationModel toModel() {
    return StationModel(
      id: id,
      name: name,
      address: address,
      latitude: latitude,
      longitude: longitude,
      totalCount: totalCount,
      availableCount: availableCount,
      slots: List.filled(totalCount, 0), // Placeholder slots
      imageUrl: imageUrl,
    );
  }
}
