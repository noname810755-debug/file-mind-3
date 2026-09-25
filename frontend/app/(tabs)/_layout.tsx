import { Tabs } from "expo-router";
import React from "react";
import { Platform } from "react-native";

import { Icon, type IconName } from "@/src/icons";
import { useTheme } from "@/src/theme";

export default function TabsLayout() {
  const { colors } = useTheme();
  const icon = (name: IconName, focusedName: IconName) =>
    function TabIcon({ color, focused }: { color: string; focused: boolean }) {
      return <Icon name={focused ? focusedName : name} size={25} color={color} />;
    };
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.brandPrimary,
        tabBarInactiveTintColor: colors.muted,
        tabBarStyle: {
          backgroundColor: colors.surfaceSecondary,
          borderTopColor: colors.divider,
          borderTopWidth: 1,
          ...(Platform.OS === "web" ? { height: 64 } : {}),
        },
        tabBarItemStyle: { alignSelf: "center" },
        tabBarLabelStyle: { fontSize: 11, fontWeight: "600" },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{ title: "Home", tabBarIcon: icon("home-outline", "home") }}
      />
      <Tabs.Screen
        name="files"
        options={{ title: "Files", tabBarIcon: icon("folder-outline", "folder") }}
      />
      <Tabs.Screen
        name="pdf"
        options={{ title: "PDF", tabBarIcon: icon("file-pdf-box", "file-pdf-box") }}
      />
      <Tabs.Screen
        name="ai"
        options={{ title: "AI", tabBarIcon: icon("robot-outline", "robot") }}
      />
    </Tabs>
  );
}
