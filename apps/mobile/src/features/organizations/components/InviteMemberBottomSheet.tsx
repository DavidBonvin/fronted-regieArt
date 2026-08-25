import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  Pressable,
  Modal,
  StyleSheet,
  Animated,
  Dimensions,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { inviteByEmail } from '@regieart/api';
import type { EmailInvitation, MemberRole } from '@regieart/types';
import { useTheme } from '../../../shared/theme';
import type { ThemeColors } from '@regieart/ui';

const SCREEN_HEIGHT = Dimensions.get('window').height;
const SHEET_HEIGHT = SCREEN_HEIGHT * 0.82;

type RoleOption = { value: MemberRole; label: string };

const ROLE_OPTIONS: RoleOption[] = [
  { value: 'MEMBER', label: 'Miembro' },
  { value: 'ADMIN', label: 'Admin' },
  { value: 'EXTERNAL_TECH', label: 'Técnico Externo' },
];

type Props = {
  orgId: string;
  onClose: () => void;
  onSuccess: (invitation: EmailInvitation) => void;
};

export function InviteMemberBottomSheet({ orgId, onClose, onSuccess }: Props) {
  const { theme } = useTheme();
  const { bottom } = useSafeAreaInsets();
  const s = makeStyles(theme, bottom);

  const [email, setEmail] = useState('');
  const [role, setRole] = useState<MemberRole>('MEMBER');
  const [instrument, setInstrument] = useState('');
  const [personalMessage, setPersonalMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [emailError, setEmailError] = useState('');

  const translateY = useRef(new Animated.Value(SHEET_HEIGHT)).current;
  const backdropOpacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.spring(translateY, {
        toValue: 0,
        damping: 25,
        stiffness: 200,
        useNativeDriver: true,
      }),
      Animated.timing(backdropOpacity, {
        toValue: 1,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start();
  }, [backdropOpacity, translateY]);

  function dismissSheet(callback?: () => void) {
    Animated.parallel([
      Animated.timing(translateY, {
        toValue: SHEET_HEIGHT,
        duration: 250,
        useNativeDriver: true,
      }),
      Animated.timing(backdropOpacity, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start(() => {
      callback?.();
      onClose();
    });
  }

  function validateEmail(value: string) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!value.trim()) return 'El correo es obligatorio';
    if (!emailRegex.test(value.trim())) return 'Correo inválido';
    return '';
  }

  async function handleSubmit() {
    const error = validateEmail(email);
    if (error) {
      setEmailError(error);
      return;
    }
    setEmailError('');
    setSubmitting(true);
    try {
      const invitation = await inviteByEmail(orgId, {
        email: email.trim(),
        role,
        instrument: instrument.trim() || undefined,
        personalMessage: personalMessage.trim() || undefined,
      });
      dismissSheet(() => onSuccess(invitation));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Modal
      transparent
      animationType="none"
      visible
      onRequestClose={() => dismissSheet()}
      statusBarTranslucent
    >
      <View style={StyleSheet.absoluteFill}>
        <Animated.View
          style={[s.backdrop, { opacity: backdropOpacity }]}
        >
          <Pressable style={StyleSheet.absoluteFill} onPress={() => dismissSheet()} />
        </Animated.View>

        <Animated.View style={[s.sheet, { transform: [{ translateY }] }]}>
          <View style={s.dragIndicator} />
          <Text style={s.sheetTitle}>Invitar miembro</Text>

          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            style={{ flex: 1 }}
          >
            <ScrollView
              contentContainerStyle={s.formContent}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
            >
              <View style={s.fieldGroup}>
                <Text style={s.fieldLabel}>Correo electrónico</Text>
                <TextInput
                  style={[s.input, emailError ? s.inputError : null]}
                  value={email}
                  onChangeText={(v) => { setEmail(v); setEmailError(''); }}
                  placeholder="nombre@ejemplo.com"
                  placeholderTextColor={theme.inputPlaceholder}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoCorrect={false}
                  editable={!submitting}
                />
                {emailError ? <Text style={s.errorText}>{emailError}</Text> : null}
              </View>

              <View style={s.fieldGroup}>
                <Text style={s.fieldLabel}>Rol</Text>
                <View style={s.roleRow}>
                  {ROLE_OPTIONS.map((option) => (
                    <Pressable
                      key={option.value}
                      style={[s.roleOption, role === option.value && s.roleOptionSelected]}
                      onPress={() => !submitting && setRole(option.value)}
                    >
                      <Text style={[s.roleOptionLabel, role === option.value && s.roleOptionLabelSelected]}>
                        {option.label}
                      </Text>
                    </Pressable>
                  ))}
                </View>
              </View>

              <View style={s.fieldGroup}>
                <Text style={s.fieldLabel}>Instrumento <Text style={s.fieldLabelOptional}>(opcional)</Text></Text>
                <TextInput
                  style={s.input}
                  value={instrument}
                  onChangeText={setInstrument}
                  placeholder="ej. Guitarra, Batería..."
                  placeholderTextColor={theme.inputPlaceholder}
                  editable={!submitting}
                />
              </View>

              <View style={s.fieldGroup}>
                <Text style={s.fieldLabel}>
                  Mensaje personal{' '}
                  <Text style={s.fieldLabelOptional}>(opcional, máx. 500 caracteres)</Text>
                </Text>
                <TextInput
                  style={[s.input, s.textArea]}
                  value={personalMessage}
                  onChangeText={(v) => setPersonalMessage(v.slice(0, 500))}
                  placeholder="Escribe un mensaje para el invitado..."
                  placeholderTextColor={theme.inputPlaceholder}
                  multiline
                  numberOfLines={4}
                  textAlignVertical="top"
                  editable={!submitting}
                />
                <Text style={s.charCount}>{personalMessage.length}/500</Text>
              </View>

              <Pressable
                style={[s.submitButton, submitting && s.submitButtonDisabled]}
                onPress={handleSubmit}
                disabled={submitting}
              >
                {submitting ? (
                  <ActivityIndicator color={theme.textOnAction} size="small" />
                ) : (
                  <Text style={s.submitButtonLabel}>Enviar Invitación</Text>
                )}
              </Pressable>
            </ScrollView>
          </KeyboardAvoidingView>
        </Animated.View>
      </View>
    </Modal>
  );
}

function makeStyles(theme: ThemeColors, bottomInset: number) {
  return StyleSheet.create({
    backdrop: {
      ...StyleSheet.absoluteFillObject,
      backgroundColor: 'rgba(0,0,0,0.5)',
    },
    sheet: {
      position: 'absolute',
      bottom: 0,
      left: 0,
      right: 0,
      height: SHEET_HEIGHT,
      backgroundColor: theme.surfaceCard,
      borderTopLeftRadius: 20,
      borderTopRightRadius: 20,
      paddingBottom: bottomInset,
    },
    dragIndicator: {
      width: 36,
      height: 4,
      borderRadius: 2,
      backgroundColor: theme.borderDefault,
      alignSelf: 'center',
      marginTop: 12,
      marginBottom: 4,
    },
    sheetTitle: {
      fontSize: 18,
      fontWeight: '700',
      color: theme.textHeading,
      paddingHorizontal: 20,
      paddingVertical: 12,
    },
    formContent: {
      paddingHorizontal: 20,
      paddingBottom: 24,
      gap: 20,
    },
    fieldGroup: {
      gap: 6,
    },
    fieldLabel: {
      fontSize: 13,
      fontWeight: '600',
      color: theme.textSecondary,
    },
    fieldLabelOptional: {
      fontWeight: '400',
      color: theme.textMuted,
    },
    input: {
      backgroundColor: theme.inputBackground,
      borderWidth: 1,
      borderColor: theme.inputBorder,
      borderRadius: 10,
      paddingHorizontal: 14,
      paddingVertical: 12,
      fontSize: 15,
      color: theme.inputText,
    },
    inputError: {
      borderColor: theme.borderDanger,
    },
    textArea: {
      height: 100,
      paddingTop: 12,
    },
    errorText: {
      fontSize: 12,
      color: theme.actionDanger,
    },
    charCount: {
      fontSize: 11,
      color: theme.textMuted,
      textAlign: 'right',
    },
    roleRow: {
      flexDirection: 'row',
      gap: 8,
    },
    roleOption: {
      flex: 1,
      paddingVertical: 10,
      borderRadius: 10,
      borderWidth: 1.5,
      borderColor: theme.borderDefault,
      alignItems: 'center',
    },
    roleOptionSelected: {
      borderColor: theme.actionBrand,
      backgroundColor: theme.actionBrand + '1A',
    },
    roleOptionLabel: {
      fontSize: 12,
      fontWeight: '600',
      color: theme.textSecondary,
    },
    roleOptionLabelSelected: {
      color: theme.actionBrand,
    },
    submitButton: {
      backgroundColor: theme.actionBrand,
      borderRadius: 12,
      paddingVertical: 15,
      alignItems: 'center',
      marginTop: 4,
    },
    submitButtonDisabled: {
      opacity: 0.6,
    },
    submitButtonLabel: {
      fontSize: 16,
      fontWeight: '700',
      color: theme.textOnAction,
    },
  });
}
