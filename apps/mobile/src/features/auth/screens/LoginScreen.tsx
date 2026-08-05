import React, { useRef, useState } from 'react';
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
import { loginWithPassword } from '@regieart/api';
import { useTheme } from '../../../shared/theme';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
import type { RootStackParamList } from '../../../navigation';
import type { ThemeColors } from '@regieart/ui';

type Props = NativeStackScreenProps<RootStackParamList, 'Login'>;

export function LoginScreen({ navigation }: Props) {
  const { theme } = useTheme();
  const { t } = useTranslation();
  const s = makeStyles(theme);
  const passwordRef = useRef<TextInput>(null);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleLogin() {
    if (!email.trim() || !password) { setError(t('errors.required_fields')); return; }
    if (!EMAIL_RE.test(email.trim())) { setError(t('errors.invalid_email')); return; }
    if (password.length < 8) { setError(t('errors.password_too_short')); return; }
    setLoading(true);
    setError(null);
    try {
      await loginWithPassword(email.trim(), password);
      navigation.replace('OrgSelector');
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      setError(__DEV__ ? msg : t('errors.invalid_credentials'));
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
          <View style={s.logoArea}>
            <View style={s.logoMark}>
              <Text style={s.logoMarkText}>RA</Text>
            </View>
            <Text style={s.appName}>RégieArt</Text>
            <Text style={s.appTagline}>{t('auth.tagline')}</Text>
          </View>

          <View style={s.greetingArea}>
            <Text style={s.greetingTitle}>{t('auth.greeting_title')}</Text>
            <Text style={s.greetingSubtitle}>{t('auth.greeting_subtitle')}</Text>
          </View>

          <View style={s.form}>
            <View style={s.fieldWrap}>
              <Text style={s.fieldLabel}>{t('auth.email')}</Text>
              <View style={[s.inputRow, error !== null && s.inputRowError]}>
                <TextInput
                  style={s.inputField}
                  placeholder={t('auth.email_placeholder')}
                  placeholderTextColor={theme.textMuted}
                  value={email}
                  onChangeText={setEmail}
                  autoCapitalize="none"
                  autoComplete="email"
                  keyboardType="email-address"
                  returnKeyType="next"
                  onSubmitEditing={() => passwordRef.current?.focus()}
                  editable={!loading}
                />
                <Text style={s.inputIconText}>✉</Text>
              </View>
            </View>

            <View style={s.fieldWrap}>
              <Text style={s.fieldLabel}>{t('auth.password')}</Text>
              <View style={s.inputRow}>
                <TextInput
                  ref={passwordRef}
                  style={s.inputField}
                  placeholder={t('auth.password_placeholder')}
                  placeholderTextColor={theme.textMuted}
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry={!showPassword}
                  autoComplete="password"
                  returnKeyType="done"
                  onSubmitEditing={handleLogin}
                  editable={!loading}
                />
                <Pressable
                  onPress={() => setShowPassword((v) => !v)}
                  style={s.eyeBtn}
                  accessibilityLabel={showPassword ? 'Hide password' : 'Show password'}
                >
                  <Text style={s.inputIconText}>{showPassword ? '🙈' : '👁'}</Text>
                </Pressable>
              </View>
            </View>

            {error !== null && <Text style={s.errorText}>{error}</Text>}

            <Pressable
              style={s.forgotBtn}
              onPress={() => navigation.navigate('ForgotPassword')}
              accessibilityRole="link"
            >
              <Text style={s.forgotText}>{t('auth.forgot_password')}</Text>
            </Pressable>

            <Pressable
              style={({ pressed }) => [
                s.primaryBtn,
                pressed && s.primaryBtnPressed,
                loading && s.primaryBtnDisabled,
              ]}
              onPress={handleLogin}
              disabled={loading}
              accessibilityRole="button"
              accessibilityLabel={t('auth.sign_in')}
            >
              {loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={s.primaryBtnLabel}>{t('auth.sign_in_button').toUpperCase()}</Text>
              )}
            </Pressable>

            <View style={s.divider}>
              <View style={s.dividerLine} />
              <Text style={s.dividerLabel}>{t('auth.or')}</Text>
              <View style={s.dividerLine} />
            </View>

            <Pressable
              style={({ pressed }) => [s.socialBtn, pressed && s.socialBtnPressed]}
              accessibilityRole="button"
              accessibilityLabel={t('auth.continue_google')}
            >
              <Text style={s.socialBtnG}>G</Text>
              <Text style={s.socialBtnLabel}>{t('auth.continue_google')}</Text>
            </Pressable>
          </View>

          <View style={s.footer}>
            <Text style={s.footerText}>{t('auth.no_account')} </Text>
            <Pressable onPress={() => navigation.navigate('Register')} accessibilityRole="link">
              <Text style={s.footerLink}>{t('auth.create_account')}</Text>
            </Pressable>
          </View>

          {__DEV__ && (
            <View style={s.devSection}>
              <Text style={s.devLabel}>DEV</Text>
              <View style={s.devRow}>
                <Pressable style={s.devBtn} onPress={() => navigation.navigate('DevPlayground')}>
                  <Text style={s.devBtnText}>✍️ Write</Text>
                </Pressable>
                <Pressable style={[s.devBtn, s.devBtnGreen]} onPress={() => navigation.navigate('DevTools')}>
                  <Text style={[s.devBtnText, s.devBtnTextGreen]}>🛠️ Tools</Text>
                </Pressable>
                <Pressable style={[s.devBtn, s.devBtnYellow]} onPress={() => navigation.navigate('StorageSuite')}>
                  <Text style={[s.devBtnText, s.devBtnTextYellow]}>📦 Storage</Text>
                </Pressable>
              </View>
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

    logoArea: {
      alignItems: 'center',
      paddingTop: 48,
      marginBottom: 40,
    },
    logoMark: {
      width: 56,
      height: 56,
      borderRadius: 16,
      backgroundColor: theme.actionBrand,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: 14,
      shadowColor: theme.actionBrand,
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.4,
      shadowRadius: 12,
      elevation: 8,
    },
    logoMarkText: {
      fontSize: 22,
      fontWeight: '800',
      color: '#fff',
      letterSpacing: 0.5,
    },
    appName: {
      fontSize: 28,
      fontWeight: '700',
      color: theme.textHeading,
      letterSpacing: -0.5,
      marginBottom: 4,
    },
    appTagline: {
      fontSize: 13,
      color: theme.textMuted,
      letterSpacing: 0.3,
    },

    greetingArea: {
      marginBottom: 32,
    },
    greetingTitle: {
      fontSize: 26,
      fontWeight: '700',
      color: theme.textHeading,
      letterSpacing: -0.3,
      marginBottom: 6,
    },
    greetingSubtitle: {
      fontSize: 15,
      color: theme.textSecondary,
      lineHeight: 22,
    },

    form: {
      gap: 0,
    },
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
    inputRowError: {
      borderColor: theme.borderDanger,
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
    eyeBtn: {
      padding: 4,
      marginLeft: 4,
    },

    errorText: {
      fontSize: 13,
      color: theme.actionDanger,
      textAlign: 'center',
      marginBottom: 8,
    },

    forgotBtn: {
      alignSelf: 'flex-end',
      marginTop: 4,
      marginBottom: 24,
      paddingVertical: 4,
    },
    forgotText: {
      fontSize: 13,
      color: theme.actionBrand,
      fontWeight: '500',
    },

    primaryBtn: {
      backgroundColor: theme.actionBrand,
      borderRadius: 14,
      paddingVertical: 16,
      alignItems: 'center',
      shadowColor: theme.actionBrand,
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.35,
      shadowRadius: 10,
      elevation: 6,
    },
    primaryBtnPressed: {
      backgroundColor: theme.actionBrandDim,
      shadowOpacity: 0.15,
    },
    primaryBtnDisabled: {
      opacity: 0.6,
    },
    primaryBtnLabel: {
      fontSize: 15,
      fontWeight: '700',
      color: '#fff',
      letterSpacing: 1.2,
    },

    divider: {
      flexDirection: 'row',
      alignItems: 'center',
      marginVertical: 24,
      gap: 12,
    },
    dividerLine: {
      flex: 1,
      height: 1,
      backgroundColor: theme.borderSubtle,
    },
    dividerLabel: {
      fontSize: 12,
      fontWeight: '600',
      color: theme.textMuted,
      letterSpacing: 1,
    },

    socialBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 10,
      borderWidth: 1.5,
      borderColor: theme.borderDefault,
      borderRadius: 14,
      paddingVertical: 14,
      backgroundColor: theme.surfaceCard,
    },
    socialBtnPressed: {
      backgroundColor: theme.surfaceRaised,
    },
    socialBtnG: {
      fontSize: 16,
      fontWeight: '800',
      color: theme.textHeading,
    },
    socialBtnLabel: {
      fontSize: 15,
      fontWeight: '500',
      color: theme.textBody,
    },

    footer: {
      flexDirection: 'row',
      justifyContent: 'center',
      alignItems: 'center',
      flexWrap: 'wrap',
      marginTop: 32,
      gap: 4,
    },
    footerText: {
      fontSize: 13,
      color: theme.textMuted,
    },
    footerLink: {
      fontSize: 13,
      color: theme.actionBrand,
      fontWeight: '500',
    },

    devSection: {
      marginTop: 40,
      alignItems: 'center',
    },
    devLabel: {
      fontSize: 10,
      fontWeight: '700',
      letterSpacing: 2,
      color: theme.textMuted,
      marginBottom: 8,
    },
    devRow: {
      flexDirection: 'row',
      gap: 8,
    },
    devBtn: {
      paddingHorizontal: 14,
      paddingVertical: 8,
      borderRadius: 6,
      borderWidth: 1,
      borderColor: '#3b82f6',
      backgroundColor: '#1e3a5f',
    },
    devBtnGreen: { borderColor: '#22c55e', backgroundColor: '#1a2a1a' },
    devBtnYellow: { borderColor: '#f59e0b', backgroundColor: '#1a1a2a' },
    devBtnText: { fontSize: 12, fontWeight: '600', color: '#3b82f6' },
    devBtnTextGreen: { color: '#22c55e' },
    devBtnTextYellow: { color: '#f59e0b' },
  });
}
