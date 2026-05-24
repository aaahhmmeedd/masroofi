import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { router } from "expo-router";
import React, { useState } from "react";
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
    Alert.alert(
      "حذف الفئة",
      `هل تريد حذف فئة "${name}"؟ ستبقى المصاريف المُدرجة تحتها كما هي.`,
      [
        { text: "إلغاء", style: "cancel" },
        {
          text: "حذف",
          style: "destructive",
          onPress: async () => {
            await deleteCategory(name);
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
          },
        },
      ]
    );
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
      <View style={[styles.header, { paddingTop: topInset + 8, backgroundColor: C.navy }]}>
        <Pressable onPress={() => router.back()} style={styles.backBtn}>
          <Feather name="arrow-right" size={22} color="#fff" />
        </Pressable>
        <Text style={styles.headerTitle}>فئات المصاريف</Text>
        <Pressable
          onPress={() => {
            setIsAdding(true);
            setEditingCat(null);
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
          }}
          style={styles.addHeaderBtn}
        >
          <Feather name="plus" size={22} color="#fff" />
        </Pressable>
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
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingBottom: 16,
    gap: 12,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(255,255,255,0.15)",
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: {
    flex: 1,
    fontFamily: "Cairo_700Bold",
    fontSize: 18,
    color: "#fff",
    textAlign: "center",
  },
  addHeaderBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(255,255,255,0.15)",
    alignItems: "center",
    justifyContent: "center",
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
