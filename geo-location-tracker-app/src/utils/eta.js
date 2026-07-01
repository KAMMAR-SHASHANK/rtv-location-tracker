// src/utils/eta.js
// Small, dependency-free helpers for distance and ETA calculations.

// Haversine distance between two lat/lng points, in meters.
export const getDistanceMeters = (lat1, lon1, lat2, lon2) => {
  const R = 6371000; // Earth radius in meters
  const toRad = (deg) => (deg * Math.PI) / 180;

  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);

  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
};

// Speed in m/s derived from two timestamped {latitude, longitude, timestamp} points.
// Use this when a device-reported speed isn't available (e.g. on the citizen
// screen, which only has the backend's location history, not GPS sensor data).
export const getSpeedFromPoints = (point1, point2) => {
  const distance = getDistanceMeters(
    point1.latitude,
    point1.longitude,
    point2.latitude,
    point2.longitude
  );
  const timeDeltaSeconds =
    (new Date(point2.timestamp) - new Date(point1.timestamp)) / 1000;

  if (timeDeltaSeconds <= 0) return 0;
  return distance / timeDeltaSeconds;
};

// ETA in seconds, or null if the vehicle is effectively stationary
// (below ~1 km/h) so a meaningful ETA can't be estimated yet.
export const calculateETA = (currentLat, currentLon, destLat, destLon, speedMps) => {
  if (!speedMps || speedMps < 0.3) return null;
  const distance = getDistanceMeters(currentLat, currentLon, destLat, destLon);
  return distance / speedMps;
};

// Formats seconds into a short human string: "<1 min", "12m", "1h 5m".
export const formatETA = (seconds) => {
  if (seconds === null || seconds === undefined) return 'Calculating...';
  if (seconds < 60) return '<1 min';

  const totalMinutes = Math.round(seconds / 60);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;

  if (hours > 0) return `${hours}h ${minutes}m`;
  return `${minutes}m`;
};