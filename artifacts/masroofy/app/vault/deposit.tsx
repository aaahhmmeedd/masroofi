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

import { toArabicNumerals } from "@/constants/arabic";
import { useApp } from "@/context/AppContext";

type Mode = "deposit" | "withdraw";

export default function VaultTransactionSheet() {
  const insets = useSafeAreaInsets();
  const { vaultId, mode: modeParam } = useLocalSearchParams<{ vaultId?: string; mode?: string }>();
  const { data, colors: C, fc, storeToVault, addIncome, getMonthBudgetUsed, getMonthIncome } = useApp();

  const [mode, setMode]         = useState<Mode>((modeParam as Mode) || "deposit");
  const [selectedVaultId, setSelectedVaultId] = useState<string>(vaultId || data.vaults[0]?.id || "");
  const [amount, setAmount]     = useState("");
  const [withdrawName, setWithdrawName] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const curr = fc(0).replace("0", "").trim();
  const selectedVault = data.vaults.find(v => v.id === selectedVaultId);

  const activeMonth = data.months
    .filter(m => !m.isEnded)
    .sort((a, b) => new Date(b.year, b.month - 1).getTime() - new Date(a.year, a.month - 1).getTime())[0];

  const monthBudgetUsed   = activeMonth ? getMonthBudgetUsed(activeMonth.id) : 0;
  const monthIncome       = activeMonth ? getMonthIncome(activeMonth.id) : { total: 0, external: 0, vault: 0, liquidity: 0 };
  const monthBudgetRemaining = activeMonth
    ? (activeMonth.budget + monthIncome.total) - monthBudgetUsed
    : 0;

  const handleSave = async () => {
    const amt = parseFloat(amount);
    if (!amount || amt <= 0)  { Alert.alert("خطأ", "يرجى إدخال مبلغ صحيح"); return; }
    if (!selectedVaultId)      { Alert.alert("خطأ", "يرجى اختيار خزنة");     return; }

    if (!activeMonth) {
      Alert.alert("لا يوجد شهر نشط", "يجب إنشاء شهر نشط أولاً من الصفحة الرئيسية قبل التعامل مع الخزنات.");
      return;
    }

    if (mode === "withdraw") {
      const vault = data.vaults.find(v => v.id === selectedVaultId);
      if (vault && amt > vault.balance) {
        Alert.alert("خطأ", "المبلغ أكبر من رصيد الخزنة"); return;
      }
    }

    if (mode === "deposit") {
      if (amt > monthBudgetRemaining) {
        Alert.alert(
          "ميزانية غير كافية",
          `لا يوجد مال كافٍ في الميزانية (المتبقي: ${fc(monthBudgetRemaining)}).\n\nاذهب إلى الشهر الحالي لتحديد طرق أخرى للتخزين.`
        );
        return;
      }
    }

    setIsLoading(true);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

    if (mode === "deposit") {
      await storeToVault(activeMonth.id, selectedVaultId, amt);
    } else {
      const name = withdrawName.trim() || `سحب من ${selectedVault?.name ?? "الخزنة"}`;
      await addIncome(activeMonth.id, amt, name, "vault", selectedVaultId);
    }

    setIsLoading(false);
    router.back();
  };

  const modeColor = mode === "deposit"
    ? (selectedVault?.color ?? C.tint)
    : C.warning ?? "#D4864A";

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : "height"}>
      <ScrollView
        contentContainerStyle={[S.container, { paddingBottom: insets.bottom + 20, backgroundColor: C.backgroundCard }]}
        keyboardShouldPersistTaps="handled"
      >
        {/* Header */}
        <View style={S.titleRow}>
          <Text style={[S.title, { color: C.text }]}>معاملة خزنة</Text>
          <Pressable onPress={() => router.back()} style={[S.closeBtn, { backgroundColor: C.backgroundSecondary }]}>
            <Feather name="x" size={20} color={C.textSecondary} />
          </Pressable>
        </View>

        {/* Mode toggle */}
        <View style={[S.modeToggle, { backgroundColor: C.backgroundSecondary }]}>
          {([
            { id: "deposit",  label: "تخزين",  icon: "download" },
            { id: "withdraw", label: "سحب",    icon: "upload"   },
          ] as { id: Mode; label: string; icon: string }[]).map(m => (
            <Pressable
              key={m.id}
              onPress={() => { Haptics.selectionAsync(); setMode(m.id); setAmount(""); }}
              style={[
                S.modeBtn,
                mode === m.id && { backgroundColor: m.id === "deposit" ? C.tint : (C.warning ?? "#D4864A") },
              ]}
            >
              <Feather name={m.icon as any} size={16} color={mode === m.id ? "#fff" : C.textSecondary} />
              <Text style={[S.modeBtnText, { color: mode === m.id ? "#fff" : C.textSecondary }]}>{m.label}</Text>
            </Pressable>
          ))}
        </View>

        {/* Active month info */}
        {activeMonth ? (
          <View style={[S.infoBar, { backgroundColor: C.backgroundSecondary, borderColor: C.border }]}>
            <Feather name="calendar" size={13} color={C.textMuted} />
            <Text style={[S.infoText, { color: C.textMuted }]}>
              {mode === "deposit"
                ? `متبقي في ميزانية الشهر الحالي: ${fc(monthBudgetRemaining)}`
                : `سيُضاف للشهر الحالي كدخل`}
            </Text>
          </View>
        ) : (
          <View style={[S.infoBar, { backgroundColor: C.danger + "12", borderColor: C.danger + "30" }]}>
            <Feather name="alert-circle" size={13} color={C.danger} />
            <Text style={[S.infoText, { color: C.danger }]}>
              لا يوجد شهر نشط · أنشئ شهراً أولاً
            </Text>
          </View>
        )}

        {/* Withdraw name */}
        {mode === "withdraw" && (
          <>
            <Text style={[S.label, { color: C.textSecondary }]}>اسم السحب</Text>
            <TextInput
              style={[S.input, { backgroundColor: C.backgroundSecondary, color: C.text, borderColor: C.border }]}
              value={withdrawName} onChangeText={setWithdrawName}
              placeholder="مثال: شراء تذاكر سفر"
              placeholderTextColor={C.textMuted} textAlign="right"
            />
          </>
        )}

        {/* Amount */}
        <Text style={[S.label, { color: C.textSecondary }]}>المبلغ</Text>
        <View style={S.amountRow}>
          <TextInput
            style={[S.input, { flex: 1, backgroundColor: C.backgroundSecondary, color: C.text, borderColor: C.border }]}
            value={amount} onChangeText={setAmount}
            keyboardType="decimal-pad" placeholder="٠" placeholderTextColor={C.textMuted} textAlign="right"
            autoFocus={!vaultId}
          />
          <Text style={[S.currency, { color: C.textSecondary }]}>{curr}</Text>
        </View>

        {/* Vault cards */}
        <Text style={[S.label, { color: C.textSecondary }]}>الخزنة</Text>
        {data.vaults.length === 0 ? (
          <View style={[S.emptyVaults, { backgroundColor: C.backgroundSecondary, borderColor: C.border }]}>
            <Feather name="archive" size={24} color={C.textMuted} />
            <Text style={[S.emptyText, { color: C.textMuted }]}>لا توجد خزائن. أضف خزنة أولاً.</Text>
          </View>
        ) : (
          <View style={S.cardsGrid}>
            {data.vaults
              .filter(v => mode === "deposit" ? true : v.balance > 0)
              .map(v => {
              const selected = selectedVaultId === v.id;
              const pct = v.goal > 0 ? Math.min(v.balance / v.goal, 1) : 0;
              return (
                <Pressable
                  key={v.id}
                  onPress={() => { Haptics.selectionAsync(); setSelectedVaultId(v.id); }}
                  style={[
                    S.vaultCard,
                    { backgroundColor: selected ? v.color + "18" : C.backgroundSecondary, borderColor: selected ? v.color : C.border },
                  ]}
                >
                  <View style={[S.vaultDot, { backgroundColor: v.color }]} />
                  <View style={S.vaultInfo}>
                    <Text style={[S.vaultName, { color: selected ? v.color : C.text }]}>{v.name}</Text>
                    <Text style={[S.vaultBal, { color: C.textSecondary }]}>{fc(v.balance)} / {fc(v.goal)}</Text>
                  </View>
                  <Text style={[S.vaultPct, { color: v.color }]}>
                    {toArabicNumerals(Math.round(pct * 100))}٪
                  </Text>
                </Pressable>
              );
            })}
          </View>
        )}

        {/* Save */}
        <Pressable
          onPress={handleSave}
          disabled={isLoading || data.vaults.length === 0 || !activeMonth}
          style={[S.saveBtn, { backgroundColor: modeColor }, (isLoading || data.vaults.length === 0 || !activeMonth) && { opacity: 0.5 }]}
        >
          <Feather name={mode === "deposit" ? "download" : "upload"} size={18} color="#fff" />
          <Text style={S.saveBtnText}>
            {isLoading ? "جاري التنفيذ..." : mode === "deposit" ? "تخزين" : "سحب من الخزنة"}
          </Text>
        </Pressable>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const S = StyleSheet.create({
  container:    { padding: 24, borderTopLeftRadius: 20, borderTopRightRadius: 20, minHeight: "100%" },
  titleRow:     { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 20 },
  title:        { fontFamily: "Cairo_700Bold", fontSize: 20 },
  closeBtn:     { width: 36, height: 36, borderRadius: 18, alignItems: "center", justifyContent: "center" },
  modeToggle:   { flexDirection: "row", borderRadius: 14, padding: 4, gap: 4, marginBottom: 14 },
  modeBtn:      { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, paddingVertical: 12, borderRadius: 11 },
  modeBtnText:  { fontFamily: "Cairo_700Bold", fontSize: 15 },
  infoBar:      { flexDirection: "row", alignItems: "center", gap: 8, padding: 10, borderRadius: 10, borderWidth: 1 },
  infoText:     { fontFamily: "Cairo_400Regular", fontSize: 12, flex: 1 },
  label:        { fontFamily: "Cairo_600SemiBold", fontSize: 14, marginBottom: 10, marginTop: 16 },
  amountRow:    { flexDirection: "row", alignItems: "center", gap: 8 },
  input:        { borderRadius: 12, padding: 14, fontFamily: "Cairo_400Regular", fontSize: 16, borderWidth: 1, marginBottom: 2 },
  currency:     { fontFamily: "Cairo_600SemiBold", fontSize: 15 },
  emptyVaults:  { borderRadius: 12, padding: 20, borderWidth: 1, alignItems: "center", gap: 8 },
  emptyText:    { fontFamily: "Cairo_400Regular", fontSize: 13, textAlign: "center" },
  cardsGrid:    { gap: 10 },
  vaultCard:    { flexDirection: "row", alignItems: "center", gap: 12, padding: 14, borderRadius: 16, borderWidth: 1.5 },
  vaultDot:     { width: 12, height: 12, borderRadius: 6, flexShrink: 0 },
  vaultInfo:    { flex: 1 },
  vaultName:    { fontFamily: "Cairo_700Bold", fontSize: 14 },
  vaultBal:     { fontFamily: "Cairo_400Regular", fontSize: 12, marginTop: 2 },
  vaultPct:     { fontFamily: "Cairo_700Bold", fontSize: 13 },
  saveBtn:      { marginTop: 28, borderRadius: 14, padding: 16, alignItems: "center", flexDirection: "row", justifyContent: "center", gap: 8 },
  saveBtnText:  { fontFamily: "Cairo_700Bold", fontSize: 16, color: "#fff" },
});
