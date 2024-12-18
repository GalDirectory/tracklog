import React from "react";
import { useState, useEffect } from "react";
import { Platform, Text, View, StyleSheet, Button, Alert } from "react-native";

import { PermissionsAndroid, AppState } from "react-native";
import BackgroundJob from "react-native-background-actions";
import Geolocation from "@react-native-community/geolocation";

async function requestMultiplePermissions() {
  try {
    await PermissionsAndroid.requestMultiple([
      PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
    ]);
    await PermissionsAndroid.requestMultiple([
      PermissionsAndroid.PERMISSIONS.ACCESS_BACKGROUND_LOCATION,
    ]);
    await PermissionsAndroid.requestMultiple([
      PermissionsAndroid.PERMISSIONS.ACCESS_COARSE_LOCATION,
    ]);
  } catch (err) {
    console.warn("Permission request error:", err);
  }
}

const getLocationTask = async (taskData: any) => {
  // Define a function to get the current position
  const getCurrentPosition = () =>
    new Promise((resolve, reject) => {
      Geolocation.getCurrentPosition(
        (position) => {
          console.log("Current Position:", position);
          resolve();
        },
        (error) => {
          console.log("Geolocation error:", error.code, error.message);
          reject(error);
        },
        { enableHighAccuracy: true, timeout: 15000, maximumAge: 10000 }
      );
    });

  await new Promise((resolve) => {
    const intervalId = setInterval(async () => {
      if (!BackgroundJob.isRunning()) {
        clearInterval(intervalId); // Stop the interval if the background job is no longer running
        resolve();
        return;
      }

      try {
        await getCurrentPosition();
        await BackgroundJob.updateNotification({
          taskDesc: "Getting position...",
        });
      } catch (error) {
        console.log("Error getting position:", error);
      }
    }, 10 * 1000); // Get position every 10 seconds
  });
};
const options = {
  taskName: "Gelocation Task",
  taskTitle: "Fetching User Location",
  taskDesc: "Fetching User Location background and foreground",
  taskIcon: {
    name: "ic_launcher",
    type: "mipmap",
  },
  color: "#FF0000",
  parameters: {
    delay: 1000,
  },
};

// Function to start the background job
export const startBackgroundJob = async () => {
  try {
    console.log("Trying to start background service");
    await BackgroundJob.start(getLocationTask, options);
    console.log("Background service started successfully!");
  } catch (e) {
    console.log("Error starting background service:", e);
  }
};

// Function to stop the background job
export const stopBackgroundJob = async () => {
  try {
    console.log("Stopping background service");
    await BackgroundJob.stop();
    console.log("Background service stopped successfully!");
  } catch (e) {
    console.log("Error stopping background service:", e);
  }
};

export default function App() {
  const [location, setLocation] = useState(null);
  const [errorMsg, setErrorMsg] = useState(null);
  const [locationStarted, setLocationStarted] = useState(false);

  useEffect(() => {
    requestMultiplePermissions();

    AppState.addEventListener("change", (nextAppState) => {
      if (nextAppState === "background") {
        startBackgroundJob();
      } else {
        stopBackgroundJob();
      }
    });
    // Configure Geolocation
    Geolocation.setRNConfiguration({
      authorizationLevel: "always", // Request "always" location permission
      skipPermissionRequests: false, // Prompt for permission if not granted
    });

    /*     // Watch for position updates
    const watchId = Geolocation.watchPosition(
      (position) => {
        console.log(position);
        // Send the position data to the server
      },
      (error) => {
        console.log(error);
      },
      {
        enableHighAccuracy: true,
        distanceFilter: 0, // Minimum distance (in meters) to update the location
        interval: 1000, // Update interval (in milliseconds), which is 15 minutes
        fastestInterval: 2 * 1000, // Fastest update interval (in milliseconds)
        useSignificantChanges: false,
      }
    );

    // To stop tracking (for example, when the component unmounts):
    return () => {
      Geolocation.clearWatch(watchId);
    }; */
  }, []);

  let text = "Waiting...";
  if (errorMsg) {
    text = errorMsg;
  } else if (location) {
    text = JSON.stringify(location);
  }

  return (
    <View>
      <Text>json: {text}</Text>
    </View>
  );
}
