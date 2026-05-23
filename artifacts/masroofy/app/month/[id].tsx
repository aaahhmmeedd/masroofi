import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { router, useLocalSearchParams } from "expo-router";
import React, { useState } from "react";
import {
  Alert,
  FlatList,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Svg, { Circle } from "react-native-svg";

import { ARABIC_MONTHS, toArabicNumerals } from "@/constants/arabic";
import { Expense, Transaction } from "@/constants/types";
import { useApp } from "@/context/AppContext";
import { notifyBudgetWarning } from "@/services/notifications";

function ProgressCircle({ pct, C }: { pct: number; C: any }) {
  const size = 130;
  const strokeWidth = 12;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const color = pct > 0.85 ? C.danger : pct > 0.6 ? C.warning : C.success;
  return (
    <View style={styles.circleContainer}>
      <Svg width={size} height={size} style={{ transform: [{ rotate: "-90deg" }] }}>
        <Circle cx={size / 2} cy={size / 2} r={radius} stroke={C.backgroundSecondary} strokeWidth={strokeWidth} fill="none" />
        <Circle cx={size / 2} cy={size / 2} r={radius} stroke={color} strokeWidth={strokeWidth} fill="none"
          strokeDasharray={circumference} strokeDashoffset={circumference - pct * circumference} strokeLinecap="round" />
      </Svg>
      <View style={styles.circleInner}>
        <Text style={[styles.circlePercent, { color }]}>{toArabicNumerals(Math.round(pct * 100))}٪</Text>
        <Text style={[styles.circleLabel, { color: C.textSecondary }]}>مستهلك</Text>
      </View>
    </View>
  );
}

function TransactionIcon({ type, C }: { type: Transaction["type"]; C: any }) {
  const cfg: Record<string, { icon: string; color: string }> = {
    expense: { icon: "minus-circle", color: C.danger },
    income: { icon: "plus-circle", color: C.success },
    vault_deposit: { icon: "archive", color: C.tint },
    savings_add: { icon: "pocket", color: C.tint },
    store_to_vault: { icon: "archive", color: C.navy },
    month_ended: { icon: "check-circle", color: C.successDark },
  };
  const c = cfg[type] || { icon: "circle", color: C.textMuted };
  return <Feather name={c.icon as any} size={16} color={c.color} />;
}

export default function MonthDetailScreen() {
  const insets = useSafeAreaInsets();
  const { id } = useLocalSearchParams<{ id: string }>();
  const {
    data, colors: C, fc,
    deleteMonth, getMonthExpenses, getMonthBudgetUsed, getMonthIncome, getMonthTransactions,
    deleteExpense, endMonth, updateMonthBudget, deleteTransaction,
  } = useApp();
  const isWeb = Platform.OS === "web";
  const topInset = isWeb ? 67 : insets.top;
  const bottomInset = isWeb ? 34 : insets.bottom;
  const [activeTab, setActiveTab] = useState<"summary" | "transactions">("summary");

  const [showEndModal, setShowEndModal] = useState(false);
  const [showBudgetModal, setShowBudgetModal] = useState(false);
  const [newBudget, setNewBudget] = useState("");
  const [saving, setSaving] = useState(false);

  const month = data.months.find((m) => m.id === id);
  if (!month) {
    return (
      <View style={[styles.container, { paddingTop: topInset, backgroundColor: C.background }]}>
        <Text style={[styles.errorText, { color: C.textSecondary }]}>الشهر غير موجود</Text>
      </View>
    );
  }

  const expenses      = getMonthExpenses(id);
  const income        = getMonthIncome(id);
  const budgetSpent   = getMonthBudgetUsed(id);
  const totalAvailable = month.budget + income.total;
  const remaining     = totalAvailable - budgetSpent;
  const pct           = totalAvailable > 0 ? Math.min(budgetSpent / totalAvailable, 1) : 0;
  const transactions  = getMonthTransactions(id);
  const totalSpentAll = expenses.reduce((s, e) => s + e.amount, 0);

  const handleDeleteExpense = (expenseId: string) => {
    Alert.alert("حذف المصروف", "هل أنت متأكد؟", [
      { text: "إلغاء", style: "cancel" },
      { text: "حذف", style: "destructive", onPress: () => { Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning); deleteExpense(expenseId); } },
    ]);
  };

  const handleEditExpense = (expenseId: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.push({ pathname: "/expense/edit", params: { expenseId } });
  };

  const handleDeleteTransaction = (txId: string) => {
    const doDelete = () => {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      deleteTransaction(txId);
    };
    if (Platform.OS === "web") {
      if (window.confirm("حذف الحركة\nهل أنت متأكد؟ سيتم عكس تأثير هذه الحركة على الميزانية.")) doDelete();
    } else {
      Alert.alert("حذف الحركة", "هل أنت متأكد؟ سيتم عكس تأثير هذه الحركة على الميزانية.", [
        { text: "إلغاء", style: "cancel" },
        { text: "حذف", style: "destructive", onPress: doDelete },
      ]);
    }
  };

  const handleDeleteMonth = () => {
    const doDelete = () => { deleteMonth(id); router.back(); };
    if (Platform.OS === "web") {
      if (window.confirm("حذف الشهر\nسيتم حذف جميع مصاريف هذا الشهر. هل أنت متأكد؟")) doDelete();
    } else {
      Alert.alert("حذف الشهر", "سيتم حذف جميع مصاريف هذا الشهر", [
        { text: "إلغاء", style: "cancel" },
        { text: "حذف", style: "destructive", onPress: doDelete },
      ]);
    }
  };

  const handleSaveBudget = async () => {
    const b = parseFloat(newBudget);
    if (isNaN(b) || b < 0) { Alert.alert("خطأ", "يرجى إدخال ميزانية صحيحة"); return; }
    setSaving(true);
    await updateMonthBudget(id, b);
    setSaving(false);
    setShowBudgetModal(false);
    setNewBudget("");
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  };

  const handleEndMonth = async () => {
    if (month.isEnded) { Alert.alert("تنبيه", "هذا الشهر منتهٍ بالفعل"); return; }
    setShowEndModal(true);
  };

  const confirmEndMonth = async () => {
    setShowEndModal(false);
    try {
      await endMonth(id);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch {
      Alert.alert("خطأ", "حدث خطأ أثناء إنهاء الشهر");
    }
  };

  const handleAddExpense = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    router.push({ pathname: "/expense/add", params: { monthId: id } });
    if (pct > 0.8 && data.settings.notificationsEnabled) {
      notifyBudgetWarning(`${ARABIC_MONTHS[month.month - 1]} ${month.year}`, pct).catch(() => {});
    }
  };

  const budgetPct = pct;
  const remainingPositive = Math.max(0, remaining);

  // Analytics for end-month modal
  const catMap: Record<string, number> = {};
  expenses.forEach((e) => { catMap[e.category] = (catMap[e.category] || 0) + e.amount; });
  const topCat = Object.entries(catMap).sort((a, b) => b[1] - a[1])[0];
  const dayOfMonth = new Date().getDate() || 1;
  const dailyAvg = Math.round(totalSpentAll / dayOfMonth);
  const sortedMonths = [...data.months].sort((a, b) =>
    new Date(b.year, b.month - 1).getTime() - new Date(a.year, a.month - 1).getTime()
  );
  const currentIdx = sortedMonths.findIndex((m) => m.id === id);
  const prevMonthData = sortedMonths[currentIdx + 1];
  const prevSpent = prevMonthData ? data.expenses
    .filter((e) => e.monthId === prevMonthData.id)
    .reduce((s, e) => s + e.amount, 0) : 0;
  const spendingDelta = prevSpent > 0 ? Math.round(((totalSpentAll - prevSpent) / prevSpent) * 100) : null;

  const header = (
    <>
      <View style={[styles.header, { paddingTop: topInset + 8, backgroundColor: C.navy }]}>
        <Pressable onPress={() => router.back()} style={styles.backBtn}>
          <Feather name="arrow-right" size={22} color={C.white} />
        </Pressable>
        <View style={{ flex: 1, alignItems: "center" }}>
          <Text style={[styles.headerTitle, { color: C.white }]}>
            {ARABIC_MONTHS[month.month - 1]} {toArabicNumerals(month.year)}
          </Text>
          {month.isEnded && (
            <View style={[styles.endedPill, { backgroundColor: "rgba(255,255,255,0.2)" }]}>
              <Text style={styles.endedPillText}>منتهي</Text>
            </View>
          )}
        </View>
        <View style={styles.headerActions}>
          {!month.isEnded && (
            <Pressable onPress={() => { setNewBudget(String(month.budget)); setShowBudgetModal(true); }} style={styles.backBtn}>
              <Feather name="edit-2" size={16} color="rgba(255,255,255,0.8)" />
            </Pressable>
          )}
          <Pressable onPress={handleDeleteMonth} style={styles.backBtn}>
            <Feather name="trash-2" size={16} color="rgba(255,255,255,0.7)" />
          </Pressable>
        </View>
      </View>

      <View style={styles.actionBtns}>
        <Pressable style={[styles.actionBtn, { backgroundColor: C.backgroundCard, borderColor: C.border }]} onPress={handleAddExpense}>
          <Feather name="minus" size={16} color={C.danger} />
          <Text style={[styles.actionBtnText, { color: C.danger }]}>مصروف</Text>
        </Pressable>
        <Pressable style={[styles.actionBtn, { backgroundColor: C.backgroundCard, borderColor: C.border }]}
          onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); router.push({ pathname: "/income/add", params: { monthId: id } }); }}>
          <Feather name="plus" size={16} color={C.success} />
          <Text style={[styles.actionBtnText, { color: C.success }]}>دخل</Text>
        </Pressable>
        <Pressable style={[styles.actionBtn, { backgroundColor: C.backgroundCard, borderColor: C.border }]}
          onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); router.push({ pathname: "/vault/store", params: { monthId: id } }); }}>
          <Feather name="archive" size={16} color={C.tint} />
          <Text style={[styles.actionBtnText, { color: C.tint }]}>تخزين</Text>
        </Pressable>
        <Pressable
          style={[styles.actionBtn, { backgroundColor: month.isEnded ? C.border : C.navy, borderColor: month.isEnded ? C.border : C.navy }]}
          onPress={handleEndMonth}
        >
          <Feather name="check-circle" size={16} color={month.isEnded ? C.textMuted : C.white} />
          <Text style={[styles.actionBtnText, { color: month.isEnded ? C.textMuted : C.white }]}>إنهاء</Text>
        </Pressable>
      </View>

      <View style={[styles.innerTabBar, { backgroundColor: C.backgroundSecondary }]}>
        <Pressable onPress={() => setActiveTab("summary")} style={[styles.innerTab, activeTab === "summary" && { backgroundColor: C.tint }]}>
          <Text style={[styles.innerTabText, { color: activeTab === "summary" ? C.white : C.textSecondary }]}>الملخص</Text>
        </Pressable>
        <Pressable onPress={() => setActiveTab("transactions")} style={[styles.innerTab, activeTab === "transactions" && { backgroundColor: C.tint }]}>
          <Text style={[styles.innerTabText, { color: activeTab === "transactions" ? C.white : C.textSecondary }]}>الحركات</Text>
        </Pressable>
      </View>

      {activeTab === "summary" && (
        <View style={[styles.summaryCard, { backgroundColor: C.backgroundCard, shadowColor: C.shadow }]}>
          <ProgressCircle pct={pct} C={C} />
          <View style={styles.financialBreakdown}>
            <View style={[styles.breakdownRow, { borderBottomColor: C.border }]}>
              <Text style={[styles.breakdownLabel, { color: C.textSecondary }]}>الميزانية الأساسية</Text>
              <Text style={[styles.breakdownValue, { color: C.text }]}>{fc(month.budget)}</Text>
            </View>
            {income.external > 0 && (
              <View style={[styles.breakdownRow, { borderBottomColor: C.border }]}>
                <Text style={[styles.breakdownLabel, { color: C.textSecondary }]}>دخل خارجي</Text>
                <Text style={[styles.breakdownValue, { color: C.success }]}>+{fc(income.external)}</Text>
              </View>
            )}
            {income.vault > 0 && (
              <View style={[styles.breakdownRow, { borderBottomColor: C.border }]}>
                <Text style={[styles.breakdownLabel, { color: C.textSecondary }]}>سحب من الخزائن</Text>
                <Text style={[styles.breakdownValue, { color: C.success }]}>+{fc(income.vault)}</Text>
              </View>
            )}
            {income.liquidity > 0 && (
              <View style={[styles.breakdownRow, { borderBottomColor: C.border }]}>
                <Text style={[styles.breakdownLabel, { color: C.textSecondary }]}>سحب من السيولة</Text>
                <Text style={[styles.breakdownValue, { color: C.success }]}>+{fc(income.liquidity)}</Text>
              </View>
            )}
            <View style={[styles.breakdownRow, { borderBottomColor: C.border, backgroundColor: C.backgroundSecondary }]}>
              <Text style={[styles.breakdownLabel, { color: C.text, fontFamily: "Cairo_700Bold" }]}>الإجمالي المتاح</Text>
              <Text style={[styles.breakdownValue, { color: C.text, fontFamily: "Cairo_700Bold" }]}>{fc(totalAvailable)}</Text>
            </View>
            <View style={[styles.breakdownRow, { borderBottomColor: C.border }]}>
              <Text style={[styles.breakdownLabel, { color: C.textSecondary }]}>إجمالي المصاريف</Text>
              <Text style={[styles.breakdownValue, { color: C.danger }]}>-{fc(totalSpentAll)}</Text>
            </View>
            <View style={[styles.breakdownRow, { borderBottomColor: "transparent" }]}>
              <Text style={[styles.breakdownLabel, { color: C.textSecondary }]}>المتبقي</Text>
              <Text style={[styles.breakdownValue, { color: remaining >= 0 ? C.success : C.danger, fontFamily: "Cairo_700Bold" }]}>{fc(remaining)}</Text>
            </View>
          </View>
        </View>
      )}

      {activeTab === "transactions" && (
        <View style={styles.txHeader}>
          <Text style={[styles.txHeaderTitle, { color: C.text }]}>الحركات المالية</Text>
          <Text style={[styles.txHeaderCount, { color: C.textSecondary }]}>{toArabicNumerals(transactions.length)} حركة</Text>
        </View>
      )}
    </>
  );

  return (
    <View style={[styles.container, { backgroundColor: C.background }]}>
      {activeTab === "summary" ? (
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: bottomInset + 80 }}>
          {header}
          <Text style={[styles.expensesHeaderTitle, { color: C.text }]}>المصاريف ({toArabicNumerals(expenses.length)})</Text>
          {expenses.length === 0 ? (
            <View style={styles.emptyState}>
              <Feather name="inbox" size={40} color={C.border} />
              <Text style={[styles.emptyText, { color: C.textMuted }]}>لا توجد مصاريف بعد</Text>
            </View>
          ) : (
            expenses.map((expense) => (
              <ExpenseItem key={expense.id} expense={expense} onDelete={handleDeleteExpense} onEdit={handleEditExpense} C={C} fc={fc} />
            ))
          )}
        </ScrollView>
      ) : (
        <FlatList
          data={transactions}
          keyExtractor={(item) => item.id}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: bottomInset + 80 }}
          ListHeaderComponent={() => header}
          ListEmptyComponent={() => (
            <View style={styles.emptyState}>
              <Feather name="activity" size={40} color={C.border} />
              <Text style={[styles.emptyText, { color: C.textMuted }]}>لا توجد حركات بعد</Text>
            </View>
          )}
          renderItem={({ item: tx }) => (
            <View style={[styles.txItem, { backgroundColor: C.backgroundCard, borderBottomColor: C.border }]}>
              <View style={[styles.txIconBox, { backgroundColor: C.backgroundSecondary }]}>
                <TransactionIcon type={tx.type} C={C} />
              </View>
              <View style={styles.txInfo}>
                <Text style={[styles.txName, { color: C.text }]}>{tx.name}</Text>
                <Text style={[styles.txMeta, { color: C.textMuted }]}>
                  {new Date(tx.createdAt).toLocaleDateString("ar-EG")} · {new Date(tx.createdAt).toLocaleTimeString("ar-EG", { hour: "2-digit", minute: "2-digit" })}
                </Text>
              </View>
              <View style={{ alignItems: "flex-end", gap: 4 }}>
                <Text style={[styles.txAmount, { color: tx.type === "expense" ? C.danger : tx.type === "income" ? C.success : C.tint }]}>
                  {tx.type === "expense" ? "-" : "+"}{fc(tx.amount)}
                </Text>
                {tx.type !== "month_ended" && !month.isEnded && (
                  <Pressable onPress={() => handleDeleteTransaction(tx.id)} style={[styles.txDeleteBtn, { backgroundColor: C.danger + "15" }]}>
                    <Feather name="trash-2" size={11} color={C.danger} />
                  </Pressable>
                )}
              </View>
            </View>
          )}
        />
      )}

      {/* ── Edit Budget Modal ── */}
      <Modal visible={showBudgetModal} transparent animationType="fade" onRequestClose={() => setShowBudgetModal(false)}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalBox, { backgroundColor: C.backgroundCard }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: C.text }]}>تعديل الميزانية</Text>
              <Pressable onPress={() => setShowBudgetModal(false)}>
                <Feather name="x" size={22} color={C.textMuted} />
              </Pressable>
            </View>
            <Text style={[styles.modalSub, { color: C.textSecondary }]}>
              الميزانية الحالية: {fc(month.budget)}
            </Text>
            <TextInput
              style={[styles.modalInput, { backgroundColor: C.backgroundSecondary, color: C.text, borderColor: C.border }]}
              value={newBudget} onChangeText={setNewBudget}
              keyboardType="decimal-pad" placeholder="الميزانية الجديدة"
              placeholderTextColor={C.textMuted} textAlign="right" autoFocus
            />
            <View style={styles.modalBtns}>
              <Pressable onPress={() => setShowBudgetModal(false)}
                style={[styles.modalBtn, { backgroundColor: C.backgroundSecondary }]}>
                <Text style={[styles.modalBtnText, { color: C.textSecondary }]}>إلغاء</Text>
              </Pressable>
              <Pressable onPress={handleSaveBudget} disabled={saving}
                style={[styles.modalBtn, { backgroundColor: C.navy, opacity: saving ? 0.6 : 1 }]}>
                <Text style={[styles.modalBtnText, { color: "#fff" }]}>حفظ</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      {/* ── End Month Summary Modal ── */}
      <Modal visible={showEndModal} transparent animationType="slide" onRequestClose={() => setShowEndModal(false)}>
        <View style={styles.modalOverlay}>
          <View style={[styles.summaryModal, { backgroundColor: C.backgroundCard }]}>
            <View style={styles.summaryModalTop}>
              <Feather name="check-circle" size={40} color={C.success} />
              <Text style={[styles.summaryModalTitle, { color: C.text }]}>إنهاء الشهر</Text>
              <Text style={[styles.summaryModalMonth, { color: C.textSecondary }]}>
                {ARABIC_MONTHS[month.month - 1]} {toArabicNumerals(month.year)}
              </Text>
            </View>

            <View style={[styles.summaryGrid, { backgroundColor: C.backgroundSecondary, borderColor: C.border }]}>
              <View style={styles.summaryCell}>
                <Text style={[styles.summaryCellLabel, { color: C.textMuted }]}>الميزانية</Text>
                <Text style={[styles.summaryCellValue, { color: C.text }]}>{fc(month.budget)}</Text>
              </View>
              <View style={[styles.summaryCellDivider, { backgroundColor: C.border }]} />
              <View style={styles.summaryCell}>
                <Text style={[styles.summaryCellLabel, { color: C.textMuted }]}>المصروف</Text>
                <Text style={[styles.summaryCellValue, { color: C.danger }]}>{fc(totalSpentAll)}</Text>
              </View>
              <View style={[styles.summaryCellDivider, { backgroundColor: C.border }]} />
              <View style={styles.summaryCell}>
                <Text style={[styles.summaryCellLabel, { color: C.textMuted }]}>المتبقي</Text>
                <Text style={[styles.summaryCellValue, { color: C.success }]}>{fc(remainingPositive)}</Text>
              </View>
            </View>

            <View style={[styles.summaryInfoBox, { backgroundColor: C.success + "12", borderColor: C.success + "30" }]}>
              <Feather name="trending-up" size={16} color={C.successDark} />
              <Text style={[styles.summaryInfoText, { color: C.successDark }]}>
                سيُضاف {fc(remainingPositive)} للسيولة تلقائياً
              </Text>
            </View>

            {budgetPct > 0.9 && (
              <View style={[styles.summaryWarning, { backgroundColor: C.danger + "12", borderColor: C.danger + "30" }]}>
                <Feather name="alert-triangle" size={14} color={C.danger} />
                <Text style={[styles.summaryWarningText, { color: C.danger }]}>استهلكت أكثر من ٩٠٪ من الميزانية هذا الشهر</Text>
              </View>
            )}

            {/* ── Analytics Section ── */}
            <View style={[styles.analyticsSection, { borderTopColor: C.border }]}>
              {topCat && (
                <View style={[styles.analyticsRow, { backgroundColor: C.backgroundSecondary, borderColor: C.border }]}>
                  <View style={[styles.analyticsIcon, { backgroundColor: C.warning + "20" }]}>
                    <Feather name="tag" size={13} color={C.warning} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.analyticsLabel, { color: C.textMuted }]}>أعلى تصنيف صرف</Text>
                    <Text style={[styles.analyticsValue, { color: C.text }]}>{topCat[0]}</Text>
                  </View>
                  <Text style={[styles.analyticsAmount, { color: C.danger }]}>{fc(topCat[1])}</Text>
                </View>
              )}
              <View style={[styles.analyticsRow, { backgroundColor: C.backgroundSecondary, borderColor: C.border }]}>
                <View style={[styles.analyticsIcon, { backgroundColor: C.navy + "15" }]}>
                  <Feather name="clock" size={13} color={C.navy} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.analyticsLabel, { color: C.textMuted }]}>متوسط الصرف اليومي</Text>
                  <Text style={[styles.analyticsValue, { color: C.text }]}>{fc(dailyAvg)}</Text>
                </View>
              </View>
              {spendingDelta !== null && (
                <View style={[styles.analyticsRow, { backgroundColor: C.backgroundSecondary, borderColor: C.border }]}>
                  <View style={[styles.analyticsIcon, { backgroundColor: (spendingDelta >= 0 ? C.danger : C.success) + "20" }]}>
                    <Feather name={spendingDelta >= 0 ? "trending-up" : "trending-down"} size={13} color={spendingDelta >= 0 ? C.danger : C.successDark} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.analyticsLabel, { color: C.textMuted }]}>مقارنة بالشهر الماضي</Text>
                    <Text style={[styles.analyticsValue, { color: spendingDelta >= 0 ? C.danger : C.successDark }]}>
                      {spendingDelta >= 0 ? "+" : ""}{toArabicNumerals(Math.abs(spendingDelta))}٪ {spendingDelta >= 0 ? "أكثر" : "أقل"}
                    </Text>
                  </View>
                </View>
              )}
            </View>

            <View style={styles.modalBtns}>
              <Pressable onPress={() => setShowEndModal(false)}
                style={[styles.modalBtn, { backgroundColor: C.backgroundSecondary }]}>
                <Text style={[styles.modalBtnText, { color: C.textSecondary }]}>إلغاء</Text>
              </Pressable>
              <Pressable onPress={confirmEndMonth}
                style={[styles.modalBtn, { backgroundColor: C.success }]}>
                <Feather name="check-circle" size={16} color="#fff" />
                <Text style={[styles.modalBtnText, { color: "#fff" }]}>إنهاء الشهر</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

