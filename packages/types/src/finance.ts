export type ExpenseCategory =
  | 'transport'
  | 'accommodation'
  | 'food'
  | 'equipment'
  | 'per_diem'
  | 'venue'
  | 'other';

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
