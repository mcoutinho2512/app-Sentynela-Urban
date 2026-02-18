import * as Location from "expo-location";
import * as ImagePicker from "expo-image-picker";

export async function requestLocationPermission(): Promise<boolean> {
  const { status } = await Location.requestForegroundPermissionsAsync();
  return status === "granted";
}

export async function requestCameraPermission(): Promise<boolean> {
  const { status } = await ImagePicker.requestCameraPermissionsAsync();
  return status === "granted";
}

export async function requestMediaLibraryPermission(): Promise<boolean> {
  const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
  return status === "granted";
}

export async function getCurrentLocation(): Promise<Location.LocationObject | null> {
  const granted = await requestLocationPermission();
  if (!granted) return null;
  return Location.getCurrentPositionAsync({
    accuracy: Location.Accuracy.High,
  });
}
