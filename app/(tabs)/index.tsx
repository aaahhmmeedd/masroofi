import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { router } from "expo-router";
import React, { useRef, useState } from "react";
import {
  Animated,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import {
  ARABIC_MONTHS,
  getRandomVerse,
  toArabicNumerals,
} from "@/constants/arabic";
import { Month } from "@/constants/types";
import { useApp } from "@/context/AppContext";

function QuranCard() {
  const { colors: C } = useApp();
  const [verse, setVerse] = useState(getRandomVerse());
  const fadeAnim = useRef(new Animated.Value(1)).current;

  const changeVerse = () => {
    Animated.timing(fadeAnim, { toValue: 0, duration: 300, useNativeDriver: true }).start(() => {
      setVerse(getRandomVerse());
      Animated.timing(fadeAnim, { toValue: 1, duration: 300, useNativeDriver: true }).start();
    });
  };

  return (
    <Pressable
      onPress={changeVerse}
      style={[styles.quranCard, { backgroundColor: C.backgroundCard, borderColor: C.border }]}
    >
      <View style={styles.quranHeader}>
        <Feather name="book-open" size={14} color={C.tint} />
        <Text style={[styles.quranLabel, { color: C.tint }]}>آية كريمة · اضغط للتغيير</Text>
      </View>
      <Animated.Text style={[styles.quranText, { opacity: fadeAnim, color: C.text }]}>
        {verse.text}
      </Animated.Text>
      <Animated.Text style={[styles.quranSurah, { opacity: fadeAnim, color: C.textSecondary }]}>
        — {verse.surah}
      </Animated.Text>
    </Pressable>
  );
}

function LiquidityCard() {
  const { data, colors: C, fc } = useApp();
  const totalVaultBalance = data.vaults.reduce((s, v) => s + v.balance, 0);
  const activeDebts = (data.debts || []).filter(d => !d.isPaid);
  const totalOwedToMe = activeDebts.filter(d => d.type === "owed_to_me").reduce((s, d) => s + d.remaining, 0);
  const totalIOwe = activeDebts.filter(d => d.type === "i_owe").reduce((s, d) => s + d.remaining, 0);
  const netWorth = data.savings + totalVaultBalance + totalOwedToMe - totalIOwe;

  return (
    <View style={[styles.liquidityCard, { backgroundColor: C.backgroundCard, borderColor: C.border }]}>
      <View style={styles.liquidityMain}>
        <Text style={[styles.liquidityMainLabel, { color: C.textSecondary }]}>السيولة الحرة</Text>
        <Text style={[styles.liquidityMainAmount, { color: C.tint }]}>{fc(data.savings)}</Text>
        <View style={styles.netWorthRow}>
          <Feather name="trending-up" size={11} color={C.textMuted} />
          <Text style={[styles.liquidityMainHint, { color: C.textMuted }]}>
            صافي الثروة: {fc(netWorth)}
          </Text>
        </View>
      </View>
      <View style={[styles.liquidityDividerH, { backgroundColor: C.border }]} />
      <View style={styles.liquidityRow}>
        <Pressable style={styles.liquidityItem} onPress={() => router.push("/(tabs)/vaults")}>
          <Feather name="archive" size={16} color={C.navy} />
          <Text style={[styles.liquidityItemLabel, { color: C.textSecondary }]}>الخزائن</Text>
          <Text style={[styles.liquidityItemAmount, { color: C.navy }]}>{fc(totalVaultBalance)}</Text>
        </Pressable>
        <View style={[styles.liquidityDividerV, { backgroundColor: C.border }]} />
        <Pressable style={styles.liquidityItem} onPress={() => router.push("/debts" as any)}>
          <Feather name="users" size={16} color={totalIOwe > 0 ? C.danger : C.textMuted} />
          <Text style={[styles.liquidityItemLabel, { color: C.textSecondary }]}>
            {totalOwedToMe > 0 && totalIOwe > 0 ? "ديون" : totalOwedToMe > 0 ? "لي" : "علي"}
          </Text>
          <Text style={[styles.liquidityItemAmount, {
            color: totalOwedToMe > 0 ? C.tint : totalIOwe > 0 ? C.danger : C.textMuted
          }]}>
            {totalOwedToMe > 0 ? `+${fc(totalOwedToMe)}` : totalIOwe > 0 ? `-${fc(totalIOwe)}` : fc(0)}
          </Text>
        </Pressable>
        <View style={[styles.liquidityDividerV, { backgroundColor: C.border }]} />
        <Pressable style={styles.liquidityItem} onPress={() => router.push("/(tabs)/analytics")}>
          <Feather name="bar-chart-2" size={16} color={C.tint} />
          <Text style={[styles.liquidityItemLabel, { color: C.textSecondary }]}>التقارير</Text>
          <Text style={[styles.liquidityItemHint, { color: C.tint }]}>عرض ←</Text>
        </Pressable>
      </View>
    </View>
  );
}

function MonthCard({ month }: { month: Month }) {
  const { colors: C, fc, getMonthBudgetUsed, getMonthIncome } = useApp();
  const spent = getMonthBudgetUsed(month.id);
  const income = getMonthIncome(month.id);
  // totalAvailable = budget + all income (external/vault/liquidity withdrawals)
  const totalAvailable = month.budget + income.total;
  const remaining = totalAvailable - spent;
  const pct = totalAvailable > 0 ? Math.min(spent / totalAvailable, 1) : 0;
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const hasExtraIncome = income.total > 0;

  const handlePress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    Animated.sequence([
      Animated.timing(scaleAnim, { toValue: 0.97, duration: 80, useNativeDriver: true }),
      Animated.timing(scaleAnim, { toValue: 1, duration: 80, useNativeDriver: true }),
    ]).start(() => {
      router.push({ pathname: "/month/[id]", params: { id: month.id } });
    });
  };

  const barColor = pct > 0.85 ? C.danger : pct > 0.6 ? C.warning : C.success;

  return (
    <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
      <Pressable
        onPress={handlePress}
        style={[styles.monthCard, { backgroundColor: C.backgroundCard, shadowColor: C.shadow }]}
      >
        <View style={styles.monthCardTop}>
          <View>
            <Text style={[styles.monthName, { color: C.text }]}>
              {ARABIC_MONTHS[month.month - 1]}
            </Text>
            <Text style={[styles.monthYear, { color: C.textSecondary }]}>
              {toArabicNumerals(month.year)}
            </Text>
          </View>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
            {month.isEnded && (
              <View style={[styles.endedBadge, { backgroundColor: C.successDark }]}>
                <Text style={styles.endedBadgeText}>منتهي</Text>
              </View>
            )}
            {hasExtraIncome && !month.isEnded && (
              <View style={[styles.incomeBadge, { backgroundColor: C.success + "25", borderColor: C.success + "60" }]}>
                <Feather name="plus" size={9} color={C.successDark} />
                <Text style={[styles.incomeBadgeText, { color: C.successDark }]}>{fc(income.total)}</Text>
              </View>
            )}
            <View style={[styles.monthBadge, { backgroundColor: pct > 0.85 ? C.danger + "15" : C.backgroundSecondary }]}>
              <Text style={[styles.monthBadgeText, { color: pct > 0.85 ? C.danger : C.text }]}>
                {toArabicNumerals(Math.round(pct * 100))}٪
              </Text>
            </View>
          </View>
        </View>
        <View style={[styles.progressBar, { backgroundColor: C.backgroundSecondary }]}>
          <View style={[styles.progressFill, { width: `${pct * 100}%` as any, backgroundColor: barColor }]} />
        </View>
        <View style={styles.monthCardBottom}>
          <View style={styles.monthStat}>
            <Text style={[styles.monthAmountLabel, { color: C.textSecondary }]}>المتاح</Text>
            <Text style={[styles.monthAmount, { color: C.text }]}>{fc(totalAvailable)}</Text>
          </View>
          <View style={[styles.monthStatDivider, { backgroundColor: C.border }]} />
          <View style={styles.monthStat}>
            <Text style={[styles.monthAmountLabel, { color: C.textSecondary }]}>المصروف</Text>
            <Text style={[styles.monthAmount, { color: C.danger }]}>{fc(spent)}</Text>
          </View>
          <View style={[styles.monthStatDivider, { backgroundColor: C.border }]} />
          <View style={styles.monthStat}>
            <Text style={[styles.monthAmountLabel, { color: C.textSecondary }]}>المتبقي</Text>
            <Text style={[styles.monthAmount, { color: remaining >= 0 ? C.success : C.danger }]}>
              {fc(remaining)}
            </Text>
          </View>
        </View>
      </Pressable>
    </Animated.View>
  );
}

