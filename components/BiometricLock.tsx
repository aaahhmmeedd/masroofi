import { Feather } from "@expo/vector-icons";
import * as LocalAuthentication from "expo-local-authentication";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";

import Colors from "@/constants/colors";

interface Props {
  onUnlock: () => void;
  isDark: boolean;
}

export default function BiometricLock({ onUnlock, isDark }: Props) {
  const C = isDark ? Colors.dark : Colors.light;
  const [status, setStatus] = useState<"idle" | "authenticating" | "error">("idle");
  const [hasHardware, setHasHardware] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  useEffect(() => {
    checkHardware();
  }, []);

  useEffect(() => {
    if (hasHardware) {
      authenticate();
    }
  }, [hasHardware]);

  const checkHardware = async () => {
    const supported = await LocalAuthentication.hasHardwareAsync();
    const enrolled = await LocalAuthentication.isEnrolledAsync();
    setHasHardware(supported && enrolled);
  };

  const authenticate = async () => {
    setStatus("authenticating");
    setErrorMsg("");
    try {
      const result = await LocalAuthentication.authenticateAsync({
        promptMessage: "تحقق من هويتك للدخول لمصروفي",
        cancelLabel: "إلغاء",
        fallbackLabel: "استخدام رمز الدخول",
        disableDeviceFallback: false,
      });
      if (result.success) {
        onUnlock();
      } else {
        setStatus("error");
        setErrorMsg(
          result.error === "user_cancel"
            ? "تم الإلغاء"
            : "فشل التحقق. حاول مرة أخرى"
        );
      }
    } catch {
      setStatus("error");
      setErrorMsg("حدث خطأ في التحقق");
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: C.background }]}>
      <View style={[styles.card, { backgroundColor: C.backgroundCard, shadowColor: C.shadow }]}>
        <View style={[styles.iconWrapper, { backgroundColor: C.navy + "15" }]}>
          <Feather name="lock" size={40} color={C.navy} />
        </View>

        <Text style={[styles.appName, { color: C.text }]}>مصروفي</Text>
        <Text style={[styles.subtitle, { color: C.textSecondary }]}>
          التطبيق محمي بالبصمة
        </Text>

        {status === "authenticating" ? (
          <View style={styles.loadingRow}>
            <ActivityIndicator color={C.tint} size="small" />
            <Text style={[styles.loadingText, { color: C.textSecondary }]}>
              جاري التحقق...
            </Text>
          </View>
        ) : (
          <>
            {status === "error" && (
              <View style={[styles.errorBox, { backgroundColor: C.danger + "15" }]}>
                <Feather name="alert-circle" size={16} color={C.danger} />
                <Text style={[styles.errorText, { color: C.danger }]}>{errorMsg}</Text>
              </View>
            )}
            <Pressable
              onPress={authenticate}
              style={[styles.unlockBtn, { backgroundColor: C.tint }]}
            >
              <Feather name="shield" size={20} color="#fff" />
              <Text style={styles.unlockBtnText}>
                {!hasHardware ? "المتابعة" : "تحقق بالبصمة"}
              </Text>
            </Pressable>
            {!hasHardware && (
              <Text style={[styles.noHardwareNote, { color: C.textMuted }]}>
                لا يوجد بصمة على هذا الجهاز
              </Text>
            )}
          </>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 9999,
    alignItems: "center",
    justifyContent: "center",
    padding: 32,
  },
  card: {
    width: "100%",
    maxWidth: 340,
    borderRadius: 24,
    padding: 32,
    alignItems: "center",
    gap: 12,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 1,
    shadowRadius: 16,
    elevation: 8,
  },
  iconWrapper: {
    width: 80,
    height: 80,
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 4,
  },
  appName: {
    fontFamily: "Cairo_900Black",
    fontSize: 26,
  },
  subtitle: {
    fontFamily: "Cairo_400Regular",
    fontSize: 14,
    textAlign: "center",
    marginBottom: 8,
  },
  loadingRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: 8,
  },
  loadingText: {
    fontFamily: "Cairo_400Regular",
    fontSize: 14,
  },
  errorBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    width: "100%",
  },
  errorText: {
    fontFamily: "Cairo_600SemiBold",
    fontSize: 13,
    flex: 1,
    textAlign: "right",
  },
  unlockBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    width: "100%",
    paddingVertical: 14,
    borderRadius: 14,
    marginTop: 4,
  },
  unlockBtnText: {
    fontFamily: "Cairo_700Bold",
    fontSize: 16,
    color: "#fff",
  },
  noHardwareNote: {
    fontFamily: "Cairo_400Regular",
    fontSize: 12,
    textAlign: "center",
  },
});
