import { Feather } from "@expo/vector-icons";
import React, { useMemo, useState, useRef } from "react";
import {
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  Animated,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Svg, { G, Rect, Text as SvgText, Circle } from "react-native-svg";

import { ARABIC_MONTHS, toArabicNumerals } from "@/constants/arabic";
import { useApp } from "@/context/AppContext";
import { useScrollToTop, ScrollToTopButton } from "@/components/ScrollToTopButton";

const CATEGORY_COLORS = [
  "#1B818F", "#7B4D35", "#A3BFB0", "#C0504A", "#D4864A",
  "#156B76", "#9B5D45", "#6A9E8E", "#B89A82", "#4DA8B5",
];

const TIME_FILTERS = [
  { label: "شهر", months: 1 },
  { label: "٣ أشهر", months: 3 },
  { label: "٦ أشهر", months: 6 },
  { label: "سنة", months: 12 },
  { label: "الكل", months: 999 },
];

function BarChart({ months }: { months: { label: string; budget: number; spent: number }[] }) {
  const { colors: C } = useApp();
  const width = 340;
  const height = 180;
  const barWidth = 22;
  const gap = 18;
  const maxVal = Math.max(...months.flatMap((m) => [m.budget, m.spent]), 1);
  const totalWidth = months.length * (barWidth * 2 + gap + 10);

  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false}>
      <Svg width={Math.max(totalWidth, width)} height={height + 50}>
        {months.map((m, i) => {
          const x = i * (barWidth * 2 + gap + 10) + 10;
          const budgetH = (m.budget / maxVal) * height;
          const spentH = (m.spent / maxVal) * height;
          return (
            <G key={i}>
              <Rect x={x} y={height - budgetH} width={barWidth} height={budgetH} fill={C.navyLight} rx={4} opacity={0.7} />
              <Rect x={x + barWidth + 4} y={height - spentH} width={barWidth} height={spentH} fill={C.danger} rx={4} opacity={0.85} />
              <SvgText x={x + barWidth} y={height + 18} textAnchor="middle" fill={C.textSecondary} fontSize={10} fontFamily="Cairo_400Regular" textLength={45}>
                {m.label}
              </SvgText>
            </G>
          );
        })}
      </Svg>
    </ScrollView>
  );
}

function DonutChart({ data }: { data: { label: string; value: number; color: string }[] }) {
  const { colors: C, fc } = useApp();
  const total = data.reduce((s, d) => s + d.value, 0) || 1;
  const size = 130;
  const strokeWidth = 22;
  const r = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * r;
  let cumulativePct = 0;
  const arcs = data.map((d) => {
    const pct = d.value / total;
    const dashLen = pct * circumference;
    const dashOffset = circumference * (1 - cumulativePct);
    cumulativePct += pct;
    return { ...d, dashLen, dashOffset };
  });

  return (
    <View style={{ alignItems: "center" }}>
      <View style={{ position: "relative", width: size, height: size }}>
        <Svg width={size} height={size} style={{ transform: [{ rotate: "-90deg" }] }}>
          <Circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={C.backgroundSecondary} strokeWidth={strokeWidth} />
          {arcs.map((arc, i) => (
            <Circle
              key={i}
              cx={size / 2} cy={size / 2} r={r}
              fill="none" stroke={arc.color}
              strokeWidth={strokeWidth}
              strokeDasharray={`${arc.dashLen} ${circumference - arc.dashLen}`}
              strokeDashoffset={arc.dashOffset}
              strokeLinecap="butt"
            />
          ))}
        </Svg>
        <View style={{ position: "absolute", inset: 0, alignItems: "center", justifyContent: "center" }}>
          <Text style={{ fontFamily: "Cairo_700Bold", fontSize: 10, color: C.textSecondary }}>إجمالي</Text>
          <Text style={{ fontFamily: "Cairo_900Black", fontSize: 12, color: C.text }}>{fc(total)}</Text>
        </View>
      </View>
    </View>
  );
}