export default function HomeScreen() {
  const insets = useSafeAreaInsets();
  const { data, colors: C } = useApp();
  const isWeb = Platform.OS === "web";
  const topInset = isWeb ? 67 : insets.top;

  const sortedMonths = [...data.months].sort((a, b) => {
    // Sort by year+month desc (most recent first)
    const aTime = new Date(a.year, a.month - 1).getTime();
    const bTime = new Date(b.year, b.month - 1).getTime();
    return bTime - aTime;
  });

  const activeMonths = sortedMonths.filter(m => !m.isEnded).length;

  return (
    <View style={[styles.container, { backgroundColor: C.background }]}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{
          paddingTop: topInset + 8,
          paddingBottom: (isWeb ? 34 : insets.bottom) + 100,
        }}
      >
        <View style={styles.header}>
          <View>
            <Text style={[styles.headerTitle, { color: C.text }]}>مصروفي</Text>
            <Text style={[styles.headerSub, { color: C.textSecondary }]}>إدارة مصاريفك بذكاء</Text>
          </View>
          <Pressable
            onPress={() => router.push("/(tabs)/settings")}
            style={[styles.iconBtn, { backgroundColor: C.backgroundCard, shadowColor: C.shadow }]}
          >
            <Feather name="more-horizontal" size={20} color={C.navy} />
          </Pressable>
        </View>

        <QuranCard />
        <LiquidityCard />

        <View style={styles.sectionHeader}>
          <View>
            <Text style={[styles.sectionTitle, { color: C.text }]}>الشهور</Text>
            {activeMonths > 0 && (
              <Text style={[styles.sectionSub, { color: C.textSecondary }]}>
                {toArabicNumerals(activeMonths)} شهر نشط
              </Text>
            )}
          </View>
          <Pressable
            style={[styles.addBtn, { backgroundColor: C.navy }]}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
              router.push("/month/add");
            }}
          >
            <Feather name="plus" size={18} color={C.white} />
            <Text style={[styles.addBtnText, { color: C.white }]}>إضافة شهر</Text>
          </Pressable>
        </View>

        {sortedMonths.length === 0 ? (
          <View style={styles.emptyState}>
            <View style={[styles.emptyIcon, { backgroundColor: C.backgroundCard, borderColor: C.border }]}>
              <Feather name="calendar" size={40} color={C.border} />
            </View>
            <Text style={[styles.emptyTitle, { color: C.textSecondary }]}>لا توجد شهور بعد</Text>
            <Text style={[styles.emptyText, { color: C.textMuted }]}>ابدأ بإضافة شهر جديد لتتبع مصاريفك</Text>
            <Pressable
              style={[styles.emptyBtn, { backgroundColor: C.navy }]}
              onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); router.push("/month/add"); }}
            >
              <Feather name="plus" size={16} color={C.white} />
              <Text style={[styles.emptyBtnText, { color: C.white }]}>إضافة شهر جديد</Text>
            </Pressable>
          </View>
        ) : (
          sortedMonths.map((m) => <MonthCard key={m.id} month={m} />)
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: "row", justifyContent: "space-between",
    alignItems: "center", paddingHorizontal: 20, marginBottom: 16,
  },
  headerTitle: { fontFamily: "Cairo_900Black", fontSize: 28 },
  headerSub: { fontFamily: "Cairo_400Regular", fontSize: 13 },
  iconBtn: {
    width: 44, height: 44, borderRadius: 22,
    alignItems: "center", justifyContent: "center",
    shadowOffset: { width: 0, height: 2 }, shadowOpacity: 1, shadowRadius: 8, elevation: 3,
  },
  quranCard: {
    marginHorizontal: 20, marginBottom: 14,
    borderRadius: 16, padding: 16, borderWidth: 1,
  },
  quranHeader: { flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 8 },
  quranLabel: { fontFamily: "Cairo_600SemiBold", fontSize: 12 },
  quranText: {
    fontFamily: "Cairo_400Regular", fontSize: 15,
    textAlign: "center", lineHeight: 28, marginBottom: 6,
  },
  quranSurah: { fontFamily: "Cairo_400Regular", fontSize: 12, textAlign: "center" },
  liquidityCard: {
    marginHorizontal: 20, marginBottom: 24,
    borderRadius: 20, borderWidth: 1, overflow: "hidden",
  },
  liquidityMain: { padding: 20, alignItems: "center", gap: 4 },
  liquidityMainLabel: { fontFamily: "Cairo_600SemiBold", fontSize: 13 },
  liquidityMainAmount: { fontFamily: "Cairo_900Black", fontSize: 30 },
  netWorthRow: { flexDirection: "row", alignItems: "center", gap: 4 },
  liquidityMainHint: { fontFamily: "Cairo_400Regular", fontSize: 11 },
  liquidityDividerH: { height: 1 },
  liquidityDividerV: { width: 1, height: 44 },
  liquidityRow: { flexDirection: "row", alignItems: "center" },
  liquidityItem: { flex: 1, alignItems: "center", paddingVertical: 14, gap: 3 },
  liquidityItemLabel: { fontFamily: "Cairo_400Regular", fontSize: 11 },
  liquidityItemAmount: { fontFamily: "Cairo_700Bold", fontSize: 13 },
  liquidityItemHint: { fontFamily: "Cairo_600SemiBold", fontSize: 12 },
  sectionHeader: {
    flexDirection: "row", justifyContent: "space-between",
    alignItems: "center", paddingHorizontal: 20, marginBottom: 12,
  },
  sectionTitle: { fontFamily: "Cairo_700Bold", fontSize: 18 },
  sectionSub: { fontFamily: "Cairo_400Regular", fontSize: 11, marginTop: 1 },
  addBtn: {
    flexDirection: "row", alignItems: "center", gap: 6,
    paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20,
  },
  addBtnText: { fontFamily: "Cairo_600SemiBold", fontSize: 13 },
  monthCard: {
    marginHorizontal: 20, marginBottom: 12, borderRadius: 16, padding: 16,
    shadowOffset: { width: 0, height: 2 }, shadowOpacity: 1, shadowRadius: 8, elevation: 3,
  },
  monthCardTop: {
    flexDirection: "row", justifyContent: "space-between",
    alignItems: "flex-start", marginBottom: 12,
  },
  monthName: { fontFamily: "Cairo_700Bold", fontSize: 18 },
  monthYear: { fontFamily: "Cairo_400Regular", fontSize: 13 },
  endedBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 10 },
  endedBadgeText: { fontFamily: "Cairo_600SemiBold", fontSize: 10, color: "#fff" },
  incomeBadge: { flexDirection: "row", alignItems: "center", gap: 2, paddingHorizontal: 6, paddingVertical: 3, borderRadius: 10, borderWidth: 1 },
  incomeBadgeText: { fontFamily: "Cairo_600SemiBold", fontSize: 10 },
  monthBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  monthBadgeText: { fontFamily: "Cairo_700Bold", fontSize: 13 },
  progressBar: { height: 6, borderRadius: 3, overflow: "hidden", marginBottom: 14 },
  progressFill: { height: "100%", borderRadius: 3 },
  monthCardBottom: { flexDirection: "row", alignItems: "center" },
  monthStat: { flex: 1, alignItems: "center", gap: 2 },
  monthStatDivider: { width: 1, height: 32 },
  monthAmountLabel: { fontFamily: "Cairo_400Regular", fontSize: 11 },
  monthAmount: { fontFamily: "Cairo_700Bold", fontSize: 14 },
  emptyState: { alignItems: "center", justifyContent: "center", paddingVertical: 48, paddingHorizontal: 32, gap: 14 },
  emptyIcon: { width: 88, height: 88, borderRadius: 44, alignItems: "center", justifyContent: "center", borderWidth: 2, marginBottom: 4 },
  emptyTitle: { fontFamily: "Cairo_700Bold", fontSize: 18 },
  emptyText: { fontFamily: "Cairo_400Regular", fontSize: 14, textAlign: "center", lineHeight: 22 },
  emptyBtn: { flexDirection: "row", alignItems: "center", gap: 8, paddingHorizontal: 20, paddingVertical: 12, borderRadius: 20, marginTop: 4 },
  emptyBtnText: { fontFamily: "Cairo_600SemiBold", fontSize: 14 },
});
