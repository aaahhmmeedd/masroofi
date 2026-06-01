import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { router } from "expo-router";
import React, { useState } from "react";
import { toArabicNumerals } from "@/constants/arabic";
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

import { useApp } from "@/context/AppContext";
import { CustomConfirmDialog } from "@/components/CustomConfirmDialog";

const CATEGORY_ICONS: Record<string, string> = {
  "طعام ومشروبات": "coffee",
  "نقل ومواصلات": "truck",
  "تسوق": "shopping-bag",
  "فواتير ومرافق": "zap",
  "صحة ورياضة": "heart",
  "ترفيه": "tv",
  "تعليم": "book",
  "سفر": "map",
  "منزل": "home",
  "أخرى": "more-horizontal",
};

function getIcon(name: string): string {
  return CATEGORY_ICONS[name] || "tag";
}

export default function CategoriesScreen() {
  const insets = useSafeAreaInsets();
  const { data, colors: C, addCategory, deleteCategory, updateCategory } = useApp();
  const isWeb = Platform.OS === "web";
  const topInset = isWeb ? 67 : insets.top;
  const bottomInset = isWeb ? 34 : insets.bottom;

  const [newName, setNewName] = useState("");
  const [editingCat, setEditingCat] = useState<string | null>(null);
  const [editValue, setEditValue] = useState("");
  const [isAdding, setIsAdding] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [selectedDeleteCat, setSelectedDeleteCat] = useState<string | null>(null);

  const handleAdd = async () => {
    const trimmed = newName.trim();
    if (!trimmed) return;
    if (data.categories.includes(trimmed)) {
      Alert.alert("تنبيه", "هذه الفئة موجودة بالفعل");
      return;
    }
    await addCategory(trimmed);
    setNewName("");
    setIsAdding(false);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  };

  const handleDelete = (name: string) => {
    setSelectedDeleteCat(name);
    setShowDeleteConfirm(true);
  };

  const handleConfirmDelete = async () => {
    if (selectedDeleteCat) {
      await deleteCategory(selectedDeleteCat);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      setShowDeleteConfirm(false);
      setSelectedDeleteCat(null);
    }
  };

  const handleStartEdit = (name: string) => {
    setEditingCat(name);
    setEditValue(name);
    Haptics.selectionAsync();
  };

  const handleSaveEdit = async () => {
    if (!editingCat) return;
    const trimmed = editValue.trim();
    if (!trimmed) {
      setEditingCat(null);
      return;
    }
    if (trimmed !== editingCat && data.categories.includes(trimmed)) {
      Alert.alert("تنبيه", "هذه الفئة موجودة بالفعل");
      return;
    }
    await updateCategory(editingCat, trimmed);
    setEditingCat(null);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  };

  const getExpenseCount = (cat: string) =>
    data.expenses.filter((e) => e.category === cat).length;

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: C.background }]}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <View style={[styles.header, { paddingTop: topInset + 16, backgroundColor: C.backgroundCard }]}>
        <View style={styles.headerTop}>
          <Text style={[styles.headerTitle, { color: C.text }]}>فئات المصاريف</Text>
          <Pressable
            onPress={() => {
              setIsAdding(true);
              setEditingCat(null);
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
            }}
            style={[styles.addHeaderBtn, { backgroundColor: C.navy }]}
          >
            <Feather name="plus" size={16} color="#fff" />
          </Pressable>
        </View>
        <View style={styles.headerStats}>
          <View style={styles.headerStat}>
            <Text style={[styles.headerStatLabel, { color: C.textSecondary }]}>عدد الفئات</Text>
            <Text style={[styles.headerStatValue, { color: C.text }]}>
              {toArabicNumerals(data.categories.length)}
            </Text>
          </View>
        </View>
      </View>

      {isAdding && (
        <View style={[styles.addBox, { backgroundColor: C.backgroundCard, borderColor: C.border }]}>
          <View style={[styles.addIconBox, { backgroundColor: C.tint + "20" }]}>
            <Feather name="tag" size={18} color={C.tint} />
          </View>
          <TextInput
            style={[styles.addInput, { color: C.text, borderColor: C.border }]}
            value={newName}
            onChangeText={setNewName}
            placeholder="اسم الفئة الجديدة"
            placeholderTextColor={C.textMuted}
            textAlign="right"
            autoFocus
            returnKeyType="done"
            onSubmitEditing={handleAdd}
          />
          <View style={styles.addActions}>
            <Pressable
              onPress={() => { setIsAdding(false); setNewName(""); }}
              style={[styles.addActionBtn, { backgroundColor: C.backgroundSecondary }]}
            >
              <Feather name="x" size={16} color={C.textSecondary} />
            </Pressable>
            <Pressable
              onPress={handleAdd}
              style={[styles.addActionBtn, { backgroundColor: C.tint }]}
            >
              <Feather name="check" size={16} color="#fff" />
            </Pressable>
          </View>
        </View>
      )}

      <FlatList
        data={data.categories}
        keyExtractor={(item) => item}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: bottomInset + 40, paddingTop: 8 }}
        ListEmptyComponent={() => (
          <View style={styles.emptyState}>
            <Feather name="tag" size={48} color={C.border} />
            <Text style={[styles.emptyTitle, { color: C.textSecondary }]}>لا توجد فئات</Text>
            <Text style={[styles.emptyText, { color: C.textMuted }]}>اضغط + لإضافة فئة جديدة</Text>
          </View>
        )}
        renderItem={({ item: cat }) => {
          const isEditing = editingCat === cat;
          const count = getExpenseCount(cat);

          return (
            <View style={[styles.catRow, { backgroundColor: C.backgroundCard, borderBottomColor: C.border }]}>
              <View style={[styles.catIcon, { backgroundColor: C.navy + "15" }]}>
                <Feather name={getIcon(cat) as any} size={16} color={C.navy} />
              </View>

              {isEditing ? (
                <TextInput
                  style={[styles.editInput, { color: C.text, borderColor: C.tint, backgroundColor: C.backgroundSecondary }]}
                  value={editValue}
                  onChangeText={setEditValue}
                  textAlign="right"
                  autoFocus
                  returnKeyType="done"
                  onSubmitEditing={handleSaveEdit}
                />
              ) : (
                <View style={styles.catInfo}>
                  <Text style={[styles.catName, { color: C.text }]}>{cat}</Text>
                  <Text style={[styles.catCount, { color: C.textMuted }]}>
                    {count > 0 ? `${count} مصروف` : "لا يوجد مصاريف"}
                  </Text>
                </View>
              )}

              <View style={styles.catActions}>
                {isEditing ? (
                  <>
                    <Pressable
                      onPress={() => setEditingCat(null)}
                      style={[styles.actionCircle, { backgroundColor: C.backgroundSecondary }]}
                    >
                      <Feather name="x" size={14} color={C.textSecondary} />
                    </Pressable>
                    <Pressable
                      onPress={handleSaveEdit}
                      style={[styles.actionCircle, { backgroundColor: C.tint }]}
                    >
                      <Feather name="check" size={14} color="#fff" />
                    </Pressable>
                  </>
                ) : (
                  <>
                    <Pressable
                      onPress={() => handleStartEdit(cat)}
                      style={[styles.actionCircle, { backgroundColor: C.tint + "15" }]}
                    >
                      <Feather name="edit-2" size={14} color={C.tint} />
                    </Pressable>
                    <Pressable
                      onPress={() => handleDelete(cat)}
                      style={[styles.actionCircle, { backgroundColor: C.danger + "15" }]}
                    >
                      <Feather name="trash-2" size={14} color={C.danger} />
                    </Pressable>
                  </>
                )}
              </View>
            </View>
          );
        }}
      />
      <CustomConfirmDialog
        visible={showDeleteConfirm}
        title="حذف الفئة"
        message={`هل تريد حذف فئة "${selectedDeleteCat}"؟ ستبقى المصاريف المُدرجة تحتها كما هي.`}
        confirmText="حذف"
        cancelText="إلغاء"
        isDangerous={true}
        onConfirm={handleConfirmDelete}
        onCancel={() => {
          setShowDeleteConfirm(false);
          setSelectedDeleteCat(null);
        }}
        colors={C}
      />
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    paddingHorizontal: 20,
    paddingBottom: 28,
  },
  headerTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  headerTitle: {
    fontFamily: "Cairo_900Black",
    fontSize: 28,
    flex: 1,
  },
  headerStats: {
    flexDirection: "row",
    marginTop: 12,
    paddingTop: 12,
  },
  headerStat: { flex: 1, alignItems: "center" },
  headerStatLabel: {
    fontFamily: "Cairo_400Regular",
    fontSize: 12,
    marginBottom: 4,
  },
  headerStatValue: {
    fontFamily: "Cairo_700Bold",
    fontSize: 16,
  },
  addHeaderBtn: {
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 10,
  },
  addBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginHorizontal: 16,
    marginVertical: 8,
    padding: 12,
    borderRadius: 14,
    borderWidth: 1.5,
  },
  addIconBox: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  addInput: {
    flex: 1,
    fontFamily: "Cairo_400Regular",
    fontSize: 15,
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 8,
    borderWidth: 1,
  },
  addActions: { flexDirection: "row", gap: 6 },
  addActionBtn: {
    width: 32,
    height: 32,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  catRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
  },
  catIcon: {
    width: 38,
    height: 38,
    borderRadius: 11,
    alignItems: "center",
    justifyContent: "center",
  },
  catInfo: { flex: 1 },
  catName: { fontFamily: "Cairo_600SemiBold", fontSize: 15 },
  catCount: { fontFamily: "Cairo_400Regular", fontSize: 12, marginTop: 1 },
  editInput: {
    flex: 1,
    fontFamily: "Cairo_600SemiBold",
    fontSize: 15,
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 8,
    borderWidth: 1.5,
  },
  catActions: { flexDirection: "row", gap: 6 },
  actionCircle: {
    width: 32,
    height: 32,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  emptyState: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 64,
    gap: 12,
  },
  emptyTitle: { fontFamily: "Cairo_700Bold", fontSize: 18 },
  emptyText: { fontFamily: "Cairo_400Regular", fontSize: 14 },
});
