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
import type { NativeStackNavigationProp, NativeStackScreenProps } from '@react-navigation/native-stack';
import { useTranslation } from 'react-i18next';
import { createSong, updateSong, getSong, getMyOrganizations } from '@regieart/api';
import { useTheme } from '../../../shared/theme';
import type { ThemeColors } from '@regieart/ui';
import type { RootStackParamList } from '../../../navigation';

type Props = NativeStackScreenProps<RootStackParamList, 'UploadScore'>;
type Nav = NativeStackNavigationProp<RootStackParamList>;

const KEYS = ['C', 'Db', 'D', 'Eb', 'E', 'F', 'F#', 'G', 'Ab', 'A', 'Bb', 'B',
               'Cm', 'Dm', 'Em', 'Fm', 'Gm', 'Am', 'Bm'];

export function UploadScoreScreen({ route }: Props) {
  const { songId } = route.params;
  const { theme } = useTheme();
  const { t } = useTranslation();
  const navigation = useNavigation<Nav>();
  const s = makeStyles(theme);

  const [orgId, setOrgId] = useState('');
  const [title, setTitle] = useState('');
  const [composer, setComposer] = useState('');
  const [arranger, setArranger] = useState('');
  const [genre, setGenre] = useState('');
  const [musicalKey, setMusicalKey] = useState('');
  const [tempo, setTempo] = useState('');
  const [durationSeconds, setDurationSeconds] = useState('');
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(!!songId);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    async function init() {
      const orgs = await getMyOrganizations();
      setOrgId(orgs[0]?.id ?? '');
      if (songId) {
        const song = await getSong(songId);
        setTitle(song.title);
        setComposer(song.composer ?? '');
        setArranger(song.arranger ?? '');
        setGenre(song.genre ?? '');
        setMusicalKey(song.musicalKey ?? '');
        setTempo(song.tempo ? String(song.tempo) : '');
        setDurationSeconds(song.durationSeconds ? String(song.durationSeconds) : '');
        setNotes(song.notes ?? '');
      }
      setLoading(false);
    }
    init();
  }, [songId]);

  async function handleSave() {
    if (!title.trim()) {
      setError(t('errors.required_fields'));
      return;
    }
    if (tempo && !Number.isFinite(parseInt(tempo, 10))) {
      setError(t('errors.generic'));
      return;
    }
    if (durationSeconds && !Number.isFinite(parseInt(durationSeconds, 10))) {
      setError(t('errors.generic'));
      return;
    }
    setSaving(true);
    setError('');
    try {
      const dto = {
        orgId,
        title: title.trim(),
        composer: composer.trim() || undefined,
        arranger: arranger.trim() || undefined,
        genre: genre.trim() || undefined,
        musicalKey: musicalKey || undefined,
        tempo: tempo ? parseInt(tempo, 10) : undefined,
        durationSeconds: durationSeconds ? parseInt(durationSeconds, 10) : undefined,
        notes: notes.trim() || undefined,
      };
      if (songId) {
        await updateSong(songId, dto);
      } else {
        await createSong(dto);
      }
      navigation.goBack();
    } catch {
      setError(t('errors.generic'));
    } finally {
      setSaving(false);
    }
  }

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
      <KeyboardAvoidingView
        style={s.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView contentContainerStyle={s.scroll} keyboardShouldPersistTaps="handled">
          <Text style={s.title}>{songId ? t('song_form.edit_title') : t('song_form.add_title')}</Text>

          <Text style={s.fieldLabel}>{t('song_form.title_field')} *</Text>
          <TextInput
            style={s.input}
            value={title}
            onChangeText={setTitle}
            placeholder={t('song_form.title_placeholder')}
            placeholderTextColor={theme.textMuted}
          />

          <Text style={s.fieldLabel}>{t('song_form.composer_field')}</Text>
          <TextInput
            style={s.input}
            value={composer}
            onChangeText={setComposer}
            placeholder={t('song_form.composer_placeholder')}
            placeholderTextColor={theme.textMuted}
          />

          <Text style={s.fieldLabel}>{t('song_form.arranger_field')}</Text>
          <TextInput
            style={s.input}
            value={arranger}
            onChangeText={setArranger}
            placeholder={t('song_form.arranger_placeholder')}
            placeholderTextColor={theme.textMuted}
          />

          <View style={s.row}>
            <View style={s.rowHalf}>
              <Text style={s.fieldLabel}>{t('song_form.genre_field')}</Text>
              <TextInput
                style={s.input}
                value={genre}
                onChangeText={setGenre}
                placeholder="Jazz"
                placeholderTextColor={theme.textMuted}
              />
            </View>
            <View style={s.rowHalf}>
              <Text style={s.fieldLabel}>{t('song_form.bpm_field')}</Text>
              <TextInput
                style={s.input}
                value={tempo}
                onChangeText={setTempo}
                placeholder="120"
                placeholderTextColor={theme.textMuted}
                keyboardType="numeric"
              />
            </View>
          </View>

          <Text style={s.fieldLabel}>{t('song_form.key_field')}</Text>
          <View style={s.keyGrid}>
            {KEYS.map((k) => (
              <Pressable
                key={k}
                style={[s.keyChip, musicalKey === k && s.keyChipSelected]}
                onPress={() => setMusicalKey(musicalKey === k ? '' : k)}
              >
                <Text style={[s.keyChipText, musicalKey === k && s.keyChipTextSelected]}>{k}</Text>
              </Pressable>
            ))}
          </View>

          <Text style={s.fieldLabel}>{t('song_form.duration_field')}</Text>
          <TextInput
            style={s.input}
            value={durationSeconds}
            onChangeText={setDurationSeconds}
            placeholder="240"
            placeholderTextColor={theme.textMuted}
            keyboardType="numeric"
          />

          <Text style={s.fieldLabel}>{t('song_form.notes_field')}</Text>
          <TextInput
            style={[s.input, s.textArea]}
            value={notes}
            onChangeText={setNotes}
            placeholder={t('song_form.notes_placeholder')}
            placeholderTextColor={theme.textMuted}
            multiline
            numberOfLines={4}
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
              <Text style={s.saveBtnText}>{songId ? t('common.save') : t('common.create')}</Text>
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
    fieldLabel: {
      fontSize: 12,
      fontWeight: '600',
      color: theme.textSecondary,
      marginBottom: 6,
      marginTop: 12,
    },
    input: {
      backgroundColor: theme.surfaceRaised,
      borderRadius: 10,
      paddingHorizontal: 14,
      paddingVertical: 12,
      fontSize: 15,
      color: theme.textHeading,
    },
    textArea: { minHeight: 88, paddingTop: 12 },
    row: { flexDirection: 'row', gap: 10 },
    rowHalf: { flex: 1 },
    keyGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 4 },
    keyChip: {
      borderRadius: 8,
      borderWidth: 1.5,
      borderColor: theme.borderDefault,
      paddingHorizontal: 10,
      paddingVertical: 7,
      minWidth: 40,
      alignItems: 'center',
    },
    keyChipSelected: { borderColor: theme.actionBrand, backgroundColor: theme.statusOkSurface },
    keyChipText: { fontSize: 13, fontWeight: '500', color: theme.textSecondary },
    keyChipTextSelected: { color: theme.actionBrand, fontWeight: '700' },
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

