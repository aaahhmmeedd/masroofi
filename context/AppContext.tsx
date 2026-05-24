import AsyncStorage from "@react-native-async-storage/async-storage";
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import Colors, { ThemeColors } from "@/constants/colors";
import { formatCurrency } from "@/constants/arabic";
import {
  AppData,
  AppSettings,
  Debt,
  Expense,
  Month,
  RecurringExpense,
  Transaction,
  Vault,
  DEFAULT_CATEGORIES,
} from "@/constants/types";

const STORAGE_KEY = "@masroofy_data_v2";

const defaultSettings: AppSettings = {
  currency: "ج.م",
  darkMode: false,
  biometricLock: false,
  autoMonthManagement: false,
  notificationsEnabled: false,
  themeAccent: "papyrus",
};

const defaultData: AppData = {
  months: [],
  expenses: [],
  vaults: [],
  transactions: [],
  savings: 0,
  recurringExpenses: [],
  categories: [...DEFAULT_CATEGORIES],
  debts: [],
  settings: defaultSettings,
};

function generateId(): string {
  return Date.now().toString() + Math.random().toString(36).substr(2, 9);
}

interface AppContextValue {
  data: AppData;
  isLoading: boolean;
  colors: ThemeColors;
  fc: (amount: number) => string;
  addMonth: (month: number, year: number, budget: number) => Promise<Month>;
  deleteMonth: (id: string) => Promise<void>;
  endMonth: (monthId: string) => Promise<void>;
  addExpense: (
    monthId: string,
    name: string,
    amount: number,
    source: "budget" | "savings" | string,
    category: string,
    vaultId?: string
  ) => Promise<void>;
  deleteExpense: (id: string) => Promise<void>;
  getMonthExpenses: (monthId: string) => Expense[];
  getMonthBudgetUsed: (monthId: string) => number;
  getMonthIncome: (monthId: string) => { external: number; vault: number; liquidity: number; total: number };
  getMonthTransactions: (monthId: string) => Transaction[];
  addIncome: (monthId: string, amount: number, name: string, source: "external" | "vault" | "liquidity", vaultId?: string) => Promise<void>;
  storeToVault: (monthId: string, vaultId: string, amount: number) => Promise<void>;
  addVault: (name: string, goal: number, color: string) => Promise<Vault>;
  deleteVault: (id: string) => Promise<void>;
  depositToVault: (
    vaultId: string,
    amount: number,
    source: "savings" | string,
    monthId?: string
  ) => Promise<void>;
  withdrawFromVault: (vaultId: string, amount: number) => Promise<void>;
  addToSavings: (amount: number, monthId?: string) => Promise<void>;
  addRecurringExpense: (name: string, amount: number, category: string) => Promise<void>;
  deleteRecurringExpense: (id: string) => Promise<void>;
  addCategory: (name: string) => Promise<void>;
  deleteCategory: (name: string) => Promise<void>;
  updateCategory: (oldName: string, newName: string) => Promise<void>;
  addDebt: (name: string, amount: number, type: "owed_to_me" | "i_owe", note?: string, dueDate?: number) => Promise<void>;
  payDebt: (id: string, amount: number) => Promise<void>;
  deleteDebt: (id: string) => Promise<void>;
  updateExpense: (id: string, partial: { name?: string; amount?: number; category?: string }) => Promise<void>;
  updateDebt: (id: string, partial: { name?: string; note?: string; amount?: number }) => Promise<void>;
  updateSettings: (partial: Partial<AppSettings>) => Promise<void>;
  generateDemoData: () => Promise<void>;
  exportData: () => Promise<string>;
  importData: (jsonStr: string) => Promise<void>;
  updateMonthBudget: (monthId: string, newBudget: number) => Promise<void>;
  payDebtWithMonthTx: (debtId: string, amount: number) => Promise<{ success: boolean; error?: string }>;
  lendMoneyInMonth: (monthId: string, amount: number, personName: string, category: string) => Promise<void>;
  repayMyDebtInMonth: (monthId: string, amount: number, debtId?: string, personName?: string) => Promise<void>;
  borrowMoneyInMonth: (monthId: string, amount: number, personName: string) => Promise<void>;
  receiveDebtInMonth: (monthId: string, amount: number, debtId?: string, personName?: string) => Promise<void>;
  deleteTransaction: (id: string) => Promise<void>;
}

