import { Platform } from "react-native";

type NotificationsModule = typeof import("expo-notifications");

let modulePromise: Promise<NotificationsModule | null> | null = null;
let handlerConfigured = false;

async function getNotifications(): Promise<NotificationsModule | null> {
  if (Platform.OS === "web") return null;
  if (!modulePromise) {
  modulePromise = Promise.resolve(import("expo-notifications")).catch(() => null);
  }
  return modulePromise;
}

async function configureHandler(notifications: NotificationsModule) {
  if (handlerConfigured) return;
  notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldPlaySound: true,
      shouldSetBadge: true,
      shouldShowBanner: true,
      shouldShowList: true,
    }),
  });
  if (Platform.OS === "android") {
    await notifications.setNotificationChannelAsync("filemind", {
      name: "File Mind",
      importance: notifications.AndroidImportance.DEFAULT,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: "#FF5E00",
    });
  }
  handlerConfigured = true;
}

export async function getLocalNotificationStatus(): Promise<"granted" | "denied" | "unavailable"> {
  const notifications = await getNotifications();
  if (!notifications) return "unavailable";
  await configureHandler(notifications);
  const permissions = await notifications.getPermissionsAsync();
  return permissions.granted ? "granted" : "denied";
}

export async function requestLocalNotificationPermission(): Promise<"granted" | "denied" | "unavailable"> {
  const notifications = await getNotifications();
  if (!notifications) return "unavailable";
  await configureHandler(notifications);
  const current = await notifications.getPermissionsAsync();
  const result = current.granted ? current : await notifications.requestPermissionsAsync();
  return result.granted ? "granted" : "denied";
}

export async function sendTestNotification(): Promise<{ ok: boolean; reason?: string }> {
  const notifications = await getNotifications();
  if (!notifications) return { ok: false, reason: "Notifications are available on a physical mobile device." };
  const status = await requestLocalNotificationPermission();
  if (status !== "granted") return { ok: false, reason: "Notification permission is disabled in device settings." };
  try {
    await notifications.scheduleNotificationAsync({
      content: {
        title: "File Mind is ready",
        body: "Your on-device notification is working. Your files stay on this device.",
        sound: "default",
        data: { source: "file-mind-local" },
      },
      trigger: null,
    });
    return { ok: true };
  } catch {
    return { ok: false, reason: "Could not schedule the notification on this device." };
  }
}

export async function initializeLocalNotifications() {
  const notifications = await getNotifications();
  if (!notifications) return;
  try {
    await configureHandler(notifications);
  } catch {
    // Notification support is optional and must never block app startup.
  }
}
