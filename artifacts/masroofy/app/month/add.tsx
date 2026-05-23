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

import { ARABIC_MONTHS, toArabicNumerals } from "@/constants/arabic";
import { useApp } from "@/context/AppContext";

export default function AddMonthSheet() {
  const insets = useSafeAreaInsets();
  const { addMonth, data, colors: C, fc } = useApp();

  const now = new Date();
  const [selectedMonth, setSelectedMonth] = useState(now.getMonth() + 1);
  const [year, setYear] = useState(String(now.getFullYear()));
  const [budget, setBudget] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  // Quick budget presets based on last month history
  const lastMonthBudget = data.months.sort((a, b) => {
    const at = new Date(a.year, a.month - 1).getTime();
    const bt = new Date(b.year, b.month - 1).getTime();
    return bt - at;
  })[0]?.budget ?? 0;

  const presets = lastMonthBudget > 0
    ? [lastMonthBudget, Math.round(lastMonthBudget * 1.1), Math.round(lastMonthBudget * 0.9)]
    : [3000, 5000, 8000];

  const alreadyExists = data.months.some(
    m => m.month === selectedMonth && m.year === (parseInt(year) || now.getFullYear())
  );

  const recurringTotal = data.recurringExpenses.reduce((s, r) => s + r.amount, 0);

  const handleSave = async () => {
    if (!budget || parseFloat(budget) <= 0) {
      Alert.alert("خطأ", "يرجى إدخال ميزانية صحيحة");
      return;
    }
    const parsedYear = parseInt(year) || now.getFullYear();
    if (alreadyExists) {
      Alert.alert("تنبيه", `يوجد شهر ${ARABIC_MONTHS[selectedMonth - 1]} ${parsedYear} بالفعل`);
      return;
    }
    setIsLoading(true);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    await addMonth(selectedMonth, parsedYear, parseFloat(budget));
    setIsLoading(false);
    router.back();
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : "height"}>
      <ScrollView
        contentContainerStyle={[
          styles.container,
          { paddingBottom: insets.bottom + 20, backgroundColor: C.backgroundCard },
        ]}
        keyboardShouldPersistTaps="handled"
      >
        {/* Header */}
        <View style={styles.titleRow}>
          <Text style={[styles.title, { color: C.text }]}>إضافة شهر جديد</Text>
          <Pressable onPress={() => router.back()} style={[styles.closeBtn, { backgroundColor: C.backgroundSecondary }]}>
            <Feather name="x" size={20} color={C.textSecondary} />
          </Pressable>
        </View>

        {/* Month picker */}
        <Text style={[styles.label, { color: C.textSecondary }]}>الشهر</Text>
        <View style={styles.monthsGrid}>
          {ARABIC_MONTHS.map((name, index) => {
            const m = index + 1;
            const isSelected = selectedMonth === m;
            const exists = data.months.some(mo => mo.month === m && mo.year === (parseInt(year) || now.getFullYear()));
            return (
              <Pressable
                key={m}
                onPress={() => { Haptics.selectionAsync(); setSelectedMonth(m); }}
                style={[
                  styles.monthChip,
                  {
                    backgroundColor: isSelected ? C.navy : exists ? C.backgroundSecondary : C.backgroundSecondary,
                    borderColor: isSelected ? C.navy : exists ? C.border + "80" : C.border,
                    opacity: exists && !isSelected ? 0.5 : 1,
                  },
                ]}
              >
                <Text style={[styles.monthChipText, { color: isSelected ? C.white : exists ? C.textMuted : C.textSecondary }]}>
                  {name}
                </Text>
                {exists && !isSelected && (
                  <Feather name="check" size={9} color={C.textMuted} />
                )}
              </Pressable>
            );
          })}
        </View>

        {/* Year */}
        <Text style={[styles.label, { color: C.textSecondary }]}>السنة</Text>
        <TextInput
          style={[styles.input, { backgroundColor: C.backgroundSecondary, color: C.text, borderColor: C.border }]}
          value={year}
          onChangeText={setYear}
          keyboardType="number-pad"
          placeholder="٢٠٢٥"
          placeholderTextColor={C.textMuted}
          textAlign="right"
        />

        {/* Budget */}
        <Text style={[styles.label, { color: C.textSecondary }]}>الميزانية الإجمالية</Text>

        {/* Quick presets */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 10 }}>
          <View style={styles.presetRow}>
            {presets.map((p, i) => (
              <Pressable
                key={i}
                onPress={() => { Haptics.selectionAsync(); setBudget(String(p)); }}
                style={[
                  styles.presetChip,
                  {
                    backgroundColor: budget === String(p) ? C.navy + "15" : C.backgroundSecondary,
                    borderColor: budget === String(p) ? C.navy : C.border,
                  },
                ]}
              >
                {i === 0 && lastMonthBudget > 0 && (
                  <Text style={[styles.presetTag, { color: C.tint }]}>نفس السابق</Text>
                )}
                <Text style={[styles.presetAmount, { color: budget === String(p) ? C.navy : C.text }]}>
                  {fc(p)}
                </Text>
              </Pressable>
            ))}
          </View>
        </ScrollView>

        <View style={styles.inputRow}>
          <TextInput
            style={[styles.input, { flex: 1, backgroundColor: C.backgroundSecondary, color: C.text, borderColor: C.border }]}
            value={budget}
            onChangeText={setBudget}
            keyboardType="decimal-pad"
            placeholder="٠"
            placeholderTextColor={C.textMuted}
            textAlign="right"
          />
          <Text style={[styles.currency, { color: C.textSecondary }]}>{fc(0).replace("0", "").trim()}</Text>
        </View>

        {/* Recurring expenses preview */}
        {data.recurringExpenses.length > 0 && (
          <View style={[styles.recurringBox, { backgroundColor: C.tint + "10", borderColor: C.tint + "35" }]}>
            <View style={styles.recurringHeader}>
              <Feather name="repeat" size={13} color={C.tint} />
              <Text style={[styles.recurringTitle, { color: C.tint }]}>
                يُضاف تلقائياً: {toArabicNumerals(data.recurringExpenses.length)} مصروف متكرر
              </Text>
              {recurringTotal > 0 && (
                <Text style={[styles.recurringTotal, { color: C.tint }]}> ({fc(recurringTotal)})</Text>
              )}
            </View>
            {data.recurringExpenses.slice(0, 4).map(re => (
              <View key={re.id} style={styles.recurringItem}>
                <View style={[styles.recurringDot, { backgroundColor: C.tint }]} />
                <Text style={[styles.recurringItemText, { color: C.textSecondary }]}>
                  {re.name}
                </Text>
                <Text style={[styles.recurringItemAmount, { color: C.tint }]}>{fc(re.amount)}</Text>
              </View>
            ))}
            {data.recurringExpenses.length > 4 && (
              <Text style={[styles.recurringMore, { color: C.textMuted }]}>
                +{toArabicNumerals(data.recurringExpenses.length - 4)} أخرى
              </Text>
            )}
            {budget && parseFloat(budget) > 0 && recurringTotal > 0 && (
              <View style={[styles.recurringRemain, { borderTopColor: C.tint + "30" }]}>
                <Text style={[styles.recurringRemainText, { color: C.textSecondary }]}>
                  الميزانية الفعلية بعد المتكررة:
                </Text>
                <Text style={[styles.recurringRemainAmount, { color: parseFloat(budget) - recurringTotal >= 0 ? C.successDark : C.danger }]}>
                  {fc(parseFloat(budget) - recurringTotal)}
                </Text>
              </View>
            )}
          </View>
        )}

        {alreadyExists && (
          <View style={[styles.warningBox, { backgroundColor: C.warning + "15", borderColor: C.warning + "40" }]}>
            <Feather name="alert-triangle" size={13} color={C.warning} />
            <Text style={[styles.warningText, { color: C.warning }]}>
              يوجد شهر {ARABIC_MONTHS[selectedMonth - 1]} {year} بالفعل
            </Text>
          </View>
        )}

        <Pressable
          onPress={handleSave}
          disabled={isLoading || alreadyExists}
          style={[styles.saveBtn, { backgroundColor: alreadyExists ? C.border : C.navy }, (isLoading || alreadyExists) && { opacity: 0.6 }]}
        >
          <Feather name="plus-circle" size={18} color={alreadyExists ? C.textMuted : C.white} />
          <Text style={[styles.saveBtnText, { color: alreadyExists ? C.textMuted : C.white }]}>
            {isLoading ? "جاري الحفظ..." : "إضافة الشهر"}
          </Text>
        </Pressable>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 24, borderTopLeftRadius: 20, borderTopRightRadius: 20, minHeight: "100%" },
  titleRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 24 },
  title: { fontFamily: "Cairo_700Bold", fontSize: 20 },
  closeBtn: { width: 36, height: 36, borderRadius: 18, alignItems: "center", justifyContent: "center" },
  label: { fontFamily: "Cairo_600SemiBold", fontSize: 14, marginBottom: 10, marginTop: 12 },
  monthsGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 4 },
  monthChip: { width: "30%", paddingVertical: 10, borderRadius: 12, borderWidth: 1, alignItems: "center", gap: 2 },
  monthChipText: { fontFamily: "Cairo_600SemiBold", fontSize: 13 },
  input: { borderRadius: 12, padding: 14, fontFamily: "Cairo_400Regular", fontSize: 16, borderWidth: 1, marginBottom: 4 },
  inputRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  currency: { fontFamily: "Cairo_600SemiBold", fontSize: 14 },
  presetRow: { flexDirection: "row", gap: 8, paddingRight: 4 },
  presetChip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 12, borderWidth: 1, alignItems: "center", minWidth: 80 },
  presetTag: { fontFamily: "Cairo_400Regular", fontSize: 10 },
  presetAmount: { fontFamily: "Cairo_700Bold", fontSize: 13 },
  recurringBox: { marginTop: 16, borderRadius: 14, padding: 14, borderWidth: 1, gap: 6 },
  recurringHeader: { flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 4 },
  recurringTitle: { fontFamily: "Cairo_600SemiBold", fontSize: 13 },
  recurringTotal: { fontFamily: "Cairo_700Bold", fontSize: 12 },
  recurringItem: { flexDirection: "row", alignItems: "center", gap: 8 },
  recurringDot: { width: 5, height: 5, borderRadius: 3 },
  recurringItemText: { flex: 1, fontFamily: "Cairo_400Regular", fontSize: 13 },
  recurringItemAmount: { fontFamily: "Cairo_600SemiBold", fontSize: 12 },
  recurringMore: { fontFamily: "Cairo_400Regular", fontSize: 12, paddingRight: 13 },
  recurringRemain: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", borderTopWidth: 1, marginTop: 4, paddingTop: 8 },
  recurringRemainText: { fontFamily: "Cairo_400Regular", fontSize: 12 },
  recurringRemainAmount: { fontFamily: "Cairo_700Bold", fontSize: 13 },
  warningBox: { flexDirection: "row", alignItems: "center", gap: 8, padding: 12, borderRadius: 10, borderWidth: 1, marginTop: 12 },
  warningText: { fontFamily: "Cairo_400Regular", fontSize: 13, flex: 1 },
  saveBtn: { marginTop: 24, borderRadius: 14, padding: 16, alignItems: "center", flexDirection: "row", justifyContent: "center", gap: 8 },
  saveBtnText: { fontFamily: "Cairo_700Bold", fontSize: 16 },
});
