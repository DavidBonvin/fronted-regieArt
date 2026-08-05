import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  Pressable,
  TextInput,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useTranslation } from 'react-i18next';
import { createEntry, listCategories, getMyOrganizations } from '@regieart/api';
import type { FinanceCategory, FinanceEntryType } from '@regieart/types';
import { useTheme } from '../../../shared/theme';
import type { ThemeColors } from '@regieart/ui';
import type { RootStackParamList } from '../../../navigation';

type Nav = NativeStackNavigationProp<RootStackParamList>;

const CURRENCIES = ['USD', 'EUR', 'COP', 'MXN', 'BRL'];

export function ReceiptCameraScreen() {
  const { theme } = useTheme();
  const { t } = useTranslation();
  const navigation = useNavigation<Nav>();
  const s = makeStyles(theme);

  const [orgId, setOrgId] = useState('');
  const [categories, setCategories] = useState<FinanceCategory[]>([]);
  const [amount, setAmount] = useState('');
  const [currency, setCurrency] = useState('USD');
  const [description, setDescription] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<FinanceCategory | null>(null);
  const [type, setType] = useState<FinanceEntryType>('EXPENSE');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [initializing, setInitializing] = useState(true);

  useEffect(() => {
    async function init() {
      const orgs = await getMyOrganizations();
      const id = orgs[0]?.id ?? '';
      setOrgId(id);
      if (id) {
        const cats = await listCategories(id);
        setCategories(cats);
      }
      setInitializing(false);
    }
    init();
  }, []);

  async function handleSave() {
    if (!amount.trim() || !selectedCategory) {
      setError(t('errors.required_fields'));
      return;
    }
    if (!Number.isFinite(parseFloat(amount.trim()))) {
      setError(t('errors.invalid_amount'));
      return;
    }
    setSaving(true);
    setError('');
    try {
      await createEntry({
        orgId,
        categoryId: selectedCategory.id,
        type,
        amount: amount.trim(),
        currency,
        description: description.trim() || undefined,
        date: new Date().toISOString(),
      });
      navigation.goBack();
    } catch {
      setError(t('errors.generic'));
    } finally {
      setSaving(false);
    }
  }

  if (initializing) {
    return (
      <SafeAreaView style={s.root}>
        <View style={s.center}>
          <ActivityIndicator color={theme.actionBrand} size="large" />
        </View>
      </SafeAreaView>
    );
  }

  const filteredCategories = categories.filter((c) => c.type === type);

  return (
    <SafeAreaView style={s.root}>
      <KeyboardAvoidingView style={s.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={s.scroll} keyboardShouldPersistTaps="handled">
          <Text style={s.title}>{t('finance_form.add_title')}</Text>

          <View style={s.typeRow}>
            {(['EXPENSE', 'INCOME'] as FinanceEntryType[]).map((tp) => (
              <Pressable
                key={tp}
                style={[s.typeBtn, type === tp && s.typeBtnActive]}
                onPress={() => { setType(tp); setSelectedCategory(null); }}
              >
                <Text style={[s.typeBtnText, type === tp && s.typeBtnTextActive]}>
                  {t(`finance.type_${tp.toLowerCase()}`)}
                </Text>
              </Pressable>
            ))}
          </View>

          <Text style={s.fieldLabel}>{t('finance_form.amount_field')} *</Text>
          <View style={s.amountRow}>
            <TextInput
              style={[s.input, s.amountInput]}
              value={amount}
              onChangeText={setAmount}
              placeholder="0.00"
              placeholderTextColor={theme.textMuted}
              keyboardType="decimal-pad"
            />
            <View style={s.currencyPicker}>
              {CURRENCIES.map((c) => (
                <Pressable
                  key={c}
                  style={[s.currencyBtn, currency === c && s.currencyBtnActive]}
                  onPress={() => setCurrency(c)}
                >
                  <Text style={[s.currencyText, currency === c && s.currencyTextActive]}>{c}</Text>
                </Pressable>
              ))}
            </View>
          </View>

          <Text style={s.fieldLabel}>{t('finance_form.category_field')} *</Text>
          <View style={s.categoryGrid}>
            {filteredCategories.map((cat) => (
              <Pressable
                key={cat.id}
                style={[s.categoryChip, selectedCategory?.id === cat.id && s.categoryChipSelected]}
                onPress={() => setSelectedCategory(cat)}
              >
                <Text style={[s.categoryText, selectedCategory?.id === cat.id && s.categoryTextSelected]}>
                  {cat.icon ? `${cat.icon} ` : ''}{cat.name}
                </Text>
              </Pressable>
            ))}
          </View>

          <Text style={s.fieldLabel}>{t('finance_form.description_field')}</Text>
          <TextInput
            style={[s.input, s.textArea]}
            value={description}
            onChangeText={setDescription}
            placeholder={t('finance_form.description_placeholder')}
            placeholderTextColor={theme.textMuted}
            multiline
            numberOfLines={3}
            textAlignVertical="top"
          />

          {error ? <Text style={s.error}>{error}</Text> : null}

          <Pressable
            style={({ pressed }) => [s.saveBtn, pressed && s.saveBtnPressed]}
            onPress={handleSave}
            disabled={saving}
          >
            {saving ? (
              <ActivityIndicator color="#FFFFFF" size="small" />
            ) : (
              <Text style={s.saveBtnText}>{t('common.create')}</Text>
            )}
          </Pressable>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function makeStyles(theme: ThemeColors) {
  return StyleSheet.create({
    root: { flex: 1, backgroundColor: theme.surfaceApp },
    flex: { flex: 1 },
    center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
    scroll: { padding: 16, paddingBottom: 40 },
    title: { fontSize: 26, fontWeight: '700', color: theme.textHeading, letterSpacing: -0.3, marginBottom: 20 },
    fieldLabel: { fontSize: 12, fontWeight: '600', color: theme.textSecondary, marginBottom: 6, marginTop: 12 },
    input: {
      backgroundColor: theme.surfaceRaised,
      borderRadius: 10,
      paddingHorizontal: 14,
      paddingVertical: 12,
      fontSize: 15,
      color: theme.textHeading,
    },
    textArea: { minHeight: 80, paddingTop: 12 },
    typeRow: { flexDirection: 'row', gap: 8, marginBottom: 4 },
    typeBtn: {
      flex: 1,
      borderRadius: 10,
      borderWidth: 1.5,
      borderColor: theme.borderDefault,
      paddingVertical: 10,
      alignItems: 'center',
    },
    typeBtnActive: { borderColor: theme.actionBrand, backgroundColor: theme.statusOkSurface },
    typeBtnText: { fontSize: 14, fontWeight: '600', color: theme.textSecondary },
    typeBtnTextActive: { color: theme.actionBrand },
    amountRow: { gap: 8 },
    amountInput: {},
    currencyPicker: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 4 },
    currencyBtn: {
      borderRadius: 8,
      borderWidth: 1.5,
      borderColor: theme.borderDefault,
      paddingHorizontal: 12,
      paddingVertical: 7,
    },
    currencyBtnActive: { borderColor: theme.actionBrand, backgroundColor: theme.statusOkSurface },
    currencyText: { fontSize: 12, fontWeight: '600', color: theme.textSecondary },
    currencyTextActive: { color: theme.actionBrand },
    categoryGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
    categoryChip: {
      borderRadius: 8,
      borderWidth: 1.5,
      borderColor: theme.borderDefault,
      paddingHorizontal: 12,
      paddingVertical: 8,
    },
    categoryChipSelected: { borderColor: theme.actionBrand, backgroundColor: theme.statusOkSurface },
    categoryText: { fontSize: 13, fontWeight: '500', color: theme.textSecondary },
    categoryTextSelected: { color: theme.actionBrand, fontWeight: '700' },
    error: { fontSize: 13, color: theme.actionDanger, marginTop: 10, marginBottom: 4 },
    saveBtn: {
      backgroundColor: theme.actionBrand,
      borderRadius: 12,
      paddingVertical: 14,
      alignItems: 'center',
      marginTop: 20,
    },
    saveBtnPressed: { backgroundColor: theme.actionBrandDim },
    saveBtnText: { fontSize: 15, fontWeight: '600', color: '#FFFFFF' },
  });
}

