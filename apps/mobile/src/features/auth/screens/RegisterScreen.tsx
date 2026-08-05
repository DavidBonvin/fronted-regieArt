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
import { registerUser, loginWithPassword, getMe, updateMe } from '@regieart/api';
import { useTheme } from '../../../shared/theme';
import type { RootStackParamList } from '../../../navigation';
import type { ThemeColors } from '@regieart/ui';

type Props = NativeStackScreenProps<RootStackParamList, 'Register'>;

function parseCityCountry(raw: string): { city: string; country: string } {
  const idx = raw.lastIndexOf(',');
  if (idx === -1) return { city: raw.trim(), country: '' };
  return { city: raw.slice(0, idx).trim(), country: raw.slice(idx + 1).trim() };
}

export function RegisterScreen({ navigation }: Props) {
  const { theme } = useTheme();
  const { t } = useTranslation();
  const s = makeStyles(theme);

  const emailRef = useRef<TextInput>(null);
  const passwordRef = useRef<TextInput>(null);
  const cityRef = useRef<TextInput>(null);

  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [cityCountry, setCityCountry] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [acceptTerms, setAcceptTerms] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleRegister() {
    if (!displayName.trim()) { setError(t('errors.required_fields')); return; }
    if (!email.trim()) { setError(t('errors.required_fields')); return; }
    if (!password) { setError(t('errors.required_fields')); return; }
    if (!acceptTerms) { setError('Debes aceptar los Términos de Servicio para continuar.'); return; }

    setLoading(true);
    setError(null);
    try {
      await registerUser({ email: email.trim(), password, firstName: displayName.trim() });

      await loginWithPassword(email.trim(), password);

      await getMe();

      const { city, country } = parseCityCountry(cityCountry);
      await updateMe({
        displayName: displayName.trim(),
        city: city || undefined,
        country: country || undefined,
      });

      navigation.replace('OrgSelector');
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      setError(msg.includes('Registration failed') ? t('errors.registration_failed') : msg);
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
          >
            <Text style={s.backArrow}>←</Text>
            <Text style={s.backText}>{t('auth.sign_in')}</Text>
          </Pressable>

          <View style={s.header}>
            <Text style={s.title}>{t('auth.register_title')}</Text>
            <Text style={s.subtitle}>{t('auth.register_subtitle')}</Text>
          </View>

          <Pressable
            style={({ pressed }) => [s.socialBtn, pressed && s.socialBtnPressed]}
            accessibilityRole="button"
          >
            <Text style={s.socialBtnG}>G</Text>
            <Text style={s.socialBtnLabel}>{t('auth.register_google')}</Text>
          </Pressable>

          <View style={s.divider}>
            <View style={s.dividerLine} />
            <Text style={s.dividerLabel}>{t('auth.or')}</Text>
            <View style={s.dividerLine} />
          </View>

          <View style={s.form}>
            <View style={s.fieldWrap}>
              <Text style={s.fieldLabel}>{t('auth.display_name')}</Text>
              <View style={s.inputRow}>
                <TextInput
                  style={s.inputField}
                  placeholder={t('auth.display_name_placeholder')}
                  placeholderTextColor={theme.textMuted}
                  value={displayName}
                  onChangeText={setDisplayName}
                  autoCapitalize="words"
                  returnKeyType="next"
                  onSubmitEditing={() => emailRef.current?.focus()}
                  editable={!loading}
                />
                <Text style={s.inputIconText}>👤</Text>
              </View>
            </View>

            <View style={s.fieldWrap}>
              <Text style={s.fieldLabel}>{t('auth.email')}</Text>
              <View style={s.inputRow}>
                <TextInput
                  ref={emailRef}
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
                  autoComplete="new-password"
                  returnKeyType="next"
                  onSubmitEditing={() => cityRef.current?.focus()}
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

            <View style={s.fieldWrap}>
              <Text style={s.fieldLabel}>{t('auth.city_country')}</Text>
              <View style={s.inputRow}>
                <TextInput
                  ref={cityRef}
                  style={s.inputField}
                  placeholder={t('auth.city_country_placeholder')}
                  placeholderTextColor={theme.textMuted}
                  value={cityCountry}
                  onChangeText={setCityCountry}
                  autoCapitalize="words"
                  returnKeyType="done"
                  onSubmitEditing={handleRegister}
                  editable={!loading}
                />
                <Text style={s.inputIconText}>📍</Text>
              </View>
            </View>

            {error !== null && <Text style={s.errorText}>{error}</Text>}

            <Pressable
              style={s.termsRow}
              onPress={() => setAcceptTerms((v) => !v)}
              accessibilityRole="checkbox"
              accessibilityState={{ checked: acceptTerms }}
            >
              <View style={[s.checkbox, acceptTerms && s.checkboxChecked]}>
                {acceptTerms && <Text style={s.checkboxTick}>✓</Text>}
              </View>
              <Text style={s.termsText}>{t('auth.accept_terms')}</Text>
            </Pressable>

            <Pressable
              style={({ pressed }) => [
                s.primaryBtn,
                pressed && s.primaryBtnPressed,
                loading && s.primaryBtnDisabled,
              ]}
              onPress={handleRegister}
              disabled={loading}
              accessibilityRole="button"
            >
              {loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={s.primaryBtnLabel}>{t('auth.create_account').toUpperCase()}</Text>
              )}
            </Pressable>
          </View>

          <View style={s.footer}>
            <Text style={s.footerText}>{t('auth.already_have_account')} </Text>
            <Pressable onPress={() => navigation.goBack()} accessibilityRole="link">
              <Text style={s.footerLink}>{t('auth.sign_in')}</Text>
            </Pressable>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function makeStyles(theme: ThemeColors) {
  return StyleSheet.create({
    root: { flex: 1, backgroundColor: theme.surfaceApp },
    flex: { flex: 1 },
    scroll: { flexGrow: 1, paddingHorizontal: 24, paddingBottom: 40 },

    backBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      paddingTop: 16,
      paddingBottom: 24,
    },
    backArrow: { fontSize: 20, color: theme.actionBrand },
    backText: { fontSize: 14, fontWeight: '500', color: theme.actionBrand },

    header: { marginBottom: 28 },
    title: {
      fontSize: 26,
      fontWeight: '700',
      color: theme.textHeading,
      letterSpacing: -0.3,
      marginBottom: 6,
    },
    subtitle: { fontSize: 15, color: theme.textSecondary, lineHeight: 22 },

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
      marginBottom: 4,
    },
    socialBtnPressed: { backgroundColor: theme.surfaceRaised },
    socialBtnG: { fontSize: 16, fontWeight: '800', color: theme.textHeading },
    socialBtnLabel: { fontSize: 15, fontWeight: '500', color: theme.textBody },

    divider: { flexDirection: 'row', alignItems: 'center', marginVertical: 20, gap: 12 },
    dividerLine: { flex: 1, height: 1, backgroundColor: theme.borderSubtle },
    dividerLabel: { fontSize: 12, fontWeight: '600', color: theme.textMuted, letterSpacing: 1 },

    form: {},
    fieldWrap: { marginBottom: 16 },
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
    inputIconText: { fontSize: 16, color: theme.textMuted, marginLeft: 8 },
    eyeBtn: { padding: 4, marginLeft: 4 },

    errorText: {
      fontSize: 13,
      color: theme.actionDanger,
      textAlign: 'center',
      marginBottom: 12,
    },

    termsRow: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: 12,
      marginBottom: 24,
    },
    checkbox: {
      width: 20,
      height: 20,
      borderRadius: 5,
      borderWidth: 1.5,
      borderColor: theme.borderDefault,
      alignItems: 'center',
      justifyContent: 'center',
      marginTop: 1,
    },
    checkboxChecked: {
      backgroundColor: theme.actionBrand,
      borderColor: theme.actionBrand,
    },
    checkboxTick: { fontSize: 12, color: '#fff', fontWeight: '700' },
    termsText: { flex: 1, fontSize: 13, color: theme.textSecondary, lineHeight: 20 },

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
    primaryBtnPressed: { backgroundColor: theme.actionBrandDim, shadowOpacity: 0.15 },
    primaryBtnDisabled: { opacity: 0.6 },
    primaryBtnLabel: {
      fontSize: 15,
      fontWeight: '700',
      color: '#fff',
      letterSpacing: 1.2,
    },

    footer: {
      flexDirection: 'row',
      justifyContent: 'center',
      alignItems: 'center',
      flexWrap: 'wrap',
      marginTop: 28,
      gap: 4,
    },
    footerText: { fontSize: 13, color: theme.textMuted },
    footerLink: { fontSize: 13, color: theme.actionBrand, fontWeight: '500' },
  });
}
