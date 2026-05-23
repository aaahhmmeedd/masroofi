import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { router, useLocalSearchParams } from "expo-router";
import React, { useRef, useState } from "react";
import {
  Alert,
  Animated,
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

type SourceId = "external" | "liquidity" | "vault_withdraw" | "debt_repaid_to_me" | "debt_borrowed";

export default function AddIncomeSheet() {
  const insets = useSafeAreaInsets();
  const { monthId } = useLocalSearchParams<{ monthId: string }>();
  const {
    addIncome, borrowMoneyInMonth, receiveDebtInMonth,
    data, colors: C, fc,
  } = useApp();

  const [source, setSource]               = useState<SourceId>("external");
  const [name, setName]                   = useState("");
  const [amount, setAmount]               = useState("");
  const [debtPerson, setDebtPerson]       = useState("");
  const [selectedDebtId, setSelectedDebtId] = useState("");
  const [selectedVaultId, setSelectedVaultId] = useState(data.vaults[0]?.id || "");
  const [isLoading, setIsLoading]         = useState(false);
  const saveBtnScale = useRef(new Animated.Value(1)).current;

  const animateSaveBtn = () => {
    Animated.sequence([
      Animated.spring(saveBtnScale, { toValue: 0.94, useNativeDriver: true, speed: 50 }),
      Animated.spring(saveBtnScale, { toValue: 1,    useNativeDriver: true, speed: 30 }),
    ]).start();
  };

  const curr = fc(0).replace("0", "").trim();
  const owedToMeDebts = (data.debts || []).filter((d) => d.type === "owed_to_me" && !d.isPaid);
  const vaultsWithBalance = data.vaults.filter((v) => v.balance > 0);
  const isDebt = source === "debt_repaid_to_me" || source === "debt_borrowed";

  const SOURCES = [
    { id: "external" as SourceId,         label: "دخل خارجي",     icon: "trending-up",  hint: "مكافأة، راتب، هدية...",   accent: C.successDark },
    { id: "liquidity" as SourceId,        label: "من السيولة",    icon: "pocket",       hint: `رصيد ${fc(data.savings)}`, accent: C.successDark },
    { id: "vault_withdraw" as SourceId,   label: "سحب من خزنة",  icon: "archive",      hint: `${vaultsWithBalance.length} خزنة متاحة`, accent: C.tint },
    { id: "debt_repaid_to_me" as SourceId, label: "رجع دين لي",  icon: "user-check",   hint: "أحد ردّ لك ما أخذه",     accent: C.tint },
    { id: "debt_borrowed" as SourceId,    label: "أخذت دين",     icon: "user-plus",    hint: "اقترضت من شخص آخر",       accent: C.warning },
  ];

  const activeSrc = SOURCES.find((s) => s.id === source)!;
  const enteredAmt = parseFloat(amount) || 0;
  const liquidityAfter = source === "liquidity" ? data.savings - enteredAmt : null;

  const handleSave = async () => {
    const amt = parseFloat(amount);
    if (!amount || amt <= 0) { Alert.alert("خطأ", "يرجى إدخال مبلغ صحيح"); return; }
    if (!monthId) return;

    if (source === "debt_borrowed" && !debtPerson.trim()) {
      Alert.alert("خطأ", "يرجى إدخال اسم من أخذت منه الدين"); return;
    }
    if (source === "liquidity" && amt > data.savings) {
      const proceed = await new Promise<boolean>((resolve) => {
        Alert.alert("تحذير", `المبلغ (${fc(amt)}) أكبر من السيولة المتاحة (${fc(data.savings)})`, [
          { text: "إلغاء", onPress: () => resolve(false), style: "cancel" },
          { text: "متابعة", onPress: () => resolve(true) },
        ]);
      });
      if (!proceed) return;
    }
    if (source === "vault_withdraw") {
      const vault = data.vaults.find((v) => v.id === selectedVaultId);
      if (!vault) { Alert.alert("خطأ", "يرجى اختيار خزنة"); return; }
      if (amt > vault.balance) {
        Alert.alert("خطأ", `المبلغ (${fc(amt)}) أكبر من رصيد الخزنة (${fc(vault.balance)})`); return;
      }
    }

    animateSaveBtn();
    setIsLoading(true);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

    if (source === "debt_borrowed") {
      await borrowMoneyInMonth(monthId, amt, debtPerson.trim());
    } else if (source === "debt_repaid_to_me") {
      await receiveDebtInMonth(monthId, amt, selectedDebtId || undefined, debtPerson.trim() || undefined);
    } else if (source === "vault_withdraw") {
      await addIncome(monthId, amt, `سحب من ${data.vaults.find((v) => v.id === selectedVaultId)?.name ?? "خزنة"}`, "vault", selectedVaultId);
    } else {
      const finalName = name.trim() || "دخل";
      await addIncome(monthId, amt, finalName, source === "liquidity" ? "liquidity" : "external");
    }

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
          <Text style={[S.title, { color: C.text }]}>إضافة دخل</Text>
          <Pressable onPress={() => router.back()} style={[S.closeBtn, { backgroundColor: C.backgroundSecondary }]}>
            <Feather name="x" size={20} color={C.textSecondary} />
          </Pressable>
        </View>

        {!isDebt && source !== "vault_withdraw" && source !== "liquidity" && (
          <>
            <Text style={[S.label, { color: C.textSecondary }]}>اسم الدخل</Text>
            <TextInput
              style={[S.input, { backgroundColor: C.backgroundSecondary, color: C.text, borderColor: C.border }]}
              value={name} onChangeText={setName}
              placeholder="مثال: مكافأة نهاية الشهر"
              placeholderTextColor={C.textMuted} textAlign="right" autoFocus
            />
          </>
        )}

        <Text style={[S.label, { color: C.textSecondary }]}>المبلغ</Text>
        <View style={S.amountRow}>
          <TextInput
            style={[S.input, { flex: 1, backgroundColor: C.backgroundSecondary, color: C.text, borderColor: C.border }]}
            value={amount} onChangeText={setAmount}
            keyboardType="decimal-pad" placeholder="٠" placeholderTextColor={C.textMuted} textAlign="right"
          />
          <Text style={[S.currency, { color: C.textSecondary }]}>{curr}</Text>
        </View>

        {source === "liquidity" && enteredAmt > 0 && (
          <View style={[S.balanceBar, {
            backgroundColor: (liquidityAfter ?? 0) >= 0 ? C.success + "12" : C.danger + "12",
            borderColor: (liquidityAfter ?? 0) >= 0 ? C.success + "35" : C.danger + "35",
          }]}>
            <Feather name={(liquidityAfter ?? 0) >= 0 ? "check-circle" : "alert-circle"} size={12}
              color={(liquidityAfter ?? 0) >= 0 ? C.successDark : C.danger} />
            <Text style={[S.balanceBarText, { color: (liquidityAfter ?? 0) >= 0 ? C.successDark : C.danger }]}>
              السيولة بعد السحب: {fc(liquidityAfter ?? 0)}
            </Text>
          </View>
        )}

        <Text style={[S.label, { color: C.textSecondary }]}>مصدر الدخل</Text>
        <View style={S.cardsGrid}>
          {SOURCES.map((s) => {
            const active = source === s.id;
            return (
              <Pressable key={s.id}
                onPress={() => { Haptics.selectionAsync(); setSource(s.id); setDebtPerson(""); setSelectedDebtId(""); }}
                style={[S.sourceCard, { backgroundColor: active ? s.accent + "15" : C.backgroundSecondary, borderColor: active ? s.accent : C.border }]}
              >
                <Feather name={s.icon as any} size={20} color={active ? s.accent : C.textMuted} />
                <Text style={[S.cardLabel, { color: active ? s.accent : C.text }]}>{s.label}</Text>
                <Text style={[S.cardHint, { color: active ? s.accent + "CC" : C.textMuted }]}>{s.hint}</Text>
              </Pressable>
            );
          })}
        </View>

        {source === "vault_withdraw" && (
          <>
            <Text style={[S.label, { color: C.textSecondary }]}>اختر الخزنة</Text>
            {vaultsWithBalance.length === 0 ? (
              <View style={[S.emptyBox, { backgroundColor: C.backgroundSecondary, borderColor: C.border }]}>
                <Text style={[S.emptyText, { color: C.textMuted }]}>لا توجد خزائن تحتوي على أموال</Text>
              </View>
            ) : (
              <View style={S.vaultsGrid}>
                {vaultsWithBalance.map((v) => {
                  const sel = selectedVaultId === v.id;
                  return (
                    <Pressable key={v.id}
                      onPress={() => { Haptics.selectionAsync(); setSelectedVaultId(v.id); }}
                      style={[S.vaultChip, { backgroundColor: sel ? v.color + "18" : C.backgroundSecondary, borderColor: sel ? v.color : C.border }]}
                    >
                      <View style={[S.vaultDot, { backgroundColor: v.color }]} />
                      <View style={{ flex: 1 }}>
                        <Text style={[S.vaultName, { color: sel ? v.color : C.text }]}>{v.name}</Text>
                        <Text style={[S.vaultBal, { color: C.textSecondary }]}>{fc(v.balance)}</Text>
                      </View>
                      {sel && <Feather name="check-circle" size={16} color={v.color} />}
                    </Pressable>
                  );
                })}
              </View>
            )}
          </>
        )}

        {source === "debt_repaid_to_me" && (
          <>
            <Text style={[S.label, { color: C.textSecondary }]}>من أرجع لك الدين؟</Text>
            {owedToMeDebts.length > 0 && (
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={S.chipsRow}>
                {owedToMeDebts.map((d) => (
                  <Pressable key={d.id}
                    onPress={() => { Haptics.selectionAsync(); setSelectedDebtId(d.id); setDebtPerson(d.name); }}
                    style={[S.personChip, { backgroundColor: selectedDebtId === d.id ? C.tint : C.backgroundSecondary, borderColor: selectedDebtId === d.id ? C.tint : C.border }]}
                  >
                    <Text style={[S.personChipName, { color: selectedDebtId === d.id ? "#fff" : C.text }]}>{d.name}</Text>
                    <Text style={[S.personChipSub, { color: selectedDebtId === d.id ? "rgba(255,255,255,0.8)" : C.textSecondary }]}>متبقي: {fc(d.remaining)}</Text>
                  </Pressable>
                ))}
              </ScrollView>
            )}
            <TextInput
              style={[S.input, { backgroundColor: C.backgroundSecondary, color: C.text, borderColor: C.border, marginTop: owedToMeDebts.length > 0 ? 8 : 0 }]}
              value={debtPerson}
              onChangeText={(t) => { setDebtPerson(t); setSelectedDebtId(""); }}
              placeholder={owedToMeDebts.length > 0 ? "أو اسم جديد..." : "اسم الشخص"}
              placeholderTextColor={C.textMuted} textAlign="right"
            />
          </>
        )}

        {source === "debt_borrowed" && (
          <>
            <Text style={[S.label, { color: C.textSecondary }]}>من أخذت منه الدين؟</Text>
            <TextInput
              style={[S.input, { backgroundColor: C.backgroundSecondary, color: C.text, borderColor: C.border }]}
              value={debtPerson} onChangeText={setDebtPerson}
              placeholder="اسم الشخص" placeholderTextColor={C.textMuted} textAlign="right"
            />
          </>
        )}

        <Animated.View style={{ transform: [{ scale: saveBtnScale }] }}>
          <Pressable onPress={handleSave} disabled={isLoading}
            style={[S.saveBtn, { backgroundColor: activeSrc.accent }, isLoading && { opacity: 0.6 }]}
          >
            <Feather name="check-circle" size={18} color="#fff" />
            <Text style={S.saveBtnText}>{isLoading ? "جاري الإضافة..." : "إضافة الدخل"}</Text>
          </Pressable>
        </Animated.View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const S = StyleSheet.create({
  container:    { padding: 24, borderTopLeftRadius: 20, borderTopRightRadius: 20, minHeight: "100%" },
  titleRow:     { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 20 },
  title:        { fontFamily: "Cairo_700Bold", fontSize: 20 },
  closeBtn:     { width: 36, height: 36, borderRadius: 18, alignItems: "center", justifyContent: "center" },
  label:        { fontFamily: "Cairo_600SemiBold", fontSize: 14, marginBottom: 10, marginTop: 16 },
  amountRow:    { flexDirection: "row", alignItems: "center", gap: 8 },
  input:        { borderRadius: 12, padding: 14, fontFamily: "Cairo_400Regular", fontSize: 16, borderWidth: 1, marginBottom: 2 },
  currency:     { fontFamily: "Cairo_600SemiBold", fontSize: 15 },
  balanceBar:   { flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 10, paddingVertical: 7, borderRadius: 8, borderWidth: 1, marginTop: 6 },
  balanceBarText: { fontFamily: "Cairo_600SemiBold", fontSize: 12 },
  cardsGrid:    { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  sourceCard:   { width: "47.5%", alignItems: "center", padding: 14, borderRadius: 16, borderWidth: 1.5, gap: 6 },
  cardLabel:    { fontFamily: "Cairo_700Bold", fontSize: 13, textAlign: "center" },
  cardHint:     { fontFamily: "Cairo_400Regular", fontSize: 10, textAlign: "center" },
  emptyBox:     { borderRadius: 12, padding: 16, borderWidth: 1, alignItems: "center" },
  emptyText:    { fontFamily: "Cairo_400Regular", fontSize: 13 },
  vaultsGrid:   { gap: 8 },
  vaultChip:    { flexDirection: "row", alignItems: "center", gap: 10, padding: 12, borderRadius: 12, borderWidth: 1.5 },
  vaultDot:     { width: 10, height: 10, borderRadius: 5 },
  vaultName:    { fontFamily: "Cairo_700Bold", fontSize: 13 },
  vaultBal:     { fontFamily: "Cairo_400Regular", fontSize: 11 },
  chipsRow:     { flexDirection: "row", gap: 8, paddingBottom: 4 },
  personChip:   { alignItems: "center", paddingHorizontal: 14, paddingVertical: 10, borderRadius: 12, borderWidth: 1 },
  personChipName: { fontFamily: "Cairo_600SemiBold", fontSize: 13 },
  personChipSub:  { fontFamily: "Cairo_400Regular", fontSize: 11 },
  saveBtn:      { marginTop: 28, borderRadius: 14, padding: 16, alignItems: "center", flexDirection: "row", justifyContent: "center", gap: 8 },
  saveBtnText:  { fontFamily: "Cairo_700Bold", fontSize: 16, color: "#fff" },
});