function ExpenseItem({
  expense, onDelete, onEdit, C, fc,
}: { expense: Expense; onDelete: (id: string) => void; onEdit: (id: string) => void; C: any; fc: (n: number) => string }) {
  const sourceLabel = expense.source === "budget" ? "الميزانية" : expense.source === "savings" ? "السيولة" : "الخزنة";
  return (
    <View style={[styles.expenseItem, { backgroundColor: C.backgroundCard }]}>
      <View style={[styles.expenseDot, { backgroundColor: C.danger }]} />
      <View style={styles.expenseInfo}>
        <Text style={[styles.expenseName, { color: C.text }]}>{expense.name}</Text>
        <Text style={[styles.expenseCategory, { color: C.textSecondary }]}>{expense.category} · {sourceLabel}</Text>
      </View>
      <View style={styles.expenseRight}>
        <Text style={[styles.expenseAmount, { color: C.danger }]}>-{fc(expense.amount)}</Text>
        <View style={styles.expenseActions}>
          <Pressable onPress={() => onEdit(expense.id)} style={[styles.actionIconBtn, { backgroundColor: C.backgroundSecondary }]}>
            <Feather name="edit-2" size={13} color={C.textSecondary} />
          </Pressable>
          <Pressable onPress={() => onDelete(expense.id)} style={[styles.actionIconBtn, { backgroundColor: C.danger + "15" }]}>
            <Feather name="trash-2" size={13} color={C.danger} />
          </Pressable>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  errorText: { fontFamily: "Cairo_400Regular", textAlign: "center", marginTop: 48 },
  header: { flexDirection: "row", alignItems: "center", paddingHorizontal: 16, paddingBottom: 16, gap: 12 },
  backBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: "rgba(255,255,255,0.15)", alignItems: "center", justifyContent: "center" },
  headerTitle: { fontFamily: "Cairo_700Bold", fontSize: 17 },
  endedPill: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 10, marginTop: 2 },
  endedPillText: { fontFamily: "Cairo_600SemiBold", fontSize: 10, color: "#fff" },
  headerActions: { flexDirection: "row", gap: 6 },
  actionBtns: { flexDirection: "row", gap: 8, paddingHorizontal: 16, paddingVertical: 12 },
  actionBtn: { flex: 1, flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 4, paddingVertical: 10, borderRadius: 12, borderWidth: 1 },
  actionBtnText: { fontFamily: "Cairo_600SemiBold", fontSize: 11 },
  innerTabBar: { flexDirection: "row", marginHorizontal: 16, marginBottom: 12, borderRadius: 10, padding: 3 },
  innerTab: { flex: 1, paddingVertical: 7, borderRadius: 8, alignItems: "center" },
  innerTabText: { fontFamily: "Cairo_600SemiBold", fontSize: 13 },
  summaryCard: { margin: 16, borderRadius: 20, padding: 16, alignItems: "center", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 1, shadowRadius: 12, elevation: 4 },
  circleContainer: { position: "relative", alignItems: "center", justifyContent: "center", marginBottom: 16 },
  circleInner: { position: "absolute", alignItems: "center", justifyContent: "center" },
  circlePercent: { fontFamily: "Cairo_900Black", fontSize: 22 },
  circleLabel: { fontFamily: "Cairo_400Regular", fontSize: 11 },
  financialBreakdown: { width: "100%", borderRadius: 12, overflow: "hidden" },
  breakdownRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingVertical: 10, paddingHorizontal: 12, borderBottomWidth: 1 },
  breakdownLabel: { fontFamily: "Cairo_400Regular", fontSize: 13 },
  breakdownValue: { fontFamily: "Cairo_600SemiBold", fontSize: 13 },
  txHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingHorizontal: 20, marginBottom: 8, marginTop: 4 },
  txHeaderTitle: { fontFamily: "Cairo_700Bold", fontSize: 16 },
  txHeaderCount: { fontFamily: "Cairo_400Regular", fontSize: 13 },
  txItem: { flexDirection: "row", alignItems: "center", marginHorizontal: 16, marginBottom: 8, borderRadius: 12, padding: 12, gap: 10 },
  txIconBox: { width: 36, height: 36, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  txInfo: { flex: 1 },
  txName: { fontFamily: "Cairo_600SemiBold", fontSize: 14 },
  txMeta: { fontFamily: "Cairo_400Regular", fontSize: 11 },
  txAmount: { fontFamily: "Cairo_700Bold", fontSize: 13 },
  txDeleteBtn: { padding: 4, borderRadius: 6 },
  analyticsSection: { gap: 8, borderTopWidth: 1, paddingTop: 12 },
  analyticsRow: { flexDirection: "row", alignItems: "center", gap: 10, padding: 10, borderRadius: 12, borderWidth: 1 },
  analyticsIcon: { width: 30, height: 30, borderRadius: 8, alignItems: "center", justifyContent: "center" },
  analyticsLabel: { fontFamily: "Cairo_400Regular", fontSize: 11 },
  analyticsValue: { fontFamily: "Cairo_700Bold", fontSize: 13 },
  analyticsAmount: { fontFamily: "Cairo_700Bold", fontSize: 13 },
  expensesHeaderTitle: { fontFamily: "Cairo_700Bold", fontSize: 16, paddingHorizontal: 20, marginBottom: 8, marginTop: 4 },
  expenseItem: { flexDirection: "row", alignItems: "center", marginHorizontal: 16, marginBottom: 8, borderRadius: 14, padding: 14, gap: 12 },
  expenseDot: { width: 8, height: 8, borderRadius: 4 },
  expenseInfo: { flex: 1 },
  expenseName: { fontFamily: "Cairo_600SemiBold", fontSize: 15 },
  expenseCategory: { fontFamily: "Cairo_400Regular", fontSize: 12 },
  expenseRight: { alignItems: "flex-end", gap: 6 },
  expenseAmount: { fontFamily: "Cairo_700Bold", fontSize: 14 },
  expenseActions: { flexDirection: "row", gap: 6 },
  actionIconBtn: { width: 28, height: 28, borderRadius: 8, alignItems: "center", justifyContent: "center" },
  emptyState: { alignItems: "center", justifyContent: "center", paddingVertical: 40, gap: 12 },
  emptyText: { fontFamily: "Cairo_400Regular", fontSize: 15 },
  modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "center", alignItems: "center", padding: 24 },
  modalBox: { width: "100%", borderRadius: 20, padding: 24, gap: 16 },
  modalHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  modalTitle: { fontFamily: "Cairo_700Bold", fontSize: 18 },
  modalSub: { fontFamily: "Cairo_400Regular", fontSize: 13 },
  modalInput: { borderRadius: 12, borderWidth: 1, padding: 14, fontFamily: "Cairo_400Regular", fontSize: 16 },
  modalBtns: { flexDirection: "row", gap: 10 },
  modalBtn: { flex: 1, paddingVertical: 14, borderRadius: 12, alignItems: "center", flexDirection: "row", justifyContent: "center", gap: 6 },
  modalBtnText: { fontFamily: "Cairo_600SemiBold", fontSize: 15 },
  summaryModal: { width: "100%", borderRadius: 24, padding: 24, gap: 16 },
  summaryModalTop: { alignItems: "center", gap: 8 },
  summaryModalTitle: { fontFamily: "Cairo_900Black", fontSize: 22 },
  summaryModalMonth: { fontFamily: "Cairo_600SemiBold", fontSize: 14 },
  summaryGrid: { flexDirection: "row", borderRadius: 16, borderWidth: 1, overflow: "hidden" },
  summaryCell: { flex: 1, alignItems: "center", paddingVertical: 14, gap: 4 },
  summaryCellDivider: { width: 1 },
  summaryCellLabel: { fontFamily: "Cairo_400Regular", fontSize: 11 },
  summaryCellValue: { fontFamily: "Cairo_700Bold", fontSize: 15 },
  summaryInfoBox: { flexDirection: "row", alignItems: "center", gap: 8, borderRadius: 12, borderWidth: 1, padding: 12 },
  summaryInfoText: { fontFamily: "Cairo_600SemiBold", fontSize: 13, flex: 1 },
  summaryWarning: { flexDirection: "row", alignItems: "center", gap: 8, borderRadius: 12, borderWidth: 1, padding: 12 },
  summaryWarningText: { fontFamily: "Cairo_600SemiBold", fontSize: 12, flex: 1 },
});
