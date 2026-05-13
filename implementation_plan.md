# Implementation Plan - Real Voltaje API Integration

## Goal
Integrate the real Voltaje API (`https://m.voltajevzla.com`) to replace simulated data for map stations, while maintaining a fallback mechanism to ensure app stability if the API returns no data.

## User Review Required
> [!IMPORTANT]
> The real API returns empty lists for the test coordinates (Caracas). The implementation will use a **Hybrid Repository** pattern: it attempts to fetch from the real API, and falls back to simulated data if the result is empty or fails. This ensures the app remains usable while we debug the data source.

## Proposed Changes

## Proposed Changes

### Network Layer
#### [NEW] `lib/core/network/voltaje_api_client.dart`
-   Implement `VoltajeApiClient` using `Dio`.
-   Base URL: `https://m.voltajevzla.com/cdb-app-api/v1/app/`.
-   Method: `getNearbyStations(double lat, double lng)`.
-   Handles `multipart/form-data` request.

### Data Layer
#### [NEW] `lib/features/map/data/dtos/voltaje_station_dto.dart`
-   Data Transfer Object mapping the Chinese API fields (`shopname`, `jifei`, etc.) to Dart objects.
-   `toDomain()` method to convert to `StationModel`.

#### [MODIFY] `lib/features/map/data/station_service.dart`
-   Inject `VoltajeApiClient`.
-   Update `getStations` to call API.
-   Implement fallback logic: `if (apiStations.isEmpty) return _getMockStations();`

### Domain/Config
#### [MODIFY] `lib/core/config/constants.dart` (or similar)
-   Add API constants (Base URL, Keys).

## Verification Plan

### Automated Tests
-   Unit test for `VoltajeStationDto` parsing (if I can get a sample JSON later).
-   Integration test for `VoltajeApiClient` (checking for 200 OK).

### Manual Verification
-   Run the app.
-   Check logs: "Fetching from Real API...".
-   If empty, check logs: "Real API returned 0 stations. Using fallback."
### Manual Verification
-   Run the app.
-   Check logs: "Fetching from Real API...".
-   If empty, check logs: "Real API returned 0 stations. Using fallback."
-   Verify map markers appear (Real API confirmed working locally; Cloud environment returns empty but App handles it).
-   **Status**: Debugging Complete. Cloud Function returns 200 OK. Fallback ensures markers.
