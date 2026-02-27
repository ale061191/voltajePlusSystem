import 'package:flutter/material.dart';
import 'package:google_maps_flutter/google_maps_flutter.dart';
import 'package:flutter/services.dart' show rootBundle;
import 'package:go_router/go_router.dart';
import 'package:geolocator/geolocator.dart';
import 'package:permission_handler/permission_handler.dart';
import 'package:http/http.dart' as http;
import 'package:flutter_dotenv/flutter_dotenv.dart';
import 'dart:convert';

import '../../../../core/constants/app_colors.dart';
import '../../data/station_service.dart';
import '../../data/station_model.dart';
import 'package:cloud_firestore/cloud_firestore.dart';
import '../../../../services/auth_service.dart';

class HomeScreen extends StatefulWidget {
  const HomeScreen({super.key});

  @override
  State<HomeScreen> createState() => _HomeScreenState();
}

class _HomeScreenState extends State<HomeScreen> {
  GoogleMapController? _mapController;
  BitmapDescriptor? _customMarker;
  String? _mapStyle;

  // Navigation & Location
  Set<Polyline> _polylines = {};
  LatLng? _currentLocation;
  // Read the key from .env
  static final String _googleMapsApiKey =
      dotenv.env['GOOGLE_MAPS_API_KEY'] ?? '';

  // Real-time Map Data
  final StationService _stationService = StationService();
  Set<Marker> _markers = {};
  bool _isLoading = true;

  // Default Application Location (Caracas)
  static const CameraPosition _kInitialPosition = CameraPosition(
    target: LatLng(10.4806, -66.9036),
    zoom: 13.0,
  );

  bool _isBottomSheetOpen = false;

  @override
  void initState() {
    super.initState();
    _loadMapAssets();
  }

  Future<void> _loadMapAssets() async {
    // 1. Load Dark Map Style
    try {
      _mapStyle = await rootBundle.loadString('assets/style.json');
    } catch (e) {
      debugPrint("Error loading map style: $e");
    }

    // 2. Load Custom Marker
    try {
      _customMarker = await BitmapDescriptor.asset(
        const ImageConfiguration(size: Size(36, 36)),
        'assets/images/marker.png',
      );
    } catch (e) {
      debugPrint("Error loading marker: $e");
    }

    // 3. Request Location & Get Current Position
    await _getCurrentLocation();

    // 4. Fetch Stations
    await _fetchStations();

    if (mounted) setState(() {});
  }

  Future<void> _getCurrentLocation() async {
    var status = await Permission.location.request();
    if (status.isGranted) {
      try {
        Position position = await Geolocator.getCurrentPosition();
        setState(() {
          _currentLocation = LatLng(position.latitude, position.longitude);
        });
        // Optional: Move camera to user on start
        if (_mapController != null && _currentLocation != null) {
          _mapController!.animateCamera(
            CameraUpdate.newLatLngZoom(_currentLocation!, 15),
          );
        }
      } catch (e) {
        debugPrint("Error getting location: $e");
      }
    }
  }

  Future<void> _fetchStations() async {
    try {
      debugPrint("🗺️ Fetching Stations...");
      final List<StationModel> stations = await _stationService.getStations(
        lat: _currentLocation?.latitude,
        lng: _currentLocation?.longitude,
      );
      debugPrint("✅ Stations Received: ${stations.length}");

      final Set<Marker> newMarkers = stations.map((station) {
        return Marker(
          markerId: MarkerId(station.id.toString()),
          position: LatLng(station.latitude, station.longitude),
          icon: _customMarker ?? BitmapDescriptor.defaultMarker,
          onTap: () {
            if (mounted) _showStationDetails(context, station);
          },
        );
      }).toSet();

      if (mounted) {
        setState(() {
          _markers = newMarkers;
          _isLoading = false;
        });
      }
    } catch (e) {
      debugPrint("❌ Error fetching stations for map: $e");
      if (mounted) setState(() => _isLoading = false);
    }
  }

