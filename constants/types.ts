export interface Month {
  id: string;
  month: number;
  year: number;
  budget: number;
  createdAt: number;
  isEnded?: boolean;
  endedAt?: number;
}

export interface Expense {
  id: string;
  monthId: string;
  name: string;
  amount: number;
  source: "budget" | "savings" | "vault" | string;
  vaultId?: string;
  category: string;
  createdAt: number;
}

export interface Vault {
  id: string;
  name: string;
  goal: number;
  balance: number;
  color: string;
  createdAt: number;
}

export interface Transaction {
  id: string;
  type:
    | "expense"
    | "vault_deposit"
    | "savings_add"
    | "income"
    | "month_ended"
    | "store_to_vault"
    | "debt_given"
    | "debt_repaid_out"
    | "debt_borrowed"
    | "debt_received_back";
  name: string;
  amount: number;
  source: string;
  monthId?: string;
  vaultId?: string;
  debtId?: string;
  createdAt: number;
}

export interface RecurringExpense {
  id: string;
  name: string;
  amount: number;
  category: string;
  createdAt: number;
}

export interface Debt {
  id: string;
  name: string;
  amount: number;
  remaining: number;
  type: "owed_to_me" | "i_owe";
  note?: string;
  dueDate?: number;
  createdAt: number;
  isPaid: boolean;
}

export interface AppSettings {
  currency: "ج.م" | "ر.س" | "$";
  darkMode: boolean;
  biometricLock: boolean;
  autoMonthManagement: boolean;
  notificationsEnabled: boolean;
  themeAccent: "papyrus" | "clean";
}

export interface AppData {
  months: Month[];
  expenses: Expense[];
  vaults: Vault[];
  transactions: Transaction[];
  savings: number;
  recurringExpenses: RecurringExpense[];
  categories: string[];
  debts: Debt[];
  settings: AppSettings;
}

export const DEFAULT_CATEGORIES = [
  "طعام ومشروبات",
  "نقل ومواصلات",
  "تسوق",
  "فواتير ومرافق",
  "صحة ورياضة",
  "ترفيه",
  "تعليم",
  "سفر",
  "منزل",
  "أخرى",
];

export const EXPENSE_CATEGORIES = DEFAULT_CATEGORIES;

export const VAULT_COLORS = [
  "#1B818F",
  "#7B4D35",
  "#A3BFB0",
  "#C0504A",
  "#D4864A",
  "#156B76",
  "#9B5D45",
  "#6A9E8E",
];
