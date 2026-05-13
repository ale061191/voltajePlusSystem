import 'package:flutter/material.dart';
import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:google_maps_flutter/google_maps_flutter.dart';
import 'package:go_router/go_router.dart';
import 'package:flutter/services.dart' show rootBundle;
import '../../../../core/constants/app_colors.dart';

class AdminUserMapScreen extends StatefulWidget {
  final Map<String, dynamic> rentalData;

  const AdminUserMapScreen({super.key, required this.rentalData});

  @override
  State<AdminUserMapScreen> createState() => _AdminUserMapScreenState();
}

class _AdminUserMapScreenState extends State<AdminUserMapScreen> {
  GoogleMapController? _mapController;
  String? _mapStyle;
  Set<Marker> _markers = {};
  BitmapDescriptor? _customMarker;

  late String _uid;
  late String _machineId;
  late String _slotId;
  late String _batteryCode;

  @override
  void initState() {
    super.initState();
    _uid = widget.rentalData['uid'] ?? 'Desconocido';
    _machineId = widget.rentalData['machineId'] ?? 'Desconocida';
    _slotId = widget.rentalData['slotId'] ?? 'Desconocido';
    _batteryCode = widget.rentalData['batteryCode'] ?? 'Desconocido';
    _loadMapAssets();
  }

  Future<void> _loadMapAssets() async {
    try {
      _mapStyle = await rootBundle.loadString('assets/style.json');
    } catch (e) {
      debugPrint("Error loading map style: $e");
    }

    try {
      _customMarker = await BitmapDescriptor.asset(
        const ImageConfiguration(size: Size(36, 36)),
        'assets/images/marker.png',
      );
    } catch (e) {
      debugPrint("Error loading marker: $e");
    }

    // Initial marker placement if available
    if (widget.rentalData['lastLocation'] != null) {
      final GeoPoint initialGeo = widget.rentalData['lastLocation'] as GeoPoint;
      _updateMarker(initialGeo);
    }

    if (mounted) setState(() {});
  }

  void _updateMarker(GeoPoint geoPoint) {
    if (!mounted) return;

    final LatLng position = LatLng(geoPoint.latitude, geoPoint.longitude);

    setState(() {
      _markers.clear();
      _markers.add(
        Marker(
          markerId: MarkerId('user_$_uid'),
          position: position,
          icon:
              _customMarker ??
              BitmapDescriptor.defaultMarkerWithHue(BitmapDescriptor.hueGreen),
          onTap: _showUserDetails,
        ),
      );
    });

    if (_mapController != null) {
      _mapController!.animateCamera(CameraUpdate.newLatLngZoom(position, 16));
    }
  }

