import { BlurView } from "expo-blur";
import { Tabs } from "expo-router";
import { Feather } from "@expo/vector-icons";
import React from "react";
import { Platform, StyleSheet } from "react-native";

import { useApp } from "@/context/AppContext";

export default function TabLayout() {
  const { colors: C, data } = useApp();
  const isIOS = Platform.OS === "ios";
  const isWeb = Platform.OS === "web";
  const isDark = data.settings?.darkMode ?? false;

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: C.tint,
        tabBarInactiveTintColor: C.tabIconDefault,
        tabBarStyle: {
          position: "absolute",
          backgroundColor: isIOS ? "transparent" : C.backgroundCard,
          borderTopWidth: isIOS ? 0 : StyleSheet.hairlineWidth,
          borderTopColor: C.border,
          elevation: 0,
          height: isWeb ? 84 : undefined,
        },
        tabBarLabelStyle: {
          fontFamily: "Cairo_600SemiBold",
          fontSize: 10,
        },
        tabBarBackground: isIOS
          ? () => (
              <BlurView
                intensity={80}
                tint={isDark ? "dark" : "light"}
                style={StyleSheet.absoluteFill}
              />
            )
          : undefined,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "الرئيسية",
          tabBarIcon: ({ color, size }) => (
            <Feather name="home" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="vaults"
        options={{
          title: "الخزائن",
          tabBarIcon: ({ color, size }) => (
            <Feather name="archive" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="debts"
        options={{
          title: "الديون",
          tabBarIcon: ({ color, size }) => (
            <Feather name="users" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="analytics"
        options={{
          title: "التقارير",
          tabBarIcon: ({ color, size }) => (
            <Feather name="bar-chart-2" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: "المزيد",
          tabBarIcon: ({ color, size }) => (
            <Feather name="more-horizontal" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen name="log" options={{ href: null }} />
    </Tabs>
  );
}
