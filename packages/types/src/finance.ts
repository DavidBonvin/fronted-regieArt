export type ExpenseCategory =
  | 'TRAVEL'
  | 'ACCOMMODATION'
  | 'FOOD'
  | 'EQUIPMENT'
  | 'MARKETING'
  | 'FEES'
  | 'OTHER';

export type FinanceEntryType = 'INCOME' | 'EXPENSE';
export type FinanceStatus = 'PENDING' | 'APPROVED' | 'REJECTED';

export interface FinanceCategory {
  id: string;
  orgId: string;
  name: string;
  type: FinanceEntryType;
  icon?: string;
}

export interface FinanceEntry {
  id: string;
  orgId: string;
  eventId?: string;
  categoryId: string;
  category?: FinanceCategory;
  type: FinanceEntryType;
  amount: string;
  currency: string;
  description?: string;
  date: string;
  status: FinanceStatus;
  proofAssetId?: string;
  authorId: string;
  createdAt: string;
  updatedAt: string;
}

export interface PerDiemPayout {
  id: string;
  orgId: string;
  eventId: string;
  userId: string;
  amount: string;
  currency: string;
  isPaid: boolean;
  paidAt?: string;
}

export interface FinanceReportResponse {
  period: {
    from: string | null;
    to: string | null;
  };
  summary: {
    totalIncome: number;
    totalExpense: number;
    balance: number;
  };
  byCategory: Array<{
    name: string;
    type: FinanceEntryType;
    total: number;
    count: number;
  }>;
}

export interface CreateFinanceCategoryDto {
  orgId: string;
  name: string;
  type: FinanceEntryType;
  icon?: string;
}

export interface CreateFinanceEntryDto {
  orgId: string;
  eventId?: string;
  categoryId: string;
  type: FinanceEntryType;
  amount: string;
  currency: string;
  description?: string;
  date: string;
  proofAssetId?: string;
}

export interface UpdateFinanceEntryDto {
  categoryId?: string;
  amount?: string;
  currency?: string;
  description?: string;
  date?: string;
  proofAssetId?: string;
}

export interface FinanceEntryListParams {
  orgId?: string;
  eventId?: string;
  type?: FinanceEntryType;
  status?: FinanceStatus;
  from?: string;
  to?: string;
  page?: number;
  limit?: number;
}

export interface CreatePerDiemDto {
  orgId: string;
  eventId: string;
  userId: string;
  amount: string;
  currency: string;
}

export type ExpenseStatus = 'pending' | 'approved' | 'rejected';

export interface Expense {
  id: string;
  title: string;
  amount: number;
  currency: string;
  category: ExpenseCategory;
  status: ExpenseStatus;
  receiptFileUrl?: string;
  receiptFileKey?: string;
  submittedBy: string;
  submittedAt: string;
  reviewedBy?: string;
  reviewedAt?: string;
  daysheetId: string;
  organizationId: string;
  notes?: string;
}

export interface ExpenseCreateRequest {
  title: string;
  amount: number;
  currency: string;
  category: ExpenseCategory;
  daysheetId: string;
  notes?: string;
}

export interface ReceiptUploadPresignedUrl {
  uploadUrl: string;
  fileKey: string;
  expiresAt: string;
}

export interface PerDiem {
  id: string;
  userId: string;
  amount: number;
  currency: string;
  daysheetId: string;
  paidAt?: string;
}

export interface FinanceSummary {
  daysheetId: string;
  currency: string;
  totalExpenses: number;
  totalPerDiems: number;
  pendingExpenses: number;
  approvedExpenses: number;
  expensesByCategory: Record<ExpenseCategory, number>;
}
