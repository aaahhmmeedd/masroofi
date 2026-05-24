import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import React, { useRef } from "react";
import {
  Alert,
  Animated,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Svg, { Circle } from "react-native-svg";

import { toArabicNumerals } from "@/constants/arabic";
import { ThemeColors } from "@/constants/colors";
import { Vault } from "@/constants/types";
import { useApp } from "@/context/AppContext";

function VaultCard({ vault, C }: { vault: Vault; C: ThemeColors }) {
  const { deleteVault, fc } = useApp();
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const pct = vault.goal > 0 ? Math.min(vault.balance / vault.goal, 1) : 0;
  const size = 60;
  const strokeWidth = 5;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;

  const handleDelete = () => {
    Alert.alert(
      "حذف الخزنة",
      `سيتم إعادة رصيد ${fc(vault.balance)} إلى السيولة`,
      [
        { text: "إلغاء", style: "cancel" },
        {
          text: "حذف",
          style: "destructive",
          onPress: () => {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
            deleteVault(vault.id);
          },
        },
      ]
    );
  };

  const handleWithdraw = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.push({ pathname: "/vault/deposit", params: { vaultId: vault.id, mode: "withdraw" } });
  };

  return (
    <View
      style={[
        styles.vaultCard,
        {
          backgroundColor: C.backgroundCard,
          borderTopColor: vault.color,
          shadowColor: C.shadow,
        },
      ]}
    >
      <View style={styles.vaultTop}>
        <View style={styles.vaultCircle}>
          <Svg width={size} height={size} style={{ transform: [{ rotate: "-90deg" }] }}>
            <Circle
              cx={size / 2} cy={size / 2} r={radius}
              stroke={C.border} strokeWidth={strokeWidth} fill="none"
            />
            <Circle
              cx={size / 2} cy={size / 2} r={radius}
              stroke={vault.color} strokeWidth={strokeWidth} fill="none"
              strokeDasharray={circumference}
              strokeDashoffset={circumference - pct * circumference}
              strokeLinecap="round"
            />
          </Svg>
          <View style={styles.vaultCircleInner}>
            <Text style={[styles.vaultPct, { color: vault.color }]}>
              {toArabicNumerals(Math.round(pct * 100))}٪
            </Text>
          </View>
        </View>

        <View style={styles.vaultInfo}>
          <Text style={[styles.vaultName, { color: C.text }]}>{vault.name}</Text>
          <Text style={[styles.vaultBalance, { color: C.text }]}>
            {fc(vault.balance)}
          </Text>
          <Text style={[styles.vaultGoal, { color: C.textSecondary }]}>
            الهدف: {fc(vault.goal)}
          </Text>
        </View>

        <View style={styles.vaultActions}>
          <Pressable
            onPress={handleWithdraw}
            style={[styles.vaultActionBtn, { backgroundColor: C.backgroundSecondary }]}
          >
            <Feather name="arrow-up" size={16} color={C.textSecondary} />
          </Pressable>
          <Pressable
            onPress={handleDelete}
            style={[styles.vaultActionBtn, { backgroundColor: C.danger + "18" }]}
          >
            <Feather name="trash-2" size={16} color={C.danger} />
          </Pressable>
        </View>
      </View>

      <View style={[styles.vaultProgressBar, { backgroundColor: C.backgroundSecondary }]}>
        <View
          style={[
            styles.vaultProgressFill,
            { width: `${pct * 100}%` as any, backgroundColor: vault.color },
          ]}
        />
      </View>

      <Pressable
        style={[styles.depositBtn, { borderColor: vault.color + "80", backgroundColor: vault.color + "10" }]}
        onPress={() => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          router.push({ pathname: "/vault/deposit", params: { vaultId: vault.id } });
        }}
      >
        <Feather name="archive" size={14} color={vault.color} />
        <Text style={[styles.depositBtnText, { color: vault.color }]}>الخزنة</Text>
      </Pressable>
    </View>
  );
}

