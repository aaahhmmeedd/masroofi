import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import * as LocalAuthentication from "expo-local-authentication";
import { router } from "expo-router";
import React, { useEffect, useState } from "react";
import {
  Alert,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  Share,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useApp } from "@/context/AppContext";
import { requestPermissions } from "@/services/notifications";

const CURRENCIES = [
  { symbol: "ج.م", label: "جنيه مصري" },
  { symbol: "ر.س", label: "ريال سعودي" },
  { symbol: "$",   label: "دولار" },
] as const;

function SectionLabel({ text }: { text: string }) {
  const { colors: C } = useApp();
  return <Text style={[styles.sectionLabel, { color: C.textSecondary }]}>{text}</Text>;
}

function SettingRow({
  icon, title, subtitle, onPress, rightElement, danger,
}: {
  icon: string; title: string; subtitle?: string;
  onPress?: () => void; rightElement?: React.ReactNode; danger?: boolean;
}) {
  const { colors: C } = useApp();
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [styles.settingRow, pressed && { opacity: 0.7 }]}>
      <View style={[styles.settingIcon, { backgroundColor: danger ? C.danger + "15" : C.navy + "15" }]}>
        <Feather name={icon as any} size={18} color={danger ? C.danger : C.navy} />
      </View>
      <View style={styles.settingText}>
        <Text style={[styles.settingTitle, { color: danger ? C.danger : C.text }]}>{title}</Text>
        {subtitle && <Text style={[styles.settingSubtitle, { color: C.textSecondary }]}>{subtitle}</Text>}
      </View>
      {rightElement || (onPress && <Feather name="chevron-left" size={16} color={C.textMuted} />)}
    </Pressable>
  );
}

function Divider() {
  const { colors: C } = useApp();
  return <View style={[styles.divider, { backgroundColor: C.border }]} />;
}

