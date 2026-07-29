import type {
  FinanceCategory,
  CreateFinanceCategoryDto,
  FinanceEntry,
  CreateFinanceEntryDto,
  UpdateFinanceEntryDto,
  FinanceEntryListParams,
  PerDiemPayout,
  CreatePerDiemDto,
  FinanceReportResponse,
} from '@regieart/types';
import { getHttpClient } from '../client/httpClient';
import type { ApiRes } from '../client/types';

export async function createCategory(dto: CreateFinanceCategoryDto): Promise<FinanceCategory> {
  const res = await getHttpClient()
    .post('finance/categories', { json: dto })
    .json<ApiRes<FinanceCategory>>();
  return res.data;
}

export async function listCategories(orgId: string): Promise<FinanceCategory[]> {
  const res = await getHttpClient()
    .get('finance/categories', { searchParams: { orgId } })
    .json<ApiRes<FinanceCategory[]>>();
  return res.data;
}

export async function deleteCategory(categoryId: string): Promise<void> {
  await getHttpClient().delete(`finance/categories/${categoryId}`);
}

export async function createEntry(dto: CreateFinanceEntryDto): Promise<FinanceEntry> {
  const res = await getHttpClient()
    .post('finance/entries', { json: dto })
    .json<ApiRes<FinanceEntry>>();
  return res.data;
}

export async function listEntries(params: FinanceEntryListParams): Promise<{
  entries: FinanceEntry[];
  total: number;
  page: number;
  limit: number;
}> {
  const res = await getHttpClient()
    .get('finance/entries', { searchParams: params as Record<string, string | number> })
    .json<ApiRes<{ entries: FinanceEntry[]; total: number; page: number; limit: number }>>();
  return res.data;
}

export async function getEntry(entryId: string): Promise<FinanceEntry> {
  const res = await getHttpClient().get(`finance/entries/${entryId}`).json<ApiRes<FinanceEntry>>();
  return res.data;
}

export async function updateEntry(
  entryId: string,
  dto: UpdateFinanceEntryDto,
): Promise<FinanceEntry> {
  const res = await getHttpClient()
    .patch(`finance/entries/${entryId}`, { json: dto })
    .json<ApiRes<FinanceEntry>>();
  return res.data;
}

export async function deleteEntry(entryId: string): Promise<void> {
  await getHttpClient().delete(`finance/entries/${entryId}`);
}

export async function approveEntry(entryId: string): Promise<FinanceEntry> {
  const res = await getHttpClient()
    .patch(`finance/entries/${entryId}/approve`)
    .json<ApiRes<FinanceEntry>>();
  return res.data;
}

export async function rejectEntry(entryId: string, reason?: string): Promise<FinanceEntry> {
  const res = await getHttpClient()
    .patch(`finance/entries/${entryId}/reject`, { json: { reason } })
    .json<ApiRes<FinanceEntry>>();
  return res.data;
}

export async function createPerDiem(dto: CreatePerDiemDto): Promise<PerDiemPayout> {
  const res = await getHttpClient()
    .post('finance/per-diem', { json: dto })
    .json<ApiRes<PerDiemPayout>>();
  return res.data;
}

export async function listPerDiems(params: {
  orgId: string;
  eventId?: string;
}): Promise<PerDiemPayout[]> {
  const res = await getHttpClient()
    .get('finance/per-diem', { searchParams: params as Record<string, string> })
    .json<ApiRes<PerDiemPayout[]>>();
  return res.data;
}

export async function markPerDiemPaid(perDiemId: string): Promise<PerDiemPayout> {
  const res = await getHttpClient()
    .patch(`finance/per-diem/${perDiemId}/mark-paid`)
    .json<ApiRes<PerDiemPayout>>();
  return res.data;
}

export async function getFinanceReport(params: {
  orgId: string;
  from?: string;
  to?: string;
}): Promise<FinanceReportResponse> {
  const res = await getHttpClient()
    .get('finance/reports', { searchParams: params as Record<string, string> })
    .json<ApiRes<FinanceReportResponse>>();
  return res.data;
}