export default function VaultsScreen() {
  const insets = useSafeAreaInsets();
  const { data, colors: C } = useApp();
  const isWeb = Platform.OS === "web";
  const topInset = isWeb ? 67 : insets.top;
  const bottomInset = isWeb ? 34 : insets.bottom;

  const totalVaulted = data.vaults.reduce((s, v) => s + v.balance, 0);
  const { fc } = useApp();

  return (
    <View style={[styles.container, { backgroundColor: C.background }]}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: bottomInset + 100 }}
      >
        <LinearGradient
          colors={[C.purpleDark, C.purple, C.purpleLight]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[styles.header, { paddingTop: topInset + 16 }]}
        >
          <Text style={styles.headerTitle}>الخزائن</Text>
          <Text style={styles.headerSub}>ادخر لأهدافك المستقبلية</Text>
          <View style={styles.headerStats}>
            <View style={styles.headerStat}>
              <Text style={styles.headerStatLabel}>إجمالي الخزائن</Text>
              <Text style={styles.headerStatValue}>
                {fc(totalVaulted)}
              </Text>
            </View>
            <View style={styles.headerStatDivider} />
            <View style={styles.headerStat}>
              <Text style={styles.headerStatLabel}>السيولة الحرة</Text>
              <Text style={styles.headerStatValue}>
                {fc(data.savings)}
              </Text>
            </View>
          </View>
        </LinearGradient>

        <View style={styles.sectionHeader}>
          <Text style={[styles.sectionTitle, { color: C.text }]}>خزائني</Text>
          <Pressable
            style={[styles.addBtn, { backgroundColor: C.purple }]}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
              router.push("/vault/add");
            }}
          >
            <Feather name="plus" size={16} color="#fff" />
            <Text style={styles.addBtnText}>خزنة جديدة</Text>
          </Pressable>
        </View>

        {data.vaults.length === 0 ? (
          <View style={styles.emptyState}>
            <Feather name="archive" size={48} color={C.border} />
            <Text style={[styles.emptyTitle, { color: C.textSecondary }]}>لا توجد خزائن بعد</Text>
            <Text style={[styles.emptyText, { color: C.textMuted }]}>
              أنشئ خزنة لادخار المال لهدف معين
            </Text>
          </View>
        ) : (
          data.vaults.map((v) => <VaultCard key={v.id} vault={v} C={C} />)
        )}
      </ScrollView>
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
    color: "#fff",
    marginBottom: 4,
  },
  headerSub: {
    fontFamily: "Cairo_400Regular",
    fontSize: 13,
    color: "rgba(255,255,255,0.75)",
    marginBottom: 20,
  },
  headerStats: {
    flexDirection: "row",
    backgroundColor: "rgba(255,255,255,0.15)",
    borderRadius: 16,
    padding: 16,
  },
  headerStat: { flex: 1, alignItems: "center" },
  headerStatDivider: {
    width: 1,
    backgroundColor: "rgba(255,255,255,0.3)",
    marginHorizontal: 8,
  },
  headerStatLabel: {
    fontFamily: "Cairo_400Regular",
    fontSize: 12,
    color: "rgba(255,255,255,0.75)",
    marginBottom: 4,
  },
  headerStatValue: {
    fontFamily: "Cairo_700Bold",
    fontSize: 16,
    color: "#fff",
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    marginTop: 20,
    marginBottom: 12,
  },
  sectionTitle: {
    fontFamily: "Cairo_700Bold",
    fontSize: 18,
  },
  addBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
  },
  addBtnText: {
    fontFamily: "Cairo_600SemiBold",
    fontSize: 13,
    color: "#fff",
  },
  vaultCard: {
    marginHorizontal: 16,
    marginBottom: 12,
    borderRadius: 16,
    padding: 16,
    borderTopWidth: 3,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 1,
    shadowRadius: 8,
    elevation: 3,
  },
  vaultTop: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginBottom: 12,
  },
  vaultCircle: {
    width: 60,
    height: 60,
    position: "relative",
    alignItems: "center",
    justifyContent: "center",
  },
  vaultCircleInner: {
    position: "absolute",
    alignItems: "center",
    justifyContent: "center",
  },
  vaultPct: {
    fontFamily: "Cairo_700Bold",
    fontSize: 11,
  },
  vaultInfo: { flex: 1 },
  vaultName: {
    fontFamily: "Cairo_700Bold",
    fontSize: 16,
  },
  vaultBalance: {
    fontFamily: "Cairo_700Bold",
    fontSize: 15,
  },
  vaultGoal: {
    fontFamily: "Cairo_400Regular",
    fontSize: 12,
  },
  vaultActions: { gap: 8 },
  vaultActionBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  vaultProgressBar: {
    height: 5,
    borderRadius: 3,
    overflow: "hidden",
    marginBottom: 12,
  },
  vaultProgressFill: {
    height: "100%",
    borderRadius: 3,
  },
  depositBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    borderWidth: 1.5,
    borderRadius: 10,
    padding: 10,
  },
  depositBtnText: {
    fontFamily: "Cairo_600SemiBold",
    fontSize: 14,
  },
  emptyState: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 48,
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
