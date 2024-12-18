import React from "react";
import { useState, useEffect } from "react";
import { Platform, Text, View, StyleSheet, Button, Alert } from "react-native";

import * as Location from "expo-location";

import * as TaskManager from "expo-task-manager";

const LOCATION_TASK_NAME = "background-location-task";

let num = 0;

TaskManager.defineTask(LOCATION_TASK_NAME, async ({ data, error }) => {
  if (error) {
    // 🔴 Log errors if any occur while fetching location data.
    console.error(`Error fetching location: ${error.message}`);
    return;
  }
  if (data) {
    ++num;
    Alert.alert("received update, ", num.toString());
  }
});

export default function App() {
  const [location, setLocation] = useState(null);
  const [errorMsg, setErrorMsg] = useState(null);
  const [locationStarted, setLocationStarted] = useState(false);

  useEffect(() => {
    async function getCurrentLocation() {
      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        setErrorMsg("Permission to fg access location was denied");
        return;
      }

      let { status: bgStatus } =
        await Location.requestBackgroundPermissionsAsync();
      if (status !== "granted") {
        setErrorMsg("Permission to bg access location was denied");
        return;
      }

      await Location.isBackgroundLocationAvailableAsync();
    }

    getCurrentLocation();
  }, []);

  const startLocationTracking = async () => {
    await Location.startLocationUpdatesAsync(LOCATION_TASK_NAME, {
      accuracy: Location.Accuracy.Highest,
      // foregroundService is how you get the task to be updated as often as would be if the app was open
      showsBackgroundLocationIndicator: true,
      activityType: Location.ActivityType.AutomotiveNavigation,
      timeInterval: 3000,
      foregroundService: {
        notificationTitle: "Using your location",
        notificationBody:
          "To turn off, go back to the app and switch something off.",
      },
      pausesUpdatesAutomatically: false,
    });

    // Logramos que comince a trackear?
    const hasStarted = await Location.hasStartedLocationUpdatesAsync(
      LOCATION_TASK_NAME
    );
    setLocationStarted(hasStarted);
    console.log("Tracking enabled", hasStarted);
  };

  /**
   * Detener tracking
   */
  const stopLocation = async () => {
    const tracking = await TaskManager.isTaskRegisteredAsync(
      LOCATION_TASK_NAME
    );
    console.log("Tracking", tracking);
    if (tracking) {
      await Location.stopLocationUpdatesAsync(LOCATION_TASK_NAME);
      console.log("Tracking disabled");
    } else {
      console.log("Could not disable tracking");
    }
  };

  let text = "Waiting...";
  if (errorMsg) {
    text = errorMsg;
  } else if (location) {
    text = JSON.stringify(location);
  }

  return (
    <View>
      <Text>json: {text}</Text>

      <Button onPress={startLocationTracking} title={"Start"} />

      <Button title="Stop" onPress={stopLocation}></Button>
    </View>
  );
}