export default function SettingsScreen() {
  const insets = useSafeAreaInsets();
  const {
    data, colors: C, fc,
    updateSettings, addRecurringExpense, deleteRecurringExpense,
    exportData, importData, generateDemoData,
  } = useApp();
  const isWeb = Platform.OS === "web";
  const topInset  = isWeb ? 67 : insets.top;
  const bottomInset = isWeb ? 34 : insets.bottom;

  const categories = data.categories?.length ? data.categories : ["أخرى"];
  const [biometricAvailable, setBiometricAvailable] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [importText, setImportText] = useState("");
  const [importError, setImportError] = useState("");
  const [showAddRecurring, setShowAddRecurring] = useState(false);
  const [recurringName, setRecurringName] = useState("");
  const [recurringAmount, setRecurringAmount] = useState("");
  const [recurringCategory, setRecurringCategory] = useState(categories[0]);

  useEffect(() => {
    if (Platform.OS !== "web") {
      LocalAuthentication.hasHardwareAsync().then((has) => {
        if (has) LocalAuthentication.isEnrolledAsync().then(setBiometricAvailable);
      });
    }
  }, []);

  const confirm = (title: string, msg: string, onConfirm: () => void) => {
    if (Platform.OS === "web") {
      if (window.confirm(`${title}\n${msg}`)) onConfirm();
    } else {
      Alert.alert(title, msg, [
        { text: "إلغاء", style: "cancel" },
        { text: "تأكيد", style: "destructive", onPress: onConfirm },
      ]);
    }
  };

  const handleExport = async () => {
    try {
      const json = await exportData();
      if (Platform.OS === "web") {
        const blob = new Blob([json], { type: "application/json" });
        const url  = URL.createObjectURL(blob);
        const a    = document.createElement("a");
        a.href = url; a.download = "masroofy-backup.json"; a.click();
      } else {
        await Share.share({ message: json, title: "مصروفي - نسخة احتياطية" });
      }
    } catch { Alert.alert("خطأ", "فشل في تصدير البيانات"); }
  };

  const generateMonthlyReportHTML = () => {
    const now = new Date();
    const months = data.months.slice(0, 3);
    const currency = data.settings.currency;
    const fmtAmt = (n: number) => `${n.toLocaleString("ar-EG")} ${currency}`;

    const monthRows = months.map((m) => {
      const mExpenses = data.expenses.filter((e) => e.monthId === m.id);
      const spent = mExpenses.reduce((s, e) => s + e.amount, 0);
      const remaining = m.budget - spent;
      const monthNames = ["يناير","فبراير","مارس","أبريل","مايو","يونيو","يوليو","أغسطس","سبتمبر","أكتوبر","نوفمبر","ديسمبر"];
      return `
        <tr>
          <td>${monthNames[m.month - 1]} ${m.year}</td>
          <td>${fmtAmt(m.budget)}</td>
          <td style="color:#c0504a">${fmtAmt(spent)}</td>
          <td style="color:${remaining >= 0 ? "#1b818f" : "#c0504a"}">${fmtAmt(remaining)}</td>
          <td>${m.isEnded ? "منتهي" : "جاري"}</td>
        </tr>`;
    }).join("");

    const catMap: Record<string, number> = {};
    data.expenses.forEach((e) => { catMap[e.category] = (catMap[e.category] || 0) + e.amount; });
    const topCats = Object.entries(catMap).sort((a, b) => b[1] - a[1]).slice(0, 5);
    const catRows = topCats.map(([cat, amt]) =>
      `<tr><td>${cat}</td><td style="color:#c0504a">${fmtAmt(amt)}</td></tr>`
    ).join("");

    const activeDebts = (data.debts || []).filter((d) => !d.isPaid);
    const debtRows = activeDebts.map((d) =>
      `<tr><td>${d.name}</td><td>${d.type === "owed_to_me" ? "مديون لي" : "عليّ"}</td><td>${fmtAmt(d.remaining)}</td></tr>`
    ).join("");

    return `<!DOCTYPE html>
<html dir="rtl" lang="ar">
<head>
  <meta charset="UTF-8"/>
  <style>
    body { font-family: Arial, sans-serif; padding: 20px; color: #333; direction: rtl; }
    h1 { color: #1b818f; border-bottom: 2px solid #1b818f; padding-bottom: 8px; }
    h2 { color: #7b4d35; margin-top: 24px; }
    table { width: 100%; border-collapse: collapse; margin-top: 8px; }
    th { background: #1b818f; color: white; padding: 8px; text-align: right; }
    td { padding: 8px; border-bottom: 1px solid #eee; }
    tr:hover { background: #f5f5f5; }
    .summary { display: flex; gap: 16px; margin: 16px 0; }
    .card { background: #f0f8f9; border-radius: 8px; padding: 12px; flex: 1; text-align: center; }
    .card-value { font-size: 20px; font-weight: bold; color: #1b818f; }
    .card-label { font-size: 12px; color: #666; }
    .footer { margin-top: 32px; color: #999; font-size: 11px; text-align: center; }
  </style>
</head>
<body>
  <h1>📊 تقرير مصروفي</h1>
  <p>تاريخ التقرير: ${now.toLocaleDateString("ar-EG")} · ${now.toLocaleTimeString("ar-EG")}</p>
  <div class="summary">
    <div class="card"><div class="card-value">${data.months.length}</div><div class="card-label">عدد الشهور</div></div>
    <div class="card"><div class="card-value">${data.expenses.length}</div><div class="card-label">عدد المصاريف</div></div>
    <div class="card"><div class="card-value">${fmtAmt(data.savings)}</div><div class="card-label">السيولة</div></div>
    <div class="card"><div class="card-value">${activeDebts.length}</div><div class="card-label">ديون نشطة</div></div>
  </div>
  <h2>الشهور الأخيرة</h2>
  <table><thead><tr><th>الشهر</th><th>الميزانية</th><th>المصروف</th><th>المتبقي</th><th>الحالة</th></tr></thead>
  <tbody>${monthRows || "<tr><td colspan='5'>لا توجد شهور</td></tr>"}</tbody></table>
  <h2>أعلى فئات الإنفاق</h2>
  <table><thead><tr><th>الفئة</th><th>الإجمالي</th></tr></thead>
  <tbody>${catRows || "<tr><td colspan='2'>لا توجد بيانات</td></tr>"}</tbody></table>
  ${activeDebts.length > 0 ? `<h2>الديون النشطة</h2>
  <table><thead><tr><th>الاسم</th><th>النوع</th><th>المتبقي</th></tr></thead>
  <tbody>${debtRows}</tbody></table>` : ""}
  <p class="footer">تم إنشاؤه بواسطة تطبيق مصروفي</p>
</body></html>`;
  };

  const handleGeneratePDF = async () => {
    try {
      const html = generateMonthlyReportHTML();
      if (Platform.OS === "web") {
        const win = window.open("", "_blank");
        if (win) { win.document.write(html); win.document.close(); win.print(); }
      } else {
        await Share.share({ message: html, title: "تقرير مصروفي" });
      }
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch { Alert.alert("خطأ", "فشل في إنشاء التقرير"); }
  };

  const handleClearData = () => {
    confirm("حذف جميع البيانات", "هل أنت متأكد؟ سيتم حذف كل شيء نهائياً", async () => {
      try {
        await importData(JSON.stringify({
          months: [], expenses: [], vaults: [], transactions: [],
          savings: 0, recurringExpenses: [], categories: data.categories,
          debts: [], settings: data.settings,
        }));
      } catch { Alert.alert("خطأ", "فشل في حذف البيانات"); }
    });
  };

  const handleGenerateDemoData = () => {
    confirm("توليد بيانات تجريبية", "سيضيف ٦ أشهر من البيانات العشوائية. هل تريد الاستمرار؟", async () => {
      try {
        await generateDemoData();
        Alert.alert("تم ✓", "تم توليد البيانات التجريبية بنجاح");
      } catch { Alert.alert("خطأ", "فشل في توليد البيانات"); }
    });
  };

  const handleImport = async () => {
    if (!importText.trim()) { setImportError("الرجاء لصق محتوى ملف النسخة الاحتياطية"); return; }
    try {
      await importData(importText.trim());
      setShowImportModal(false); setImportText(""); setImportError("");
      Alert.alert("تم ✓", "تم استيراد البيانات بنجاح");
    } catch { setImportError("الملف غير صالح. تأكد من صحة ملف JSON"); }
  };

  const handleAddRecurring = async () => {
    if (!recurringName.trim()) { Alert.alert("خطأ", "أدخل اسم المصروف"); return; }
    if (!recurringAmount || parseFloat(recurringAmount) <= 0) { Alert.alert("خطأ", "أدخل مبلغاً صحيحاً"); return; }
    await addRecurringExpense(recurringName.trim(), parseFloat(recurringAmount), recurringCategory);
    setRecurringName(""); setRecurringAmount(""); setShowAddRecurring(false);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  };

  const handleNotificationsToggle = async (v: boolean) => {
    if (v && Platform.OS !== "web") {
      const granted = await requestPermissions();
      if (!granted) { Alert.alert("الإذن مرفوض", "يرجى السماح بالإشعارات من إعدادات الجهاز"); return; }
    }
    await updateSettings({ notificationsEnabled: v });
    Haptics.selectionAsync();
  };

  return (
    <View style={[styles.container, { backgroundColor: C.background }]}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: bottomInset + 100 }}>
        <View style={[styles.header, { paddingTop: topInset + 16 }]}>
          <Text style={[styles.headerTitle, { color: C.text }]}>المزيد</Text>
        </View>

        {/* ── المظهر ── */}
        <SectionLabel text="المظهر" />
        <View style={[styles.section, { backgroundColor: C.backgroundCard }]}>
          <SettingRow
            icon="moon" title="الوضع الليلي"
            subtitle={data.settings.darkMode ? "الوضع الداكن مفعّل" : "الوضع الفاتح مفعّل"}
            rightElement={
              <Switch
                value={data.settings.darkMode}
                onValueChange={(v) => { updateSettings({ darkMode: v }); Haptics.selectionAsync(); }}
                trackColor={{ false: C.border, true: C.navy }}
                thumbColor={C.white}
              />
            }
          />
          <View style={[styles.divider, { backgroundColor: C.border }]} />
          <View style={styles.settingRow}>
            <View style={[styles.settingIcon, { backgroundColor: C.navy + "15" }]}>
              <Feather name="droplet" size={18} color={C.navy} />
            </View>
            <View style={styles.settingText}>
              <Text style={[styles.settingTitle, { color: C.text }]}>لون التطبيق</Text>
              <Text style={[styles.settingSubtitle, { color: C.textSecondary }]}>
                {(data.settings.themeAccent ?? "papyrus") === "papyrus" ? "ورقي · الوضع الكلاسيكي الدافئ" : "فاتح · تصميم نظيف وأبيض"}
              </Text>
            </View>
          </View>
          <View style={styles.themeAccentRow}>
            {([
              { id: "papyrus", label: "ورقي", desc: "دافئ وكلاسيكي" },
              { id: "clean",   label: "فاتح", desc: "نظيف وحديث" },
            ] as { id: "papyrus" | "clean"; label: string; desc: string }[]).map((t) => {
              const active = (data.settings.themeAccent ?? "papyrus") === t.id;
              return (
                <Pressable
                  key={t.id}
                  onPress={() => { updateSettings({ themeAccent: t.id }); Haptics.selectionAsync(); }}
                  style={[
                    styles.themeChip,
                    {
                      backgroundColor: active ? C.navy : C.backgroundSecondary,
                      borderColor: active ? C.navy : C.border,
                    },
                  ]}
                >
                  <Text style={[styles.themeChipLabel, { color: active ? C.white : C.text }]}>{t.label}</Text>
                  <Text style={[styles.themeChipDesc, { color: active ? "rgba(255,255,255,0.75)" : C.textMuted }]}>{t.desc}</Text>
                </Pressable>
              );
            })}
          </View>
        </View>

        {/* ── العملة ── */}
        <SectionLabel text="العملة" />
        <View style={[styles.section, { backgroundColor: C.backgroundCard }]}>
          <View style={styles.currencyRow}>
            {CURRENCIES.map((cur) => (
              <Pressable key={cur.symbol}
                onPress={() => { updateSettings({ currency: cur.symbol }); Haptics.selectionAsync(); }}
                style={[
                  styles.currencyChip,
                  { backgroundColor: data.settings.currency === cur.symbol ? C.navy : C.backgroundSecondary,
                    borderColor: data.settings.currency === cur.symbol ? C.navy : C.border },
                ]}
              >
                <Text style={[styles.currencySymbol, { color: data.settings.currency === cur.symbol ? C.white : C.text }]}>{cur.symbol}</Text>
                <Text style={[styles.currencyLabel, { color: data.settings.currency === cur.symbol ? "rgba(255,255,255,0.7)" : C.textMuted }]}>{cur.label}</Text>
              </Pressable>
            ))}
          </View>
        </View>

        {/* ── التنظيم ── */}
        <SectionLabel text="التنظيم" />
        <View style={[styles.section, { backgroundColor: C.backgroundCard }]}>
          <SettingRow
            icon="calendar" title="إدارة الشهور تلقائياً"
            subtitle={data.settings.autoMonthManagement
              ? "ينشئ شهراً جديداً بميزانية صفر عند بداية كل شهر"
              : "أنشئ شهراً جديداً يدوياً من الصفحة الرئيسية"}
            rightElement={
              <Switch
                value={!!data.settings.autoMonthManagement}
                onValueChange={(v) => { updateSettings({ autoMonthManagement: v }); Haptics.selectionAsync(); }}
                trackColor={{ false: C.border, true: C.successDark }}
                thumbColor={C.white}
              />
            }
          />
          <Divider />
          <SettingRow
            icon="users" title="الديون"
            subtitle={`${(data.debts || []).filter(d => !d.isPaid).length} دين نشط`}
            onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); router.push("/debts" as any); }}
          />
          <Divider />
          <SettingRow
            icon="bell" title="الإشعارات"
            subtitle={isWeb ? "متاح على تطبيق الجوال فقط" : data.settings.notificationsEnabled ? "مفعّلة · تنبيهات الميزانية والديون" : "تنبيهات نهاية الشهر والديون والميزانية"}
            rightElement={
              <Switch
                value={!!data.settings.notificationsEnabled}
                disabled={isWeb}
                onValueChange={handleNotificationsToggle}
                trackColor={{ false: C.border, true: C.tint }}
                thumbColor={C.white}
              />
            }
          />
          <Divider />
          <SettingRow
            icon="shield" title="قفل البصمة"
            subtitle={isWeb ? "متاح على تطبيق الجوال فقط" : biometricAvailable ? (data.settings.biometricLock ? "التطبيق مؤمَّن بالبصمة" : "يُطلب التحقق عند فتح التطبيق") : "جهازك لا يدعم هذه الميزة"}
            rightElement={
              <Switch
                value={!!data.settings.biometricLock}
                disabled={isWeb || !biometricAvailable}
                onValueChange={(v) => { updateSettings({ biometricLock: v }); Haptics.selectionAsync(); }}
                trackColor={{ false: C.border, true: C.tint }}
                thumbColor={C.white}
              />
            }
          />
        </View>

        {/* ── المصاريف ── */}
        <SectionLabel text="المصاريف" />
        <View style={[styles.section, { backgroundColor: C.backgroundCard }]}>
          <SettingRow
            icon="tag" title="فئات المصاريف"
            subtitle={`${data.categories.length} فئة · إضافة وتعديل وحذف الفئات`}
            onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); router.push("/categories" as any); }}
          />
          <Divider />
          <View>
            {data.recurringExpenses.length === 0 && !showAddRecurring && (
              <View style={styles.emptyRecurring}>
                <Text style={[styles.emptyRecurringText, { color: C.textMuted }]}>لا توجد مصاريف متكررة. تُضاف تلقائياً عند فتح شهر جديد.</Text>
              </View>
            )}
            {data.recurringExpenses.map((re) => (
              <View key={re.id} style={[styles.recurringItem, { borderBottomColor: C.border }]}>
                <View style={[styles.recurringIcon, { backgroundColor: C.tint + "20" }]}>
                  <Feather name="repeat" size={14} color={C.tint} />
                </View>
                <View style={styles.recurringInfo}>
                  <Text style={[styles.recurringName, { color: C.text }]}>{re.name}</Text>
                  <Text style={[styles.recurringMeta, { color: C.textSecondary }]}>{fc(re.amount)} · {re.category}</Text>
                </View>
                <Pressable onPress={() => deleteRecurringExpense(re.id)} style={styles.recurringDelete}>
                  <Feather name="trash-2" size={14} color={C.danger} />
                </Pressable>
              </View>
            ))}
            {showAddRecurring && (
              <View style={[styles.addRecurringForm, { borderTopColor: C.border }]}>
                <TextInput
                  style={[styles.miniInput, { backgroundColor: C.backgroundSecondary, color: C.text, borderColor: C.border }]}
                  value={recurringName} onChangeText={setRecurringName}
                  placeholder="اسم المصروف" placeholderTextColor={C.textMuted} textAlign="right"
                />
                <TextInput
                  style={[styles.miniInput, { backgroundColor: C.backgroundSecondary, color: C.text, borderColor: C.border }]}
                  value={recurringAmount} onChangeText={setRecurringAmount}
                  placeholder="المبلغ" placeholderTextColor={C.textMuted}
                  keyboardType="decimal-pad" textAlign="right"
                />
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 8 }}>
                  <View style={{ flexDirection: "row", gap: 6 }}>
                    {categories.map((cat) => (
                      <Pressable key={cat} onPress={() => setRecurringCategory(cat)}
                        style={[styles.miniChip, { backgroundColor: recurringCategory === cat ? C.tint : C.backgroundSecondary, borderColor: recurringCategory === cat ? C.tint : C.border }]}>
                        <Text style={[styles.miniChipText, { color: recurringCategory === cat ? C.white : C.textSecondary }]}>{cat}</Text>
                      </Pressable>
                    ))}
                  </View>
                </ScrollView>
                <View style={styles.addRecurringBtns}>
                  <Pressable onPress={() => setShowAddRecurring(false)} style={[styles.miniBtn, { backgroundColor: C.backgroundSecondary }]}>
                    <Text style={[styles.miniBtnText, { color: C.textSecondary }]}>إلغاء</Text>
                  </Pressable>
                  <Pressable onPress={handleAddRecurring} style={[styles.miniBtn, { backgroundColor: C.navy }]}>
                    <Text style={[styles.miniBtnText, { color: C.white }]}>إضافة</Text>
                  </Pressable>
                </View>
              </View>
            )}
            {!showAddRecurring && (
              <Pressable onPress={() => setShowAddRecurring(true)} style={[styles.addRecurringBtn, { borderTopColor: data.recurringExpenses.length > 0 ? C.border : "transparent" }]}>
                <Feather name="plus" size={16} color={C.tint} />
                <Text style={[styles.addRecurringBtnText, { color: C.tint }]}>إضافة مصروف متكرر</Text>
              </Pressable>
            )}
          </View>
        </View>

        {/* ── البيانات والنسخ الاحتياطي ── */}
        <SectionLabel text="البيانات والنسخ الاحتياطي" />
        <View style={[styles.section, { backgroundColor: C.backgroundCard }]}>
          <SettingRow icon="file-text" title="إنشاء تقرير مالي" subtitle="تقرير HTML شامل بكل بياناتك" onPress={handleGeneratePDF} />
          <SettingRow icon="download" title="تصدير البيانات" subtitle="احفظ بياناتك كملف JSON" onPress={handleExport} />
          <Divider />
          <SettingRow icon="upload" title="استيراد البيانات" subtitle="استعادة من ملف نسخة احتياطية"
            onPress={() => { setImportText(""); setImportError(""); setShowImportModal(true); }} />
          <Divider />
          <SettingRow icon="info" title="إحصائيات البيانات"
            subtitle={`${data.months.length} شهر · ${data.expenses.length} مصروف · ${data.vaults.length} خزنة`} />
        </View>

        {/* ── خيارات المطور ── */}
        <SectionLabel text="خيارات المطور" />
        <View style={[styles.section, { backgroundColor: C.backgroundCard }]}>
          <SettingRow icon="database" title="توليد بيانات تجريبية"
            subtitle="إضافة ٦ أشهر من البيانات للاختبار"
            onPress={handleGenerateDemoData} />
          <Divider />
          <SettingRow icon="trash-2" title="حذف جميع البيانات"
            subtitle="لا يمكن التراجع عن هذا الإجراء"
            onPress={handleClearData} danger />
        </View>

        <Text style={[styles.footer, { color: C.textMuted }]}>مصروفي · الإصدار ٢.١</Text>
      </ScrollView>

      <Modal visible={showImportModal} transparent animationType="slide" onRequestClose={() => setShowImportModal(false)}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalBox, { backgroundColor: C.backgroundCard }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: C.text }]}>استيراد البيانات</Text>
              <Pressable onPress={() => setShowImportModal(false)}>
                <Feather name="x" size={22} color={C.textMuted} />
              </Pressable>
            </View>
            <Text style={[styles.modalHint, { color: C.textSecondary }]}>الصق محتوى ملف JSON الذي صدّرته مسبقاً:</Text>
            <TextInput
              style={[styles.importInput, { backgroundColor: C.backgroundSecondary, color: C.text, borderColor: importError ? C.danger : C.border }]}
              value={importText}
              onChangeText={(t) => { setImportText(t); setImportError(""); }}
              placeholder="الصق محتوى ملف JSON هنا..."
              placeholderTextColor={C.textMuted}
              multiline textAlign="right" textAlignVertical="top"
            />
            {!!importError && <Text style={[styles.importError, { color: C.danger }]}>{importError}</Text>}
            <View style={styles.modalBtns}>
              <Pressable onPress={() => setShowImportModal(false)} style={[styles.modalBtn, { backgroundColor: C.backgroundSecondary }]}>
                <Text style={[styles.modalBtnText, { color: C.textSecondary }]}>إلغاء</Text>
              </Pressable>
              <Pressable onPress={handleImport} style={[styles.modalBtn, { backgroundColor: C.navy }]}>
                <Text style={[styles.modalBtnText, { color: C.white }]}>استيراد</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { paddingHorizontal: 20, paddingBottom: 16 },
  headerTitle: { fontFamily: "Cairo_900Black", fontSize: 28 },
  sectionLabel: { fontFamily: "Cairo_600SemiBold", fontSize: 13, paddingHorizontal: 20, marginBottom: 8, marginTop: 4 },
  section: { marginHorizontal: 16, marginBottom: 12, borderRadius: 16, overflow: "hidden" },
  settingRow: { flexDirection: "row", alignItems: "center", gap: 12, padding: 16 },
  settingIcon: { width: 36, height: 36, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  settingText: { flex: 1 },
  settingTitle: { fontFamily: "Cairo_600SemiBold", fontSize: 15 },
  settingSubtitle: { fontFamily: "Cairo_400Regular", fontSize: 12, marginTop: 1 },
  divider: { height: 1, marginHorizontal: 16 },
  currencyRow: { flexDirection: "row", padding: 12, gap: 8 },
  currencyChip: { flex: 1, alignItems: "center", padding: 10, borderRadius: 12, borderWidth: 1, gap: 2 },
  currencySymbol: { fontFamily: "Cairo_700Bold", fontSize: 16 },
  currencyLabel: { fontFamily: "Cairo_400Regular", fontSize: 10 },
  emptyRecurring: { padding: 16 },
  emptyRecurringText: { fontFamily: "Cairo_400Regular", fontSize: 13, textAlign: "center", lineHeight: 20 },
  recurringItem: { flexDirection: "row", alignItems: "center", gap: 12, padding: 12, paddingHorizontal: 16, borderBottomWidth: 1 },
  recurringIcon: { width: 32, height: 32, borderRadius: 8, alignItems: "center", justifyContent: "center" },
  recurringInfo: { flex: 1 },
  recurringName: { fontFamily: "Cairo_600SemiBold", fontSize: 14 },
  recurringMeta: { fontFamily: "Cairo_400Regular", fontSize: 12 },
  recurringDelete: { padding: 6 },
  addRecurringForm: { padding: 16, borderTopWidth: 1, gap: 8 },
  miniInput: { borderRadius: 10, padding: 10, fontFamily: "Cairo_400Regular", fontSize: 14, borderWidth: 1 },
  miniChip: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 14, borderWidth: 1 },
  miniChipText: { fontFamily: "Cairo_600SemiBold", fontSize: 11 },
  addRecurringBtns: { flexDirection: "row", gap: 8 },
  miniBtn: { flex: 1, paddingVertical: 10, borderRadius: 10, alignItems: "center" },
  miniBtnText: { fontFamily: "Cairo_600SemiBold", fontSize: 14 },
  addRecurringBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, padding: 14, borderTopWidth: 1 },
  addRecurringBtnText: { fontFamily: "Cairo_600SemiBold", fontSize: 14 },
  themeAccentRow: { flexDirection: "row", gap: 8, paddingHorizontal: 16, paddingBottom: 16 },
  themeChip: { flex: 1, alignItems: "center", paddingVertical: 12, borderRadius: 14, borderWidth: 1.5, gap: 3 },
  themeChipLabel: { fontFamily: "Cairo_700Bold", fontSize: 14 },
  themeChipDesc: { fontFamily: "Cairo_400Regular", fontSize: 11 },
  footer: { fontFamily: "Cairo_400Regular", fontSize: 12, textAlign: "center", marginTop: 20, marginBottom: 8 },
  modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "flex-end" },
  modalBox: { borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, gap: 14 },
  modalHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  modalTitle: { fontFamily: "Cairo_700Bold", fontSize: 18 },
  modalHint: { fontFamily: "Cairo_400Regular", fontSize: 13 },
  importInput: { borderRadius: 12, borderWidth: 1, padding: 12, minHeight: 120, fontFamily: "Cairo_400Regular", fontSize: 13 },
  importError: { fontFamily: "Cairo_400Regular", fontSize: 13 },
  modalBtns: { flexDirection: "row", gap: 10 },
  modalBtn: { flex: 1, paddingVertical: 14, borderRadius: 12, alignItems: "center" },
  modalBtnText: { fontFamily: "Cairo_600SemiBold", fontSize: 15 },
});