export default function ReportsScreen() {
  const insets = useSafeAreaInsets();
  const { data, colors: C, fc, getMonthBudgetUsed } = useApp();
  const isWeb = Platform.OS === "web";
  const topInset = isWeb ? 67 : insets.top;
  const bottomInset = isWeb ? 34 : insets.bottom;
  const [activeTab, setActiveTab] = useState<"summary" | "compare" | "distribute" | "insights">("summary");
  const [timeFilter, setTimeFilter] = useState(3);
  const [yearFilter, setYearFilter] = useState<number | null>(null);
  const [liquidityView, setLiquidityView] = useState<"month" | "year">("month");
  const scrollViewRef = useRef<ScrollView>(null);
  const { opacity, shouldShow, handleScroll } = useScrollToTop(C);

  const totalBudget = data.months.reduce((s, m) => s + m.budget, 0);
  const totalSpent = data.months.reduce((s, m) => s + getMonthBudgetUsed(m.id), 0);
  const savingsRate = totalBudget > 0 ? ((totalBudget - totalSpent) / totalBudget) * 100 : 0;

  const monthsData = useMemo(() =>
    data.months.slice(0, 6).reverse().map((m) => ({
      label: ARABIC_MONTHS[m.month - 1],
      budget: m.budget,
      spent: getMonthBudgetUsed(m.id),
    })),
    [data.months, getMonthBudgetUsed]
  );

  const filteredExpenses = useMemo(() => {
    if (timeFilter === 999) return data.expenses;
    const cutoff = Date.now() - timeFilter * 30 * 24 * 3600 * 1000;
    return data.expenses.filter((e) => e.createdAt >= cutoff);
  }, [data.expenses, timeFilter]);

  const categoryData = useMemo(() => {
    const catMap: Record<string, number> = {};
    filteredExpenses.forEach((e) => {
      catMap[e.category] = (catMap[e.category] || 0) + e.amount;
    });
    return Object.entries(catMap)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 8)
      .map(([label, value], i) => ({ label, value, color: CATEGORY_COLORS[i % CATEGORY_COLORS.length] }));
  }, [filteredExpenses]);

  const compareData = useMemo(() => {
    let filtered = data.months.map((m) => ({
      id: m.id,
      label: `${ARABIC_MONTHS[m.month - 1]} ${toArabicNumerals(m.year)}`,
      budget: m.budget,
      spent: getMonthBudgetUsed(m.id),
      isEnded: m.isEnded,
      year: m.year,
    }));
    if (yearFilter !== null) {
      filtered = filtered.filter(m => m.year === yearFilter);
    }
    return filtered;
  }, [data.months, getMonthBudgetUsed, yearFilter]);

  // Financial insights derived data
  const insights = useMemo(() => {
    const sorted = [...data.months].sort((a, b) => {
      const at = new Date(a.year, a.month - 1).getTime();
      const bt = new Date(b.year, b.month - 1).getTime();
      return bt - at;
    });
    const currentMonth = sorted[0];
    const prevMonth = sorted[1];

    const currentSpent = currentMonth ? getMonthBudgetUsed(currentMonth.id) : 0;
    const prevSpent = prevMonth ? getMonthBudgetUsed(prevMonth.id) : 0;
    const spendingDelta = prevSpent > 0 ? ((currentSpent - prevSpent) / prevSpent) * 100 : 0;

    // Top category this month
    const currentExpenses = currentMonth
      ? data.expenses.filter((e) => e.monthId === currentMonth.id)
      : [];
    const catMap: Record<string, number> = {};
    currentExpenses.forEach((e) => { catMap[e.category] = (catMap[e.category] || 0) + e.amount; });
    const topCat = Object.entries(catMap).sort((a, b) => b[1] - a[1])[0];

    // Daily average (current month)
    const now = new Date();
    const dayOfMonth = now.getDate();
    const dailyAvg = dayOfMonth > 0 ? currentSpent / dayOfMonth : 0;

    // Budget pace: extrapolate to end of month
    const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
    const projectedTotal = dailyAvg * daysInMonth;
    const budget = currentMonth?.budget ?? 0;
    const willExceed = budget > 0 && projectedTotal > budget;
    const projectedPct = budget > 0 ? projectedTotal / budget : 0;

    return {
      currentMonth, prevMonth,
      currentSpent, prevSpent, spendingDelta,
      topCat, dailyAvg, projectedTotal, willExceed, projectedPct,
      daysInMonth, dayOfMonth,
    };
  }, [data, getMonthBudgetUsed]);

  const tabs = [
    { key: "summary",   label: "الملخص"    },
    { key: "compare",   label: "المقارنة"    },
    { key: "distribute",label: "التوزيع"   },
    { key: "insights",  label: "رؤى"       },
  ] as const;

  return (
    <View style={[styles.container, { backgroundColor: C.background }]}>
      <ScrollView ref={scrollViewRef} onScroll={handleScroll} scrollEventThrottle={16} showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: bottomInset + 100 }}>
        <View style={[styles.header, { paddingTop: topInset + 16 }]}>
          <Text style={[styles.headerTitle, { color: C.text }]}>التقارير</Text>
          <Text style={[styles.headerSub, { color: C.textSecondary }]}>نظرة عامة على إنفاقك</Text>
        </View>

        <View style={[styles.tabBar, { backgroundColor: C.backgroundSecondary }]}>
          {tabs.map((tab) => (
            <Pressable
              key={tab.key}
              onPress={() => setActiveTab(tab.key)}
              style={[styles.tabBtn, activeTab === tab.key && { backgroundColor: C.tint }]}
            >
              <Text style={[styles.tabBtnText, { color: activeTab === tab.key ? C.white : C.textSecondary }]}>
                {tab.label}
              </Text>
            </Pressable>
          ))}
        </View>

        {/* ═══ SUMMARY TAB ═══ */}
        {activeTab === "summary" && (
          <>
            <View style={styles.statsRow}>
              <View style={[styles.statCard, { backgroundColor: C.navyLight }]}>
                <Feather name="trending-down" size={18} color={C.white} />
                <Text style={[styles.statCardValue, { color: C.white }]}>{fc(totalSpent)}</Text>
                <Text style={[styles.statCardLabel, { color: "rgba(255,255,255,0.8)" }]}>إجمالي المصاريف</Text>
              </View>
              <View style={[styles.statCard, { backgroundColor: C.tint }]}>
                <Feather name="trending-up" size={18} color={C.white} />
                <Text style={[styles.statCardValue, { color: C.white }]}>{toArabicNumerals(Math.round(savingsRate))}٪</Text>
                <Text style={[styles.statCardLabel, { color: "rgba(255,255,255,0.8)" }]}>نسبة الادخار</Text>
              </View>
            </View>
            <View style={[styles.chartCard, { backgroundColor: C.backgroundCard, shadowColor: C.shadow }]}>
              <View style={styles.savingsHeader}>
                <Feather name="shield-off" size={20} color={C.success} />
                <Text style={[styles.chartTitle, { color: C.text }]}>معدل الادخار</Text>
              </View>
              <View style={styles.savingsDetails}>
                <View style={styles.savingsStat}>
                  <Text style={[styles.savingsStatLabel, { color: C.textSecondary }]}>نسبة الادخار</Text>
                  <Text style={[styles.savingsStatValue, { color: C.success }]}>{toArabicNumerals(Math.round(savingsRate))}٪</Text>
                </View>
                <View style={[styles.savingsDivider, { backgroundColor: C.border }]} />
                <View style={styles.savingsStat}>
                  <Text style={[styles.savingsStatLabel, { color: C.textSecondary }]}>مبلغ مدخر</Text>
                  <Text style={[styles.savingsStatValue, { color: C.success }]}>{fc(totalBudget - totalSpent)}</Text>
                </View>
              </View>
            </View>
            <View style={[styles.chartCard, { backgroundColor: C.backgroundCard, shadowColor: C.shadow }]}>
              <View style={styles.chartHeader}>
                <Text style={[styles.chartTitle, { color: C.text }]}>السيولة</Text>
                <View style={[styles.filterChipRow, { gap: 6 }]}>
                  <Pressable
                    onPress={() => setLiquidityView("month")}
                    style={[styles.filterChip, { backgroundColor: liquidityView === "month" ? C.tint : C.backgroundSecondary, borderColor: liquidityView === "month" ? C.tint : C.border, borderWidth: 1 }]}
                  >
                    <Text style={[styles.filterChipText, { color: liquidityView === "month" ? C.white : C.textSecondary, fontSize: 10 }]}>أشهر</Text>
                  </Pressable>
                  <Pressable
                    onPress={() => setLiquidityView("year")}
                    style={[styles.filterChip, { backgroundColor: liquidityView === "year" ? C.tint : C.backgroundSecondary, borderColor: liquidityView === "year" ? C.tint : C.border, borderWidth: 1 }]}
                  >
                    <Text style={[styles.filterChipText, { color: liquidityView === "year" ? C.white : C.textSecondary, fontSize: 10 }]}>سنوات</Text>
                  </Pressable>
                </View>
              </View>
              {(() => {
                const liquidityData = liquidityView === "month"
                  ? data.months.slice(-12).map(m => ({
                      label: ARABIC_MONTHS[m.month - 1],
                      value: data.savings,
                      month: m.month,
                      year: m.year,
                    }))
                  : Array.from(new Set(data.months.map(m => m.year))).sort().map(year => ({
                      label: toArabicNumerals(year),
                      value: data.savings,
                      year,
                    }));

                if (liquidityData.length === 0) {
                  return (
                    <View style={styles.emptyState}>
                      <Feather name="trending-up" size={40} color={C.border} />
                      <Text style={[styles.emptyText, { color: C.textMuted }]}>لا توجد بيانات</Text>
                    </View>
                  );
                }

                const maxValue = Math.max(...liquidityData.map(d => d.value), 1);
                const width = 340;
                const height = 120;

                return (
                  <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                    <Svg width={Math.max(liquidityData.length * 50, width)} height={height + 40}>
                      {liquidityData.map((d, i) => {
                        const x = i * 50 + 10;
                        const barHeight = (d.value / maxValue) * height;
                        return (
                          <G key={i}>
                            <Rect
                              x={x} y={height - barHeight} width={30} height={barHeight}
                              fill={C.success} rx={4} opacity={0.8}
                            />
                            <SvgText
                              x={x + 15} y={height + 18}
                              textAnchor="middle" fill={C.textSecondary}
                              fontSize={10} fontFamily="Cairo_400Regular"
                            >
                              {d.label.substring(0, 3)}
                            </SvgText>
                          </G>
                        );
                      })}
                    </Svg>
                  </ScrollView>
                );
              })()}
              <View style={{ marginTop: 16, paddingTop: 12 }}>
                <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
                  <View>
                    <Text style={[styles.savingsStatLabel, { color: C.textSecondary }]}>إجمالي السيولة</Text>
                    <Text style={[styles.savingsStatValue, { color: C.success }]}>{fc(data.savings)}</Text>
                  </View>
                </View>
              </View>
            </View>
            {monthsData.length > 0 ? (
              <View style={[styles.chartCard, { backgroundColor: C.backgroundCard, shadowColor: C.shadow }]}>
                <View style={styles.chartHeader}>
                  <Text style={[styles.chartTitle, { color: C.text }]}>الميزانية مقابل المصاريف</Text>
                  <View style={styles.legend}>
                    <View style={[styles.legendDot, { backgroundColor: C.navyLight }]} />
                    <Text style={[styles.legendText, { color: C.textSecondary }]}>الميزانية</Text>
                    <View style={[styles.legendDot, { backgroundColor: C.danger }]} />
                    <Text style={[styles.legendText, { color: C.textSecondary }]}>المصاريف</Text>
                  </View>
                </View>
                <BarChart months={monthsData} />
              </View>
            ) : (
              <View style={styles.emptyState}>
                <Feather name="bar-chart-2" size={48} color={C.border} />
                <Text style={[styles.emptyTitle, { color: C.textSecondary }]}>لا توجد بيانات بعد</Text>
                <Text style={[styles.emptyText, { color: C.textMuted }]}>أضف مصاريف لعرض التقارير</Text>
              </View>
            )}
          </>
        )}

        {/* ═══ COMPARE TAB ═══ */}
        {activeTab === "compare" && (
          <>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterRow} contentContainerStyle={{ gap: 8, paddingHorizontal: 16 }}>
              <Pressable
                onPress={() => setYearFilter(null)}
                style={[
                  styles.filterChip,
                  { backgroundColor: yearFilter === null ? C.tint : C.backgroundSecondary, borderColor: yearFilter === null ? C.tint : C.border },
                ]}
              >
                <Text style={[styles.filterChipText, { color: yearFilter === null ? C.white : C.textSecondary }]}>
                  الكل
                </Text>
              </Pressable>
              {Array.from(new Set(data.months.map(m => m.year))).sort((a, b) => b - a).map((year) => (
                <Pressable
                  key={year}
                  onPress={() => setYearFilter(year)}
                  style={[
                    styles.filterChip,
                    { backgroundColor: yearFilter === year ? C.tint : C.backgroundSecondary, borderColor: yearFilter === year ? C.tint : C.border },
                  ]}
                >
                  <Text style={[styles.filterChipText, { color: yearFilter === year ? C.white : C.textSecondary }]}>
                    {toArabicNumerals(year)}
                  </Text>
                </Pressable>
              ))}
            </ScrollView>
            <View style={[styles.chartCard, { backgroundColor: C.backgroundCard, shadowColor: C.shadow }]}>
              <Text style={[styles.chartTitle, { color: C.text, marginBottom: 16 }]}>مقارنة الميزانية بالمصاريف</Text>
              {compareData.length === 0 ? (
                <View style={styles.emptyState}>
                  <Feather name="calendar" size={40} color={C.border} />
                  <Text style={[styles.emptyText, { color: C.textMuted }]}>لا توجد شهور بعد</Text>
                </View>
              ) : (
              compareData.map((m) => {
                const pct = m.budget > 0 ? Math.min(m.spent / m.budget, 1) : 0;
                const barColor = pct > 0.85 ? C.danger : pct > 0.6 ? C.warning : C.success;
                const remaining = m.budget - m.spent;
                return (
                  <View key={m.id} style={[styles.compareRow, { borderBottomColor: C.border }]}>
                    <View style={styles.compareHeader}>
                      <Text style={[styles.compareMonth, { color: C.text }]}>{m.label}</Text>
                      <Text style={[styles.comparePct, { color: barColor }]}>
                        {toArabicNumerals(Math.round(pct * 100))}٪
                      </Text>
                    </View>
                    <View style={[styles.compareBar, { backgroundColor: C.backgroundSecondary }]}>
                      <View style={[styles.compareBarFill, { width: `${pct * 100}%` as any, backgroundColor: barColor }]} />
                    </View>
                    <View style={styles.compareAmounts}>
                      <Text style={[styles.compareAmt, { color: C.textSecondary }]}>ميزانية: {fc(m.budget)}</Text>
                      <Text style={[styles.compareAmt, { color: C.danger }]}>صُرف: {fc(m.spent)}</Text>
                      <Text style={[styles.compareAmt, { color: remaining >= 0 ? C.success : C.danger }]}>
                        متبقي: {fc(remaining)}
                      </Text>
                    </View>
                  </View>
                );
              })
            )}
            </View>
          </>
        )}

        {/* ═══ DISTRIBUTE TAB ═══ */}
        {activeTab === "distribute" && (
          <>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterRow} contentContainerStyle={{ gap: 8, paddingHorizontal: 16 }}>
              {TIME_FILTERS.map((f) => (
                <Pressable
                  key={f.months}
                  onPress={() => setTimeFilter(f.months)}
                  style={[
                    styles.filterChip,
                    { backgroundColor: timeFilter === f.months ? C.tint : C.backgroundSecondary, borderColor: timeFilter === f.months ? C.tint : C.border },
                  ]}
                >
                  <Text style={[styles.filterChipText, { color: timeFilter === f.months ? C.white : C.textSecondary }]}>
                    {f.label}
                  </Text>
                </Pressable>
              ))}
            </ScrollView>
            {categoryData.length > 0 ? (
              <>
                <View style={[styles.chartCard, { backgroundColor: C.backgroundCard, shadowColor: C.shadow }]}>
                  <Text style={[styles.chartTitle, { color: C.text, marginBottom: 16 }]}>توزيع المصاريف حسب الفئة</Text>
                  <View style={styles.donutSection}>
                    <DonutChart data={categoryData} />
                    <View style={styles.categoryList}>
                      {categoryData.map((cat, i) => {
                        const total = categoryData.reduce((s, c) => s + c.value, 0);
                        const pct = total > 0 ? Math.round((cat.value / total) * 100) : 0;
                        return (
                          <View key={i} style={styles.categoryItem}>
                            <View style={[styles.categoryDot, { backgroundColor: cat.color }]} />
                            <Text style={[styles.categoryLabel, { color: C.textSecondary }]} numberOfLines={1}>{cat.label}</Text>
                            <View style={styles.categoryValues}>
                              <Text style={[styles.categoryPercentage, { color: cat.color }]}>{toArabicNumerals(pct)}٪</Text>
                              <Text style={[styles.categoryValue, { color: C.text }]}>{fc(cat.value)}</Text>
                            </View>
                          </View>
                        );
                      })}
                    </View>
                  </View>
                </View>

                {/* Distribution Overview Cards */}
                <View style={styles.distributionCards}>
                  {/* Income Distribution */}
                  {(() => {
                    const totalIncome = data.expenses
                      .filter(e => e.type === 'income')
                      .reduce((s, e) => s + e.amount, 0);
                    return totalIncome > 0 ? (
                      <View style={[styles.distCard, { backgroundColor: C.backgroundCard, shadowColor: C.shadow, borderLeftColor: C.success, borderLeftWidth: 4 }]}>
                        <View style={styles.distCardHeader}>
                          <Feather name="arrow-down-left" size={16} color={C.success} />
                          <Text style={[styles.distCardTitle, { color: C.textSecondary }]}>إجمالي الدخل</Text>
                        </View>
                        <Text style={[styles.distCardValue, { color: C.success }]}>{fc(totalIncome)}</Text>
                      </View>
                    ) : null;
                  })()}

                  {/* Budget Compliance */}
                  {(() => {
                    const totalBudgetCurrent = data.months
                      .filter(m => !m.isEnded)
                      .reduce((s, m) => s + m.budget, 0);
                    const totalSpentCurrent = data.months
                      .filter(m => !m.isEnded)
                      .reduce((s, m) => s + getMonthBudgetUsed(m.id), 0);
                    const compliance = totalBudgetCurrent > 0 ? (totalSpentCurrent / totalBudgetCurrent) * 100 : 0;
                    return totalBudgetCurrent > 0 ? (
                      <View style={[styles.distCard, { backgroundColor: C.backgroundCard, shadowColor: C.shadow, borderLeftColor: compliance > 85 ? C.danger : C.warning, borderLeftWidth: 4 }]}>
                        <View style={styles.distCardHeader}>
                          <Feather name="check-circle" size={16} color={compliance > 85 ? C.danger : C.warning} />
                          <Text style={[styles.distCardTitle, { color: C.textSecondary }]}>التزام الميزانية</Text>
                        </View>
                        <Text style={[styles.distCardValue, { color: compliance > 85 ? C.danger : C.warning }]}>{toArabicNumerals(Math.round(compliance))}٪</Text>
                      </View>
                    ) : null;
                  })()}

                  {/* Top Spending Month */}
                  {(() => {
                    const monthSpending = data.months.map(m => ({
                      name: `${ARABIC_MONTHS[m.month]} ${toArabicNumerals(m.year)}`,
                      amount: getMonthBudgetUsed(m.id),
                    })).sort((a, b) => b.amount - a.amount)[0];
                    return monthSpending && monthSpending.amount > 0 ? (
                      <View style={[styles.distCard, { backgroundColor: C.backgroundCard, shadowColor: C.shadow, borderLeftColor: C.danger, borderLeftWidth: 4 }]}>
                        <View style={styles.distCardHeader}>
                          <Feather name="trending-down" size={16} color={C.danger} />
                          <Text style={[styles.distCardTitle, { color: C.textSecondary }]}>أعلى شهر إنفاقاً</Text>
                        </View>
                        <View style={{ gap: 4 }}>
                          <Text style={[styles.distCardValue, { color: C.danger }]}>{fc(monthSpending.amount)}</Text>
                          <Text style={[styles.distCardMeta, { color: C.textMuted }]}>{monthSpending.name}</Text>
                        </View>
                      </View>
                    ) : null;
                  })()}

                  {/* Income Distribution by Source */}
                  {(() => {
                    const incomeBySource: Record<string, number> = {};
                    data.expenses
                      .filter(e => e.type === 'income')
                      .forEach(e => {
                        const source = e.note || 'مصدر آخر';
                        incomeBySource[source] = (incomeBySource[source] || 0) + e.amount;
                      });
                    const totalIncome = Object.values(incomeBySource).reduce((s, v) => s + v, 0);
                    const sources = Object.entries(incomeBySource).sort((a, b) => b[1] - a[1]);
                    return totalIncome > 0 ? (
                      <View style={[styles.distCard, { backgroundColor: C.backgroundCard, shadowColor: C.shadow, borderLeftColor: C.success, borderLeftWidth: 4 }]}>
                        <View style={styles.distCardHeader}>
                          <Feather name="layers" size={16} color={C.success} />
                          <Text style={[styles.distCardTitle, { color: C.textSecondary }]}>توزيع الدخل حسب المصدر</Text>
                        </View>
                        <View style={{ gap: 8 }}>
                          {sources.slice(0, 5).map(([source, amount], idx) => {
                            const pct = (amount / totalIncome) * 100;
                            return (
                              <View key={idx} style={{ gap: 4 }}>
                                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                                  <Text style={[styles.distItem, { color: C.text, flex: 1 }]}>{source}</Text>
                                  <Text style={[styles.distPercentage, { color: C.success }]}>{toArabicNumerals(Math.round(pct))}٪</Text>
                                </View>
                                <View style={[styles.progressMini, { backgroundColor: C.backgroundSecondary }]}>
                                  <View style={[styles.progressMiniFill, { width: `${pct}%` as any, backgroundColor: C.success }]} />
                                </View>
                              </View>
                            );
                          })}
                        </View>
                        <Text style={[styles.distTotal, { color: C.success }]}>الإجمالي: {fc(totalIncome)}</Text>
                      </View>
                    ) : null;
                  })()}

                  {/* Taken Debts Distribution */}
                  {(() => {
                    const takenDebts = data.debts.filter(d => d.type === 'i_owe');
                    const totalTaken = takenDebts.reduce((s, d) => s + d.remaining, 0);
                    const debtsByPerson: Record<string, number> = {};
                    takenDebts.forEach(d => {
                      debtsByPerson[d.name] = (debtsByPerson[d.name] || 0) + d.remaining;
                    });
                    const debts = Object.entries(debtsByPerson).sort((a, b) => b[1] - a[1]);
                    return totalTaken > 0 ? (
                      <View style={[styles.distCard, { backgroundColor: C.backgroundCard, shadowColor: C.shadow, borderLeftColor: C.warning, borderLeftWidth: 4 }]}>
                        <View style={styles.distCardHeader}>
                          <Feather name="arrow-up-left" size={16} color={C.warning} />
                          <Text style={[styles.distCardTitle, { color: C.textSecondary }]}>توزيع الديون المأخوذة</Text>
                        </View>
                        <View style={{ gap: 8 }}>
                          {debts.slice(0, 5).map(([name, amount], idx) => {
                            const pct = (amount / totalTaken) * 100;
                            return (
                              <View key={idx} style={{ gap: 4 }}>
                                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                                  <Text style={[styles.distItem, { color: C.text, flex: 1 }]}>{name}</Text>
                                  <Text style={[styles.distPercentage, { color: C.warning }]}>{toArabicNumerals(Math.round(pct))}٪</Text>
                                </View>
                                <View style={[styles.progressMini, { backgroundColor: C.backgroundSecondary }]}>
                                  <View style={[styles.progressMiniFill, { width: `${pct}%` as any, backgroundColor: C.warning }]} />
                                </View>
                              </View>
                            );
                          })}
                        </View>
                        <Text style={[styles.distTotal, { color: C.warning }]}>الإجمالي: {fc(totalTaken)}</Text>
                      </View>
                    ) : null;
                  })()}

                  {/* Given Debts Distribution */}
                  {(() => {
                    const givenDebts = data.debts.filter(d => d.type === 'owed_to_me');
                    const totalGiven = givenDebts.reduce((s, d) => s + d.remaining, 0);
                    const debtsByPerson: Record<string, number> = {};
                    givenDebts.forEach(d => {
                      debtsByPerson[d.name] = (debtsByPerson[d.name] || 0) + d.remaining;
                    });
                    const debts = Object.entries(debtsByPerson).sort((a, b) => b[1] - a[1]);
                    return totalGiven > 0 ? (
                      <View style={[styles.distCard, { backgroundColor: C.backgroundCard, shadowColor: C.shadow, borderLeftColor: C.tint, borderLeftWidth: 4 }]}>
                        <View style={styles.distCardHeader}>
                          <Feather name="arrow-down-left" size={16} color={C.tint} />
                          <Text style={[styles.distCardTitle, { color: C.textSecondary }]}>توزيع الديون المعطاة</Text>
                        </View>
                        <View style={{ gap: 8 }}>
                          {debts.slice(0, 5).map(([name, amount], idx) => {
                            const pct = (amount / totalGiven) * 100;
                            return (
                              <View key={idx} style={{ gap: 4 }}>
                                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                                  <Text style={[styles.distItem, { color: C.text, flex: 1 }]}>{name}</Text>
                                  <Text style={[styles.distPercentage, { color: C.tint }]}>{toArabicNumerals(Math.round(pct))}٪</Text>
                                </View>
                                <View style={[styles.progressMini, { backgroundColor: C.backgroundSecondary }]}>
                                  <View style={[styles.progressMiniFill, { width: `${pct}%` as any, backgroundColor: C.tint }]} />
                                </View>
                              </View>
                            );
                          })}
                        </View>
                        <Text style={[styles.distTotal, { color: C.tint }]}>الإجمالي: {fc(totalGiven)}</Text>
                      </View>
                    ) : null;
                  })()}

                  {/* Expenses Distribution by Month */}
                  {(() => {
                    const monthExpenses = data.months.map(m => ({
                      name: `${ARABIC_MONTHS[m.month - 1]}`,
                      amount: getMonthBudgetUsed(m.id),
                    })).filter(m => m.amount > 0).sort((a, b) => b.amount - a.amount);
                    const totalMonthExpenses = monthExpenses.reduce((s, m) => s + m.amount, 0);
                    return monthExpenses.length > 0 ? (
                      <View style={[styles.distCard, { backgroundColor: C.backgroundCard, shadowColor: C.shadow, borderLeftColor: C.navy, borderLeftWidth: 4 }]}>
                        <View style={styles.distCardHeader}>
                          <Feather name="calendar" size={16} color={C.navy} />
                          <Text style={[styles.distCardTitle, { color: C.textSecondary }]}>توزيع المصاريف حسب الشهر</Text>
                        </View>
                        <View style={{ gap: 8 }}>
                          {monthExpenses.slice(0, 5).map(({ name, amount }, idx) => {
                            const pct = (amount / totalMonthExpenses) * 100;
                            return (
                              <View key={idx} style={{ gap: 4 }}>
                                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                                  <Text style={[styles.distItem, { color: C.text, flex: 1 }]}>{name}</Text>
                                  <Text style={[styles.distPercentage, { color: C.navy }]}>{toArabicNumerals(Math.round(pct))}٪</Text>
                                </View>
                                <View style={[styles.progressMini, { backgroundColor: C.backgroundSecondary }]}>
                                  <View style={[styles.progressMiniFill, { width: `${pct}%` as any, backgroundColor: C.navy }]} />
                                </View>
                              </View>
                            );
                          })}
                        </View>
                        <Text style={[styles.distTotal, { color: C.navy }]}>الإجمالي: {fc(totalMonthExpenses)}</Text>
                      </View>
                    ) : null;
                  })()}
                </View>
              </>
            ) : (
              <View style={styles.emptyState}>
                <Feather name="pie-chart" size={48} color={C.border} />
                <Text style={[styles.emptyTitle, { color: C.textSecondary }]}>لا توجد مصاريف</Text>
                <Text style={[styles.emptyText, { color: C.textMuted }]}>في الفترة المحددة</Text>
              </View>
            )}
          </>
        )}

        {/* ═══ INSIGHTS TAB ═══ */}
        {activeTab === "insights" && (() => {
          const { currentMonth, prevMonth, currentSpent, prevSpent, spendingDelta,
            topCat, dailyAvg, projectedTotal, willExceed, projectedPct,
            daysInMonth, dayOfMonth } = insights;

          if (!currentMonth) {
            return (
              <View style={styles.emptyState}>
                <Feather name="activity" size={48} color={C.border} />
                <Text style={[styles.emptyTitle, { color: C.textSecondary }]}>لا توجد بيانات</Text>
                <Text style={[styles.emptyText, { color: C.textMuted }]}>أضف شهراً ومصاريف لعرض الرؤى</Text>
              </View>
            );
          }

          const currentMonthName = `${ARABIC_MONTHS[currentMonth.month - 1]} ${currentMonth.year}`;
          const deltaPositive = spendingDelta >= 0;

          return (
            <View style={{ paddingHorizontal: 16, gap: 12 }}>
              {/* vs Last Month */}
              <View style={[styles.insightCard, { backgroundColor: C.backgroundCard, shadowColor: C.shadow }]}>
                <View style={styles.insightHeader}>
                  <View style={[styles.insightIcon, { backgroundColor: deltaPositive ? C.danger + "15" : C.success + "20" }]}>
                    <Feather name={deltaPositive ? "trending-up" : "trending-down"} size={16} color={deltaPositive ? C.danger : C.successDark} />
                  </View>
                  <Text style={[styles.insightTitle, { color: C.text }]}>مقارنة بالشهر الماضي</Text>
                </View>
                {prevMonth ? (
                  <>
                    <Text style={[styles.insightValue, { color: deltaPositive ? C.danger : C.successDark }]}>
                      {deltaPositive ? "+" : ""}{toArabicNumerals(Math.round(Math.abs(spendingDelta)))}٪ {deltaPositive ? "أكثر" : "أقل"}
                    </Text>
                    <View style={styles.insightCompareRow}>
                      <Text style={[styles.insightSub, { color: C.textSecondary }]}>
                        {`${ARABIC_MONTHS[prevMonth.month - 1]}: ${fc(prevSpent)}`}
                      </Text>
                      <Text style={[styles.insightSub, { color: C.textSecondary }]}>
                        {`${ARABIC_MONTHS[currentMonth.month - 1]}: ${fc(currentSpent)}`}
                      </Text>
                    </View>
                  </>
                ) : (
                  <Text style={[styles.insightSub, { color: C.textMuted }]}>لا يوجد شهر سابق للمقارنة</Text>
                )}
              </View>

              {/* Budget Pace */}
              <View style={[styles.insightCard, { backgroundColor: willExceed ? C.danger + "12" : C.backgroundCard, borderColor: willExceed ? C.danger + "40" : "transparent", borderWidth: willExceed ? 1 : 0, shadowColor: C.shadow }]}>
                <View style={styles.insightHeader}>
                  <View style={[styles.insightIcon, { backgroundColor: willExceed ? C.danger + "20" : C.tint + "15" }]}>
                    <Feather name={willExceed ? "alert-triangle" : "check-circle"} size={16} color={willExceed ? C.danger : C.tint} />
                  </View>
                  <Text style={[styles.insightTitle, { color: C.text }]}>وتيرة الإنفاق</Text>
                </View>
                <Text style={[styles.insightValue, { color: willExceed ? C.danger : C.tint }]}>
                  {willExceed ? "ستتجاوز الميزانية" : "على المسار الصحيح"}
                </Text>
                <Text style={[styles.insightSub, { color: C.textSecondary }]}>
                  {`يوم ${toArabicNumerals(dayOfMonth)} من ${toArabicNumerals(daysInMonth)} · متوقع: ${fc(Math.round(projectedTotal))}`}
                </Text>
                <View style={[styles.paceBar, { backgroundColor: C.backgroundSecondary, marginTop: 10 }]}>
                  <View style={[styles.paceBarFill, { width: `${Math.min(projectedPct, 1) * 100}%` as any, backgroundColor: willExceed ? C.danger : C.tint }]} />
                </View>
              </View>

              {/* Daily Average */}
              <View style={[styles.insightCard, { backgroundColor: C.backgroundCard, shadowColor: C.shadow }]}>
                <View style={styles.insightHeader}>
                  <View style={[styles.insightIcon, { backgroundColor: C.navy + "15" }]}>
                    <Feather name="clock" size={16} color={C.navy} />
                  </View>
                  <Text style={[styles.insightTitle, { color: C.text }]}>متوسط الإنفاق اليومي</Text>
                </View>
                <Text style={[styles.insightValue, { color: C.text }]}>{fc(Math.round(dailyAvg))}</Text>
                <Text style={[styles.insightSub, { color: C.textSecondary }]}>
                  {currentMonthName} · {toArabicNumerals(dayOfMonth)} يوم مضى
                </Text>
              </View>

              {/* Top Category */}
              {topCat && (
                <View style={[styles.insightCard, { backgroundColor: C.backgroundCard, shadowColor: C.shadow }]}>
                  <View style={styles.insightHeader}>
                    <View style={[styles.insightIcon, { backgroundColor: C.warning + "20" }]}>
                      <Feather name="tag" size={16} color={C.warning} />
                    </View>
                    <Text style={[styles.insightTitle, { color: C.text }]}>أكثر فئة إنفاقاً هذا الشهر</Text>
                  </View>
                  <Text style={[styles.insightValue, { color: C.text }]}>{topCat[0]}</Text>
                  <Text style={[styles.insightSub, { color: C.textSecondary }]}>
                    {fc(topCat[1])} · {toArabicNumerals(Math.round(currentSpent > 0 ? (topCat[1] / currentSpent) * 100 : 0))}٪ من إجمالي المصاريف
                  </Text>
                </View>
              )}

              {/* Top Spending Day */}
              {(() => {
                const currentExpenses = currentMonth
                  ? data.expenses.filter((e) => e.monthId === currentMonth.id)
                  : [];
                const dayMap: Record<number, number> = {};
                currentExpenses.forEach((e) => {
                  const d = new Date(e.createdAt).getDate();
                  dayMap[d] = (dayMap[d] || 0) + e.amount;
                });
                const topDay = Object.entries(dayMap).sort((a, b) => Number(b[1]) - Number(a[1]))[0];
                if (!topDay) return null;
                return (
                  <View style={[styles.insightCard, { backgroundColor: C.backgroundCard, shadowColor: C.shadow }]}>
                    <View style={styles.insightHeader}>
                      <View style={[styles.insightIcon, { backgroundColor: C.tint + "15" }]}>
                        <Feather name="calendar" size={16} color={C.tint} />
                      </View>
                      <Text style={[styles.insightTitle, { color: C.text }]}>أكثر يوم صرفاً</Text>
                    </View>
                    <Text style={[styles.insightValue, { color: C.text }]}>
                      يوم {toArabicNumerals(Number(topDay[0]))}
                    </Text>
                    <Text style={[styles.insightSub, { color: C.textSecondary }]}>
                      {fc(Math.round(Number(topDay[1])))} في يوم واحد
                    </Text>
                  </View>
                );
              })()}

              {/* Debts Overview */}
              {(() => {
                const totalDebtsTaken = data.debts.filter(d => d.type === 'taken').reduce((s, d) => s + d.amount, 0);
                const totalDebtsGiven = data.debts.filter(d => d.type === 'given').reduce((s, d) => s + d.amount, 0);
                if (totalDebtsTaken === 0 && totalDebtsGiven === 0) return null;
                return (
                  <>
                    {totalDebtsTaken > 0 && (
                      <View style={[styles.insightCard, { backgroundColor: C.backgroundCard, shadowColor: C.shadow }]}>
                        <View style={styles.insightHeader}>
                          <View style={[styles.insightIcon, { backgroundColor: C.danger + "15" }]}>
                            <Feather name="arrow-up-right" size={16} color={C.danger} />
                          </View>
                          <Text style={[styles.insightTitle, { color: C.text }]}>ديون عليك</Text>
                        </View>
                        <Text style={[styles.insightValue, { color: C.danger }]}>{fc(totalDebtsTaken)}</Text>
                        <Text style={[styles.insightSub, { color: C.textSecondary }]}>
                          {toArabicNumerals(data.debts.filter(d => d.type === 'taken').length)} دين(ة)
                        </Text>
                      </View>
                    )}
                    {totalDebtsGiven > 0 && (
                      <View style={[styles.insightCard, { backgroundColor: C.backgroundCard, shadowColor: C.shadow }]}>
                        <View style={styles.insightHeader}>
                          <View style={[styles.insightIcon, { backgroundColor: C.success + "20" }]}>
                            <Feather name="arrow-down-left" size={16} color={C.successDark} />
                          </View>
                          <Text style={[styles.insightTitle, { color: C.text }]}>ديون لك</Text>
                        </View>
                        <Text style={[styles.insightValue, { color: C.successDark }]}>{fc(totalDebtsGiven)}</Text>
                        <Text style={[styles.insightSub, { color: C.textSecondary }]}>
                          {toArabicNumerals(data.debts.filter(d => d.type === 'given').length)} دين(ة)
                        </Text>
                      </View>
                    )}
                  </>
                );
              })()}

              {/* Quick stats row */}
              <View style={styles.quickStatsRow}>
                {[
                  { label: "عدد الشهور", value: toArabicNumerals(data.months.length), icon: "calendar" },
                  { label: "عدد المصاريف", value: toArabicNumerals(data.expenses.length), icon: "list" },
                  { label: "السيولة", value: fc(data.savings), icon: "pocket" },
                  { label: "الخزائن", value: toArabicNumerals(data.vaults.length), icon: "archive" },
                ].map((item, i) => (
                  <View key={i} style={[styles.quickStat, { backgroundColor: C.backgroundCard, shadowColor: C.shadow }]}>
                    <Feather name={item.icon as any} size={14} color={C.navy} />
                    <Text style={[styles.quickStatVal, { color: C.text }]}>{item.value}</Text>
                    <Text style={[styles.quickStatLbl, { color: C.textMuted }]}>{item.label}</Text>
                  </View>
                ))}
              </View>
            </View>
          );
        })()}
      </ScrollView>
      <ScrollToTopButton scrollViewRef={scrollViewRef} colors={C} opacity={opacity} shouldShow={shouldShow} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { paddingHorizontal: 20, paddingBottom: 12 },
  headerTitle: { fontFamily: "Cairo_900Black", fontSize: 28 },
  headerSub: { fontFamily: "Cairo_400Regular", fontSize: 13 },
  tabBar: {
    flexDirection: "row", marginHorizontal: 16, marginBottom: 16,
    borderRadius: 12, padding: 4, gap: 4,
  },
  tabBtn: { flex: 1, paddingVertical: 8, borderRadius: 9, alignItems: "center" },
  tabBtnText: { fontFamily: "Cairo_600SemiBold", fontSize: 11 },
  statsRow: { flexDirection: "row", gap: 12, paddingHorizontal: 16, marginBottom: 16 },
  statCard: { flex: 1, borderRadius: 16, padding: 16, gap: 6 },
  statCardValue: { fontFamily: "Cairo_700Bold", fontSize: 15, color: "#fff" },
  statCardLabel: { fontFamily: "Cairo_400Regular", fontSize: 11, color: "rgba(255,255,255,0.7)" },
  chartCard: {
    marginHorizontal: 16, marginBottom: 16, borderRadius: 20, padding: 16,
    shadowOffset: { width: 0, height: 2 }, shadowOpacity: 1, shadowRadius: 8, elevation: 3,
  },
  chartHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 16 },
  chartTitle: { fontFamily: "Cairo_700Bold", fontSize: 15 },
  legend: { flexDirection: "row", alignItems: "center", gap: 6 },
  legendDot: { width: 8, height: 8, borderRadius: 4 },
  legendText: { fontFamily: "Cairo_400Regular", fontSize: 10 },
  savingsHeader: { flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 12 },
  savingsDetails: { flexDirection: "row", alignItems: "center" },
  savingsStat: { flex: 1, alignItems: "center" },
  savingsDivider: { width: 1, height: 40 },
  savingsStatLabel: { fontFamily: "Cairo_400Regular", fontSize: 12, marginBottom: 4 },
  savingsStatValue: { fontFamily: "Cairo_700Bold", fontSize: 18 },
  compareRow: { marginBottom: 16, paddingBottom: 16, borderBottomWidth: 1 },
  compareHeader: { flexDirection: "row", justifyContent: "space-between", marginBottom: 6 },
  compareMonth: { fontFamily: "Cairo_600SemiBold", fontSize: 14 },
  comparePct: { fontFamily: "Cairo_700Bold", fontSize: 13 },
  compareBar: { height: 6, borderRadius: 3, overflow: "hidden", marginBottom: 8 },
  compareBarFill: { height: "100%", borderRadius: 3 },
  compareAmounts: { flexDirection: "row", justifyContent: "space-between" },
  compareAmt: { fontFamily: "Cairo_400Regular", fontSize: 11 },
  filterRow: { marginBottom: 12 },
  filterChipRow: { flexDirection: "row" },
  filterChip: { paddingHorizontal: 14, paddingVertical: 7, borderRadius: 20, borderWidth: 1 },
  filterChipText: { fontFamily: "Cairo_600SemiBold", fontSize: 12 },
  donutSection: { flexDirection: "row", alignItems: "center", gap: 16 },
  categoryList: { flex: 1, gap: 8 },
  categoryItem: { flexDirection: "row", alignItems: "center", gap: 8 },
  categoryDot: { width: 8, height: 8, borderRadius: 4, flexShrink: 0 },
  categoryLabel: { fontFamily: "Cairo_400Regular", fontSize: 11, flex: 1 },
  categoryValues: { flexDirection: "row", alignItems: "center", gap: 6 },
  categoryPercentage: { fontFamily: "Cairo_700Bold", fontSize: 10, minWidth: 28 },
  categoryValue: { fontFamily: "Cairo_700Bold", fontSize: 11 },
  distributionCards: { marginHorizontal: 16, marginBottom: 16, gap: 12 },
  distCard: { borderRadius: 14, padding: 14, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 1, shadowRadius: 6, elevation: 2 },
  distCardHeader: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 8 },
  distCardTitle: { fontFamily: "Cairo_600SemiBold", fontSize: 12 },
  distCardValue: { fontFamily: "Cairo_900Black", fontSize: 16 },
  distCardMeta: { fontFamily: "Cairo_400Regular", fontSize: 11 },
  distItem: { fontFamily: "Cairo_500Medium", fontSize: 12 },
  distPercentage: { fontFamily: "Cairo_700Bold", fontSize: 13, minWidth: 40, textAlign: "right" },
  progressMini: { height: 4, borderRadius: 2, overflow: "hidden" },
  progressMiniFill: { height: "100%", borderRadius: 2 },
  distTotal: { fontFamily: "Cairo_700Bold", fontSize: 13, marginTop: 8, paddingTop: 8 },
  emptyState: { alignItems: "center", justifyContent: "center", paddingVertical: 48, gap: 12 },
  emptyTitle: { fontFamily: "Cairo_700Bold", fontSize: 18 },
  emptyText: { fontFamily: "Cairo_400Regular", fontSize: 14, textAlign: "center" },
  insightCard: {
    borderRadius: 18, padding: 16,
    shadowOffset: { width: 0, height: 2 }, shadowOpacity: 1, shadowRadius: 8, elevation: 3,
  },
  insightHeader: { flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 10 },
  insightIcon: { width: 34, height: 34, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  insightTitle: { fontFamily: "Cairo_600SemiBold", fontSize: 14 },
  insightValue: { fontFamily: "Cairo_900Black", fontSize: 20, marginBottom: 4 },
  insightSub: { fontFamily: "Cairo_400Regular", fontSize: 12 },
  insightCompareRow: { flexDirection: "row", justifyContent: "space-between", marginTop: 4 },
  paceBar: { height: 6, borderRadius: 3, overflow: "hidden" },
  paceBarFill: { height: "100%", borderRadius: 3 },
  quickStatsRow: { flexDirection: "row", gap: 10, marginBottom: 8 },
  quickStat: {
    flex: 1, borderRadius: 14, padding: 12, alignItems: "center", gap: 4,
    shadowOffset: { width: 0, height: 1 }, shadowOpacity: 1, shadowRadius: 4, elevation: 2,
  },
  quickStatVal: { fontFamily: "Cairo_700Bold", fontSize: 13 },
  quickStatLbl: { fontFamily: "Cairo_400Regular", fontSize: 10, textAlign: "center" },
});
