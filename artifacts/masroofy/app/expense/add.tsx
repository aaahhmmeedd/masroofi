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

export default function AddExpenseSheet() {
  const insets = useSafeAreaInsets();
  const { monthId } = useLocalSearchParams<{ monthId: string }>();
  const {
    addExpense, lendMoneyInMonth, repayMyDebtInMonth,
    data, colors: C, fc, getMonthBudgetUsed, getMonthIncome,
  } = useApp();

  const categories = data.categories?.length ? data.categories : ["أخرى"];
  const month = data.months.find((m) => m.id === monthId);

  const [name, setName]           = useState("");
  const [amount, setAmount]       = useState("");
  const [source, setSource]       = useState("budget");
  const [category, setCategory]   = useState(categories[0]);
  const [debtPerson, setDebtPerson]         = useState("");
  const [selectedDebtId, setSelectedDebtId] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const saveBtnScale = useRef(new Animated.Value(1)).current;

  const animateSaveBtn = () => {
    Animated.sequence([
      Animated.spring(saveBtnScale, { toValue: 0.94, useNativeDriver: true, speed: 50 }),
      Animated.spring(saveBtnScale, { toValue: 1,    useNativeDriver: true, speed: 30 }),
    ]).start();
  };

  const curr = fc(0).replace("0", "").trim();
  const isDebt = source === "debt_repaid_mine" || source === "debt_lent";
  const iOweDebts = (data.debts || []).filter((d) => d.type === "i_owe" && !d.isPaid);

  const budgetSpent   = monthId ? getMonthBudgetUsed(monthId) : 0;
  const income        = monthId ? getMonthIncome(monthId) : { total: 0, external: 0, vault: 0, liquidity: 0 };
  const totalAvailable = (month?.budget ?? 0) + income.total;
  const budgetRemaining = totalAvailable - budgetSpent;

  const getSourceBalance = (id: string) => {
    if (id === "budget") return { label: "متبقي من الميزانية", value: budgetRemaining, isCritical: budgetRemaining < (parseFloat(amount) || 0) };
    if (id === "savings") return { label: "رصيد السيولة", value: data.savings, isCritical: data.savings < (parseFloat(amount) || 0) };
    const vault = data.vaults.find((v) => v.id === id);
    if (vault) return { label: `رصيد ${vault.name}`, value: vault.balance, isCritical: vault.balance < (parseFloat(amount) || 0) };
    return null;
  };

  const currentBalance = getSourceBalance(source);

  const regularSources = [
    { id: "budget",  label: "الميزانية", icon: "credit-card", hint: `متبقي ${fc(budgetRemaining)}`, accent: C.navy },
    { id: "savings", label: "السيولة",   icon: "pocket",      hint: `رصيد ${fc(data.savings)}`,    accent: C.navy },
    ...data.vaults.map((v) => ({ id: v.id, label: v.name, icon: "archive", hint: fc(v.balance), accent: v.color })),
  ];
  const debtSources = [
    { id: "debt_repaid_mine", label: "سددت دين",  icon: "user-check", hint: "دفعت دينًا كان عليك", accent: C.tint },
    { id: "debt_lent",        label: "أعطيت دين", icon: "user-minus", hint: "أقرضت شخصًا مالاً",   accent: C.warning },
  ];

  const activeAccent = isDebt
    ? (source === "debt_repaid_mine" ? C.tint : C.warning)
    : (regularSources.find((s) => s.id === source)?.accent ?? C.navy);

  const handleSave = async () => {
    const amt = parseFloat(amount);
    if (!amount || amt <= 0) { Alert.alert("خطأ", "يرجى إدخال مبلغ صحيح"); return; }
    if (!monthId)             { Alert.alert("خطأ", "لم يتم تحديد الشهر"); return; }
    if (!isDebt && !name.trim()) { Alert.alert("خطأ", "يرجى إدخال اسم المصروف"); return; }
    if (source === "debt_lent"        && !debtPerson.trim()) { Alert.alert("خطأ", "يرجى إدخال اسم من أعطيته الدين"); return; }
    if (source === "debt_repaid_mine" && !selectedDebtId && !debtPerson.trim()) { Alert.alert("خطأ", "اختر الدين أو أدخل اسم الدائن"); return; }

    if (source === "savings" && amt > data.savings) {
      const proceed = await new Promise<boolean>((resolve) => {
        Alert.alert("تحذير", `المبلغ (${fc(amt)}) أكبر من السيولة المتاحة (${fc(data.savings)})`, [
          { text: "إلغاء", onPress: () => resolve(false), style: "cancel" },
          { text: "متابعة", onPress: () => resolve(true) },
        ]);
      });
      if (!proceed) return;
    }

    animateSaveBtn();
    setIsLoading(true);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

    if (source === "debt_lent") {
      await lendMoneyInMonth(monthId, amt, debtPerson.trim(), category);
    } else if (source === "debt_repaid_mine") {
      await repayMyDebtInMonth(monthId, amt, selectedDebtId || undefined, debtPerson.trim() || undefined);
    } else {
      const isVault = source !== "budget" && source !== "savings";
      await addExpense(monthId, name.trim(), amt, isVault ? "vault" : source, category, isVault ? source : undefined);
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
          <Text style={[S.title, { color: C.text }]}>إضافة مصروف</Text>
          <Pressable onPress={() => router.back()} style={[S.closeBtn, { backgroundColor: C.backgroundSecondary }]}>
            <Feather name="x" size={20} color={C.textSecondary} />
          </Pressable>
        </View>

        {!isDebt && (
          <>
            <Text style={[S.label, { color: C.textSecondary }]}>اسم المصروف</Text>
            <TextInput
              style={[S.input, { backgroundColor: C.backgroundSecondary, color: C.text, borderColor: C.border }]}
              value={name} onChangeText={setName}
              placeholder="مثال: فاتورة الكهرباء"
              placeholderTextColor={C.textMuted} textAlign="right"
              autoFocus={!isDebt}
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

        {!isDebt && currentBalance && (
          <View style={[S.balanceBar, {
            backgroundColor: currentBalance.isCritical ? C.danger + "12" : C.success + "12",
            borderColor: currentBalance.isCritical ? C.danger + "35" : C.success + "35",
          }]}>
            <Feather name={currentBalance.isCritical ? "alert-circle" : "check-circle"} size={12}
              color={currentBalance.isCritical ? C.danger : C.successDark} />
            <Text style={[S.balanceBarText, { color: currentBalance.isCritical ? C.danger : C.successDark }]}>
              {currentBalance.label}: {fc(currentBalance.value)}
            </Text>
          </View>
        )}

        <Text style={[S.label, { color: C.textSecondary }]}>مصدر المصروف</Text>
        <View style={S.cardsGrid}>
          {regularSources.map((s) => {
            const active = source === s.id;
            return (
              <Pressable key={s.id}
                onPress={() => { Haptics.selectionAsync(); setSource(s.id); }}
                style={[S.sourceCard, { backgroundColor: active ? s.accent + "15" : C.backgroundSecondary, borderColor: active ? s.accent : C.border }]}
              >
                <Feather name={s.icon as any} size={20} color={active ? s.accent : C.textMuted} />
                <Text style={[S.cardLabel, { color: active ? s.accent : C.text }]}>{s.label}</Text>
                <Text style={[S.cardHint, { color: active ? s.accent + "CC" : C.textMuted }]}>{s.hint}</Text>
              </Pressable>
            );
          })}
        </View>

        <Text style={[S.sectionDivider, { color: C.textMuted }]}>أو معاملة دين</Text>
        <View style={S.cardsGrid}>
          {debtSources.map((s) => {
            const active = source === s.id;
            return (
              <Pressable key={s.id}
                onPress={() => { Haptics.selectionAsync(); setSource(s.id); setDebtPerson(""); setSelectedDebtId(""); }}
                style={[S.sourceCard, { backgroundColor: active ? s.accent + "15" : C.backgroundSecondary, borderColor: active ? s.accent : C.border }]}
              >
                <Feather name={s.icon as any} size={20} color={active ? s.accent : C.textMuted} />
                <Text style={[S.cardLabel, { color: active ? s.accent : C.text }]}>{s.label}</Text>
                <Text style={[S.cardHint, { color: C.textMuted }]}>{s.hint}</Text>
              </Pressable>
            );
          })}
        </View>

        {source === "debt_repaid_mine" && (
          <>
            <Text style={[S.label, { color: C.textSecondary }]}>لمن سددت الدين؟</Text>
            {iOweDebts.length > 0 && (
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={S.chipsRow}>
                {iOweDebts.map((d) => (
                  <Pressable key={d.id}
                    onPress={() => { Haptics.selectionAsync(); setSelectedDebtId(d.id); setDebtPerson(d.name); }}
                    style={[S.personChip, { backgroundColor: selectedDebtId === d.id ? C.tint : C.backgroundSecondary, borderColor: selectedDebtId === d.id ? C.tint : C.border }]}
                  >
                    <Text style={[S.personChipName, { color: selectedDebtId === d.id ? "#fff" : C.text }]}>{d.name}</Text>
                    <Text style={[S.personChipSub, { color: selectedDebtId === d.id ? "rgba(255,255,255,0.8)" : C.textSecondary }]}>{fc(d.remaining)}</Text>
                  </Pressable>
                ))}
              </ScrollView>
            )}
            <TextInput
              style={[S.input, { backgroundColor: C.backgroundSecondary, color: C.text, borderColor: C.border, marginTop: iOweDebts.length > 0 ? 8 : 0 }]}
              value={debtPerson}
              onChangeText={(t) => { setDebtPerson(t); setSelectedDebtId(""); }}
              placeholder={iOweDebts.length > 0 ? "أو اسم جديد..." : "اسم الدائن"}
              placeholderTextColor={C.textMuted} textAlign="right"
            />
          </>
        )}

        {source === "debt_lent" && (
          <>
            <Text style={[S.label, { color: C.textSecondary }]}>لمن أعطيت الدين؟</Text>
            <TextInput
              style={[S.input, { backgroundColor: C.backgroundSecondary, color: C.text, borderColor: C.border }]}
              value={debtPerson} onChangeText={setDebtPerson}
              placeholder="اسم الشخص" placeholderTextColor={C.textMuted} textAlign="right"
            />
          </>
        )}

        {!isDebt && (
          <>
            <Text style={[S.label, { color: C.textSecondary }]}>الفئة</Text>
            <View style={S.categoriesWrap}>
              {categories.map((cat) => (
                <Pressable key={cat}
                  onPress={() => { Haptics.selectionAsync(); setCategory(cat); }}
                  style={[S.catChip, { backgroundColor: category === cat ? C.tint : C.backgroundSecondary, borderColor: category === cat ? C.tint : C.border }]}
                >
                  <Text style={[S.catChipText, { color: category === cat ? "#fff" : C.textSecondary }]}>{cat}</Text>
                </Pressable>
              ))}
            </View>
          </>
        )}

        <Animated.View style={{ transform: [{ scale: saveBtnScale }] }}>
          <Pressable onPress={handleSave} disabled={isLoading}
            style={[S.saveBtn, { backgroundColor: activeAccent }, isLoading && { opacity: 0.6 }]}
          >
            <Feather name="check-circle" size={18} color="#fff" />
            <Text style={S.saveBtnText}>{isLoading ? "جاري الحفظ..." : "إضافة المصروف"}</Text>
          </Pressable>
        </Animated.View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const S = StyleSheet.create({
  container:      { padding: 24, borderTopLeftRadius: 20, borderTopRightRadius: 20, minHeight: "100%" },
  titleRow:       { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 20 },
  title:          { fontFamily: "Cairo_700Bold", fontSize: 20 },
  closeBtn:       { width: 36, height: 36, borderRadius: 18, alignItems: "center", justifyContent: "center" },
  label:          { fontFamily: "Cairo_600SemiBold", fontSize: 14, marginBottom: 10, marginTop: 16 },
  sectionDivider: { fontFamily: "Cairo_400Regular", fontSize: 12, marginTop: 14, marginBottom: 8 },
  amountRow:      { flexDirection: "row", alignItems: "center", gap: 8 },
  input:          { borderRadius: 12, padding: 14, fontFamily: "Cairo_400Regular", fontSize: 16, borderWidth: 1, marginBottom: 2 },
  currency:       { fontFamily: "Cairo_600SemiBold", fontSize: 15 },
  balanceBar:     { flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 10, paddingVertical: 7, borderRadius: 8, borderWidth: 1, marginTop: 6 },
  balanceBarText: { fontFamily: "Cairo_600SemiBold", fontSize: 12 },
  cardsGrid:      { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  sourceCard:     { width: "47.5%", alignItems: "center", padding: 14, borderRadius: 16, borderWidth: 1.5, gap: 6 },
  cardLabel:      { fontFamily: "Cairo_700Bold", fontSize: 13, textAlign: "center" },
  cardHint:       { fontFamily: "Cairo_400Regular", fontSize: 10, textAlign: "center" },
  chipsRow:       { flexDirection: "row", gap: 8, paddingBottom: 4 },
  personChip:     { alignItems: "center", paddingHorizontal: 14, paddingVertical: 10, borderRadius: 12, borderWidth: 1 },
  personChipName: { fontFamily: "Cairo_600SemiBold", fontSize: 13 },
  personChipSub:  { fontFamily: "Cairo_400Regular", fontSize: 11 },
  categoriesWrap: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  catChip:        { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16, borderWidth: 1 },
  catChipText:    { fontFamily: "Cairo_600SemiBold", fontSize: 12 },
  saveBtn:        { marginTop: 28, borderRadius: 14, padding: 16, alignItems: "center", flexDirection: "row", justifyContent: "center", gap: 8 },
  saveBtnText:    { fontFamily: "Cairo_700Bold", fontSize: 16, color: "#fff" },
});
