import React, { useState, useEffect, useRef } from "react";
import { View, Alert, StyleSheet, TextInput } from "react-native";
import {
  Text,
  Button,
  Card,
  ActivityIndicator,
  IconButton,
} from "react-native-paper";
import * as Location from "expo-location";
import axios from "axios";
import { calculateETA, formatETA } from "../utils/eta";

const { API_URL } = require("../../creds");

const TrackerDashboard = ({ route, navigation }) => {
  const { vehicleId, username, vehicleType } = route.params || {};

  const [location, setLocation] = useState(null);
  const [intervalId, setIntervalId] = useState(null);
  const [loading, setLoading] = useState(false);

  const [destLatInput, setDestLatInput] = useState("");
  const [destLonInput, setDestLonInput] = useState("");
  const [destination, setDestination] = useState(null);
  const [eta, setEta] = useState(null);
  const destinationRef = useRef(null);

  useEffect(() => {
    destinationRef.current = destination;
  }, [destination]);

  useEffect(() => {
    if (!vehicleId) {
      Alert.alert(
        "Error",
        "Vehicle ID is missing. Please register or login again."
      );
      return;
    }

    (async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        Alert.alert(
          "Permission Denied",
          "Location permission is required for tracking."
        );
        return;
      }

      const id = setInterval(async () => {
        const { coords } = await Location.getCurrentPositionAsync({});
        setLocation(coords);

        const dest = destinationRef.current;
        if (dest) {
          // coords.speed is in m/s, reported by the device GPS when available
          const etaSeconds = calculateETA(
            coords.latitude,
            coords.longitude,
            dest.latitude,
            dest.longitude,
            coords.speed
          );
          setEta(etaSeconds);
        }

        try {
          await axios.post(`${API_URL}/api/locations/new_location_add`, {
            vehicleId,
            latitude: coords.latitude,
            longitude: coords.longitude,
            timestamp: new Date().toISOString(),
          });
          console.log("Location sent to backend");
        } catch (err) {
          console.error("Error sending location:", err);
        }
      }, 10000);

      setIntervalId(id);
      return () => clearInterval(id);
    })();
  }, [vehicleId]);

  const handleLogout = () => {
    if (intervalId) {
      clearInterval(intervalId);
      console.log("Location tracking stopped");
    }
    navigation.navigate("Home");
  };

  const applyDestination = () => {
    const lat = parseFloat(destLatInput);
    const lon = parseFloat(destLonInput);
    if (isNaN(lat) || isNaN(lon)) {
      Alert.alert("Invalid destination", "Enter valid latitude and longitude.");
      return;
    }
    setDestination({ latitude: lat, longitude: lon });
  };

  return (
    <View style={styles.container}>
      <Text style={styles.vehicleType}>User Dashboard</Text>

      <Card mode="outlined" style={styles.card}>
        <Card.Title title={`User Name: ${username}`} />
        <Card.Title title={`Vehicle ID: ${vehicleId}`} />
        <Card.Title title={`Vehicle Type: ${vehicleType}`} />
        <Card.Content>
          {loading && (
            <ActivityIndicator
              size="small"
              color="#2563EB"
              style={styles.loader}
            />
          )}
          {location ? (
            <Text style={styles.locationText}>
              Latitude: {location.latitude}, Longitude: {location.longitude}
            </Text>
          ) : (
            <Text style={styles.locationText}>
              Location is being fetched...
            </Text>
          )}

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
          </View>
          <Button mode="outlined" onPress={applyDestination} style={styles.setDestButton}>
            Set Destination
          </Button>

          {destination && (
            <Text style={styles.etaText}>ETA: {formatETA(eta)}</Text>
          )}
        </Card.Content>
        <Card.Actions>
          <Button
            mode="contained"
            onPress={handleLogout}
            style={styles.logoutButton}
            color="#d9534f"
          >
            Logout
          </Button>
        </Card.Actions>
      </Card>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#f8f9fa",
    padding: 0,
  },
  card: {
    width: "90%",
    padding: 10,
    backgroundColor: "#ffffff",
  },
  vehicleType: {
    fontSize: 18,
    fontWeight: "bold",
    marginBottom: 10,
    color: "#495057",
  },
  locationText: {
    fontSize: 16,
    color: "#6c757d",
    marginTop: 10,
  },
  loader: {
    marginTop: 10,
  },
  destRow: {
    flexDirection: "row",
    marginTop: 12,
  },
  destInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: "#ced4da",
    borderRadius: 6,
    padding: 8,
    marginRight: 6,
    backgroundColor: "#fff",
  },
  setDestButton: {
    marginTop: 8,
  },
  etaText: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#28A745",
    marginTop: 12,
  },
  logoutButton: {
    marginTop: 20,
    width: "100%",
  },
});

export default TrackerDashboard;