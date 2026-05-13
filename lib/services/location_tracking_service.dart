import 'dart:async';
import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:flutter/foundation.dart';
import 'package:geolocator/geolocator.dart';
import 'package:permission_handler/permission_handler.dart';

import 'auth_service.dart';

class LocationTrackingService {
  static final LocationTrackingService _instance =
      LocationTrackingService._internal();
  factory LocationTrackingService() => _instance;
  LocationTrackingService._internal();

  StreamSubscription<Position>? _positionStreamSubscription;
  bool _isTracking = false;

  bool get isTracking => _isTracking;

  final FirebaseFirestore _firestore = FirebaseFirestore.instance;

  /// Request permissions. Needs to be called before starting tracking.
  Future<bool> requestPermissions() async {
    bool serviceEnabled = await Geolocator.isLocationServiceEnabled();
    if (!serviceEnabled) {
      debugPrint('Los servicios de ubicación están deshabilitados.');
      return false;
    }

    LocationPermission permission = await Geolocator.checkPermission();
    if (permission == LocationPermission.denied) {
      permission = await Geolocator.requestPermission();
      if (permission == LocationPermission.denied) {
        debugPrint('Permisos de ubicación denegados.');
        return false;
      }
    }

    if (permission == LocationPermission.deniedForever) {
      debugPrint('Los permisos de ubicación están denegados permanentemente.');
      // Usually you would ask the user to open app settings here:
      // await openAppSettings();
      return false;
    }

    // Attempt to get background permissions if needed
    final bgStatus = await Permission.locationAlways.status;
    if (!bgStatus.isGranted) {
      await Permission.locationAlways.request();
    }

    return true;
  }

  /// Starts tracking the user's location and sends it to Firestore
  Future<void> startTracking(String rentalId) async {
    if (_isTracking) {
      debugPrint('Ya se está rastreando la ubicación.');
      return;
    }

    final hasPermissions = await requestPermissions();
    if (!hasPermissions) {
      debugPrint('No se puede iniciar rastreo: Permisos denegados');
      return;
    }

    final user = AuthService.currentUser;
    if (user == null) return;

    _isTracking = true;
    debugPrint('Iniciando rastreo GPS para el alquiler $rentalId...');

    // Defines how often to get the location
    const locationSettings = LocationSettings(
      accuracy: LocationAccuracy.high,
      distanceFilter: 10, // Updates every 10 meters of movement
    );

    _positionStreamSubscription =
        Geolocator.getPositionStream(locationSettings: locationSettings).listen(
          (Position position) {
            _updateLocationInFirestore(user.uid, rentalId, position);
          },
        );
  }

  /// Stops tracking the location
  void stopTracking() {
    if (!_isTracking) return;
    debugPrint('Deteniendo rastreo GPS...');
    _positionStreamSubscription?.cancel();
    _positionStreamSubscription = null;
    _isTracking = false;
  }

  /// Updates the location in Firestore under active_rentals/{rentalId}
  Future<void> _updateLocationInFirestore(
    String uid,
    String rentalId,
    Position position,
  ) async {
    try {
      await _firestore.collection('active_rentals').doc(uid).set({
        'uid': uid,
        'rentalId': rentalId,
        'lastLocation': GeoPoint(position.latitude, position.longitude),
        'lastUpdatedAt': FieldValue.serverTimestamp(),
        'heading': position.heading,
        'speed': position.speed,
      }, SetOptions(merge: true));
      debugPrint(
        '📍 GPS Update sent -> ${position.latitude}, ${position.longitude}',
      );
    } catch (e) {
      debugPrint('Error actualizando ubicación en Firestore: $e');
    }
  }
}
