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
import type { NativeStackNavigationProp, NativeStackScreenProps } from '@react-navigation/native-stack';
import { useTranslation } from 'react-i18next';
import { listEntries, getMyOrganizations } from '@regieart/api';
import type { FinanceEntry } from '@regieart/types';
import { useTheme } from '../../../shared/theme';
import type { ThemeColors } from '@regieart/ui';
import type { RootStackParamList } from '../../../navigation';

type Props = NativeStackScreenProps<RootStackParamList, 'Expenses'>;
type Nav = NativeStackNavigationProp<RootStackParamList>;

export function ExpensesScreen({ route }: Props) {
  const { daysheetId } = route.params;
  const { theme } = useTheme();
  const { t } = useTranslation();
  const navigation = useNavigation<Nav>();
  const s = makeStyles(theme);

  const [entries, setEntries] = useState<FinanceEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadEntries = useCallback(async () => {
    const orgs = await getMyOrganizations();
    const orgId = orgs[0]?.id;
    if (!orgId) return;
    const res = await listEntries({ orgId, eventId: daysheetId, limit: 50 });
    setEntries(res.entries);
  }, [daysheetId]);

  useEffect(() => {
    loadEntries().finally(() => setLoading(false));
  }, [loadEntries]);

  async function handleRefresh() {
    setRefreshing(true);
    await loadEntries();
    setRefreshing(false);
  }

  const total = entries.reduce((sum, e) => {
    const amt = parseFloat(e.amount) || 0;
    return e.type === 'INCOME' ? sum + amt : sum - amt;
  }, 0);

  if (loading) {
    return (
      <SafeAreaView style={s.root}>
        <View style={s.center}>
          <ActivityIndicator color={theme.actionBrand} size="large" />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={s.root}>
      <FlatList
        data={entries}
        keyExtractor={(item) => item.id}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={theme.actionBrand} />
        }
        ListHeaderComponent={
          <View style={s.header}>
            <Text style={s.title}>{t('finance.expenses_title')}</Text>
            <View style={[s.balanceCard, { borderColor: total >= 0 ? theme.statusOk : theme.statusError }]}>
              <Text style={s.balanceLabel}>{t('finance.balance_label')}</Text>
              <Text style={[s.balanceValue, { color: total >= 0 ? theme.statusOk : theme.statusError }]}>
                {total >= 0 ? '+' : ''}{total.toFixed(2)}
              </Text>
            </View>
          </View>
        }
        ListEmptyComponent={
          <View style={s.empty}>
            <Text style={s.emptyText}>{t('common.no_results')}</Text>
          </View>
        }
        renderItem={({ item }) => {
          const isIncome = item.type === 'INCOME';
          return (
            <View style={s.entryRow}>
              <View style={[s.typeIcon, { backgroundColor: isIncome ? theme.statusOkSurface : theme.statusErrorSurface }]}>
                <Text style={[s.typeIconText, { color: isIncome ? theme.statusOk : theme.statusError }]}>
                  {isIncome ? '+' : '−'}
                </Text>
              </View>
              <View style={s.entryInfo}>
                <Text style={s.entryDesc} numberOfLines={1}>{item.description ?? item.category?.name ?? '—'}</Text>
                <Text style={s.entryDate}>{new Date(item.date).toLocaleDateString()}</Text>
              </View>
              <View style={s.entryRight}>
                <Text style={[s.entryAmount, { color: isIncome ? theme.statusOk : theme.statusError }]}>
                  {isIncome ? '+' : '−'}{parseFloat(item.amount).toFixed(2)} {item.currency}
                </Text>
                <View style={[s.statusChip, {
                  backgroundColor: item.status === 'APPROVED' ? theme.statusOkSurface
                    : item.status === 'REJECTED' ? theme.statusErrorSurface
                    : theme.statusPendingSurface,
                }]}>
                  <Text style={[s.statusText, {
                    color: item.status === 'APPROVED' ? theme.statusOk
                      : item.status === 'REJECTED' ? theme.statusError
                      : theme.statusPending,
                  }]}>{item.status}</Text>
                </View>
              </View>
            </View>
          );
        }}
        ItemSeparatorComponent={() => <View style={s.separator} />}
        contentContainerStyle={s.list}
      />

      <Pressable
        style={s.fab}
        onPress={() => navigation.navigate('ReceiptCamera', {})}
      >
        <Text style={s.fabText}>+</Text>
      </Pressable>
    </SafeAreaView>
  );
}

function makeStyles(theme: ThemeColors) {
  return StyleSheet.create({
    root: { flex: 1, backgroundColor: theme.surfaceApp },
    center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
    header: { padding: 16, paddingBottom: 8 },
    title: { fontSize: 26, fontWeight: '700', color: theme.textHeading, letterSpacing: -0.3, marginBottom: 14 },
    balanceCard: {
      backgroundColor: theme.surfaceCard,
      borderRadius: 16,
      padding: 16,
      borderWidth: 1.5,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: 8,
    },
    balanceLabel: { fontSize: 13, fontWeight: '600', color: theme.textSecondary },
    balanceValue: { fontSize: 22, fontWeight: '700' },
    list: { paddingHorizontal: 16, paddingBottom: 80 },
    entryRow: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: theme.surfaceCard,
      borderRadius: 12,
      padding: 13,
      gap: 12,
    },
    typeIcon: {
      width: 36,
      height: 36,
      borderRadius: 18,
      alignItems: 'center',
      justifyContent: 'center',
    },
    typeIconText: { fontSize: 20, fontWeight: '700', lineHeight: 22 },
    entryInfo: { flex: 1 },
    entryDesc: { fontSize: 14, fontWeight: '600', color: theme.textHeading, marginBottom: 2 },
    entryDate: { fontSize: 12, color: theme.textMuted },
    entryRight: { alignItems: 'flex-end', gap: 4 },
    entryAmount: { fontSize: 14, fontWeight: '700' },
    statusChip: { borderRadius: 4, paddingHorizontal: 6, paddingVertical: 2 },
    statusText: { fontSize: 10, fontWeight: '700' },
    separator: { height: 6 },
    empty: { alignItems: 'center', paddingVertical: 60 },
    emptyText: { fontSize: 15, color: theme.textSecondary },
    fab: {
      position: 'absolute',
      bottom: 24,
      right: 20,
      width: 56,
      height: 56,
      borderRadius: 28,
      backgroundColor: theme.actionBrand,
      alignItems: 'center',
      justifyContent: 'center',
      elevation: 4,
    },
    fabText: { fontSize: 28, color: '#FFFFFF', lineHeight: 32 },
  });
}

