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

import { useApp } from "@/context/AppContext";

const DEBT_TYPES = [
  { key: "owed_to_me" as const, label: "دين لي", sub: "شخص مدين لك", icon: "arrow-down-left", color: "#1B818F" },
  { key: "i_owe" as const, label: "دين عليّ", sub: "أنت مدين لشخص", icon: "arrow-up-right", color: "#C0504A" },
];

export default function AddDebtSheet() {
  const insets = useSafeAreaInsets();
  const { addDebt, colors: C, fc } = useApp();

  const [name, setName] = useState("");
  const [amount, setAmount] = useState("");
  const [type, setType] = useState<"owed_to_me" | "i_owe">("owed_to_me");
  const [note, setNote] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const currencySymbol = fc(0).replace("0", "").trim();

  const handleSave = async () => {
    if (!name.trim()) {
      Alert.alert("خطأ", "يرجى إدخال اسم المدين أو الدائن");
      return;
    }
    const amt = parseFloat(amount);
    if (!amount || isNaN(amt) || amt <= 0) {
      Alert.alert("خطأ", "يرجى إدخال مبلغ صحيح");
      return;
    }
    setIsLoading(true);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    await addDebt(name.trim(), amt, type, note.trim() || undefined);
    setIsLoading(false);
    router.back();
  };

  const selectedType = DEBT_TYPES.find((t) => t.key === type)!;

  return (
    <View style={{ flex: 1, backgroundColor: C.backgroundCard }}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : "height"}>
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={[styles.container, { backgroundColor: C.backgroundCard, paddingTop: insets.top + 8 }]}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.titleRow}>
            <Text style={[styles.title, { color: C.text }]}>دين جديد</Text>
            <Pressable
              onPress={() => router.back()}
              style={[styles.closeBtn, { backgroundColor: C.backgroundSecondary }]}
            >
              <Feather name="x" size={20} color={C.textSecondary} />
            </Pressable>
          </View>

          <Text style={[styles.label, { color: C.textSecondary }]}>نوع الدين</Text>
          <View style={styles.typeRow}>
            {DEBT_TYPES.map((t) => (
              <Pressable
                key={t.key}
                onPress={() => { Haptics.selectionAsync(); setType(t.key); }}
                style={[
                  styles.typeCard,
                  {
                    borderColor: type === t.key ? t.color : C.border,
                    backgroundColor: type === t.key ? t.color + "12" : C.backgroundSecondary,
                  },
                ]}
              >
                <View style={[styles.typeIcon, { backgroundColor: t.color + "20" }]}>
                  <Feather name={t.icon as any} size={18} color={t.color} />
                </View>
                <Text style={[styles.typeLabel, { color: type === t.key ? t.color : C.text }]}>
                  {t.label}
                </Text>
                <Text style={[styles.typeSub, { color: C.textMuted }]}>{t.sub}</Text>
              </Pressable>
            ))}
          </View>

          <Text style={[styles.label, { color: C.textSecondary }]}>
            {type === "owed_to_me" ? "اسم المدين" : "اسم الدائن"}
          </Text>
          <TextInput
            style={[styles.input, { backgroundColor: C.backgroundSecondary, color: C.text, borderColor: C.border }]}
            value={name}
            onChangeText={setName}
            placeholder={type === "owed_to_me" ? "مثال: محمد" : "مثال: أحمد"}
            placeholderTextColor={C.textMuted}
            textAlign="right"
            autoFocus
          />

          <Text style={[styles.label, { color: C.textSecondary }]}>المبلغ</Text>
          <View style={styles.amountRow}>
            <Text style={[styles.currency, { color: C.textSecondary }]}>{currencySymbol}</Text>
            <TextInput
              style={[styles.input, { flex: 1, backgroundColor: C.backgroundSecondary, color: C.text, borderColor: C.border }]}
              value={amount}
              onChangeText={setAmount}
              keyboardType="decimal-pad"
              placeholder="٠.٠٠"
              placeholderTextColor={C.textMuted}
              textAlign="right"
            />
          </View>

          <Text style={[styles.label, { color: C.textSecondary }]}>ملاحظة (اختياري)</Text>
          <TextInput
            style={[styles.input, styles.noteInput, { backgroundColor: C.backgroundSecondary, color: C.text, borderColor: C.border }]}
            value={note}
            onChangeText={setNote}
            placeholder="مثال: قرض منزلي، دين من شراء سيارة..."
            placeholderTextColor={C.textMuted}
            textAlign="right"
            multiline
            numberOfLines={2}
          />
        </ScrollView>

        <View style={[styles.saveBtnContainer, { paddingBottom: Math.max(insets.bottom, 16) + 8, borderTopColor: C.border, backgroundColor: C.backgroundCard }]}>
          <Pressable
            onPress={handleSave}
            disabled={isLoading}
            style={[styles.saveBtn, { backgroundColor: selectedType.color }, isLoading && { opacity: 0.6 }]}
          >
            <Text style={styles.saveBtnText}>
              {isLoading ? "جاري الحفظ..." : "إضافة الدين"}
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
  typeRow: { flexDirection: "row", gap: 10 },
  typeCard: { flex: 1, borderRadius: 14, borderWidth: 1.5, padding: 14, alignItems: "center", gap: 6 },
  typeIcon: { width: 38, height: 38, borderRadius: 11, alignItems: "center", justifyContent: "center" },
  typeLabel: { fontFamily: "Cairo_700Bold", fontSize: 13 },
  typeSub: { fontFamily: "Cairo_400Regular", fontSize: 10, textAlign: "center" },
  input: { borderRadius: 12, padding: 14, fontFamily: "Cairo_400Regular", fontSize: 16, borderWidth: 1 },
  amountRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  currency: { fontFamily: "Cairo_600SemiBold", fontSize: 14 },
  noteInput: { minHeight: 70, textAlignVertical: "top" },
  saveBtnContainer: { paddingHorizontal: 24, paddingTop: 12, borderTopWidth: StyleSheet.hairlineWidth },
  saveBtn: { borderRadius: 14, padding: 16, alignItems: "center" },
  saveBtnText: { fontFamily: "Cairo_700Bold", fontSize: 16, color: "#fff" },
});
