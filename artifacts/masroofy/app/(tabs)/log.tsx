import { Feather } from "@expo/vector-icons";
import React, { useMemo, useState } from "react";
import {
  FlatList,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { ARABIC_MONTHS, toArabicNumerals } from "@/constants/arabic";
import { ThemeColors } from "@/constants/colors";
import { Transaction } from "@/constants/types";
import { useApp } from "@/context/AppContext";

const TX_CONFIG: Record<string, { icon: string; sign: "+" | "-" | ""; label: string; colorKey: "income" | "expense" | "neutral" | "vault" | "end" }> = {
  expense:       { icon: "arrow-up-right",   sign: "-", label: "مصروف",        colorKey: "expense" },
  income:        { icon: "arrow-down-left",  sign: "+", label: "دخل",          colorKey: "income" },
  savings_add:   { icon: "pocket",           sign: "+", label: "سيولة",        colorKey: "income" },
  vault_deposit: { icon: "archive",          sign: "-", label: "إيداع خزنة",   colorKey: "vault" },
  store_to_vault:{ icon: "archive",          sign: "-", label: "تخزين",        colorKey: "vault" },
  month_ended:   { icon: "check-circle",     sign: "+", label: "نهاية شهر",   colorKey: "end" },
};

const SOURCE_LABELS: Record<string, string> = {
  budget:    "الميزانية",
  savings:   "السيولة",
  manual:    "يدوي",
  external:  "خارجي",
  liquidity: "سيولة",
  vault:     "خزنة",
};

function TransactionItem({ tx, C, fc }: { tx: Transaction; C: ThemeColors; fc: (n: number) => string }) {
  const date = new Date(tx.createdAt);
  const day   = toArabicNumerals(date.getDate());
  const month = ARABIC_MONTHS[date.getMonth()].slice(0, 3);
  const time  = `${toArabicNumerals(date.getHours())}:${toArabicNumerals(date.getMinutes()).padStart(2, "٠")}`;

  const cfg = TX_CONFIG[tx.type] ?? { icon: "circle", sign: "", label: tx.type, colorKey: "neutral" as const };

  const colorMap = {
    income:  C.successDark,
    expense: C.danger,
    vault:   C.tint,
    end:     C.successDark,
    neutral: C.textMuted,
  };
  const typeColor = colorMap[cfg.colorKey];
  const typeBg    = typeColor + "20";
  const srcLabel  = SOURCE_LABELS[tx.source] ?? tx.source;

  return (
    <View style={[styles.txItem, { backgroundColor: C.backgroundCard }]}>
      <View style={[styles.txIcon, { backgroundColor: typeBg }]}>
        <Feather name={cfg.icon as any} size={16} color={typeColor} />
      </View>
      <View style={styles.txInfo}>
        <Text style={[styles.txName, { color: C.text }]}>{tx.name}</Text>
        <Text style={[styles.txMeta, { color: C.textMuted }]}>
          {cfg.label} · {srcLabel} · {day} {month} · {time}
        </Text>
      </View>
      <Text style={[styles.txAmount, { color: typeColor }]}>
        {cfg.sign}{fc(tx.amount)}
      </Text>
    </View>
  );
}

export default function LogScreen() {
  const insets = useSafeAreaInsets();
  const { data, colors: C, fc } = useApp();
  const [search, setSearch] = useState("");
  const isWeb = Platform.OS === "web";
  const topInset = isWeb ? 67 : insets.top;
  const bottomInset = isWeb ? 34 : insets.bottom;

  const filtered = useMemo(() => {
    if (!search.trim()) return data.transactions;
    const q = search.toLowerCase();
    return data.transactions.filter((t) => t.name.toLowerCase().includes(q));
  }, [data.transactions, search]);

  return (
    <View style={[styles.container, { backgroundColor: C.background }]}>
      <View style={[styles.header, { paddingTop: topInset + 16, backgroundColor: C.background }]}>
        <Text style={[styles.headerTitle, { color: C.text }]}>السجل</Text>
        <Text style={[styles.headerSub, { color: C.textSecondary }]}>
          {toArabicNumerals(data.transactions.length)} عملية
        </Text>
        <View style={[styles.searchBar, { backgroundColor: C.backgroundCard, borderColor: C.border }]}>
          <Feather name="search" size={16} color={C.textSecondary} />
          <TextInput
            style={[styles.searchInput, { color: C.text }]}
            value={search}
            onChangeText={setSearch}
            placeholder="ابحث عن عملية..."
            textAlign="right"
            placeholderTextColor={C.textMuted}
          />
          {search.length > 0 && (
            <Pressable onPress={() => setSearch("")}>
              <Feather name="x" size={16} color={C.textSecondary} />
            </Pressable>
          )}
        </View>
      </View>

      <FlatList
        data={filtered}
        keyExtractor={(item) => item.id}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: bottomInset + 100, paddingTop: 8 }}
        ListEmptyComponent={() => (
          <View style={styles.emptyState}>
            <Feather name="clock" size={48} color={C.border} />
            <Text style={[styles.emptyTitle, { color: C.textSecondary }]}>
              {search ? "لا توجد نتائج" : "لا توجد عمليات بعد"}
            </Text>
            <Text style={[styles.emptyText, { color: C.textMuted }]}>
              {search ? "جرب كلمة بحث مختلفة" : "ستظهر عملياتك المالية هنا"}
            </Text>
          </View>
        )}
        renderItem={({ item }) => <TransactionItem tx={item} C={C} fc={fc} />}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    paddingHorizontal: 20,
    paddingBottom: 16,
  },
  headerTitle: {
    fontFamily: "Cairo_900Black",
    fontSize: 28,
  },
  headerSub: {
    fontFamily: "Cairo_400Regular",
    fontSize: 13,
    marginBottom: 12,
  },
  searchBar: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderWidth: 1,
  },
  searchInput: {
    flex: 1,
    fontFamily: "Cairo_400Regular",
    fontSize: 15,
    padding: 0,
  },
  txItem: {
    flexDirection: "row",
    alignItems: "center",
    marginHorizontal: 16,
    marginBottom: 10,
    borderRadius: 14,
    padding: 14,
    gap: 12,
  },
  txIcon: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  txInfo: { flex: 1 },
  txName: {
    fontFamily: "Cairo_600SemiBold",
    fontSize: 14,
  },
  txMeta: {
    fontFamily: "Cairo_400Regular",
    fontSize: 12,
    marginTop: 2,
  },
  txAmount: {
    fontFamily: "Cairo_700Bold",
    fontSize: 14,
  },
  emptyState: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 64,
    gap: 12,
  },
  emptyTitle: {
    fontFamily: "Cairo_700Bold",
    fontSize: 18,
  },
  emptyText: {
    fontFamily: "Cairo_400Regular",
    fontSize: 14,
    textAlign: "center",
  },
});
