import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { router } from "expo-router";
import React, { useState, useRef } from "react";
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
  Animated,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useApp } from "@/context/AppContext";
import { CustomConfirmDialog } from "@/components/CustomConfirmDialog";
import { useScrollToTop, ScrollToTopButton } from "@/components/ScrollToTopButton";

export default function RecurringExpensesScreen() {
  const insets = useSafeAreaInsets();
  const { data, colors: C, fc, addRecurringExpense, deleteRecurringExpense } = useApp();
  const isWeb = Platform.OS === "web";
  const topInset = isWeb ? 67 : insets.top;
  const bottomInset = isWeb ? 34 : insets.bottom;
  const scrollViewRef = useRef<FlatList>(null);
  const { opacity, shouldShow, handleScroll } = useScrollToTop(C);
  const categories = data.categories || [];

  const [newName, setNewName] = useState("");
  const [newAmount, setNewAmount] = useState("");
  const [newCategory, setNewCategory] = useState(categories[0] || "");
  const [isAdding, setIsAdding] = useState(false);
  const [showCategoryPicker, setShowCategoryPicker] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [selectedDeleteId, setSelectedDeleteId] = useState<string | null>(null);

  const handleAdd = async () => {
    const trimmed = newName.trim();
    if (!trimmed) {
      Alert.alert("خطأ", "أدخل اسم المصروف");
      return;
    }
    const amount = parseFloat(newAmount);
    if (!newAmount.trim() || amount <= 0) {
      Alert.alert("خطأ", "أدخل مبلغاً صحيحاً");
      return;
    }
    await addRecurringExpense(trimmed, amount, newCategory);
    setNewName("");
    setNewAmount("");
    setNewCategory(categories[0] || "");
    setIsAdding(false);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  };

  const handleDelete = (id: string) => {
    setSelectedDeleteId(id);
    setShowDeleteConfirm(true);
  };

  const handleConfirmDelete = async () => {
    if (selectedDeleteId) {
      await deleteRecurringExpense(selectedDeleteId);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      setShowDeleteConfirm(false);
      setSelectedDeleteId(null);
    }
  };

  const renderRecurring = ({ item }: { item: any }) => (
    <Pressable
      style={[styles.recurringItem, { backgroundColor: C.backgroundCard, borderColor: C.border }]}
      onPress={() => {}}
    >
      <View style={styles.recurringLeft}>
        <View style={[styles.categoryIcon, { backgroundColor: C.tint + "20" }]}>
          <Feather name="repeat" size={14} color={C.tint} />
        </View>
        <View style={styles.recurringInfo}>
          <Text style={[styles.recurringName, { color: C.text }]}>{item.name}</Text>
          <Text style={[styles.recurringCategory, { color: C.textSecondary }]}>{item.category}</Text>
        </View>
      </View>
      <View style={styles.recurringRight}>
        <Text style={[styles.recurringAmount, { color: C.tint }]}>{fc(item.amount)}</Text>
        <Pressable
          onPress={() => handleDelete(item.id)}
          style={({ pressed }) => [
            styles.deleteBtn,
            { backgroundColor: C.danger + (pressed ? "30" : "15") },
          ]}
        >
          <Feather name="trash-2" size={14} color={C.danger} />
        </Pressable>
      </View>
    </Pressable>
  );

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      style={[styles.container, { backgroundColor: C.background }]}
    >
      <View style={[styles.header, { paddingTop: topInset }]}>
        <Pressable onPress={() => router.back()} style={styles.backBtn}>
          <Feather name="chevron-right" size={20} color={C.text} />
        </Pressable>
        <View style={styles.headerTitle}>
          <Text style={[styles.title, { color: C.text }]}>المصاريف المتكررة</Text>
          <Text style={[styles.subtitle, { color: C.textSecondary }]}>إدارة المصاريف الشهرية</Text>
        </View>
      </View>

      <FlatList
        ref={scrollViewRef}
        onScroll={handleScroll}
        scrollEventThrottle={16}
        data={data.recurringExpenses || []}
        renderItem={renderRecurring}
        keyExtractor={(item) => item.id}
        scrollEnabled={!isAdding && !showCategoryPicker}
        contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: bottomInset + 200, gap: 8 }}
        ListEmptyComponent={
          !isAdding && (
            <View style={styles.empty}>
              <View style={[styles.emptyIcon, { backgroundColor: C.backgroundCard, borderColor: C.border }]}>
                <Feather name="repeat" size={40} color={C.border} />
              </View>
              <Text style={[styles.emptyTitle, { color: C.textSecondary }]}>لا توجد مصاريف متكررة</Text>
              <Text style={[styles.emptyText, { color: C.textMuted }]}>أضف مصروفاً متكرراً سيتكرر كل شهر</Text>
            </View>
          )
        }
      />

      {isAdding && (
        <View style={[styles.addPanel, { backgroundColor: C.backgroundCard, paddingBottom: bottomInset + 16 }]}>
          <Text style={[styles.panelTitle, { color: C.text }]}>إضافة مصروف متكرر</Text>

          <TextInput
            placeholder="اسم المصروف"
            placeholderTextColor={C.textMuted}
            value={newName}
            onChangeText={setNewName}
            style={[styles.input, { color: C.text, borderColor: C.border, backgroundColor: C.background }]}
          />

          <TextInput
            placeholder="المبلغ"
            placeholderTextColor={C.textMuted}
            value={newAmount}
            onChangeText={setNewAmount}
            keyboardType="decimal-pad"
            style={[styles.input, { color: C.text, borderColor: C.border, backgroundColor: C.background }]}
          />

          <Pressable
            onPress={() => setShowCategoryPicker(!showCategoryPicker)}
            style={[styles.categorySelect, { borderColor: C.border, backgroundColor: C.background }]}
          >
            <Text style={[styles.categorySelectText, { color: C.text }]}>{newCategory}</Text>
            <Feather name="chevron-down" size={16} color={C.textSecondary} />
          </Pressable>

          {showCategoryPicker && (
            <View style={[styles.categoryPickerModal, { backgroundColor: C.backgroundCard, borderColor: C.border }]}>
              {categories.map((cat) => (
                <Pressable
                  key={cat}
                  onPress={() => {
                    setNewCategory(cat);
                    setShowCategoryPicker(false);
                  }}
                  style={[
                    styles.categoryOption,
                    newCategory === cat && { backgroundColor: C.tint + "20" },
                  ]}
                >
                  <Text
                    style={[
                      styles.categoryOptionText,
                      {
                        color: newCategory === cat ? C.tint : C.text,
                        fontFamily: newCategory === cat ? "Cairo_700Bold" : "Cairo_400Regular",
                      },
                    ]}
                  >
                    {cat}
                  </Text>
                </Pressable>
              ))}
            </View>
          )}

          <View style={styles.panelActions}>
            <Pressable
              onPress={() => {
                setIsAdding(false);
                setNewName("");
                setNewAmount("");
                setShowCategoryPicker(false);
              }}
              style={[styles.cancelBtn, { backgroundColor: C.backgroundSecondary }]}
            >
              <Text style={[styles.actionBtnText, { color: C.text }]}>إلغاء</Text>
            </Pressable>
            <Pressable
              onPress={handleAdd}
              style={[styles.confirmBtn, { backgroundColor: C.tint }]}
            >
              <Feather name="plus" size={16} color={C.white} />
              <Text style={[styles.actionBtnText, { color: C.white }]}>إضافة</Text>
            </Pressable>
          </View>
        </View>
      )}

      <Pressable
        onPress={() => (isAdding ? null : setIsAdding(true))}
        style={[styles.fab, { backgroundColor: C.navy }]}
      >
        <Feather name="plus" size={24} color={C.white} />
      </Pressable>

      <CustomConfirmDialog
        visible={showDeleteConfirm}
        title="حذف المصروف المتكرر"
        message="هل تريد حذف هذا المصروف؟"
        confirmText="حذف"
        cancelText="إلغاء"
        isDangerous={true}
        onConfirm={handleConfirmDelete}
        onCancel={() => {
          setShowDeleteConfirm(false);
          setSelectedDeleteId(null);
        }}
        colors={C}
      />
      <ScrollToTopButton scrollViewRef={scrollViewRef} colors={C} opacity={opacity} shouldShow={shouldShow} />
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: "row", alignItems: "center", gap: 12, paddingHorizontal: 16, paddingVertical: 12 },
  backBtn: { width: 40, height: 40, borderRadius: 20, alignItems: "center", justifyContent: "center" },
  headerTitle: { flex: 1 },
  title: { fontFamily: "Cairo_900Black", fontSize: 22 },
  subtitle: { fontFamily: "Cairo_400Regular", fontSize: 12 },
  recurringItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 14,
    borderWidth: 1,
    marginTop: 8,
  },
  recurringLeft: { flexDirection: "row", alignItems: "center", gap: 12, flex: 1 },
  categoryIcon: { width: 36, height: 36, borderRadius: 8, alignItems: "center", justifyContent: "center" },
  recurringInfo: { flex: 1 },
  recurringName: { fontFamily: "Cairo_600SemiBold", fontSize: 14, marginBottom: 2 },
  recurringCategory: { fontFamily: "Cairo_400Regular", fontSize: 12 },
  recurringRight: { flexDirection: "row", alignItems: "center", gap: 8 },
  recurringAmount: { fontFamily: "Cairo_700Bold", fontSize: 14, minWidth: 60, textAlign: "right" },
  deleteBtn: { width: 32, height: 32, borderRadius: 8, alignItems: "center", justifyContent: "center" },
  empty: { alignItems: "center", justifyContent: "center", paddingVertical: 60, paddingHorizontal: 32, gap: 12 },
  emptyIcon: { width: 80, height: 80, borderRadius: 40, alignItems: "center", justifyContent: "center", borderWidth: 2, marginBottom: 8 },
  emptyTitle: { fontFamily: "Cairo_700Bold", fontSize: 16 },
  emptyText: { fontFamily: "Cairo_400Regular", fontSize: 13, textAlign: "center", lineHeight: 20 },
  addPanel: { padding: 16, borderTopWidth: 1, borderTopColor: "rgba(0,0,0,0.1)" },
  panelTitle: { fontFamily: "Cairo_700Bold", fontSize: 16, marginBottom: 14 },
  input: { borderWidth: 1, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, marginBottom: 10, fontFamily: "Cairo_400Regular", fontSize: 14 },
  categorySelect: { borderWidth: 1, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, marginBottom: 10, flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  categorySelectText: { fontFamily: "Cairo_400Regular", fontSize: 14 },
  categoryPickerModal: { borderWidth: 1, borderRadius: 10, overflow: "hidden", marginBottom: 10 },
  categoryOption: { paddingHorizontal: 12, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: "rgba(0,0,0,0.1)" },
  categoryOptionText: { fontSize: 14 },
  panelActions: { flexDirection: "row", gap: 10 },
  cancelBtn: { flex: 1, paddingVertical: 12, borderRadius: 10, alignItems: "center" },
  confirmBtn: { flex: 1, flexDirection: "row", gap: 6, paddingVertical: 12, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  actionBtnText: { fontFamily: "Cairo_600SemiBold", fontSize: 14 },
  fab: { position: "absolute", bottom: 100, right: 20, width: 56, height: 56, borderRadius: 28, alignItems: "center", justifyContent: "center", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 1, shadowRadius: 8, elevation: 5 },
});
