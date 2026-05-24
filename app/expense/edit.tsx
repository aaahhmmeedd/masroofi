import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { router, useLocalSearchParams } from "expo-router";
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

export default function EditExpenseSheet() {
  const insets = useSafeAreaInsets();
  const { expenseId } = useLocalSearchParams<{ expenseId: string }>();
  const { data, colors: C, fc, updateExpense } = useApp();

  const expense = data.expenses.find((e) => e.id === expenseId);

  const [name, setName] = useState(expense?.name ?? "");
  const [amount, setAmount] = useState(expense ? String(expense.amount) : "");
  const [category, setCategory] = useState(expense?.category ?? data.categories[0]);
  const [isSaving, setIsSaving] = useState(false);

  if (!expense) {
    return (
      <View style={[{ flex: 1, backgroundColor: C.backgroundCard, justifyContent: "center", alignItems: "center" }]}>
        <Text style={[S.label, { color: C.textMuted }]}>المصروف غير موجود</Text>
      </View>
    );
  }

  const handleSave = async () => {
    if (!name.trim()) { Alert.alert("خطأ", "أدخل اسماً للمصروف"); return; }
    const amt = parseFloat(amount);
    if (!amount || isNaN(amt) || amt <= 0) { Alert.alert("خطأ", "أدخل مبلغاً صحيحاً"); return; }

    setIsSaving(true);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    await updateExpense(expense.id, { name: name.trim(), amount: amt, category });
    setIsSaving(false);
    router.back();
  };

  const sourceLabel = expense.source === "budget" ? "الميزانية" : expense.source === "savings" ? "السيولة" : "الخزنة";

  return (
    <View style={{ flex: 1, backgroundColor: C.backgroundCard }}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : "height"}>
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={[S.container, { backgroundColor: C.backgroundCard, paddingTop: insets.top + 8 }]}
          keyboardShouldPersistTaps="handled"
        >
          <View style={S.titleRow}>
            <Text style={[S.title, { color: C.text }]}>تعديل المصروف</Text>
            <Pressable onPress={() => router.back()} style={[S.closeBtn, { backgroundColor: C.backgroundSecondary }]}>
              <Feather name="x" size={20} color={C.textSecondary} />
            </Pressable>
          </View>

          <View style={[S.sourceTag, { backgroundColor: C.backgroundSecondary }]}>
            <Feather name="info" size={12} color={C.textMuted} />
            <Text style={[S.sourceText, { color: C.textMuted }]}>المصدر: {sourceLabel} · لا يمكن تغييره</Text>
          </View>

          <Text style={[S.label, { color: C.textSecondary }]}>الاسم</Text>
          <TextInput
            style={[S.input, { backgroundColor: C.backgroundSecondary, color: C.text, borderColor: C.border }]}
            value={name} onChangeText={setName}
            placeholder="اسم المصروف" placeholderTextColor={C.textMuted}
            textAlign="right" autoFocus
          />

          <Text style={[S.label, { color: C.textSecondary }]}>المبلغ</Text>
          <View style={S.amountRow}>
            <TextInput
              style={[S.input, { flex: 1, backgroundColor: C.backgroundSecondary, color: C.text, borderColor: C.border }]}
              value={amount} onChangeText={setAmount}
              keyboardType="decimal-pad" placeholder="٠"
              placeholderTextColor={C.textMuted} textAlign="right"
            />
            <Text style={[S.currency, { color: C.textSecondary }]}>{fc(0).replace("0", "").trim()}</Text>
          </View>

          <Text style={[S.label, { color: C.textSecondary }]}>الفئة</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 4 }}>
            <View style={S.chips}>
              {data.categories.map((cat) => (
                <Pressable
                  key={cat}
                  onPress={() => { Haptics.selectionAsync(); setCategory(cat); }}
                  style={[S.chip, { backgroundColor: category === cat ? C.tint : C.backgroundSecondary, borderColor: category === cat ? C.tint : C.border }]}
                >
                  <Text style={[S.chipText, { color: category === cat ? C.white : C.textSecondary }]}>{cat}</Text>
                </Pressable>
              ))}
            </View>
          </ScrollView>
        </ScrollView>

        <View style={[S.saveBtnContainer, { paddingBottom: Math.max(insets.bottom, 16) + 8, borderTopColor: C.border, backgroundColor: C.backgroundCard }]}>
          <Pressable
            onPress={handleSave}
            disabled={isSaving}
            style={[S.saveBtn, { backgroundColor: C.tint }, isSaving && { opacity: 0.5 }]}
          >
            <Feather name="check" size={18} color="#fff" />
            <Text style={S.saveBtnText}>{isSaving ? "جاري الحفظ..." : "حفظ التعديلات"}</Text>
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}

const S = StyleSheet.create({
  container:  { padding: 24, paddingBottom: 16 },
  titleRow:   { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 20 },
  title:      { fontFamily: "Cairo_700Bold", fontSize: 20 },
  closeBtn:   { width: 36, height: 36, borderRadius: 18, alignItems: "center", justifyContent: "center" },
  sourceTag:  { flexDirection: "row", alignItems: "center", gap: 6, padding: 10, borderRadius: 10, marginBottom: 4 },
  sourceText: { fontFamily: "Cairo_400Regular", fontSize: 12 },
  label:      { fontFamily: "Cairo_600SemiBold", fontSize: 14, marginBottom: 8, marginTop: 16 },
  input:      { borderRadius: 12, padding: 14, fontFamily: "Cairo_400Regular", fontSize: 16, borderWidth: 1 },
  amountRow:  { flexDirection: "row", alignItems: "center", gap: 8 },
  currency:   { fontFamily: "Cairo_600SemiBold", fontSize: 15 },
  chips:      { flexDirection: "row", gap: 8, paddingRight: 4 },
  chip:       { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, borderWidth: 1 },
  chipText:   { fontFamily: "Cairo_600SemiBold", fontSize: 12 },
  saveBtnContainer: { paddingHorizontal: 24, paddingTop: 12, borderTopWidth: StyleSheet.hairlineWidth },
  saveBtn:    { borderRadius: 14, padding: 16, alignItems: "center", flexDirection: "row", justifyContent: "center", gap: 8 },
  saveBtnText:{ fontFamily: "Cairo_700Bold", fontSize: 16, color: "#fff" },
});
