import React from "react";
import { Modal, View, Text, Pressable, StyleSheet, Platform } from "react-native";
import { Feather } from "@expo/vector-icons";
import { ThemeColors } from "@/constants/colors";

interface CustomConfirmDialogProps {
  visible: boolean;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  isDangerous?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
  colors: ThemeColors;
}

export function CustomConfirmDialog({
  visible,
  title,
  message,
  confirmText = "تأكيد",
  cancelText = "إلغاء",
  isDangerous = false,
  onConfirm,
  onCancel,
  colors: C,
}: CustomConfirmDialogProps) {
  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onCancel}
    >
      <View style={styles.overlay}>
        <View style={[styles.dialog, { backgroundColor: C.backgroundCard }]}>
          {/* Icon */}
          <View style={[
            styles.iconContainer,
            { backgroundColor: isDangerous ? C.danger + "15" : C.warning + "15" }
          ]}>
            <Feather
              name={isDangerous ? "alert-circle" : "help-circle"}
              size={32}
              color={isDangerous ? C.danger : C.warning}
            />
          </View>

          {/* Title */}
          <Text style={[styles.title, { color: C.text }]}>{title}</Text>

          {/* Message */}
          <Text style={[styles.message, { color: C.textSecondary }]}>{message}</Text>

          {/* Buttons */}
          <View style={styles.buttonContainer}>
            <Pressable
              onPress={onCancel}
              style={[styles.button, { backgroundColor: C.backgroundSecondary }]}
            >
              <Text style={[styles.buttonText, { color: C.textSecondary }]}>
                {cancelText}
              </Text>
            </Pressable>
            <Pressable
              onPress={onConfirm}
              style={[
                styles.button,
                {
                  backgroundColor: isDangerous ? C.danger : C.tint,
                },
              ]}
            >
              <Text style={[styles.buttonText, { color: "#fff" }]}>
                {confirmText}
              </Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },
  dialog: {
    borderRadius: 20,
    padding: 24,
    width: "100%",
    maxWidth: 320,
    alignItems: "center",
    gap: 16,
  },
  iconContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 8,
  },
  title: {
    fontFamily: "Cairo_700Bold",
    fontSize: 18,
    textAlign: "center",
  },
  message: {
    fontFamily: "Cairo_400Regular",
    fontSize: 14,
    textAlign: "center",
    lineHeight: 20,
  },
  buttonContainer: {
    flexDirection: "row",
    gap: 12,
    width: "100%",
    marginTop: 8,
  },
  button: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  buttonText: {
    fontFamily: "Cairo_600SemiBold",
    fontSize: 14,
  },
});
