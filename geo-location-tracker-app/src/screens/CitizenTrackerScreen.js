import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import MapView, { Marker, Polyline } from 'react-native-maps';
import axios from 'axios';
import { getSpeedFromPoints, calculateETA, formatETA } from '../utils/eta';

const { API_URL } = require('../../creds');

const POLL_INTERVAL_MS = 5000;

const CitizenTrackerScreen = () => {
  const [vehicleIdInput, setVehicleIdInput] = useState('');
  const [trackingVehicleId, setTrackingVehicleId] = useState(null);
  const [vehicleInfo, setVehicleInfo] = useState(null);
  const [history, setHistory] = useState([]);
  const [destination, setDestination] = useState(null);
  const [destLatInput, setDestLatInput] = useState('');
  const [destLonInput, setDestLonInput] = useState('');
  const [eta, setEta] = useState(null);
  const [loading, setLoading] = useState(false);

  const pollRef = useRef(null);
  const mapRef = useRef(null);
  const destinationRef = useRef(null);

  const fetchVehicleHistory = async (vehicleId) => {
    try {
      const res = await axios.get(
        `${API_URL}/api/locations/vehicle/${vehicleId}?limit=50`
      );
      const { vehicle, history: points } = res.data;

      setVehicleInfo(vehicle);
      setHistory(points);

      if (points.length >= 2) {
        const last = points[points.length - 1];
        const prev = points[points.length - 2];
        const speedMps = getSpeedFromPoints(prev, last);
        const dest = destinationRef.current;

        if (dest) {
          const etaSeconds = calculateETA(
            last.latitude,
            last.longitude,
            dest.latitude,
            dest.longitude,
            speedMps
          );
          setEta(etaSeconds);
        }

        mapRef.current?.animateToRegion(
          {
            latitude: last.latitude,
            longitude: last.longitude,
            latitudeDelta: 0.01,
            longitudeDelta: 0.01,
          },
          500
        );
      }
    } catch (err) {
      console.error('Error fetching vehicle history:', err);
      if (err.response?.status === 404) {
        Alert.alert('Not found', `No vehicle registered with ID "${vehicleId}"`);
        stopTracking();
      }
    }
  };

  const startTracking = () => {
    if (!vehicleIdInput.trim()) {
      Alert.alert('Vehicle ID required', 'Enter a vehicle ID to track.');
      return;
    }

    const vehicleId = vehicleIdInput.trim();
    setLoading(true);
    setTrackingVehicleId(vehicleId);

    fetchVehicleHistory(vehicleId).finally(() => setLoading(false));

    pollRef.current = setInterval(() => {
      fetchVehicleHistory(vehicleId);
    }, POLL_INTERVAL_MS);
  };

  const stopTracking = () => {
    if (pollRef.current) {
      clearInterval(pollRef.current);
      pollRef.current = null;
    }
    setTrackingVehicleId(null);
    setVehicleInfo(null);
    setHistory([]);
    setEta(null);
    setDestination(null);
    destinationRef.current = null;
  };

  const applyDestination = () => {
    const lat = parseFloat(destLatInput);
    const lon = parseFloat(destLonInput);

    if (isNaN(lat) || isNaN(lon)) {
      Alert.alert('Invalid destination', 'Enter valid latitude and longitude.');
      return;
    }

    const dest = { latitude: lat, longitude: lon };
    setDestination(dest);
    destinationRef.current = dest;
  };

  const latest = history[history.length - 1];

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      {!trackingVehicleId ? (
        <View style={styles.searchBox}>
          <Text style={styles.label}>Track a vehicle (no login required)</Text>
          <TextInput
            style={styles.input}
            placeholder="Enter Vehicle ID"
            value={vehicleIdInput}
            onChangeText={setVehicleIdInput}
            autoCapitalize="none"
          />
          <TouchableOpacity style={styles.button} onPress={startTracking}>
            <Text style={styles.buttonText}>
              {loading ? 'Loading...' : 'Track'}
            </Text>
          </TouchableOpacity>
        </View>
      ) : (
        <>
          <MapView
            ref={mapRef}
            style={styles.map}
            initialRegion={{
              latitude: latest?.latitude || 12.9716,
              longitude: latest?.longitude || 77.5946,
              latitudeDelta: 0.05,
              longitudeDelta: 0.05,
            }}
          >
            {history.length > 1 && (
              <Polyline
                coordinates={history.map((p) => ({
                  latitude: p.latitude,
                  longitude: p.longitude,
                }))}
                strokeColor="#007BFF"
                strokeWidth={3}
              />
            )}

            {latest && (
              <Marker
                coordinate={{
                  latitude: latest.latitude,
                  longitude: latest.longitude,
                }}
                title={`Vehicle ${trackingVehicleId}`}
                description={vehicleInfo?.vehicleType || ''}
                pinColor="#007BFF"
              />
            )}

            {destination && (
              <Marker
                coordinate={destination}
                title="Destination"
                pinColor="#28A745"
              />
            )}
          </MapView>

          <View style={styles.infoPanel}>
            <Text style={styles.vehicleLabel}>
              Vehicle {trackingVehicleId}
              {vehicleInfo?.vehicleType ? ` (${vehicleInfo.vehicleType})` : ''}
            </Text>

            <View style={styles.destRow}>
              <TextInput
                style={styles.destInput}
                placeholder="Dest. latitude"
                value={destLatInput}
                onChangeText={setDestLatInput}
                keyboardType="numeric"
              />
              <TextInput
                style={styles.destInput}
                placeholder="Dest. longitude"
                value={destLonInput}
                onChangeText={setDestLonInput}
                keyboardType="numeric"
              />
              <TouchableOpacity style={styles.smallButton} onPress={applyDestination}>
                <Text style={styles.buttonText}>Set</Text>
              </TouchableOpacity>
            </View>

            {destination && <Text style={styles.eta}>ETA: {formatETA(eta)}</Text>}

            <TouchableOpacity style={styles.stopButton} onPress={stopTracking}>
              <Text style={styles.buttonText}>Stop Tracking</Text>
            </TouchableOpacity>
          </View>
        </>
      )}
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8f9fa' },
  searchBox: { flex: 1, justifyContent: 'center', padding: 24 },
  label: { fontSize: 16, fontWeight: '600', marginBottom: 12, color: '#495057' },
  input: {
    borderWidth: 1,
    borderColor: '#ced4da',
    borderRadius: 6,
    padding: 12,
    marginBottom: 12,
    backgroundColor: '#fff',
  },
  button: {
    backgroundColor: '#007BFF',
    borderRadius: 6,
    padding: 14,
    alignItems: 'center',
  },
  buttonText: { color: '#fff', fontWeight: 'bold' },
  map: { flex: 1 },
  infoPanel: {
    padding: 16,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#e9ecef',
  },
  vehicleLabel: { fontSize: 16, fontWeight: 'bold', marginBottom: 8, color: '#212529' },
  destRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  destInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#ced4da',
    borderRadius: 6,
    padding: 8,
    marginRight: 6,
    backgroundColor: '#fff',
  },
  smallButton: {
    backgroundColor: '#007BFF',
    borderRadius: 6,
    paddingVertical: 10,
    paddingHorizontal: 14,
  },
  eta: { fontSize: 18, fontWeight: 'bold', color: '#28A745', marginVertical: 8 },
  stopButton: {
    backgroundColor: '#d9534f',
    borderRadius: 6,
    padding: 12,
    alignItems: 'center',
    marginTop: 4,
  },
});

export default CitizenTrackerScreen;