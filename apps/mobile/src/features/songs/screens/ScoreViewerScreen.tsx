import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  Pressable,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp, NativeStackScreenProps } from '@react-navigation/native-stack';
import { useTranslation } from 'react-i18next';
import { getSong } from '@regieart/api';
import type { Song } from '@regieart/types';
import { useTheme } from '../../../shared/theme';
import type { ThemeColors } from '@regieart/ui';
import type { RootStackParamList } from '../../../navigation';

type Props = NativeStackScreenProps<RootStackParamList, 'ScoreViewer'>;
type Nav = NativeStackNavigationProp<RootStackParamList>;

export function ScoreViewerScreen({ route }: Props) {
  const { songId } = route.params;
  const { theme } = useTheme();
  const { t } = useTranslation();
  const navigation = useNavigation<Nav>();
  const s = makeStyles(theme);

  const [song, setSong] = useState<Song | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getSong(songId)
      .then((s) => {
        setSong(s);
        navigation.setOptions({ title: s.title });
      })
      .finally(() => setLoading(false));
  }, [songId, navigation]);

  if (loading) {
    return (
      <SafeAreaView style={s.root}>
        <View style={s.center}>
          <ActivityIndicator color={theme.actionBrand} size="large" />
        </View>
      </SafeAreaView>
    );
  }

  if (!song) return null;

  const metaItems = [
    { label: t('repertoire.composer_label'), value: song.composer },
    { label: t('repertoire.arranger_label'), value: song.arranger },
    { label: t('repertoire.genre_label'), value: song.genre },
    { label: t('repertoire.key_header'), value: song.musicalKey },
    { label: t('repertoire.bpm_header'), value: song.tempo ? `${song.tempo} BPM` : undefined },
    {
      label: t('repertoire.duration_header'),
      value: song.durationSeconds
        ? `${Math.floor(song.durationSeconds / 60)}:${String(song.durationSeconds % 60).padStart(2, '0')}`
        : undefined,
    },
  ].filter((i) => i.value);

  return (
    <SafeAreaView style={s.root}>
      <ScrollView contentContainerStyle={s.scroll}>
        <View style={s.metaCard}>
          <Text style={s.songTitle}>{song.title}</Text>
          <View style={s.metaGrid}>
            {metaItems.map((item) => (
              <View key={item.label} style={s.metaItem}>
                <Text style={s.metaLabel}>{item.label}</Text>
                <Text style={s.metaValue}>{item.value}</Text>
              </View>
            ))}
          </View>
        </View>

        {song.notes ? (
          <View style={s.notesCard}>
            <Text style={s.notesLabel}>{t('song_form.field_notes').toUpperCase()}</Text>
            <Text style={s.notesText}>{song.notes}</Text>
          </View>
        ) : null}

        <View style={s.pdfCard}>
          <Text style={s.pdfLabel}>{t('score_viewer.pdf_section')}</Text>
          <Text style={s.pdfHint}>{t('score_viewer.pdf_unavailable')}</Text>
        </View>

        <Pressable
          style={({ pressed }) => [s.editBtn, pressed && s.editBtnPressed]}
          onPress={() => navigation.navigate('UploadScore', { songId })}
        >
          <Text style={s.editBtnText}>{t('common.edit')}</Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

function makeStyles(theme: ThemeColors) {
  return StyleSheet.create({
    root: { flex: 1, backgroundColor: theme.surfaceApp },
    center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
    scroll: { padding: 16, paddingBottom: 40 },
    metaCard: {
      backgroundColor: theme.surfaceCard,
      borderRadius: 20,
      padding: 18,
      marginBottom: 12,
    },
    songTitle: { fontSize: 22, fontWeight: '700', color: theme.textHeading, marginBottom: 14, letterSpacing: -0.3 },
    metaGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 16 },
    metaItem: { minWidth: '40%' },
    metaLabel: { fontSize: 11, fontWeight: '600', color: theme.textMuted, marginBottom: 2 },
    metaValue: { fontSize: 14, fontWeight: '600', color: theme.textHeading },
    notesCard: {
      backgroundColor: theme.surfaceCard,
      borderRadius: 16,
      padding: 16,
      marginBottom: 12,
    },
    notesLabel: { fontSize: 10, fontWeight: '700', letterSpacing: 1.5, color: theme.textSecondary, marginBottom: 8 },
    notesText: { fontSize: 14, color: theme.textBody, lineHeight: 20 },
    pdfCard: {
      backgroundColor: theme.surfaceCard,
      borderRadius: 16,
      padding: 20,
      marginBottom: 16,
      alignItems: 'center',
    },
    pdfLabel: { fontSize: 12, fontWeight: '600', color: theme.textSecondary, marginBottom: 8 },
    pdfHint: { fontSize: 13, color: theme.textMuted, textAlign: 'center' },
    editBtn: {
      backgroundColor: theme.surfaceCard,
      borderRadius: 12,
      paddingVertical: 13,
      alignItems: 'center',
      borderWidth: 1,
      borderColor: theme.borderDefault,
    },
    editBtnPressed: { backgroundColor: theme.surfaceRaised },
    editBtnText: { fontSize: 15, fontWeight: '500', color: theme.textBody },
  });
}

