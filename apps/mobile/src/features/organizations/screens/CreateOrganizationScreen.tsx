import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  Pressable,
  ScrollView,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useTranslation } from 'react-i18next';
import { createOrganization } from '@regieart/api';
import { useTheme } from '../../../shared/theme';
import type { RootStackParamList } from '../../../navigation';
import type { ThemeColors } from '@regieart/ui';

type Props = NativeStackScreenProps<RootStackParamList, 'CreateOrganization'>;

export function CreateOrganizationScreen({ navigation }: Props) {
  const { theme } = useTheme();
  const { t } = useTranslation();
  const s = makeStyles(theme);

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [website, setWebsite] = useState('');
  const [phone, setPhone] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleCreate() {
    if (!name.trim()) {
      setError(t('errors.required_fields'));
      return;
    }
    setLoading(true);
    setError(null);
    try {
      await createOrganization({
        name: name.trim(),
        description: description.trim() || undefined,
        website: website.trim() || undefined,
        phone: phone.trim() || undefined,
      });
      navigation.replace('OrgSelector');
    } catch (err) {
      setError(err instanceof Error ? err.message : t('errors.generic'));
    } finally {
      setLoading(false);
    }
  }

  return (
    <SafeAreaView style={s.root}>
      <KeyboardAvoidingView
        style={s.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={s.header}>
          <Pressable onPress={() => navigation.goBack()} style={s.backBtn} accessibilityRole="button">
            <Text style={s.backArrow}>←</Text>
          </Pressable>
        </View>

        <ScrollView
          style={s.scroll}
          contentContainerStyle={s.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <Text style={s.title}>{t('create_org.title')}</Text>
          <Text style={s.subtitle}>{t('create_org.subtitle')}</Text>

          <View style={s.fieldGroup}>
            <Text style={s.label}>{t('create_org.field_name')}</Text>
            <TextInput
              style={s.input}
              value={name}
              onChangeText={setName}
              placeholder={t('create_org.name_placeholder')}
              placeholderTextColor={theme.textMuted}
              autoCapitalize="words"
              returnKeyType="next"
            />
          </View>

          <View style={s.fieldGroup}>
            <Text style={s.label}>{t('create_org.field_description')}</Text>
            <TextInput
              style={[s.input, s.textarea]}
              value={description}
              onChangeText={setDescription}
              placeholder={t('create_org.description_placeholder')}
              placeholderTextColor={theme.textMuted}
              multiline
              numberOfLines={4}
              textAlignVertical="top"
            />
          </View>

          <View style={s.fieldGroup}>
            <Text style={s.label}>{t('create_org.field_website')}</Text>
            <TextInput
              style={s.input}
              value={website}
              onChangeText={setWebsite}
              placeholder={t('create_org.website_placeholder')}
              placeholderTextColor={theme.textMuted}
              keyboardType="url"
              autoCapitalize="none"
              autoCorrect={false}
              returnKeyType="next"
            />
          </View>

          <View style={s.fieldGroup}>
            <Text style={s.label}>{t('create_org.field_phone')}</Text>
            <TextInput
              style={s.input}
              value={phone}
              onChangeText={setPhone}
              placeholder={t('create_org.phone_placeholder')}
              placeholderTextColor={theme.textMuted}
              keyboardType="phone-pad"
              returnKeyType="done"
            />
          </View>

          <View style={s.noticeBox}>
            <Text style={s.noticeIcon}>ℹ</Text>
            <Text style={s.noticeText}>{t('create_org.owner_notice')}</Text>
          </View>

          {error && <Text style={s.errorText}>{error}</Text>}

          <Pressable
            style={({ pressed }) => [s.submitBtn, pressed && s.submitBtnPressed, loading && s.submitBtnDisabled]}
            onPress={handleCreate}
            disabled={loading}
            accessibilityRole="button"
          >
            {loading
              ? <ActivityIndicator color="#fff" />
              : <Text style={s.submitLabel}>{t('create_org.submit')}</Text>
            }
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
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 16,
      paddingTop: 8,
      paddingBottom: 4,
    },
    backBtn: { padding: 8 },
    backArrow: { fontSize: 22, color: theme.textHeading },
    scroll: { flex: 1 },
    scrollContent: { paddingHorizontal: 24, paddingBottom: 48 },
    title: {
      fontSize: 26,
      fontWeight: '700',
      color: theme.textHeading,
      letterSpacing: -0.3,
      marginTop: 12,
      marginBottom: 6,
    },
    subtitle: {
      fontSize: 14,
      color: theme.textSecondary,
      marginBottom: 28,
      lineHeight: 20,
    },
    fieldGroup: { marginBottom: 20 },
    label: {
      fontSize: 12,
      fontWeight: '700',
      color: theme.textMuted,
      letterSpacing: 0.6,
      textTransform: 'uppercase',
      marginBottom: 8,
    },
    input: {
      backgroundColor: theme.surfaceCard,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: theme.borderSubtle,
      paddingHorizontal: 16,
      paddingVertical: 14,
      fontSize: 15,
      color: theme.textBody,
    },
    textarea: { height: 100, paddingTop: 14 },
    noticeBox: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      backgroundColor: `${theme.actionBrand}18`,
      borderRadius: 10,
      padding: 14,
      marginBottom: 24,
      gap: 10,
    },
    noticeIcon: { fontSize: 16, color: theme.actionBrand },
    noticeText: { flex: 1, fontSize: 13, color: theme.textSecondary, lineHeight: 18 },
    errorText: {
      fontSize: 13,
      color: theme.actionDanger,
      marginBottom: 12,
      textAlign: 'center',
    },
    submitBtn: {
      backgroundColor: theme.actionBrand,
      borderRadius: 14,
      paddingVertical: 17,
      alignItems: 'center',
      justifyContent: 'center',
      marginTop: 8,
    },
    submitBtnPressed: { opacity: 0.85 },
    submitBtnDisabled: { opacity: 0.6 },
    submitLabel: {
      fontSize: 15,
      fontWeight: '700',
      color: '#fff',
      letterSpacing: 0.8,
    },
  });
}
