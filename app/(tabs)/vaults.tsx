import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { router } from "expo-router";
import React, { useRef, useState } from "react";
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
import { CustomConfirmDialog } from "@/components/CustomConfirmDialog";

function VaultCard({ vault, C }: { vault: Vault; C: ThemeColors }) {
  const { deleteVault, fc } = useApp();
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const pct = vault.goal > 0 ? Math.min(vault.balance / vault.goal, 1) : 0;
  const size = 60;
  const strokeWidth = 5;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;

  const handleDelete = () => {
    setShowDeleteConfirm(true);
  };

  const confirmDelete = () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    deleteVault(vault.id);
    setShowDeleteConfirm(false);
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
            الهدف: {vault.goal > 0 ? fc(vault.goal) : "∞"}
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

      <CustomConfirmDialog
        visible={showDeleteConfirm}
        title="حذف الخزنة"
        message={`سيتم إعادة رصيد ${fc(vault.balance)} إلى السيولة`}
        confirmText="حذف"
        cancelText="إلغاء"
        isDangerous={true}
        onConfirm={confirmDelete}
        onCancel={() => setShowDeleteConfirm(false)}
        colors={C}
      />
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
        <View
          style={[styles.header, { paddingTop: topInset + 16, backgroundColor: C.backgroundCard }]}
        >
          <Text style={[styles.headerTitle, { color: C.text }]}>الخزائن</Text>
          <View style={styles.headerStats}>
            <View style={styles.headerStat}>
              <Text style={[styles.headerStatLabel, { color: C.textSecondary }]}>عدد الخزائن</Text>
              <Text style={[styles.headerStatValue, { color: C.text }]}>
                {toArabicNumerals(data.vaults.length)}
              </Text>
            </View>
            <View style={[styles.headerStatDivider, { backgroundColor: C.border }]} />
            <View style={styles.headerStat}>
              <Text style={[styles.headerStatLabel, { color: C.textSecondary }]}>إجمالي المدخر</Text>
              <Text style={[styles.headerStatValue, { color: C.tint }]}>
                {fc(totalVaulted)}
              </Text>
            </View>
          </View>
        </View>

        <View style={styles.sectionHeader}>
          <Text style={[styles.sectionTitle, { color: C.text }]}>خزائني</Text>
          <Pressable
            style={[styles.addBtn, { backgroundColor: C.navy }]}
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
