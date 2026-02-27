import 'package:flutter/material.dart';
import 'package:cloud_firestore/cloud_firestore.dart';
import '../../../../core/constants/app_colors.dart';
import 'package:go_router/go_router.dart';

class AdminActiveRentalsScreen extends StatelessWidget {
  const AdminActiveRentalsScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Colors.black,
      appBar: AppBar(
        title: const Text('Alquileres Activos (Admin)'),
        backgroundColor: Colors.black,
        leading: IconButton(
          icon: const Icon(Icons.arrow_back, color: AppColors.neonGreen),
          onPressed: () => context.pop(),
        ),
      ),
      body: StreamBuilder<QuerySnapshot>(
        stream: FirebaseFirestore.instance
            .collection('active_rentals')
            .snapshots(),
        builder: (context, snapshot) {
          if (snapshot.connectionState == ConnectionState.waiting) {
            return const Center(
              child: CircularProgressIndicator(color: AppColors.neonGreen),
            );
          }
          if (snapshot.hasError) {
            return Center(
              child: Text(
                'Error: ${snapshot.error}',
                style: const TextStyle(color: Colors.red),
              ),
            );
          }
          if (!snapshot.hasData || snapshot.data!.docs.isEmpty) {
            return const Center(
              child: Text(
                'No hay alquileres activos.',
                style: TextStyle(color: Colors.white),
              ),
            );
          }

          final rentals = snapshot.data!.docs;

          return ListView.builder(
            itemCount: rentals.length,
            padding: const EdgeInsets.all(16),
            itemBuilder: (context, index) {
              final rental = rentals[index].data() as Map<String, dynamic>;
              final uid = rental['uid'] ?? 'Desconocido';
              final machineId = rental['machineId'] ?? 'Desconocida';
              final slotId = rental['slotId'] ?? 'Desconocido';
              final batteryCode = rental['batteryCode'] ?? 'Desconocido';
              final timestamp = rental['timestamp'] as Timestamp?;

              final timeString = timestamp != null
                  ? DateTime.fromMillisecondsSinceEpoch(
                      timestamp.millisecondsSinceEpoch,
                    ).toLocal().toString().split('.')[0]
                  : 'Desconocido';

              return Card(
                color: const Color(0xFF1A1A1A),
                margin: const EdgeInsets.only(bottom: 12),
                shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(12),
                  side: BorderSide(
                    color: AppColors.neonGreen.withValues(alpha: 0.3),
                  ),
                ),
                child: ListTile(
                  title: Text(
                    'Usuario: $uid',
                    style: const TextStyle(
                      color: Colors.white,
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                  subtitle: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      const SizedBox(height: 4),
                      Text(
                        'Máquina: $machineId | Slot: $slotId',
                        style: const TextStyle(color: Colors.grey),
                      ),
                      Text(
                        'Batería: $batteryCode',
                        style: const TextStyle(color: AppColors.neonGreen),
                      ),
                      Text(
                        'Inicio: $timeString',
                        style: const TextStyle(
                          color: Colors.grey,
                          fontSize: 12,
                        ),
                      ),
                    ],
                  ),
                  trailing: IconButton(
                    icon: const Icon(Icons.map, color: AppColors.neonGreen),
                    onPressed: () {
                      context.push('/admin-user-map', extra: rental);
                    },
                  ),
                ),
              );
            },
          );
        },
      ),
    );
  }
}
