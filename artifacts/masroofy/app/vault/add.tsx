import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { router } from "expo-router";
import React, { useState } from "react";
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { VAULT_COLORS } from "@/constants/types";
import { useApp } from "@/context/AppContext";

export default function AddVaultSheet() {
  const insets = useSafeAreaInsets();
  const { addVault, colors: C, fc } = useApp();
  const [name, setName] = useState("");
  const [goal, setGoal] = useState("");
  const [color, setColor] = useState(VAULT_COLORS[0]);
  const [isLoading, setIsLoading] = useState(false);

  const currencySymbol = fc(0).replace("0", "").trim();

  const handleSave = async () => {
    if (!name.trim()) {
      Alert.alert("خطأ", "يرجى إدخال اسم الخزنة");
      return;
    }
    if (!goal || parseFloat(goal) <= 0) {
      Alert.alert("خطأ", "يرجى إدخال هدف ادخاري صحيح");
      return;
    }
    setIsLoading(true);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    await addVault(name.trim(), parseFloat(goal), color);
    setIsLoading(false);
    router.back();
  };

  return (
    <View style={{ flex: 1, backgroundColor: C.backgroundCard }}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : "height"}>
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={[styles.container, { backgroundColor: C.backgroundCard, paddingTop: insets.top + 8 }]}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.titleRow}>
            <Text style={[styles.title, { color: C.text }]}>خزنة جديدة</Text>
            <Pressable
              onPress={() => router.back()}
              style={[styles.closeBtn, { backgroundColor: C.backgroundSecondary }]}
            >
              <Feather name="x" size={20} color={C.textSecondary} />
            </Pressable>
          </View>

          <Text style={[styles.label, { color: C.textSecondary }]}>اسم الخزنة</Text>
          <TextInput
            style={[styles.input, { backgroundColor: C.backgroundSecondary, color: C.text, borderColor: C.border }]}
            value={name}
            onChangeText={setName}
            placeholder="مثال: شراء سيارة"
            placeholderTextColor={C.textMuted}
            textAlign="right"
            autoFocus
          />

          <Text style={[styles.label, { color: C.textSecondary }]}>الهدف الادخاري</Text>
          <View style={styles.inputRow}>
            <Text style={[styles.currency, { color: C.textSecondary }]}>{currencySymbol}</Text>
            <TextInput
              style={[styles.input, { flex: 1, backgroundColor: C.backgroundSecondary, color: C.text, borderColor: C.border }]}
              value={goal}
              onChangeText={setGoal}
              keyboardType="decimal-pad"
              placeholder="٠.٠٠"
              placeholderTextColor={C.textMuted}
              textAlign="right"
            />
          </View>

          <Text style={[styles.label, { color: C.textSecondary }]}>لون الخزنة</Text>
          <View style={styles.colorsRow}>
            {VAULT_COLORS.map((c) => (
              <Pressable
                key={c}
                onPress={() => { Haptics.selectionAsync(); setColor(c); }}
                style={[
                  styles.colorDot,
                  { backgroundColor: c },
                  color === c && styles.colorDotSelected,
                ]}
              >
                {color === c && <Feather name="check" size={14} color="#fff" />}
              </Pressable>
            ))}
          </View>
        </ScrollView>

        <View style={[styles.saveBtnContainer, { paddingBottom: Math.max(insets.bottom, 16) + 8, borderTopColor: C.border, backgroundColor: C.backgroundCard }]}>
          <Pressable
            onPress={handleSave}
            disabled={isLoading}
            style={[styles.saveBtn, { backgroundColor: color }, isLoading && { opacity: 0.6 }]}
          >
            <Text style={styles.saveBtnText}>
              {isLoading ? "جاري الحفظ..." : "إنشاء الخزنة"}
            </Text>
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { padding: 24, paddingBottom: 16 },
  titleRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 24 },
  title: { fontFamily: "Cairo_700Bold", fontSize: 20 },
  closeBtn: { width: 36, height: 36, borderRadius: 18, alignItems: "center", justifyContent: "center" },
  label: { fontFamily: "Cairo_600SemiBold", fontSize: 14, marginBottom: 8, marginTop: 12 },
  input: { borderRadius: 12, padding: 14, fontFamily: "Cairo_400Regular", fontSize: 16, borderWidth: 1 },
  inputRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  currency: { fontFamily: "Cairo_600SemiBold", fontSize: 14 },
  colorsRow: { flexDirection: "row", gap: 12, flexWrap: "wrap" },
  colorDot: { width: 36, height: 36, borderRadius: 18, alignItems: "center", justifyContent: "center" },
  colorDotSelected: {
    borderWidth: 3,
    borderColor: "#fff",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 4,
  },
  saveBtnContainer: { paddingHorizontal: 24, paddingTop: 12, borderTopWidth: StyleSheet.hairlineWidth },
  saveBtn: { borderRadius: 14, padding: 16, alignItems: "center" },
  saveBtnText: { fontFamily: "Cairo_700Bold", fontSize: 16, color: "#fff" },
});
