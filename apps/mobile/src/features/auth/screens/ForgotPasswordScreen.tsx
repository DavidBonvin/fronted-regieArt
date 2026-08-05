import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  Pressable,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../../../shared/theme';
import type { RootStackParamList } from '../../../navigation';
import type { ThemeColors } from '@regieart/ui';

const KEYCLOAK_URL = 'https://keycloak-production-b2ce.up.railway.app';
const REALM = 'regieart';

type Props = NativeStackScreenProps<RootStackParamList, 'ForgotPassword'>;

export function ForgotPasswordScreen({ navigation }: Props) {
  const { theme } = useTheme();
  const { t } = useTranslation();
  const s = makeStyles(theme);

  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSend() {
    const trimmed = email.trim();
    if (!trimmed) return;
    setLoading(true);
    setError(null);
    try {
      const url =
        `${KEYCLOAK_URL}/realms/${REALM}/login-actions/reset-credentials` +
        `?client_id=regieart-mobile&redirect_uri=regieart://auth`;
      await fetch(url, { method: 'GET' });
      setSent(true);
    } catch {
      setSent(true);
    } finally {
      setLoading(false);
    }
  }

  return (
    <SafeAreaView style={s.root}>
      <KeyboardAvoidingView
        style={s.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView
          contentContainerStyle={s.scroll}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <Pressable
            style={s.backBtn}
            onPress={() => navigation.goBack()}
            accessibilityRole="button"
            accessibilityLabel={t('auth.back_to_login')}
          >
            <Text style={s.backArrow}>←</Text>
            <Text style={s.backText}>{t('auth.back_to_login')}</Text>
          </Pressable>

          <View style={s.header}>
            <View style={s.iconCircle}>
              <Text style={s.iconText}>🔑</Text>
            </View>
            <Text style={s.title}>{t('auth.forgot_password_title')}</Text>
            <Text style={s.subtitle}>{t('auth.forgot_password_subtitle')}</Text>
          </View>

          {!sent ? (
            <View style={s.form}>
              <View style={s.fieldWrap}>
                <Text style={s.fieldLabel}>{t('auth.email')}</Text>
                <View style={s.inputRow}>
                  <TextInput
                    style={s.inputField}
                    placeholder={t('auth.email_placeholder')}
                    placeholderTextColor={theme.textMuted}
                    value={email}
                    onChangeText={setEmail}
                    autoCapitalize="none"
                    autoComplete="email"
                    keyboardType="email-address"
                    returnKeyType="send"
                    onSubmitEditing={handleSend}
                    editable={!loading}
                    autoFocus
                  />
                  <Text style={s.inputIconText}>✉</Text>
                </View>
              </View>

              {error !== null && <Text style={s.errorText}>{error}</Text>}

              <Pressable
                style={({ pressed }) => [
                  s.primaryBtn,
                  pressed && s.primaryBtnPressed,
                  loading && s.primaryBtnDisabled,
                ]}
                onPress={handleSend}
                disabled={loading}
                accessibilityRole="button"
              >
                {loading ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={s.primaryBtnLabel}>
                    {t('auth.send_instructions').toUpperCase()}
                  </Text>
                )}
              </Pressable>

              <View style={s.hintBox}>
                <Text style={s.hintIcon}>ℹ</Text>
                <Text style={s.hintText}>{t('auth.reset_email_hint')}</Text>
              </View>
            </View>
          ) : (
            <View style={s.successBox}>
              <Text style={s.successIcon}>✅</Text>
              <Text style={s.successTitle}>¡Instrucciones enviadas!</Text>
              <Text style={s.successSubtitle}>{t('auth.reset_email_hint')}</Text>
              <Pressable
                style={s.backToLoginBtn}
                onPress={() => navigation.goBack()}
                accessibilityRole="button"
              >
                <Text style={s.backToLoginLabel}>{t('auth.back_to_login')}</Text>
              </Pressable>
            </View>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function makeStyles(theme: ThemeColors) {
  return StyleSheet.create({
    root: {
      flex: 1,
      backgroundColor: theme.surfaceApp,
    },
    flex: { flex: 1 },
    scroll: {
      flexGrow: 1,
      paddingHorizontal: 24,
      paddingBottom: 40,
    },

    backBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      paddingTop: 16,
      paddingBottom: 32,
    },
    backArrow: {
      fontSize: 20,
      color: theme.actionBrand,
    },
    backText: {
      fontSize: 14,
      fontWeight: '500',
      color: theme.actionBrand,
    },

    header: {
      marginBottom: 36,
    },
    iconCircle: {
      width: 60,
      height: 60,
      borderRadius: 18,
      backgroundColor: theme.surfaceRaised,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: 20,
    },
    iconText: {
      fontSize: 28,
    },
    title: {
      fontSize: 26,
      fontWeight: '700',
      color: theme.textHeading,
      letterSpacing: -0.3,
      marginBottom: 10,
    },
    subtitle: {
      fontSize: 15,
      color: theme.textSecondary,
      lineHeight: 22,
    },

    form: {},
    fieldWrap: {
      marginBottom: 16,
    },
    fieldLabel: {
      fontSize: 12,
      fontWeight: '600',
      color: theme.textSecondary,
      marginBottom: 8,
      letterSpacing: 0.3,
      textTransform: 'uppercase',
    },
    inputRow: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: theme.inputBackground,
      borderWidth: 1,
      borderColor: theme.inputBorder,
      borderRadius: 12,
      paddingHorizontal: 16,
      paddingVertical: Platform.OS === 'ios' ? 14 : 2,
    },
    inputField: {
      flex: 1,
      fontSize: 16,
      color: theme.inputText,
      paddingVertical: Platform.OS === 'android' ? 12 : 0,
    },
    inputIconText: {
      fontSize: 16,
      color: theme.textMuted,
      marginLeft: 8,
    },
    errorText: {
      fontSize: 13,
      color: theme.actionDanger,
      marginBottom: 12,
    },

    primaryBtn: {
      backgroundColor: theme.actionBrand,
      borderRadius: 14,
      paddingVertical: 16,
      alignItems: 'center',
      marginBottom: 20,
      shadowColor: theme.actionBrand,
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.35,
      shadowRadius: 10,
      elevation: 6,
    },
    primaryBtnPressed: { backgroundColor: theme.actionBrandDim, shadowOpacity: 0.15 },
    primaryBtnDisabled: { opacity: 0.6 },
    primaryBtnLabel: {
      fontSize: 15,
      fontWeight: '700',
      color: '#fff',
      letterSpacing: 1.2,
    },

    hintBox: {
      flexDirection: 'row',
      gap: 10,
      backgroundColor: theme.surfaceRaised,
      borderRadius: 10,
      padding: 14,
    },
    hintIcon: {
      fontSize: 14,
      color: theme.actionBrand,
      marginTop: 1,
    },
    hintText: {
      flex: 1,
      fontSize: 13,
      color: theme.textSecondary,
      lineHeight: 19,
    },

    successBox: {
      alignItems: 'center',
      paddingTop: 24,
    },
    successIcon: {
      fontSize: 52,
      marginBottom: 20,
    },
    successTitle: {
      fontSize: 22,
      fontWeight: '700',
      color: theme.textHeading,
      marginBottom: 12,
      textAlign: 'center',
    },
    successSubtitle: {
      fontSize: 14,
      color: theme.textSecondary,
      textAlign: 'center',
      lineHeight: 21,
      marginBottom: 32,
    },
    backToLoginBtn: {
      paddingVertical: 14,
      paddingHorizontal: 32,
      borderRadius: 12,
      borderWidth: 1.5,
      borderColor: theme.actionBrand,
    },
    backToLoginLabel: {
      fontSize: 14,
      fontWeight: '600',
      color: theme.actionBrand,
    },
  });
}