const AppContext = createContext<AppContextValue | null>(null);

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [data, setData] = useState<AppData>(defaultData);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const stored = await AsyncStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        const migrated: AppData = {
          ...defaultData,
          ...parsed,
          settings: { ...defaultSettings, ...(parsed.settings || {}) },
          recurringExpenses: parsed.recurringExpenses || [],
          categories: parsed.categories?.length ? parsed.categories : [...DEFAULT_CATEGORIES],
          debts: parsed.debts || [],
        };
        setData(migrated);
      }
    } catch (e) {
      console.error("Failed to load data", e);
    } finally {
      setIsLoading(false);
    }
  };

  const saveData = async (newData: AppData) => {
    setData(newData);
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(newData));
  };

  const colors = useMemo<ThemeColors>(
    () => {
      const accent = data.settings?.themeAccent ?? "papyrus";
      const isDark = data.settings?.darkMode;
      if (accent === "clean") return isDark ? Colors.cleanDark : Colors.cleanLight;
      return isDark ? Colors.dark : Colors.light;
    },
    [data.settings?.darkMode, data.settings?.themeAccent]
  );

  const fc = useCallback(
    (amount: number) => formatCurrency(amount, data.settings?.currency ?? "ج.م"),
    [data.settings?.currency]
  );

  const addMonth = useCallback(
    async (month: number, year: number, budget: number): Promise<Month> => {
      const newMonth: Month = {
        id: generateId(),
        month,
        year,
        budget,
        createdAt: Date.now(),
      };
      const recurringExpenses: Expense[] = data.recurringExpenses.map((re) => ({
        id: generateId(),
        monthId: newMonth.id,
        name: re.name,
        amount: re.amount,
        source: "budget",
        category: re.category,
        createdAt: Date.now(),
      }));
      const newData = {
        ...data,
        months: [newMonth, ...data.months],
        expenses: [...recurringExpenses, ...data.expenses],
      };
      await saveData(newData);
      return newMonth;
    },
    [data]
  );

  const deleteMonth = useCallback(
    async (id: string) => {
      const newData = {
        ...data,
        months: data.months.filter((m) => m.id !== id),
        expenses: data.expenses.filter((e) => e.monthId !== id),
        transactions: data.transactions.filter((t) => t.monthId !== id),
      };
      await saveData(newData);
    },
    [data]
  );

  const endMonth = useCallback(
    async (monthId: string) => {
      const month = data.months.find((m) => m.id === monthId);
      if (!month) return;
      const budgetExpenses = data.expenses
        .filter((e) => e.monthId === monthId && e.source === "budget")
        .reduce((s, e) => s + e.amount, 0);
      const incomeForMonth = data.transactions
        .filter((t) => t.monthId === monthId && (t.type === "income" || t.type === "debt_borrowed" || t.type === "debt_received_back"))
        .reduce((s, t) => s + t.amount, 0);
      const totalAvailable = month.budget + incomeForMonth;
      const remaining = Math.max(0, totalAvailable - budgetExpenses);
      const endTx: Transaction = {
        id: generateId(),
        type: "month_ended",
        name: "إنهاء الشهر",
        amount: remaining,
        source: "budget",
        monthId,
        createdAt: Date.now(),
      };
      const newData = {
        ...data,
        months: data.months.map((m) =>
          m.id === monthId ? { ...m, isEnded: true, endedAt: Date.now() } : m
        ),
        savings: data.savings + remaining,
        transactions: [endTx, ...data.transactions],
      };
      await saveData(newData);
    },
    [data]
  );

  const addExpense = useCallback(
    async (
      monthId: string,
      name: string,
      amount: number,
      source: "budget" | "savings" | string,
      category: string,
      vaultId?: string
    ) => {
      const newExpense: Expense = {
        id: generateId(),
        monthId,
        name,
        amount,
        source,
        vaultId,
        category,
        createdAt: Date.now(),
      };
      const newTransaction: Transaction = {
        id: generateId(),
        type: "expense",
        name,
        amount,
        source,
        monthId,
        vaultId,
        createdAt: Date.now(),
      };
      let newData = {
        ...data,
        expenses: [newExpense, ...data.expenses],
        transactions: [newTransaction, ...data.transactions],
      };
      if (source === "savings") {
        newData = { ...newData, savings: Math.max(0, data.savings - amount) };
      } else if (vaultId) {
        newData = {
          ...newData,
          vaults: data.vaults.map((v) =>
            v.id === vaultId ? { ...v, balance: Math.max(0, v.balance - amount) } : v
          ),
        };
      }
      await saveData(newData);
    },
    [data]
  );

  const deleteExpense = useCallback(
    async (id: string) => {
      const expense = data.expenses.find((e) => e.id === id);
      if (!expense) return;
      let newData = {
        ...data,
        expenses: data.expenses.filter((e) => e.id !== id),
        transactions: data.transactions.filter(
          (t) => !(t.type === "expense" && t.name === expense.name && t.monthId === expense.monthId && t.amount === expense.amount)
        ),
      };
      if (expense.source === "savings") {
        newData = { ...newData, savings: data.savings + expense.amount };
      } else if (expense.vaultId) {
        newData = {
          ...newData,
          vaults: data.vaults.map((v) =>
            v.id === expense.vaultId ? { ...v, balance: v.balance + expense.amount } : v
          ),
        };
      }
      await saveData(newData);
    },
    [data]
  );

  const getMonthExpenses = useCallback(
    (monthId: string) => data.expenses.filter((e) => e.monthId === monthId),
    [data.expenses]
  );

  const getMonthBudgetUsed = useCallback(
    (monthId: string) =>
      data.expenses
        .filter((e) => e.monthId === monthId && e.source === "budget")
        .reduce((sum, e) => sum + e.amount, 0),
    [data.expenses]
  );

  const getMonthIncome = useCallback(
    (monthId: string) => {
      const incomeTxs = data.transactions.filter(
        (t) => t.monthId === monthId && t.type === "income"
      );
      const external = incomeTxs.filter((t) => t.source === "external").reduce((s, t) => s + t.amount, 0);
      const vault = incomeTxs.filter((t) => t.source === "vault").reduce((s, t) => s + t.amount, 0);
      const liquidity = incomeTxs.filter((t) => t.source === "liquidity").reduce((s, t) => s + t.amount, 0);
      const debtIncome = data.transactions
        .filter((t) => t.monthId === monthId && (t.type === "debt_borrowed" || t.type === "debt_received_back"))
        .reduce((s, t) => s + t.amount, 0);
      return { external, vault, liquidity, total: external + vault + liquidity + debtIncome };
    },
    [data.transactions]
  );

  const getMonthTransactions = useCallback(
    (monthId: string) =>
      data.transactions
        .filter((t) => t.monthId === monthId)
        .sort((a, b) => b.createdAt - a.createdAt),
    [data.transactions]
  );

  const addIncome = useCallback(
    async (
      monthId: string,
      amount: number,
      name: string,
      source: "external" | "vault" | "liquidity",
      vaultId?: string
    ) => {
      const tx: Transaction = {
        id: generateId(),
        type: "income",
        name,
        amount,
        source,
        monthId,
        vaultId,
        createdAt: Date.now(),
      };
      let newData = { ...data, transactions: [tx, ...data.transactions] };
      if (source === "liquidity") {
        newData = { ...newData, savings: Math.max(0, data.savings - amount) };
      } else if (source === "vault" && vaultId) {
        newData = {
          ...newData,
          vaults: data.vaults.map((v) =>
            v.id === vaultId ? { ...v, balance: Math.max(0, v.balance - amount) } : v
          ),
        };
      }
      await saveData(newData);
    },
    [data]
  );

  const storeToVault = useCallback(
    async (monthId: string, vaultId: string, amount: number) => {
      const vault = data.vaults.find(v => v.id === vaultId);
      const expense: Expense = {
        id: generateId(),
        monthId,
        name: vault ? `تخزين في ${vault.name}` : "تحويل للخزنة",
        amount,
        source: "budget",
        vaultId,
        category: "أخرى",
        createdAt: Date.now(),
      };
      const tx: Transaction = {
        id: generateId(),
        type: "store_to_vault",
        name: "تخزين مال في خزنة",
        amount,
        source: "budget",
        monthId,
        vaultId,
        createdAt: Date.now(),
      };
      const newData = {
        ...data,
        expenses: [expense, ...data.expenses],
        transactions: [tx, ...data.transactions],
        vaults: data.vaults.map((v) =>
          v.id === vaultId ? { ...v, balance: v.balance + amount } : v
        ),
      };
      await saveData(newData);
    },
    [data]
  );

  const addVault = useCallback(
    async (name: string, goal: number, color: string): Promise<Vault> => {
      const newVault: Vault = {
        id: generateId(),
        name,
        goal,
        balance: 0,
        color,
        createdAt: Date.now(),
      };
      await saveData({ ...data, vaults: [newVault, ...data.vaults] });
      return newVault;
    },
    [data]
  );

  const deleteVault = useCallback(
    async (id: string) => {
      const vault = data.vaults.find((v) => v.id === id);
      if (!vault) return;
      await saveData({
        ...data,
        vaults: data.vaults.filter((v) => v.id !== id),
        savings: data.savings + vault.balance,
      });
    },
    [data]
  );

  const depositToVault = useCallback(
    async (vaultId: string, amount: number, source: "savings" | string, monthId?: string) => {
      const tx: Transaction = {
        id: generateId(),
        type: "vault_deposit",
        name: "إيداع في الخزنة",
        amount,
        source,
        monthId,
        vaultId,
        createdAt: Date.now(),
      };
      let newData = {
        ...data,
        vaults: data.vaults.map((v) =>
          v.id === vaultId ? { ...v, balance: v.balance + amount } : v
        ),
        transactions: [tx, ...data.transactions],
      };
      if (source === "savings") {
        newData = { ...newData, savings: Math.max(0, data.savings - amount) };
      } else if (monthId) {
        const expense: Expense = {
          id: generateId(),
          monthId,
          name: "تحويل للخزنة",
          amount,
          source: "budget",
          vaultId,
          category: "أخرى",
          createdAt: Date.now(),
        };
        newData = { ...newData, expenses: [expense, ...data.expenses] };
      }
      await saveData(newData);
    },
    [data]
  );

  const withdrawFromVault = useCallback(
    async (vaultId: string, amount: number) => {
      await saveData({
        ...data,
        vaults: data.vaults.map((v) =>
          v.id === vaultId ? { ...v, balance: Math.max(0, v.balance - amount) } : v
        ),
        savings: data.savings + amount,
      });
    },
    [data]
  );

  const addToSavings = useCallback(
    async (amount: number, monthId?: string) => {
      const tx: Transaction = {
        id: generateId(),
        type: "savings_add",
        name: "إضافة للسيولة",
        amount,
        source: monthId ? "budget" : "manual",
        monthId,
        createdAt: Date.now(),
      };
      let newData = {
        ...data,
        savings: data.savings + amount,
        transactions: [tx, ...data.transactions],
      };
      if (monthId) {
        const expense: Expense = {
          id: generateId(),
          monthId,
          name: "تحويل للسيولة",
          amount,
          source: "budget",
          category: "أخرى",
          createdAt: Date.now(),
        };
        newData = { ...newData, expenses: [expense, ...data.expenses] };
      }
      await saveData(newData);
    },
    [data]
  );

  const addRecurringExpense = useCallback(
    async (name: string, amount: number, category: string) => {
      const newRE: RecurringExpense = {
        id: generateId(),
        name,
        amount,
        category,
        createdAt: Date.now(),
      };
      await saveData({
        ...data,
        recurringExpenses: [newRE, ...data.recurringExpenses],
      });
    },
    [data]
  );

  const deleteRecurringExpense = useCallback(
    async (id: string) => {
      await saveData({
        ...data,
        recurringExpenses: data.recurringExpenses.filter((r) => r.id !== id),
      });
    },
    [data]
  );

  const addCategory = useCallback(
    async (name: string) => {
      const trimmed = name.trim();
      if (!trimmed || data.categories.includes(trimmed)) return;
      await saveData({ ...data, categories: [...data.categories, trimmed] });
    },
    [data]
  );

  const deleteCategory = useCallback(
    async (name: string) => {
      await saveData({
        ...data,
        categories: data.categories.filter((c) => c !== name),
      });
    },
    [data]
  );

  const updateCategory = useCallback(
    async (oldName: string, newName: string) => {
      const trimmed = newName.trim();
      if (!trimmed || data.categories.includes(trimmed)) return;
      await saveData({
        ...data,
        categories: data.categories.map((c) => (c === oldName ? trimmed : c)),
        expenses: data.expenses.map((e) =>
          e.category === oldName ? { ...e, category: trimmed } : e
        ),
        recurringExpenses: data.recurringExpenses.map((r) =>
          r.category === oldName ? { ...r, category: trimmed } : r
        ),
      });
    },
    [data]
  );

  const addDebt = useCallback(
    async (name: string, amount: number, type: "owed_to_me" | "i_owe", note?: string, dueDate?: number) => {
      const debt: Debt = {
        id: generateId(),
        name: name.trim(),
        amount,
        remaining: amount,
        type,
        note: note?.trim(),
        dueDate,
        createdAt: Date.now(),
        isPaid: false,
      };
      await saveData({ ...data, debts: [debt, ...(data.debts || [])] });
    },
    [data]
  );

  const payDebt = useCallback(
    async (id: string, amount: number) => {
      await saveData({
        ...data,
        debts: (data.debts || []).map((d) => {
          if (d.id !== id) return d;
          const newRemaining = Math.max(0, d.remaining - amount);
          return { ...d, remaining: newRemaining, isPaid: newRemaining === 0 };
        }),
      });
    },
    [data]
  );

  const deleteDebt = useCallback(
    async (id: string) => {
      await saveData({ ...data, debts: (data.debts || []).filter((d) => d.id !== id) });
    },
    [data]
  );

  const updateExpense = useCallback(
    async (id: string, partial: { name?: string; amount?: number; category?: string }) => {
      const expense = data.expenses.find((e) => e.id === id);
      if (!expense) return;
      const oldAmount = expense.amount;
      const newAmount = partial.amount ?? oldAmount;
      const diff = newAmount - oldAmount;
      let newData = {
        ...data,
        expenses: data.expenses.map((e) => (e.id === id ? { ...e, ...partial } : e)),
      };
      if (diff !== 0) {
        if (expense.source === "savings") {
          newData = { ...newData, savings: Math.max(0, data.savings - diff) };
        } else if (expense.vaultId) {
          newData = {
            ...newData,
            vaults: data.vaults.map((v) =>
              v.id === expense.vaultId ? { ...v, balance: Math.max(0, v.balance - diff) } : v
            ),
          };
        }
      }
      await saveData(newData);
    },
    [data]
  );

  const updateDebt = useCallback(
    async (id: string, partial: { name?: string; note?: string; amount?: number }) => {
      await saveData({
        ...data,
        debts: (data.debts || []).map((d) => {
          if (d.id !== id) return d;
          const newAmount = partial.amount ?? d.amount;
          const newRemaining =
            partial.amount !== undefined
              ? Math.max(0, d.remaining + (newAmount - d.amount))
              : d.remaining;
          return { ...d, ...partial, amount: newAmount, remaining: newRemaining, isPaid: newRemaining === 0 };
        }),
      });
    },
    [data]
  );

  const updateSettings = useCallback(
    async (partial: Partial<AppSettings>) => {
      await saveData({
        ...data,
        settings: { ...data.settings, ...partial },
      });
    },
    [data]
  );

  const generateDemoData = useCallback(async () => {
    const now = new Date();
    const months: Month[] = [];
    const expenses: Expense[] = [];
    const transactions: Transaction[] = [];
    const numMonths = 6;
    const expenseTemplates = [
      { name: "إيجار", amount: 1500, category: "منزل" },
      { name: "فاتورة الكهرباء", amount: 180, category: "فواتير ومرافق" },
      { name: "فاتورة الإنترنت", amount: 250, category: "فواتير ومرافق" },
      { name: "سوبر ماركت", amount: 400, category: "طعام ومشروبات" },
      { name: "مطعم", amount: 120, category: "طعام ومشروبات" },
      { name: "بنزين", amount: 300, category: "نقل ومواصلات" },
      { name: "ملابس", amount: 200, category: "تسوق" },
      { name: "صيدلية", amount: 90, category: "صحة ورياضة" },
      { name: "اشتراك جيم", amount: 200, category: "صحة ورياضة" },
      { name: "نتفليكس", amount: 60, category: "ترفيه" },
    ];
    for (let i = numMonths - 1; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const budget = 4000 + Math.floor(Math.random() * 3000);
      const mid = generateId();
      const m: Month = {
        id: mid,
        month: d.getMonth() + 1,
        year: d.getFullYear(),
        budget,
        createdAt: d.getTime(),
        isEnded: i > 0,
        endedAt: i > 0 ? d.getTime() + 25 * 86400000 : undefined,
      };
      months.push(m);
      const numExpenses = 5 + Math.floor(Math.random() * 6);
      let totalSpent = 0;
      for (let j = 0; j < numExpenses; j++) {
        const tmpl = expenseTemplates[j % expenseTemplates.length];
        const variance = 0.8 + Math.random() * 0.4;
        const amount = Math.round(tmpl.amount * variance);
        totalSpent += amount;
        const exp: Expense = {
          id: generateId(),
          monthId: mid,
          name: tmpl.name,
          amount,
          source: "budget",
          category: tmpl.category,
          createdAt: d.getTime() + j * 86400000,
        };
        expenses.push(exp);
        transactions.push({
          id: generateId(),
          type: "expense",
          name: tmpl.name,
          amount,
          source: "budget",
          monthId: mid,
          createdAt: exp.createdAt,
        });
      }
      if (i > 0) {
        const remaining = Math.max(0, budget - totalSpent);
        transactions.push({
          id: generateId(),
          type: "month_ended",
          name: "إنهاء الشهر",
          amount: remaining,
          source: "budget",
          monthId: mid,
          createdAt: m.endedAt!,
        });
      }
    }
    const totalSavings = months.reduce((s, m) => {
      if (!m.isEnded) return s;
      const spent = expenses.filter(e => e.monthId === m.id).reduce((a, e) => a + e.amount, 0);
      return s + Math.max(0, m.budget - spent);
    }, 0);
    const demoVaults: Vault[] = [
      { id: generateId(), name: "صندوق الطوارئ", goal: 10000, balance: 3500, color: "#1B818F", createdAt: Date.now() },
      { id: generateId(), name: "سفر العيد", goal: 5000, balance: 1200, color: "#7B4D35", createdAt: Date.now() },
    ];
    await saveData({
      ...data,
      months,
      expenses,
      transactions,
      vaults: demoVaults,
      savings: totalSavings,
    });
  }, [data]);

  const updateMonthBudget = useCallback(
    async (monthId: string, newBudget: number) => {
      await saveData({
        ...data,
        months: data.months.map((m) => m.id === monthId ? { ...m, budget: newBudget } : m),
      });
    },
    [data]
  );

  const payDebtWithMonthTx = useCallback(
    async (debtId: string, amount: number): Promise<{ success: boolean; error?: string }> => {
      const activeMonth = data.months
        .filter((m) => !m.isEnded)
        .sort((a, b) => new Date(b.year, b.month - 1).getTime() - new Date(a.year, a.month - 1).getTime())[0];
      if (!activeMonth) return { success: false, error: "لا يوجد شهر نشط. أنشئ شهراً أولاً من الصفحة الرئيسية." };
      const debt = (data.debts || []).find((d) => d.id === debtId);
      if (!debt) return { success: false, error: "الدين غير موجود" };
      const newRemaining = Math.max(0, debt.remaining - amount);
      const now = Date.now();
      if (debt.type === "i_owe") {
        const budgetSpent = data.expenses
          .filter((e) => e.monthId === activeMonth.id && e.source === "budget")
          .reduce((s, e) => s + e.amount, 0);
        const incomeTotal = data.transactions
          .filter((t) => t.monthId === activeMonth.id && (t.type === "income" || t.type === "debt_borrowed" || t.type === "debt_received_back"))
          .reduce((s, t) => s + t.amount, 0);
        const available = activeMonth.budget + incomeTotal - budgetSpent;
        if (available < amount) {
          return { success: false, error: "الميزانية الحالية لا تكفي لسداد هذا الدين. اذهب للشهر الحالي لتحديد طريقة أخرى للسداد." };
        }
        const newExpense: Expense = {
          id: generateId(), monthId: activeMonth.id,
          name: `سددت لـ${debt.name}`, amount,
          source: "budget", category: "ديون", createdAt: now,
        };
        const tx: Transaction = {
          id: generateId(), type: "debt_repaid_out",
          name: `سددت لـ${debt.name}`, amount,
          source: "budget", monthId: activeMonth.id, debtId, createdAt: now,
        };
        await saveData({
          ...data,
          expenses: [newExpense, ...data.expenses],
          transactions: [tx, ...data.transactions],
          debts: (data.debts || []).map((d) =>
            d.id === debtId ? { ...d, remaining: newRemaining, isPaid: newRemaining === 0 } : d
          ),
        });
      } else {
        const tx: Transaction = {
          id: generateId(), type: "debt_received_back",
          name: `استلمت من ${debt.name}`, amount,
          source: "external", monthId: activeMonth.id, debtId, createdAt: now,
        };
        await saveData({
          ...data,
          transactions: [tx, ...data.transactions],
          debts: (data.debts || []).map((d) =>
            d.id === debtId ? { ...d, remaining: newRemaining, isPaid: newRemaining === 0 } : d
          ),
        });
      }
      return { success: true };
    },
    [data]
  );

  const lendMoneyInMonth = useCallback(
    async (monthId: string, amount: number, personName: string, category: string) => {
      const now = Date.now();
      const debtId = generateId();
      const newExpense: Expense = {
        id: generateId(), monthId,
        name: `أقرضت ${personName}`, amount,
        source: "budget", category, createdAt: now,
      };
      const tx: Transaction = {
        id: generateId(), type: "debt_given",
        name: `أقرضت ${personName}`, amount,
        source: "budget", monthId, debtId, createdAt: now,
      };
      const newDebt: Debt = {
        id: debtId, name: personName, amount, remaining: amount,
        type: "owed_to_me", note: "مرتبط بشهر", createdAt: now, isPaid: false,
      };
      await saveData({
        ...data,
        expenses: [newExpense, ...data.expenses],
        transactions: [tx, ...data.transactions],
        debts: [newDebt, ...(data.debts || [])],
      });
    },
    [data]
  );

  const repayMyDebtInMonth = useCallback(
    async (monthId: string, amount: number, debtId?: string, personName?: string) => {
      const now = Date.now();
      const debtName = debtId
        ? ((data.debts || []).find((d) => d.id === debtId)?.name ?? personName ?? "؟")
        : (personName ?? "؟");
      const newExpense: Expense = {
        id: generateId(), monthId,
        name: `سددت لـ${debtName}`, amount,
        source: "budget", category: "ديون", createdAt: now,
      };
      const tx: Transaction = {
        id: generateId(), type: "debt_repaid_out",
        name: `سددت لـ${debtName}`, amount,
        source: "budget", monthId, debtId, createdAt: now,
      };
      let newDebts = data.debts || [];
      if (debtId) {
        newDebts = newDebts.map((d) =>
          d.id === debtId ? { ...d, remaining: Math.max(0, d.remaining - amount), isPaid: d.remaining <= amount } : d
        );
      } else if (personName) {
        const newDebt: Debt = {
          id: generateId(), name: personName, amount, remaining: amount,
          type: "i_owe", createdAt: now, isPaid: false,
        };
        newDebts = [newDebt, ...newDebts];
      }
      await saveData({
        ...data,
        expenses: [newExpense, ...data.expenses],
        transactions: [tx, ...data.transactions],
        debts: newDebts,
      });
    },
    [data]
  );

  const borrowMoneyInMonth = useCallback(
    async (monthId: string, amount: number, personName: string) => {
      const now = Date.now();
      const debtId = generateId();
      const tx: Transaction = {
        id: generateId(), type: "debt_borrowed",
        name: `اقترضت من ${personName}`, amount,
        source: "external", monthId, debtId, createdAt: now,
      };
      const newDebt: Debt = {
        id: debtId, name: personName, amount, remaining: amount,
        type: "i_owe", note: "مرتبط بشهر", createdAt: now, isPaid: false,
      };
      await saveData({
        ...data,
        transactions: [tx, ...data.transactions],
        debts: [newDebt, ...(data.debts || [])],
      });
    },
    [data]
  );

  const receiveDebtInMonth = useCallback(
    async (monthId: string, amount: number, debtId?: string, personName?: string) => {
      const now = Date.now();
      const debtName = debtId
        ? ((data.debts || []).find((d) => d.id === debtId)?.name ?? personName ?? "؟")
        : (personName ?? "؟");
      const tx: Transaction = {
        id: generateId(), type: "debt_received_back",
        name: `استلمت من ${debtName}`, amount,
        source: "external", monthId, debtId, createdAt: now,
      };
      let newDebts = data.debts || [];
      if (debtId) {
        newDebts = newDebts.map((d) =>
          d.id === debtId ? { ...d, remaining: Math.max(0, d.remaining - amount), isPaid: d.remaining <= amount } : d
        );
      }
      await saveData({
        ...data,
        transactions: [tx, ...data.transactions],
        debts: newDebts,
      });
    },
    [data]
  );

  const deleteTransaction = useCallback(
    async (id: string) => {
      const tx = data.transactions.find((t) => t.id === id);
      if (!tx) return;

      let newData: AppData = {
        ...data,
        transactions: data.transactions.filter((t) => t.id !== id),
      };

      switch (tx.type) {
        case "income":
          if (tx.source === "vault" && tx.vaultId) {
            newData = {
              ...newData,
              vaults: data.vaults.map((v) =>
                v.id === tx.vaultId ? { ...v, balance: v.balance + tx.amount } : v
              ),
            };
          } else if (tx.source === "liquidity") {
            newData = { ...newData, savings: data.savings + tx.amount };
          }
          break;

        case "store_to_vault":
          if (tx.vaultId) {
            newData = {
              ...newData,
              vaults: data.vaults.map((v) =>
                v.id === tx.vaultId ? { ...v, balance: Math.max(0, v.balance - tx.amount) } : v
              ),
            };
          }
          newData = {
            ...newData,
            expenses: newData.expenses.filter(
              (e) => !(e.monthId === tx.monthId && e.vaultId === tx.vaultId && e.amount === tx.amount)
            ),
          };
          break;

        case "savings_add":
          newData = { ...newData, savings: Math.max(0, data.savings - tx.amount) };
          newData = {
            ...newData,
            expenses: newData.expenses.filter(
              (e) => !(e.monthId === tx.monthId && e.source === "budget" && e.amount === tx.amount &&
                (e.name === "تحويل للسيولة" || e.name === "إضافة للسيولة"))
            ),
          };
          break;

        case "expense": {
          const expense = data.expenses.find(
            (e) => e.monthId === tx.monthId && e.amount === tx.amount && e.name === tx.name
          );
          if (expense) {
            newData = { ...newData, expenses: newData.expenses.filter((e) => e.id !== expense.id) };
            if (expense.source === "savings") {
              newData = { ...newData, savings: data.savings + tx.amount };
            } else if (expense.vaultId) {
              newData = {
                ...newData,
                vaults: data.vaults.map((v) =>
                  v.id === expense.vaultId ? { ...v, balance: v.balance + tx.amount } : v
                ),
              };
            }
          }
          break;
        }

        case "vault_deposit":
          if (tx.vaultId) {
            newData = {
              ...newData,
              vaults: data.vaults.map((v) =>
                v.id === tx.vaultId ? { ...v, balance: Math.max(0, v.balance - tx.amount) } : v
              ),
            };
          }
          if (tx.source === "savings") {
            newData = { ...newData, savings: data.savings + tx.amount };
          }
          break;

        case "month_ended":
          newData = { ...newData, savings: Math.max(0, data.savings - tx.amount) };
          if (tx.monthId) {
            newData = {
              ...newData,
              months: data.months.map((m) =>
                m.id === tx.monthId ? { ...m, isEnded: false, endedAt: undefined } : m
              ),
            };
          }
          break;

        case "debt_given":
          newData = {
            ...newData,
            expenses: newData.expenses.filter(
              (e) => !(e.monthId === tx.monthId && e.amount === tx.amount && e.source === "budget" && e.name === tx.name)
            ),
          };
          if (tx.debtId) {
            newData = {
              ...newData,
              debts: (data.debts || []).filter((d) => d.id !== tx.debtId),
            };
          }
          break;

        case "debt_repaid_out":
          newData = {
            ...newData,
            expenses: newData.expenses.filter(
              (e) => !(e.monthId === tx.monthId && e.amount === tx.amount && e.source === "budget" && e.name === tx.name)
            ),
          };
          if (tx.debtId) {
            newData = {
              ...newData,
              debts: (data.debts || []).map((d) =>
                d.id === tx.debtId
                  ? { ...d, remaining: d.remaining + tx.amount, isPaid: false }
                  : d
              ),
            };
          }
          break;

        case "debt_borrowed":
          if (tx.debtId) {
            newData = {
              ...newData,
              debts: (data.debts || []).filter((d) => d.id !== tx.debtId),
            };
          }
          break;

        case "debt_received_back":
          if (tx.debtId) {
            newData = {
              ...newData,
              debts: (data.debts || []).map((d) =>
                d.id === tx.debtId
                  ? { ...d, remaining: d.remaining + tx.amount, isPaid: false }
                  : d
              ),
            };
          }
          break;

        default:
          break;
      }

      await saveData(newData);
    },
    [data]
  );

  const exportData = useCallback(async (): Promise<string> => {
    return JSON.stringify(data, null, 2);
  }, [data]);

  const importData = useCallback(async (jsonStr: string) => {
    const parsed = JSON.parse(jsonStr) as AppData;
    const migrated: AppData = {
      ...defaultData,
      ...parsed,
      settings: { ...defaultSettings, ...(parsed.settings || {}) },
      recurringExpenses: parsed.recurringExpenses || [],
    };
    await saveData(migrated);
  }, []);

  const value = useMemo(
    () => ({
      data,
      isLoading,
      colors,
      fc,
      addMonth,
      deleteMonth,
      endMonth,
      addExpense,
      deleteExpense,
      getMonthExpenses,
      getMonthBudgetUsed,
      getMonthIncome,
      getMonthTransactions,
      addIncome,
      storeToVault,
      addVault,
      deleteVault,
      depositToVault,
      withdrawFromVault,
      addToSavings,
      addRecurringExpense,
      deleteRecurringExpense,
      addCategory,
      deleteCategory,
      updateCategory,
      addDebt,
      payDebt,
      deleteDebt,
      updateExpense,
      updateDebt,
      updateSettings,
      generateDemoData,
      exportData,
      importData,
      updateMonthBudget,
      payDebtWithMonthTx,
      lendMoneyInMonth,
      repayMyDebtInMonth,
      borrowMoneyInMonth,
      receiveDebtInMonth,
      deleteTransaction,
    }),
    [
      data, isLoading, colors, fc,
      addMonth, deleteMonth, endMonth,
      addExpense, deleteExpense,
      getMonthExpenses, getMonthBudgetUsed, getMonthIncome, getMonthTransactions,
      addIncome, storeToVault,
      addVault, deleteVault, depositToVault, withdrawFromVault, addToSavings,
      addRecurringExpense, deleteRecurringExpense,
      addCategory, deleteCategory, updateCategory,
      addDebt, payDebt, deleteDebt,
      updateExpense, updateDebt,
      updateSettings, generateDemoData,
      exportData, importData,
      updateMonthBudget, payDebtWithMonthTx,
      lendMoneyInMonth, repayMyDebtInMonth,
      borrowMoneyInMonth, receiveDebtInMonth,
      deleteTransaction,
    ]
  );

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error("useApp must be used within AppProvider");
  return ctx;
}
