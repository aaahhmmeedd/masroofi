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

export default function StoreToVaultSheet() {
  const insets = useSafeAreaInsets();
  const { monthId } = useLocalSearchParams<{ monthId: string }>();
  const { storeToVault, data, colors: C, fc } = useApp();

  const [selectedVaultId, setSelectedVaultId] = useState<string>(data.vaults[0]?.id || "");
  const [amount, setAmount] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const curr = fc(0).replace("0", "").trim();

  const handleSave = async () => {
    if (!selectedVaultId) { Alert.alert("خطأ", "يرجى اختيار خزنة"); return; }
    const amt = parseFloat(amount);
    if (!amount || amt <= 0) { Alert.alert("خطأ", "يرجى إدخال مبلغ صحيح"); return; }
    if (!monthId) return;
    setIsLoading(true);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    await storeToVault(monthId, selectedVaultId, amt);
    setIsLoading(false);
    router.back();
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : "height"}>
      <ScrollView
        contentContainerStyle={[S.container, { paddingBottom: insets.bottom + 20, backgroundColor: C.backgroundCard }]}
        keyboardShouldPersistTaps="handled"
      >
        <View style={S.titleRow}>
          <Text style={[S.title, { color: C.text }]}>تخزين في خزنة</Text>
          <Pressable onPress={() => router.back()} style={[S.closeBtn, { backgroundColor: C.backgroundSecondary }]}>
            <Feather name="x" size={20} color={C.textSecondary} />
          </Pressable>
        </View>

        <Text style={[S.label, { color: C.textSecondary }]}>المبلغ</Text>
        <View style={S.amountRow}>
          <TextInput
            style={[S.input, { flex: 1, backgroundColor: C.backgroundSecondary, color: C.text, borderColor: C.border }]}
            value={amount} onChangeText={setAmount}
            keyboardType="decimal-pad" placeholder="٠"
            placeholderTextColor={C.textMuted} textAlign="right"
            autoFocus
          />
          <Text style={[S.currency, { color: C.textSecondary }]}>{curr}</Text>
        </View>

        <Text style={[S.label, { color: C.textSecondary }]}>اختر الخزنة</Text>
        {data.vaults.length === 0 ? (
          <View style={[S.emptyVaults, { backgroundColor: C.backgroundSecondary, borderColor: C.border }]}>
            <Feather name="archive" size={28} color={C.textMuted} />
            <Text style={[S.emptyText, { color: C.textMuted }]}>لا توجد خزائن. أضف خزنة من صفحة الخزائن أولاً.</Text>
          </View>
        ) : (
          <View style={S.cardsGrid}>
            {data.vaults.map((v) => {
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
                  <View style={S.vaultCardTop}>
                    <View style={[S.vaultDot, { backgroundColor: v.color }]} />
                    <View style={S.vaultInfo}>
                      <Text style={[S.vaultName, { color: selected ? v.color : C.text }]}>{v.name}</Text>
                      <Text style={[S.vaultBal, { color: C.textSecondary }]}>
                        {fc(v.balance)} / {fc(v.goal)}
                      </Text>
                    </View>
                    <Text style={[S.vaultPct, { color: v.color }]}>
                      {toArabicNumerals(Math.round(pct * 100))}٪
                    </Text>
                  </View>
                  <View style={[S.vaultProgress, { backgroundColor: C.backgroundCard }]}>
                    <View style={[S.vaultProgressFill, { width: `${pct * 100}%` as any, backgroundColor: v.color }]} />
                  </View>
                </Pressable>
              );
            })}
          </View>
        )}

        <Pressable
          onPress={handleSave}
          disabled={isLoading || data.vaults.length === 0}
          style={[
            S.saveBtn,
            { backgroundColor: data.vaults.find(v => v.id === selectedVaultId)?.color ?? C.tint },
            (isLoading || data.vaults.length === 0) && { opacity: 0.5 },
          ]}
        >
          <Feather name="archive" size={18} color="#fff" />
          <Text style={S.saveBtnText}>
            {isLoading ? "جاري التحويل..." : "تخزين في الخزنة"}
          </Text>
        </Pressable>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const S = StyleSheet.create({
  container:    { padding: 24, borderTopLeftRadius: 20, borderTopRightRadius: 20, minHeight: "100%" },
  titleRow:     { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 24 },
  title:        { fontFamily: "Cairo_700Bold", fontSize: 20 },
  closeBtn:     { width: 36, height: 36, borderRadius: 18, alignItems: "center", justifyContent: "center" },
  label:        { fontFamily: "Cairo_600SemiBold", fontSize: 14, marginBottom: 10, marginTop: 16 },
  amountRow:    { flexDirection: "row", alignItems: "center", gap: 8 },
  input:        { borderRadius: 12, padding: 14, fontFamily: "Cairo_400Regular", fontSize: 16, borderWidth: 1 },
  currency:     { fontFamily: "Cairo_600SemiBold", fontSize: 15 },
  emptyVaults:  { borderRadius: 12, padding: 20, borderWidth: 1, alignItems: "center", gap: 8 },
  emptyText:    { fontFamily: "Cairo_400Regular", fontSize: 13, textAlign: "center" },
  cardsGrid:    { gap: 10 },
  vaultCard:    { borderRadius: 16, borderWidth: 1.5, overflow: "hidden" },
  vaultCardTop: { flexDirection: "row", alignItems: "center", gap: 12, padding: 14 },
  vaultDot:     { width: 12, height: 12, borderRadius: 6, flexShrink: 0 },
  vaultInfo:    { flex: 1 },
  vaultName:    { fontFamily: "Cairo_700Bold", fontSize: 14 },
  vaultBal:     { fontFamily: "Cairo_400Regular", fontSize: 12, marginTop: 2 },
  vaultPct:     { fontFamily: "Cairo_700Bold", fontSize: 13 },
  vaultProgress:{ height: 4, marginHorizontal: 14, marginBottom: 10, borderRadius: 2, overflow: "hidden" },
  vaultProgressFill: { height: "100%", borderRadius: 2 },
  saveBtn:      { marginTop: 28, borderRadius: 14, padding: 16, alignItems: "center", flexDirection: "row", justifyContent: "center", gap: 8 },
  saveBtnText:  { fontFamily: "Cairo_700Bold", fontSize: 16, color: "#fff" },
});
