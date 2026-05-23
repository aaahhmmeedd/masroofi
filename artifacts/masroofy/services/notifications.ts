import { Platform } from "react-native";

type N = typeof import("expo-notifications");

function getN(): N | null {
  if (Platform.OS === "web") return null;
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const mod = require("expo-notifications") as N;
    try {
      mod.setNotificationHandler({
        handleNotification: async () => ({
          shouldShowAlert: true,
          shouldPlaySound: true,
          shouldSetBadge: false,
          shouldShowBanner: true,
          shouldShowList: true,
        }),
      });
    } catch {}
    return mod;
  } catch {
    return null;
  }
}

const N = getN();

export async function requestPermissions(): Promise<boolean> {
  if (!N) return false;
  try {
    const { status } = await N.requestPermissionsAsync();
    return status === "granted";
  } catch {
    return false;
  }
}

export async function notifyBudgetWarning(monthName: string, pct: number): Promise<void> {
  if (!N) return;
  try {
    await N.scheduleNotificationAsync({
      content: {
        title: "تحذير: الميزانية قاربت على الانتهاء ⚠️",
        body: `استهلكت ${Math.round(pct * 100)}٪ من ميزانية ${monthName}`,
        data: { type: "budget_warning" },
      },
      trigger: null,
    });
  } catch {}
}

export async function scheduleMonthEndReminder(year: number, month: number): Promise<void> {
  if (!N) return;
  try {
    const lastDay = new Date(year, month, 0);
    lastDay.setHours(10, 0, 0, 0);
    if (lastDay.getTime() <= Date.now()) return;
    await N.scheduleNotificationAsync({
      content: {
        title: "الشهر يوشك على الانتهاء 📅",
        body: "راجع مصاريفك وأنهِ الشهر الحالي لإضافة المتبقي للسيولة",
        data: { type: "month_end" },
      },
      trigger: {
        type: N.SchedulableTriggerInputTypes.DATE,
        date: lastDay,
      },
    });
  } catch {}
}

export async function notifyDebtReminder(count: number, totalAmount: string): Promise<void> {
  if (!N) return;
  try {
    await N.scheduleNotificationAsync({
      content: {
        title: `لديك ${count} دين نشط 💸`,
        body: `إجمالي الديون: ${totalAmount} — تابعها من صفحة الديون`,
        data: { type: "debt_reminder" },
      },
      trigger: null,
    });
  } catch {}
}

export async function notifyAutoMonthCreated(monthName: string, budget: string): Promise<void> {
  if (!N) return;
  try {
    await N.scheduleNotificationAsync({
      content: {
        title: "تم إنشاء شهر جديد تلقائياً 🗓️",
        body: `${monthName} بميزانية ${budget}`,
        data: { type: "auto_month" },
      },
      trigger: null,
    });
  } catch {}
}

export async function cancelAll(): Promise<void> {
  if (!N) return;
  try {
    await N.cancelAllScheduledNotificationsAsync();
  } catch {}
}
