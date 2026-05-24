import {
  Cairo_400Regular,
  Cairo_600SemiBold,
  Cairo_700Bold,
  Cairo_900Black,
  useFonts,
} from "@expo-google-fonts/cairo";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import React, { useEffect, useRef, useState } from "react";
import { Alert, I18nManager, Platform } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider } from "react-native-safe-area-context";

import { ErrorBoundary } from "@/components/ErrorBoundary";
import BiometricLock from "@/components/BiometricLock";
import { AppProvider, useApp } from "@/context/AppContext";
import { ARABIC_MONTHS } from "@/constants/arabic";
import {
  requestPermissions,
  scheduleMonthEndReminder,
  notifyAutoMonthCreated,
  notifyDebtReminder,
} from "@/services/notifications";

I18nManager.forceRTL(true);

SplashScreen.preventAutoHideAsync();

const queryClient = new QueryClient();

const sheetOptions = {
  presentation: "modal" as const,
  headerShown: false,
};

function RootLayoutNav() {
  const { data, isLoading, addMonth, fc } = useApp();
  const biometricEnabled = data.settings?.biometricLock && Platform.OS !== "web";
  const [isLocked, setIsLocked] = useState(biometricEnabled);
  const didRunOnce = useRef(false);

  useEffect(() => {
    if (biometricEnabled) setIsLocked(true);
  }, [biometricEnabled]);

  // Auto-month check + notifications setup — runs once after data is loaded
  useEffect(() => {
    if (isLoading || didRunOnce.current) return;
    didRunOnce.current = true;

    (async () => {
      const { settings } = data;

      // 1. Request notification permissions if enabled
      if (settings.notificationsEnabled && Platform.OS !== "web") {
        await requestPermissions();
      }

      // 2. Auto month management
      if (settings.autoMonthManagement) {
        const now = new Date();
        const currentM = now.getMonth() + 1;
        const currentY = now.getFullYear();
        const exists = data.months.some((m) => m.month === currentM && m.year === currentY);

        if (!exists) {
          await addMonth(currentM, currentY, 0);
          const monthName = `${ARABIC_MONTHS[currentM - 1]} ${currentY}`;
          if (settings.notificationsEnabled) {
            await notifyAutoMonthCreated(monthName, fc(0));
          } else {
            Alert.alert("تم إنشاء شهر جديد 🗓️", `${monthName} · حدّد ميزانيتك من صفحة الشهر`);
          }
          if (settings.notificationsEnabled) {
            await scheduleMonthEndReminder(currentY, currentM);
          }
        } else if (settings.notificationsEnabled) {
          // Schedule month-end reminder for current month if not already ended
          const currentMonthObj = data.months.find((m) => m.month === currentM && m.year === currentY);
          if (currentMonthObj && !currentMonthObj.isEnded) {
            await scheduleMonthEndReminder(currentY, currentM);
          }
        }
      }

      // 3. Debt reminder if notifications enabled
      if (settings.notificationsEnabled) {
        const activeDebts = (data.debts || []).filter((d) => !d.isPaid);
        if (activeDebts.length > 0) {
          const total = activeDebts.reduce((s, d) => s + d.remaining, 0);
          await notifyDebtReminder(activeDebts.length, fc(total));
        }
      }
    })();
  }, [isLoading]);

  return (
    <>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="month/[id]" options={{ headerShown: false }} />
        <Stack.Screen name="month/add" options={sheetOptions} />
        <Stack.Screen name="expense/add" options={sheetOptions} />
        <Stack.Screen name="expense/edit" options={sheetOptions} />
        <Stack.Screen name="income/add" options={sheetOptions} />
        <Stack.Screen name="vault/add" options={sheetOptions} />
        <Stack.Screen name="vault/deposit" options={sheetOptions} />
        <Stack.Screen name="vault/store" options={sheetOptions} />
        <Stack.Screen name="categories/index" options={{ headerShown: false }} />
        <Stack.Screen name="debts/index" options={{ headerShown: false }} />
        <Stack.Screen name="debts/add" options={sheetOptions} />
      </Stack>
      {isLocked && (
        <BiometricLock
          isDark={data.settings?.darkMode ?? false}
          onUnlock={() => setIsLocked(false)}
        />
      )}
    </>
  );
}

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({
    Cairo_400Regular,
    Cairo_600SemiBold,
    Cairo_700Bold,
    Cairo_900Black,
  });

  useEffect(() => {
    if (fontsLoaded || fontError) SplashScreen.hideAsync();
  }, [fontsLoaded, fontError]);

  if (!fontsLoaded && !fontError) return null;

  return (
    <SafeAreaProvider>
      <ErrorBoundary>
        <QueryClientProvider client={queryClient}>
          <AppProvider>
            <GestureHandlerRootView style={{ flex: 1 }}>
              <RootLayoutNav />
            </GestureHandlerRootView>
          </AppProvider>
        </QueryClientProvider>
      </ErrorBoundary>
    </SafeAreaProvider>
  );
}
