class StationModel {
  final String id;
  final String name;
  final String address;
  final double latitude;
  final double longitude;
  final int totalCount;
  final int availableCount;
  final int returnSlots;
  final int chargingCount;
  final int cabinetCount;
  final List<int> slots;
  final String? imageUrl;
  final double price;
  final int timeUnit;
  final int freeMinutes;
  final double maxPrice;
  final double deposit;
  final String currency;
  final String distance;
  final String schedule;

  StationModel({
    required this.id,
    required this.name,
    required this.address,
    required this.latitude,
    required this.longitude,
    required this.totalCount,
    required this.availableCount,
    this.returnSlots = 0,
    this.chargingCount = 0,
    this.cabinetCount = 1,
    required this.slots,
    this.imageUrl,
    this.price = 400.0,
    this.timeUnit = 30,
    this.freeMinutes = 0,
    this.maxPrice = 0,
    this.deposit = 0,
    this.currency = 'VES',
    this.distance = '',
    this.schedule = '',
  });

  factory StationModel.fromJson(Map<String, dynamic> json) {
    return StationModel(
      id: json['id']?.toString() ?? '0',
      name: json['name'] ?? 'Estación Desconocida',
      address: json['address'] ?? '',
      latitude: _toDouble(json['latitude']),
      longitude: _toDouble(json['longitude']),
      totalCount: _toInt(json['totalCount']),
      availableCount: _toInt(json['availableCount']),
      returnSlots: _toInt(json['returnSlots']),
      chargingCount: _toInt(json['chargingCount']),
      cabinetCount: _toInt(json['cabinetCount'], fallback: 1),
      slots: (json['slots'] != null) ? List<int>.from(json['slots']) : [],
      imageUrl: json['banner'] ?? json['picture'] ?? json['image'],
      price: _toDouble(json['price'], fallback: 400.0),
      timeUnit: _toInt(json['timeUnit'], fallback: 30),
      freeMinutes: _toInt(json['freeMinutes']),
      maxPrice: _toDouble(json['maxPrice']),
      deposit: _toDouble(json['deposit']),
      currency: json['currency']?.toString() ?? 'VES',
      distance: json['distance']?.toString() ?? '',
      schedule: json['schedule']?.toString() ?? '',
    );
  }

  static double _toDouble(dynamic v, {double fallback = 0.0}) {
    if (v is num) return v.toDouble();
    if (v is String) return double.tryParse(v) ?? fallback;
    return fallback;
  }

  static int _toInt(dynamic v, {int fallback = 0}) {
    if (v is num) return v.toInt();
    if (v is String) return int.tryParse(v) ?? fallback;
    return fallback;
  }
}
