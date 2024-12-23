import React, { useCallback, useRef } from "react";
import { useState, useEffect } from "react";
import {
  Platform,
  Text,
  View,
  StyleSheet,
  Button,
  Alert,
  ScrollView,
} from "react-native";

import { PermissionsAndroid, AppState } from "react-native";
import BackgroundJob from "react-native-background-actions";
import Geolocation from "@react-native-community/geolocation";
import { useMMKVObject, useMMKVString } from "react-native-mmkv";

async function requestMultiplePermissions() {
  try {
    if (Platform.OS === "ios") {
      Geolocation.requestAuthorization();
    } else if (Platform.OS === "android") {
      await PermissionsAndroid.requestMultiple([
        PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
      ]);
      await PermissionsAndroid.requestMultiple([
        PermissionsAndroid.PERMISSIONS.ACCESS_BACKGROUND_LOCATION,
      ]);
      await PermissionsAndroid.requestMultiple([
        PermissionsAndroid.PERMISSIONS.ACCESS_COARSE_LOCATION,
      ]);
    }
  } catch (err) {
    console.warn("Permission request error:", err);
  }
}

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

// Function to stop the background job

export default function App() {
  const [location, setLocation] = useState(null);
  const [errorMsg, setErrorMsg] = useState(null);
  const appState = useRef(AppState.currentState);
  const watchId = useRef(null);

  const [data, setData] = useMMKVString("location");

  const dataParsed = JSON.parse(data || "[]");

  const [sub, setSub] = useState(false);

  const getLocationTask = useCallback(async (taskData: any) => {
    // Define a function to get the current position
    const getCurrentPosition = () =>
      new Promise((resolve, reject) => {
        Geolocation.getCurrentPosition(
          (position) => {
            console.log("Current Position:", position);
            setData((_data) =>
              JSON.stringify(JSON.parse(_data).concat(position))
            );
            resolve();
          },
          (error) => {
            console.log("Geolocation error:", error.code, error.message);
            reject(error);
          },
          { enableHighAccuracy: true, timeout: 10000, maximumAge: 10000 }
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
  }, []);

  // Function to start the background job
  const startBackgroundJob = useCallback(async () => {
    try {
      console.log("Trying to start background service");
      await BackgroundJob.start(getLocationTask, options);
      console.log("Background service started successfully!");
      setSub(true);
    } catch (e) {
      console.log("Error starting background service:", e);
    }
  }, [getLocationTask]);

  const stopBackgroundJob = useCallback(async () => {
    try {
      console.log("Stopping background service");
      await BackgroundJob.stop();
      console.log("Background service stopped successfully!");
      setSub(false);
    } catch (e) {
      console.log("Error stopping background service:", e);
    }
  }, []);

  useEffect(() => {
    requestMultiplePermissions();

    const subscription = AppState.addEventListener("change", (nextAppState) => {
      if (nextAppState === "background") {
        startBackgroundJob();
      } else if (
        nextAppState === "active" &&
        (appState.current === "background" || appState.current === "inactive")
      ) {
        stopBackgroundJob();
      }

      appState.current = nextAppState;
    });
    // Configure Geolocation
    Geolocation.setRNConfiguration({
      authorizationLevel: "always", // Request "always" location permission
      skipPermissionRequests: false, // Prompt for permission if not granted
    });

    // To stop tracking (for example, when the component unmounts):
    return () => {
      subscription.remove();
    };
  }, []);

  const startWatch = useCallback(
    () =>
      (watchId.current = Geolocation.watchPosition(
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
      )),
    [watchId.current]
  );

  const stopWatch = () => {
    if (watchId.current) {
      Geolocation.clearWatch(watchId.current);
      watchId.current = null;
    }
  };

  let text = "Waiting...";
  if (errorMsg) {
    text = errorMsg;
  } else if (location) {
    text = JSON.stringify(location);
  }

  return (
    <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
      <Button title="Start Background Job" onPress={startBackgroundJob} />
      <Button title="Stop Background Job" onPress={stopBackgroundJob} />
      <Button title="Start Watch" onPress={startWatch} />
      <Button title="Stop Watch" onPress={stopWatch} />
      <Button title="Clear Data" onPress={() => setData("[]")} />

      <View>
        <Text style={{ fontSize: 20, backgroundColor: sub ? "green" : "red" }}>
          {"Service is " + sub}
        </Text>
      </View>
      <ScrollView>
        {dataParsed.map((item, idx) => (
          <Text key={idx}>
            {new Date(item.timestamp).toLocaleDateString("he-IL")}{" "}
            {new Date(item.timestamp).toLocaleTimeString("he-IL")}
          </Text>
        ))}
      </ScrollView>
    </View>
  );
}
