import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  Pressable,
  FlatList,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useTranslation } from 'react-i18next';
import { listEntries, getMyOrganizations } from '@regieart/api';
import type { FinanceEntry } from '@regieart/types';
import { useTheme } from '../../../shared/theme';
import type { ThemeColors } from '@regieart/ui';
import type { RootStackParamList } from '../../../navigation';

type Nav = NativeStackNavigationProp<RootStackParamList>;

function statusStyle(status: string, theme: ThemeColors) {
  if (status === 'APPROVED') return { bg: theme.statusOkSurface, text: theme.statusOk };
  if (status === 'REJECTED') return { bg: theme.statusErrorSurface, text: theme.statusError };
  return { bg: theme.statusPendingSurface, text: theme.statusPending };
}

function formatAmount(amount: string, currency: string): string {
  return `${parseFloat(amount).toFixed(2)} ${currency}`;
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

export function FinanceScreen() {
  const { theme } = useTheme();
  const { t } = useTranslation();
  const navigation = useNavigation<Nav>();
  const s = makeStyles(theme);

  const [entries, setEntries] = useState<FinanceEntry[]>([]);
  const [orgId, setOrgId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const totals = entries.reduce(
    (acc, e) => {
      const val = parseFloat(e.amount);
      if (e.type === 'INCOME') acc.income += val;
      else acc.expenses += val;
      return acc;
    },
    { income: 0, expenses: 0 },
  );

  const balance = totals.income - totals.expenses;

  const loadData = useCallback(async () => {
    const id = orgId ?? (await getMyOrganizations().then((orgs) => orgs[0]?.id));
    if (!id) return;
    if (!orgId) setOrgId(id);
    const result = await listEntries({ orgId: id, limit: 30 });
    setEntries(result.entries);
  }, [orgId]);

  useEffect(() => {
    loadData().finally(() => setLoading(false));
  }, [loadData]);

  async function handleRefresh() {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  }

  function renderEntry({ item }: { item: FinanceEntry }) {
    const st = statusStyle(item.status, theme);
    const isExpense = item.type === 'EXPENSE';
    return (
      <View style={s.entryRow}>
        <View style={[s.entryType, { backgroundColor: isExpense ? theme.statusErrorSurface : theme.statusOkSurface }]}>
          <Text style={[s.entryTypeText, { color: isExpense ? theme.statusError : theme.statusOk }]}>
            {isExpense ? '−' : '+'}
          </Text>
        </View>
        <View style={s.entryInfo}>
          <Text style={s.entryDescription} numberOfLines={1}>
            {item.description ?? item.category?.name ?? item.type}
          </Text>
          <Text style={s.entryDate}>{formatDate(item.createdAt)}</Text>
        </View>
        <View style={s.entryRight}>
          <Text style={[s.entryAmount, { color: isExpense ? theme.statusError : theme.statusOk }]}>
            {isExpense ? '−' : '+'}{formatAmount(item.amount, item.currency)}
          </Text>
          <View style={[s.statusChip, { backgroundColor: st.bg }]}>
            <Text style={[s.statusText, { color: st.text }]}>{item.status}</Text>
          </View>
        </View>
      </View>
    );
  }

  return (
    <SafeAreaView style={s.root}>
      <View style={s.header}>
        <Text style={s.title}>{t('finance.title')}</Text>
        <Pressable
          style={s.addBtn}
          onPress={() => navigation.navigate('ReceiptCamera', {})}
          accessibilityLabel={t('finance.capture_receipt')}
        >
          <Text style={s.addBtnText}>+</Text>
        </Pressable>
      </View>

      {!loading && (
        <View style={s.balanceCard}>
          <Text style={s.balanceLabel}>{t('finance.balance_label')}</Text>
          <Text style={[s.balanceAmount, { color: balance >= 0 ? theme.statusOk : theme.statusError }]}>
            {balance >= 0 ? '+' : ''}{balance.toFixed(2)}
          </Text>
          <View style={s.balanceRow}>
            <View style={s.balanceItem}>
              <Text style={s.balanceItemLabel}>{t('finance.income_label')}</Text>
              <Text style={[s.balanceItemValue, { color: theme.statusOk }]}>+{totals.income.toFixed(2)}</Text>
            </View>
            <View style={s.balanceDivider} />
            <View style={s.balanceItem}>
              <Text style={s.balanceItemLabel}>{t('finance.expenses_label')}</Text>
              <Text style={[s.balanceItemValue, { color: theme.statusError }]}>−{totals.expenses.toFixed(2)}</Text>
            </View>
          </View>
        </View>
      )}

      {loading ? (
        <View style={s.center}>
          <ActivityIndicator color={theme.actionBrand} size="large" />
        </View>
      ) : (
        <>
          <Text style={s.sectionLabel}>{t('finance.expenses_history').toUpperCase()}</Text>
          <FlatList
            data={entries}
            keyExtractor={(item) => item.id}
            renderItem={renderEntry}
            contentContainerStyle={s.listContent}
            ItemSeparatorComponent={() => <View style={s.separator} />}
            refreshControl={
              <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={theme.actionBrand} />
            }
            ListEmptyComponent={
              <View style={s.emptyState}>
                <Text style={s.emptyTitle}>No expenses recorded.</Text>
              </View>
            }
          />
        </>
      )}
    </SafeAreaView>
  );
}

function makeStyles(theme: ThemeColors) {
  return StyleSheet.create({
    root: { flex: 1, backgroundColor: theme.surfaceApp },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 20,
      paddingTop: 16,
      paddingBottom: 12,
    },
    title: { fontSize: 26, fontWeight: '700', color: theme.textHeading, letterSpacing: -0.3 },
    addBtn: {
      width: 36,
      height: 36,
      borderRadius: 18,
      backgroundColor: theme.actionBrand,
      alignItems: 'center',
      justifyContent: 'center',
    },
    addBtnText: { fontSize: 22, color: '#FFFFFF', lineHeight: 26, fontWeight: '300' },
    balanceCard: {
      marginHorizontal: 16,
      marginBottom: 16,
      backgroundColor: theme.surfaceCard,
      borderRadius: 20,
      padding: 20,
    },
    balanceLabel: {
      fontSize: 10,
      fontWeight: '700',
      letterSpacing: 1.5,
      color: theme.textSecondary,
      marginBottom: 6,
    },
    balanceAmount: { fontSize: 36, fontWeight: '700', letterSpacing: -1, marginBottom: 16 },
    balanceRow: { flexDirection: 'row', alignItems: 'center' },
    balanceItem: { flex: 1, alignItems: 'center' },
    balanceItemLabel: { fontSize: 11, color: theme.textMuted, marginBottom: 3 },
    balanceItemValue: { fontSize: 16, fontWeight: '600' },
    balanceDivider: { width: 1, height: 28, backgroundColor: theme.borderSubtle },
    sectionLabel: {
      fontSize: 11,
      fontWeight: '700',
      letterSpacing: 1.5,
      color: theme.textSecondary,
      paddingHorizontal: 20,
      marginBottom: 8,
    },
    center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
    listContent: { paddingHorizontal: 16, paddingBottom: 24 },
    entryRow: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: theme.surfaceCard,
      borderRadius: 12,
      paddingHorizontal: 14,
      paddingVertical: 13,
      minHeight: 64,
    },
    entryType: {
      width: 36,
      height: 36,
      borderRadius: 10,
      alignItems: 'center',
      justifyContent: 'center',
      marginRight: 12,
    },
    entryTypeText: { fontSize: 18, fontWeight: '700' },
    entryInfo: { flex: 1 },
    entryDescription: { fontSize: 14, fontWeight: '500', color: theme.textHeading, marginBottom: 2 },
    entryDate: { fontSize: 12, color: theme.textMuted },
    entryRight: { alignItems: 'flex-end', gap: 4 },
    entryAmount: { fontSize: 14, fontWeight: '600' },
    statusChip: {
      borderRadius: 4,
      paddingHorizontal: 6,
      paddingVertical: 2,
    },
    statusText: { fontSize: 10, fontWeight: '600' },
    separator: { height: 6 },
    emptyState: { alignItems: 'center', paddingVertical: 40 },
    emptyTitle: { fontSize: 15, color: theme.textSecondary },
  });
}