  void _showUserDetails() {
    showModalBottomSheet(
      context: context,
      backgroundColor: Colors.transparent,
      isScrollControlled: true,
      builder: (context) {
        final bottomPad = MediaQuery.of(context).padding.bottom;
        return Container(
          decoration: const BoxDecoration(
            color: Color(0xFF1A1A1A),
            borderRadius: BorderRadius.only(
              topLeft: Radius.circular(24),
              topRight: Radius.circular(24),
            ),
          ),
          padding: EdgeInsets.fromLTRB(20, 20, 20, bottomPad + 20),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              // User Info Top
              Row(
                children: [
                  Container(
                    width: 50,
                    height: 50,
                    decoration: BoxDecoration(
                      color: Colors.black,
                      shape: BoxShape.circle,
                      border: Border.all(color: AppColors.neonGreen, width: 2),
                    ),
                    child: const Icon(Icons.person, color: Colors.white),
                  ),
                  const SizedBox(width: 15),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          'Usuario UID: $_uid',
                          style: const TextStyle(
                            color: Colors.white,
                            fontSize: 16,
                            fontWeight: FontWeight.bold,
                          ),
                        ),
                      ],
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 20),

              const Text(
                "Datos del Alquiler",
                style: TextStyle(
                  color: Colors.white,
                  fontSize: 18,
                  fontWeight: FontWeight.bold,
                ),
              ),
              const SizedBox(height: 10),

              _detailRow(Icons.confirmation_number, 'Batería:', _batteryCode),
              _detailRow(Icons.battery_charging_full, 'Máquina:', _machineId),
              _detailRow(Icons.numbers, 'Slot Origen:', _slotId),

              const SizedBox(height: 10),
            ],
          ),
        );
      },
    );
  }

  Widget _detailRow(IconData icon, String label, String value) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 8),
      child: Row(
        children: [
          Icon(icon, color: AppColors.neonGreen, size: 20),
          const SizedBox(width: 10),
          Text(label, style: const TextStyle(color: Colors.grey, fontSize: 14)),
          const Spacer(),
          Text(
            value,
            style: const TextStyle(
              color: Colors.white,
              fontWeight: FontWeight.bold,
              fontSize: 14,
            ),
          ),
        ],
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final GeoPoint? initialLoc = widget.rentalData['lastLocation'] as GeoPoint?;
    final CameraPosition initialCamera = initialLoc != null
        ? CameraPosition(
            target: LatLng(initialLoc.latitude, initialLoc.longitude),
            zoom: 15.0,
          )
        : const CameraPosition(
            target: LatLng(10.4806, -66.9036),
            zoom: 12.0,
          ); // Default CCs

    return Scaffold(
      body: Stack(
        children: [
          // 1. Google Map Fullscreen
          StreamBuilder<DocumentSnapshot>(
            stream: FirebaseFirestore.instance
                .collection('active_rentals')
                .doc(_uid)
                .snapshots(),
            builder: (context, snapshot) {
              if (snapshot.hasData && snapshot.data!.exists) {
                final data = snapshot.data!.data() as Map<String, dynamic>;
                if (data['lastLocation'] != null) {
                  WidgetsBinding.instance.addPostFrameCallback((_) {
                    if (mounted)
                      _updateMarker(data['lastLocation'] as GeoPoint);
                  });
                }
              }

              return GoogleMap(
                initialCameraPosition: initialCamera,
                markers: _markers,
                onMapCreated: (controller) {
                  _mapController = controller;
                  if (_mapStyle != null) {
                    // ignore: deprecated_member_use
                    _mapController!.setMapStyle(_mapStyle);
                  }

                  if (initialLoc != null) {
                    _updateMarker(initialLoc);
                  }
                },
                myLocationEnabled: false,
                myLocationButtonEnabled: false,
                zoomControlsEnabled: false,
              );
            },
          ),

          // 2. Back Button
          Positioned(
            top: 50,
            left: 16,
            child: GestureDetector(
              onTap: () => context.pop(),
              child: Container(
                width: 45,
                height: 45,
                decoration: BoxDecoration(
                  color: Colors.black.withValues(alpha: 0.6),
                  shape: BoxShape.circle,
                  border: Border.all(color: AppColors.neonGreen, width: 1.5),
                ),
                child: const Icon(Icons.arrow_back, color: AppColors.neonGreen),
              ),
            ),
          ),

          // 3. User Info Chips
          Positioned(
            bottom: 30,
            left: 20,
            right: 20,
            child: GestureDetector(
              onTap: _showUserDetails,
              child: Container(
                padding: const EdgeInsets.all(15),
                decoration: BoxDecoration(
                  color: const Color(0xFF1A1A1A),
                  borderRadius: BorderRadius.circular(20),
                  border: Border.all(
                    color: AppColors.neonGreen.withValues(alpha: 0.4),
                  ),
                  boxShadow: [
                    BoxShadow(
                      color: Colors.black.withValues(alpha: 0.5),
                      blurRadius: 10,
                      offset: const Offset(0, 5),
                    ),
                  ],
                ),
                child: Row(
                  children: [
                    Container(
                      width: 40,
                      height: 40,
                      decoration: const BoxDecoration(
                        color: Colors.black,
                        shape: BoxShape.circle,
                      ),
                      child: const Icon(
                        Icons.person,
                        color: AppColors.neonGreen,
                      ),
                    ),
                    const SizedBox(width: 15),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            "Rastreo de Batería: $_batteryCode",
                            style: const TextStyle(
                              color: Colors.white,
                              fontWeight: FontWeight.bold,
                            ),
                          ),
                          Text(
                            "Toca para mas detalles",
                            style: TextStyle(
                              color: Colors.white.withValues(alpha: 0.5),
                              fontSize: 12,
                            ),
                          ),
                        ],
                      ),
                    ),
                    const Icon(Icons.keyboard_arrow_up, color: Colors.grey),
                  ],
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }
}
