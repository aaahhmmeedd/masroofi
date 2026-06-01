import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import React, { useState } from "react";
import {
  Alert,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { toArabicNumerals } from "@/constants/arabic";
import { Debt } from "@/constants/types";
import { useApp } from "@/context/AppContext";

type Tab = "owed_to_me" | "i_owe";

function DebtCard({
  debt,
  C,
  fc,
  onPay,
}: {
  debt: Debt;
  C: any;
  fc: (n: number) => string;
  onPay: (id: string, amount: number) => Promise<void>;
  onDelete?: never;
}) {
  const [paying, setPaying] = useState(false);
  const [payAmount, setPayAmount] = useState("");
  const [loading, setLoading] = useState(false);

  const isOwedToMe = debt.type === "owed_to_me";
  const accentColor = isOwedToMe ? "#1B818F" : "#C0504A";
  const paidPct = debt.amount > 0 ? Math.min(1 - debt.remaining / debt.amount, 1) : 1;

  const handlePay = async () => {
    const amt = parseFloat(payAmount);
    if (isNaN(amt) || amt <= 0) { Alert.alert("خطأ", "يرجى إدخال مبلغ صحيح"); return; }
    if (amt > debt.remaining) { Alert.alert("خطأ", `المبلغ أكبر من المتبقي (${fc(debt.remaining)})`); return; }
    setLoading(true);
    await onPay(debt.id, amt);
    setPaying(false);
    setPayAmount("");
    setLoading(false);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  };

  const createdDate = new Date(debt.createdAt);
  const dateStr = `${createdDate.getDate()}/${createdDate.getMonth() + 1}/${createdDate.getFullYear()}`;

  return (
    <View style={[styles.card, { backgroundColor: C.backgroundCard, borderRightColor: accentColor, opacity: debt.isPaid ? 0.65 : 1 }]}>
      <View style={styles.cardTop}>
        <View style={styles.cardLeft}>
          <View style={[styles.avatar, { backgroundColor: accentColor + "18" }]}>
            <Feather name="user" size={18} color={accentColor} />
          </View>
          <View>
            <Text style={[styles.debtName, { color: C.text }]}>{debt.name}</Text>
            {debt.note
              ? <Text style={[styles.debtNote, { color: C.textMuted }]} numberOfLines={1}>{debt.note}</Text>
              : <Text style={[styles.debtDate, { color: C.textMuted }]}>منذ {dateStr}</Text>
            }
          </View>
        </View>
        <View style={styles.cardRight}>
          <Text style={[styles.debtAmount, { color: accentColor }]}>{fc(debt.remaining)}</Text>
          {debt.remaining !== debt.amount && (
            <Text style={[styles.debtOriginal, { color: C.textMuted }]}>من {fc(debt.amount)}</Text>
          )}
        </View>
      </View>

      <View style={[styles.progressBar, { backgroundColor: C.backgroundSecondary }]}>
        <View style={[styles.progressFill, { width: `${paidPct * 100}%` as any, backgroundColor: accentColor }]} />
      </View>

      {debt.isPaid ? (
        <View style={[styles.paidBadge, { backgroundColor: "#6A9E8E20" }]}>
          <Feather name="check-circle" size={14} color="#6A9E8E" />
          <Text style={[styles.paidText, { color: "#6A9E8E" }]}>مُسدَّد بالكامل</Text>
        </View>
      ) : paying ? (
        <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"}>
          <View style={styles.payRow}>
            <TextInput
              style={[styles.payInput, { backgroundColor: C.backgroundSecondary, color: C.text, borderColor: C.border }]}
              value={payAmount} onChangeText={setPayAmount}
              keyboardType="decimal-pad"
              placeholder={`الحد الأقصى: ${fc(debt.remaining)}`}
              placeholderTextColor={C.textMuted} textAlign="right" autoFocus
            />
            <Pressable onPress={handlePay} disabled={loading}
              style={[styles.payConfirmBtn, { backgroundColor: accentColor, opacity: loading ? 0.6 : 1 }]}
            >
              {loading
                ? <Feather name="loader" size={16} color="#fff" />
                : <Feather name="check" size={16} color="#fff" />}
            </Pressable>
            <Pressable onPress={() => { setPaying(false); setPayAmount(""); }}
              style={[styles.payCancelBtn, { backgroundColor: C.backgroundSecondary }]}
            >
              <Feather name="x" size={16} color={C.textSecondary} />
            </Pressable>
          </View>
          <Text style={[styles.payHint, { color: C.textMuted }]}>
            {isOwedToMe ? "سيُضاف مبلغاً كدخل في الشهر الحالي" : "سيُخصم مبلغاً من ميزانية الشهر الحالي"}
          </Text>
        </KeyboardAvoidingView>
      ) : (
        <Pressable
          onPress={() => { setPaying(true); Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); }}
          style={[styles.payBtn, { borderColor: accentColor, backgroundColor: accentColor + "10" }]}
        >
          <Feather name="dollar-sign" size={14} color={accentColor} />
          <Text style={[styles.payBtnText, { color: accentColor }]}>
            {isOwedToMe ? "تسجيل استلام" : "تسجيل سداد"}
          </Text>
        </Pressable>
      )}
    </View>
  );
}