  // --- NAVIGATION LOGIC (HTTP + Manual Decoding) ---
  Future<void> _drawRoute(LatLng destination) async {
    if (_currentLocation == null) {
      await _getCurrentLocation();
      if (_currentLocation == null) {
        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(
              content: Text("No se pudo obtener tu ubicación actual."),
            ),
          );
        }
        return;
      }
    }

    try {
      // Manual HTTP Request to Google Directions API
      final String url =
          "https://maps.googleapis.com/maps/api/directions/json?origin=${_currentLocation!.latitude},${_currentLocation!.longitude}&destination=${destination.latitude},${destination.longitude}&mode=driving&key=$_googleMapsApiKey";

      debugPrint("requesting route: $url"); // DEBUG
      final response = await http.get(Uri.parse(url));
      debugPrint(
        "Route Response: ${response.statusCode} ${response.body}",
      ); // DEBUG

      if (response.statusCode == 200) {
        final Map<String, dynamic> data = json.decode(response.body);

        if ((data['routes'] as List).isEmpty) {
          if (mounted) {
            ScaffoldMessenger.of(context).showSnackBar(
              const SnackBar(content: Text("No se encontró ruta.")),
            );
          }
          return;
        }

        final String encodedPolyline =
            data['routes'][0]['overview_polyline']['points'];
        // Decode manually
        final List<LatLng> decodedPoints = _decodePolyline(encodedPolyline);

        setState(() {
          _polylines.clear();
          _polylines.add(
            Polyline(
              polylineId: const PolylineId('route'),
              color: AppColors.neonGreen,
              width: 5,
              points: decodedPoints,
            ),
          );
        });

        // Zoom to fit route
        if (_mapController != null) {
          LatLngBounds bounds = _boundsFromLatLngList([
            _currentLocation!,
            destination,
          ]);
          _mapController!.animateCamera(
            CameraUpdate.newLatLngBounds(bounds, 50),
          );
        }

        if (mounted) setState(() => _isBottomSheetOpen = false); // Close state
        Navigator.pop(context); // Close bottom sheet
      } else {
        debugPrint("Route Error: ${response.statusCode} ${response.body}");
        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(
              content: Text("Error al trazar ruta: ${response.reasonPhrase}"),
            ),
          );
        }
      }
    } catch (e) {
      debugPrint("Route Exception: $e");
      if (mounted) {
        ScaffoldMessenger.of(
          context,
        ).showSnackBar(SnackBar(content: Text("Error de conexión: $e")));
      }
    }
  }

  // Manual Polyline Decoder
  List<LatLng> _decodePolyline(String encoded) {
    List<LatLng> points = [];
    int index = 0, len = encoded.length;
    int lat = 0, lng = 0;

    while (index < len) {
      int b, shift = 0, result = 0;
      do {
        b = encoded.codeUnitAt(index++) - 63;
        result |= (b & 0x1f) << shift;
        shift += 5;
      } while (b >= 0x20);
      int dlat = ((result & 1) != 0 ? ~(result >> 1) : (result >> 1));
      lat += dlat;

      shift = 0;
      result = 0;
      do {
        b = encoded.codeUnitAt(index++) - 63;
        result |= (b & 0x1f) << shift;
        shift += 5;
      } while (b >= 0x20);
      int dlng = ((result & 1) != 0 ? ~(result >> 1) : (result >> 1));
      lng += dlng;

      points.add(LatLng(lat / 1E5, lng / 1E5));
    }
    return points;
  }

  LatLngBounds _boundsFromLatLngList(List<LatLng> list) {
    double? x0, x1, y0, y1;
    for (LatLng latLng in list) {
      if (x0 == null) {
        x0 = x1 = latLng.latitude;
        y0 = y1 = latLng.longitude;
      } else {
        if (latLng.latitude > x1!) x1 = latLng.latitude;
        if (latLng.latitude < x0) x0 = latLng.latitude;
        if (latLng.longitude > y1!) y1 = latLng.longitude;
        if (latLng.longitude < y0!) y0 = latLng.longitude;
      }
    }
    return LatLngBounds(
      northeast: LatLng(x1!, y1!),
      southwest: LatLng(x0!, y0!),
    );
  }

  // --- UI: BOTTOM SHEET ---
  void _showStationDetails(BuildContext context, StationModel station) {
    showModalBottomSheet(
      context: context,
      backgroundColor: Colors.transparent,
      isScrollControlled: true,
      builder: (context) {
        final bottomPad = MediaQuery.of(context).padding.bottom;
        return Container(
          decoration: const BoxDecoration(
            color: AppColors.surfaceDark,
            borderRadius: BorderRadius.vertical(top: Radius.circular(25)),
            border: Border(
              top: BorderSide(color: AppColors.neonGreen, width: 1),
            ),
          ),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              // 1. Image Header
              Stack(
                children: [
                  ClipRRect(
                    borderRadius: const BorderRadius.vertical(
                      top: Radius.circular(25),
                    ),
                    child: Image.network(
                      station.imageUrl ??
                          'https://lh5.googleusercontent.com/p/AF1QipN32oM49n-7375276321689_1.jpg',
                      height: 160,
                      width: double.infinity,
                      fit: BoxFit.cover,
                      errorBuilder: (context, error, stackTrace) {
                        return Container(
                          height: 160,
                          color: Colors.grey[900],
                          child: const Center(
                            child: Icon(
                              Icons.apartment,
                              size: 50,
                              color: Colors.grey,
                            ),
                          ),
                        );
                      },
                    ),
                  ),
                  Positioned(
                    top: 10,
                    right: 10,
                    child: GestureDetector(
                      onTap: () => Navigator.pop(context),
                      child: Container(
                        padding: const EdgeInsets.all(5),
                        decoration: const BoxDecoration(
                          color: Colors.black54,
                          shape: BoxShape.circle,
                        ),
                        child: const Icon(
                          Icons.close,
                          size: 20,
                          color: Colors.white,
                        ),
                      ),
                    ),
                  ),
                ],
              ),

              // 2. Info Content
              Padding(
                padding: const EdgeInsets.fromLTRB(20, 16, 20, 0),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      station.name,
                      style: const TextStyle(
                        fontSize: 20,
                        fontWeight: FontWeight.bold,
                        color: Colors.white,
                      ),
                    ),
                    const SizedBox(height: 4),
                    Text(
                      station.address,
                      style: const TextStyle(fontSize: 13, color: Colors.grey),
                      maxLines: 2,
                      overflow: TextOverflow.ellipsis,
                    ),
                    const SizedBox(height: 8),
                    Row(
                      children: [
                        const Icon(
                          Icons.access_time,
                          size: 14,
                          color: Colors.grey,
                        ),
                        const SizedBox(width: 4),
                        Expanded(
                          child: Text(
                            station.schedule.isNotEmpty
                                ? station.schedule
                                : "Horario no disponible",
                            style: const TextStyle(
                              fontSize: 12,
                              color: Colors.grey,
                            ),
                            maxLines: 1,
                            overflow: TextOverflow.ellipsis,
                          ),
                        ),
                      ],
                    ),
                  ],
                ),
              ),

              const SizedBox(height: 16),

              // 3. Stats Grid
              Padding(
                padding: const EdgeInsets.symmetric(horizontal: 20),
                child: Row(
                  mainAxisAlignment: MainAxisAlignment.spaceAround,
                  children: [
                    _buildStatItem(
                      Icons.battery_charging_full,
                      "${station.availableCount}",
                      "Bancos de energía",
                    ),
                    Container(width: 1, height: 36, color: Colors.grey[700]),
                    _buildStatItem(
                      Icons.power_off,
                      "${station.totalCount - station.availableCount}",
                      "Ranuras vacías",
                    ),
                  ],
                ),
              ),

              const SizedBox(height: 16),

              // 4. Pricing + Free badge
              Padding(
                padding: const EdgeInsets.symmetric(horizontal: 20),
                child: Container(
                  width: double.infinity,
                  padding: const EdgeInsets.symmetric(
                    vertical: 10,
                    horizontal: 15,
                  ),
                  decoration: BoxDecoration(
                    borderRadius: BorderRadius.circular(10),
                    border: Border.all(
                      color: AppColors.neonGreen.withOpacity(0.5),
                    ),
                  ),
                  child: Row(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      Text(
                        "Bs. ${station.price.toStringAsFixed(2)} / ${station.timeUnit} min",
                        style: const TextStyle(
                          fontSize: 14,
                          color: AppColors.neonGreen,
                          fontWeight: FontWeight.bold,
                        ),
                      ),
                      if (station.freeMinutes > 0) ...[
                        const SizedBox(width: 12),
                        Container(
                          padding: const EdgeInsets.symmetric(
                            horizontal: 8,
                            vertical: 3,
                          ),
                          decoration: BoxDecoration(
                            color: AppColors.neonGreen,
                            borderRadius: BorderRadius.circular(20),
                          ),
                          child: Text(
                            "¡${station.freeMinutes} min GRATIS!",
                            style: const TextStyle(
                              fontSize: 11,
                              color: Colors.black,
                              fontWeight: FontWeight.bold,
                            ),
                          ),
                        ),
                      ],
                    ],
                  ),
                ),
              ),

              const SizedBox(height: 16),

              // 5. Action Buttons
              Padding(
                padding: EdgeInsets.fromLTRB(20, 0, 20, 16 + bottomPad),
                child: Row(
                  children: [
                    Expanded(
                      child: ElevatedButton.icon(
                        onPressed: () {
                          Navigator.pop(context);
                          context.push('/scan');
                        },
                        icon: const Icon(
                          Icons.qr_code_scanner,
                          color: Colors.black,
                          size: 20,
                        ),
                        label: const Text(
                          "Escanear QR",
                          style: TextStyle(
                            color: Colors.black,
                            fontSize: 15,
                            fontWeight: FontWeight.bold,
                          ),
                        ),
                        style: ElevatedButton.styleFrom(
                          backgroundColor: AppColors.neonGreen,
                          padding: const EdgeInsets.symmetric(vertical: 14),
                          shape: RoundedRectangleBorder(
                            borderRadius: BorderRadius.circular(12),
                          ),
                        ),
                      ),
                    ),
                    const SizedBox(width: 12),
                    Expanded(
                      child: ElevatedButton.icon(
                        onPressed: () => _drawRoute(
                          LatLng(station.latitude, station.longitude),
                        ),
                        icon: const Icon(
                          Icons.near_me,
                          color: Colors.black,
                          size: 20,
                        ),
                        label: const Text(
                          "Ir (Ruta)",
                          style: TextStyle(
                            color: Colors.black,
                            fontSize: 15,
                            fontWeight: FontWeight.bold,
                          ),
                        ),
                        style: ElevatedButton.styleFrom(
                          backgroundColor: AppColors.neonGreen,
                          padding: const EdgeInsets.symmetric(vertical: 14),
                          shape: RoundedRectangleBorder(
                            borderRadius: BorderRadius.circular(12),
                          ),
                        ),
                      ),
                    ),
                  ],
                ),
              ),
            ],
          ),
        );
      },
    );
  }

  Widget _buildStatItem(IconData icon, String count, String label) {
    return Column(
      children: [
        Icon(icon, color: AppColors.neonGreen, size: 28),
        const SizedBox(height: 5),
        Text(
          count,
          style: const TextStyle(
            fontWeight: FontWeight.bold,
            fontSize: 18,
            color: Colors.white,
          ),
        ),
        Text(label, style: const TextStyle(fontSize: 12, color: Colors.grey)),
      ],
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: Stack(
        children: [
          // 1. Google Map Fullscreen
          GoogleMap(
            initialCameraPosition: _kInitialPosition,
            markers: _markers,
            polylines: _polylines,
            onMapCreated: (controller) {
              _mapController = controller;
              if (_mapStyle != null) {
                // ignore: deprecated_member_use
                _mapController!.setMapStyle(_mapStyle);
              }
            },
            myLocationEnabled: true, // Show blue dot
            myLocationButtonEnabled: true, // Show location button
            zoomControlsEnabled: false,
          ),

          if (_isLoading)
            const Center(
              child: CircularProgressIndicator(color: AppColors.neonGreen),
            ),

          // 2. Overlay UI (Profile)
          if (!_isBottomSheetOpen)
            Positioned(
              top: 50,
              right: 16,
              child: GestureDetector(
                onTap: () => context.push('/profile'),
                child: Container(
                  width: 50,
                  height: 50,
                  decoration: BoxDecoration(
                    color: AppColors.surfaceDark,
                    shape: BoxShape.circle,
                    border: Border.all(color: AppColors.neonGreen, width: 2),
                  ),
                  child: const Icon(Icons.person, color: Colors.white),
                ),
              ),
            ),

          if (!_isBottomSheetOpen)
            Align(
              alignment: Alignment.bottomCenter,
              child: Padding(
                padding: const EdgeInsets.only(bottom: 30),
                child: StreamBuilder<DocumentSnapshot>(
                  stream: AuthService.currentUser != null
                      ? FirebaseFirestore.instance
                            .collection('active_rentals')
                            .doc(AuthService.currentUser!.uid)
                            .snapshots()
                      : const Stream.empty(),
                  builder: (context, snapshot) {
                    final hasActiveRental =
                        snapshot.hasData && snapshot.data!.exists;

                    if (hasActiveRental) {
                      return SizedBox(
                        width: MediaQuery.of(context).size.width * 0.8,
                        height: 60,
                        child: ElevatedButton.icon(
                          onPressed: () => context.push('/scan-return'),
                          icon: const Icon(
                            Icons.assignment_return,
                            color: Colors.black,
                            size: 28,
                          ),
                          label: const Text(
                            'DEVOLVER POWERBANK',
                            style: TextStyle(
                              color: Colors.black,
                              fontSize: 18,
                              fontWeight: FontWeight.bold,
                            ),
                          ),
                          style: ElevatedButton.styleFrom(
                            backgroundColor: AppColors.neonGreen,
                            shape: RoundedRectangleBorder(
                              borderRadius: BorderRadius.circular(30),
                            ),
                            elevation: 8,
                          ),
                        ),
                      );
                    }

                    return SizedBox(
                      width: 70,
                      height: 70,
                      child: FloatingActionButton(
                        heroTag: 'scan_btn',
                        onPressed: () => context.push('/scan'),
                        backgroundColor: AppColors.neonGreen,
                        elevation: 8,
                        child: const Icon(
                          Icons.qr_code_scanner,
                          size: 36,
                          color: Colors.black,
                        ),
                      ),
                    );
                  },
                ),
              ),
            ),
        ],
      ),
    );
  }
}
