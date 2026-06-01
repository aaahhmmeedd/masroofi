import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { router } from "expo-router";
import React, { useRef, useState } from "react";
import {
  Animated,
  Modal,
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
  const [showModal, setShowModal] = useState(false);

  const totalVaulted = data.vaults.reduce((s, v) => s + v.balance, 0);
  const totalDebts = data.debts.reduce((s, d) => s + d.amount, 0);
  const netWorth = data.savings + totalVaulted - totalDebts;

  return (
    <>
      <Pressable 
        style={[styles.liquidityCard, { backgroundColor: C.backgroundCard, borderColor: C.border }]}
        onPress={() => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          setShowModal(true);
        }}
      >
        <View style={styles.liquidityMain}>
          <Text style={[styles.liquidityMainLabel, { color: C.textSecondary }]}>السيولة</Text>
          <Text style={[styles.liquidityMainAmount, { color: C.tint }]}>{fc(data.savings)}</Text>
        </View>
      </Pressable>

      <Modal visible={showModal} transparent animationType="fade">
        <Pressable 
          style={[styles.modalOverlay, { backgroundColor: "rgba(0,0,0,0.5)" }]}
          onPress={() => setShowModal(false)}
        >
          <Pressable 
            style={[styles.modalContent, { backgroundColor: C.backgroundCard }]}
            onPress={() => {}}
          >
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: C.text }]}>ملخص الثروة</Text>
              <Pressable onPress={() => setShowModal(false)}>
                <Feather name="x" size={20} color={C.text} />
              </Pressable>
            </View>

            <View style={styles.modalStats}>
              <View style={[styles.statRow, { borderBottomColor: C.border }]}>
                <Text style={[styles.statLabel, { color: C.textSecondary }]}>السيولة</Text>
                <Text style={[styles.statValue, { color: C.tint }]}>{fc(data.savings)}</Text>
              </View>
              
              <View style={[styles.statRow, { borderBottomColor: C.border }]}>
                <Text style={[styles.statLabel, { color: C.textSecondary }]}>إجمالي الخزائن</Text>
                <Text style={[styles.statValue, { color: C.navy }]}>{fc(totalVaulted)}</Text>
              </View>

              <View style={[styles.statRow, { borderBottomColor: C.border }]}>
                <Text style={[styles.statLabel, { color: C.textSecondary }]}>إجمالي الديون</Text>
                <Text style={[styles.statValue, { color: C.danger }]}>{fc(totalDebts)}</Text>
              </View>

              <View style={[styles.statRow, { borderBottomWidth: 0 }]}>
                <Text style={[styles.statLabel, { color: C.text, fontFamily: "Cairo_700Bold" }]}>صافي الثروة</Text>
                <Text style={[styles.statValue, { color: netWorth >= 0 ? C.success : C.danger, fontFamily: "Cairo_700Bold", fontSize: 18 }]}>
                  {fc(netWorth)}
                </Text>
              </View>
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </>
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
        style={[
          styles.monthCard,
          {
            backgroundColor: month.isEnded ? C.backgroundSecondary : C.backgroundCard,
            shadowColor: C.shadow,
            opacity: month.isEnded ? 0.6 : 1,
          },
        ]}
      >
        <View style={styles.monthCardTop}>
          <View>
            <Text style={[styles.monthName, { color: month.isEnded ? C.textMuted : C.text }]}>
              {ARABIC_MONTHS[month.month - 1]}
            </Text>
            <Text style={[styles.monthYear, { color: C.textSecondary }]}>
              {toArabicNumerals(month.year)}
            </Text>
          </View>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
            {month.isEnded && (
              <View style={[styles.endedBadge, { backgroundColor: C.textMuted }]}>
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

function YearsSection() {
  const { data, colors: C } = useApp();

  // Get unique years from months, sorted desc
  const years = Array.from(new Set(data.months.map(m => m.year))).sort((a, b) => b - a);

  if (years.length === 0) return null;

  return (
    <View style={styles.yearsSection}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: 20, gap: 8 }}
        scrollEventThrottle={16}
      >
        {years.map((year) => (
          <Pressable
            key={year}
            style={[
              styles.yearChip,
              {
                backgroundColor: C.backgroundCard,
                borderColor: C.border,
              },
            ]}
          >
            <Text style={[styles.yearChipText, { color: C.text }]}>
              {toArabicNumerals(year)}
            </Text>
          </Pressable>
        ))}
        <Pressable
          style={[
            styles.yearChip,
            {
              backgroundColor: C.navy,
            },
          ]}
          onPress={() => router.push("/month/add")}
        >
          <Feather name="plus" size={16} color="#fff" />
          <Text style={[styles.yearChipText, { color: "#fff" }]}>إضافة</Text>
        </Pressable>
      </ScrollView>
    </View>
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
            <Text style={[styles.headerSub, { color: C.textSecondary }]}>مصروفك تحت المراقبة</Text>
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

        <YearsSection />

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
  headerTitle: { fontFamily: "Cairo_900Black", fontSize: 28, marginBottom: 2 },
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
  yearsSection: {
    marginBottom: 20,
  },
  yearChip: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    minWidth: 60,
  },
  yearChipText: {
    fontFamily: "Cairo_700Bold",
    fontSize: 14,
  },
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
  modalOverlay: { flex: 1, alignItems: "center", justifyContent: "center" },
  modalContent: { borderRadius: 20, width: "80%", overflow: "hidden", maxWidth: 320 },
  modalHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", padding: 20, borderBottomWidth: 1, borderBottomColor: "rgba(0,0,0,0.1)" },
  modalTitle: { fontFamily: "Cairo_700Bold", fontSize: 18 },
  modalStats: { padding: 20 },
  statRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingVertical: 14, borderBottomWidth: 1 },
  statLabel: { fontFamily: "Cairo_400Regular", fontSize: 13 },
  statValue: { fontFamily: "Cairo_700Bold", fontSize: 16 },
});