export default function DebtsScreen() {
  const insets = useSafeAreaInsets();
  const { data, colors: C, fc, payDebtWithMonthTx } = useApp();
  const [tab, setTab] = useState<Tab>("owed_to_me");
  const isWeb = Platform.OS === "web";
  const topInset = isWeb ? 67 : insets.top;
  const bottomInset = isWeb ? 34 : insets.bottom;

  const debts = data.debts || [];
  const owedToMe = debts.filter((d) => d.type === "owed_to_me");
  const iOwe = debts.filter((d) => d.type === "i_owe");
  const totalOwedToMe = owedToMe.reduce((s, d) => s + d.remaining, 0);
  const totalIOwe = iOwe.reduce((s, d) => s + d.remaining, 0);
  const displayList = tab === "owed_to_me" ? owedToMe : iOwe;

  const handlePay = async (debtId: string, amount: number) => {
    const result = await payDebtWithMonthTx(debtId, amount);
    if (!result.success) {
      Alert.alert("تعذّر التسجيل", result.error ?? "حدث خطأ ما");
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: C.background }]}>
      <View style={[styles.header, { paddingTop: topInset + 16, backgroundColor: C.backgroundCard }]}>
        <Text style={[styles.headerTitle, { color: C.text }]}>الديون</Text>
        <View style={styles.headerStats}>
          <View style={styles.headerStat}>
            <Text style={[styles.headerStatLabel, { color: C.textSecondary }]}>إجمالي الديون</Text>
            <Text style={[styles.headerStatValue, { color: C.text }]}>({toArabicNumerals(owedToMe.length + iOwe.length)})</Text>
          </View>
          <View style={[styles.headerStatDivider, { backgroundColor: C.border }]} />
          <View style={styles.headerStat}>
            <Text style={[styles.headerStatLabel, { color: C.textSecondary }]}>الصافي</Text>
            <Text style={[styles.headerStatValue, { color: totalOwedToMe >= totalIOwe ? "#1B818F" : "#C0504A" }]}>
              {fc(Math.abs(totalOwedToMe - totalIOwe))}
            </Text>
          </View>
        </View>
      </View>

      <View style={[styles.tabBar, { backgroundColor: C.backgroundSecondary }]}>
        {([
          { key: "owed_to_me" as Tab, label: `لي (${toArabicNumerals(owedToMe.length)})`, color: "#1B818F" },
          { key: "i_owe" as Tab, label: `عليّ (${toArabicNumerals(iOwe.length)})`, color: "#C0504A" },
        ]).map((t) => (
          <Pressable key={t.key}
            onPress={() => { setTab(t.key); Haptics.selectionAsync(); }}
            style={[styles.tabBtn, tab === t.key && { backgroundColor: t.color }]}
          >
            <Text style={[styles.tabBtnText, { color: tab === t.key ? "#fff" : C.textSecondary }]}>{t.label}</Text>
          </Pressable>
        ))}
      </View>

      <FlatList
        data={displayList}
        keyExtractor={(item) => item.id}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: bottomInset + 40, paddingTop: 8, paddingHorizontal: 16 }}
        ListEmptyComponent={() => (
          <View style={styles.emptyState}>
            <Feather name="users" size={48} color={C.border} />
            <Text style={[styles.emptyTitle, { color: C.textSecondary }]}>
              {tab === "owed_to_me" ? "لا يوجد ديون لك" : "لا يوجد ديون عليك"}
            </Text>
            <Text style={[styles.emptyText, { color: C.textMuted }]}>تُضاف الديون تلقائياً عند التسجيل داخل الشهور</Text>
          </View>
        )}
        renderItem={({ item }) => (
          <DebtCard debt={item} C={C} fc={fc} onPay={handlePay} />
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    paddingHorizontal: 20,
    paddingBottom: 28,
  },
  headerTitle: {
    fontFamily: "Cairo_900Black",
    fontSize: 28,
  },
  headerStats: {
    flexDirection: "row",
    marginTop: 12,
    paddingTop: 12,
  },
  headerStat: { flex: 1, alignItems: "center" },
  headerStatDivider: {
    width: 1,
    height: 40,
  },
  headerStatLabel: {
    fontFamily: "Cairo_400Regular",
    fontSize: 12,
    marginBottom: 4,
  },
  headerStatValue: {
    fontFamily: "Cairo_700Bold",
    fontSize: 16,
  },
  tabBar: { flexDirection: "row", margin: 16, marginBottom: 0, borderRadius: 12, padding: 4, gap: 4 },
  tabBtn: { flex: 1, paddingVertical: 9, borderRadius: 9, alignItems: "center" },
  tabBtnText: { fontFamily: "Cairo_700Bold", fontSize: 13 },
  card: { borderRadius: 16, padding: 14, marginBottom: 10, borderRightWidth: 3 },
  cardTop: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 10 },
  cardLeft: { flexDirection: "row", alignItems: "center", gap: 10, flex: 1 },
  avatar: { width: 38, height: 38, borderRadius: 19, alignItems: "center", justifyContent: "center" },
  debtName: { fontFamily: "Cairo_700Bold", fontSize: 14 },
  debtNote: { fontFamily: "Cairo_400Regular", fontSize: 11, maxWidth: 140 },
  debtDate: { fontFamily: "Cairo_400Regular", fontSize: 11 },
  cardRight: { alignItems: "flex-end" },
  debtAmount: { fontFamily: "Cairo_900Black", fontSize: 15 },
  debtOriginal: { fontFamily: "Cairo_400Regular", fontSize: 11 },
  progressBar: { height: 4, borderRadius: 2, overflow: "hidden", marginBottom: 10 },
  progressFill: { height: "100%", borderRadius: 2 },
  paidBadge: { flexDirection: "row", alignItems: "center", gap: 6, borderRadius: 8, paddingVertical: 6, paddingHorizontal: 10, alignSelf: "flex-start" },
  paidText: { fontFamily: "Cairo_600SemiBold", fontSize: 12 },
  payRow: { flexDirection: "row", gap: 8, alignItems: "center" },
  payInput: { flex: 1, borderRadius: 10, padding: 10, fontFamily: "Cairo_400Regular", fontSize: 14, borderWidth: 1 },
  payConfirmBtn: { width: 36, height: 36, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  payCancelBtn: { width: 36, height: 36, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  payHint: { fontFamily: "Cairo_400Regular", fontSize: 11, textAlign: "center", marginTop: 6 },
  payBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, borderWidth: 1, borderRadius: 10, paddingVertical: 9 },
  payBtnText: { fontFamily: "Cairo_600SemiBold", fontSize: 13 },
  emptyState: { alignItems: "center", justifyContent: "center", paddingVertical: 64, gap: 12 },
  emptyTitle: { fontFamily: "Cairo_700Bold", fontSize: 18 },
  emptyText: { fontFamily: "Cairo_400Regular", fontSize: 14 },
});
