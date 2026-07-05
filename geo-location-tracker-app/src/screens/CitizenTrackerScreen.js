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
  Linking,
  ScrollView,
} from 'react-native';
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
  const [lastUpdated, setLastUpdated] = useState(null);

  const pollRef = useRef(null);
  const destinationRef = useRef(null);

  const fetchVehicleHistory = async (vehicleId) => {
    try {
      const res = await axios.get(
        `${API_URL}/api/locations/vehicle/${vehicleId}?limit=50`
      );
      const { vehicle, history: points } = res.data;

      setVehicleInfo(vehicle);
      setHistory(points);
      setLastUpdated(new Date().toLocaleTimeString());

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
    setLastUpdated(null);
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

  // Opens Google Maps with the vehicle's live location as a pin
  const openInGoogleMaps = () => {
    const latest = history[history.length - 1];
    if (!latest) {
      Alert.alert('No location yet', 'Waiting for vehicle location...');
      return;
    }
    const { latitude, longitude } = latest;
    const label = `Vehicle ${trackingVehicleId}`;
    const url = `https://www.google.com/maps/search/?api=1&query=${latitude},${longitude}`;
    Linking.openURL(url);
  };

  // Opens Google Maps directions from vehicle to destination
  const openDirectionsInGoogleMaps = () => {
    const latest = history[history.length - 1];
    if (!latest || !destination) return;
    const url = `https://www.google.com/maps/dir/${latest.latitude},${latest.longitude}/${destination.latitude},${destination.longitude}`;
    Linking.openURL(url);
  };

  const latest = history[history.length - 1];

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      {!trackingVehicleId ? (
        <View style={styles.searchBox}>
          <Text style={styles.title}>🚛 Track a Vehicle</Text>
          <Text style={styles.label}>No login required</Text>
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
        <ScrollView contentContainerStyle={styles.infoPanel}>
          <Text style={styles.vehicleLabel}>
            🚛 Vehicle {trackingVehicleId}
            {vehicleInfo?.vehicleType ? ` (${vehicleInfo.vehicleType})` : ''}
          </Text>

          {lastUpdated && (
            <Text style={styles.updated}>Last updated: {lastUpdated}</Text>
          )}

          {latest ? (
            <View style={styles.coordBox}>
              <Text style={styles.coordTitle}>📍 Current Location</Text>
              <Text style={styles.coordText}>Latitude:  {latest.latitude}</Text>
              <Text style={styles.coordText}>Longitude: {latest.longitude}</Text>
              <Text style={styles.coordText}>
                Time: {new Date(latest.timestamp).toLocaleTimeString()}
              </Text>
            </View>
          ) : (
            <Text style={styles.waiting}>Waiting for location...</Text>
          )}

          {/* Open in Google Maps button */}
          <TouchableOpacity style={styles.mapsButton} onPress={openInGoogleMaps}>
            <Text style={styles.buttonText}>📍 Open in Google Maps</Text>
          </TouchableOpacity>

          {/* Destination section */}
          <Text style={styles.sectionLabel}>Set Destination (optional)</Text>
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

          {destination && (
            <>
              <Text style={styles.eta}>ETA: {formatETA(eta)}</Text>
              <TouchableOpacity style={styles.directionsButton} onPress={openDirectionsInGoogleMaps}>
                <Text style={styles.buttonText}>🗺️ Get Directions in Google Maps</Text>
              </TouchableOpacity>
            </>
          )}

          <TouchableOpacity style={styles.stopButton} onPress={stopTracking}>
            <Text style={styles.buttonText}>Stop Tracking</Text>
          </TouchableOpacity>
        </ScrollView>
      )}
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8f9fa' },
  searchBox: { flex: 1, justifyContent: 'center', padding: 24 },
  title: { fontSize: 24, fontWeight: 'bold', marginBottom: 6, color: '#212529' },
  label: { fontSize: 14, color: '#6c757d', marginBottom: 16 },
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
  buttonText: { color: '#fff', fontWeight: 'bold', fontSize: 15 },
  infoPanel: { padding: 20 },
  vehicleLabel: { fontSize: 20, fontWeight: 'bold', color: '#212529', marginBottom: 4 },
  updated: { fontSize: 12, color: '#6c757d', marginBottom: 16 },
  coordBox: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#dee2e6',
  },
  coordTitle: { fontSize: 14, fontWeight: '600', color: '#495057', marginBottom: 8 },
  coordText: { fontSize: 14, color: '#212529', marginBottom: 4 },
  waiting: { color: '#6c757d', marginBottom: 16 },
  mapsButton: {
    backgroundColor: '#4285F4',
    borderRadius: 6,
    padding: 14,
    alignItems: 'center',
    marginBottom: 20,
  },
  sectionLabel: { fontSize: 14, fontWeight: '600', color: '#495057', marginBottom: 8 },
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
  eta: { fontSize: 22, fontWeight: 'bold', color: '#28A745', marginVertical: 12 },
  directionsButton: {
    backgroundColor: '#28A745',
    borderRadius: 6,
    padding: 14,
    alignItems: 'center',
    marginBottom: 16,
  },
  stopButton: {
    backgroundColor: '#d9534f',
    borderRadius: 6,
    padding: 14,
    alignItems: 'center',
    marginTop: 8,
  },
});

export default CitizenTrackerScreen;