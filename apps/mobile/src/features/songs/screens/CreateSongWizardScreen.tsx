import React, { useState } from 'react';
import {
  View,
  Text,
  Pressable,
  TextInput,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as DocumentPicker from 'expo-document-picker';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createSong, uploadFile, getMyOrganizations } from '@regieart/api';
import { useTheme } from '../../../shared/theme';
import type { ThemeColors } from '@regieart/ui';
import type { RootStackParamList } from '../../../navigation';

const SELECTED_ORG_KEY = '@regieart:selectedOrgId';
type Nav = NativeStackNavigationProp<RootStackParamList>;


const MUSICAL_KEYS = [
  'C', 'Cm', 'C#m', 'Db',
  'D', 'Dm', 'Eb', 'E', 'Em',
  'F', 'Fm', 'F#m', 'G', 'Gm',
  'Ab', 'A', 'Am', 'Bb', 'B', 'Bm',
];


interface UploadedFile {
  name: string;
  uri: string;
  size: number;
  mimeType: string;
  uploadProgress: number; // 0–100, 100 = done
  assetId?: string;
  error?: string;
}

interface WizardData {
  title: string;
  composer: string;
  arranger: string;
  genre: string;
  musicalKey: string;
  tempo: string;
  durationSeconds: string;
  notes: string;
  audioFile: UploadedFile | null;
  pdfFile: UploadedFile | null;
}


function ProgressBar({ value, theme }: { value: number; theme: ThemeColors }) {
  return (
    <View style={{ height: 3, backgroundColor: theme.borderSubtle, borderRadius: 2 }}>
      <View
        style={{
          height: 3,
          width: `${value}%`,
          backgroundColor: theme.actionBrand,
          borderRadius: 2,
        }}
      />
    </View>
  );
}


export function CreateSongWizardScreen() {
  const { theme } = useTheme();
  const navigation = useNavigation<Nav>();
  const s = makeStyles(theme);

  const [step, setStep] = useState(1);
  const [saving, setSaving] = useState(false);
  const [data, setData] = useState<WizardData>({
    title: '',
    composer: '',
    arranger: '',
    genre: '',
    musicalKey: '',
    tempo: '',
    durationSeconds: '',
    notes: '',
    audioFile: null,
    pdfFile: null,
  });

  function update(field: keyof WizardData, value: string | UploadedFile | null) {
    setData((prev) => ({ ...prev, [field]: value }));
  }

  function canProceedStep1() {
    return data.title.trim().length > 0;
  }

  async function pickFile(field: 'audioFile' | 'pdfFile') {
    const isAudio = field === 'audioFile';
    try {
      const res = await DocumentPicker.getDocumentAsync({
        type: isAudio
          ? ['audio/mpeg', 'audio/mp4', 'audio/wav', 'audio/aac', 'audio/x-m4a']
          : ['application/pdf'],
        copyToCacheDirectory: true,
      });
      if (res.canceled || !res.assets?.[0]) return;

      const picked = res.assets[0];
      update(field, {
        name: picked.name,
        uri: picked.uri,
        size: picked.size ?? 0,
        mimeType: picked.mimeType ?? (isAudio ? 'audio/mpeg' : 'application/pdf'),
        uploadProgress: 0, // 0 = selected, not uploaded yet
      });
    } catch (err) {
      Alert.alert('Error', err instanceof Error ? err.message : 'Error al seleccionar archivo');
    }
  }

  async function handleSave() {
    if (!data.title.trim()) return;
    if (data.tempo && !Number.isFinite(parseInt(data.tempo, 10))) return;
    if (data.durationSeconds && !Number.isFinite(parseInt(data.durationSeconds, 10))) return;
    setSaving(true);
    try {
      let orgId = await AsyncStorage.getItem(SELECTED_ORG_KEY);
      if (!orgId) {
        const orgs = await getMyOrganizations();
        orgId = orgs[0]?.id ?? '';
      }
      if (!orgId) throw new Error('No hay organización seleccionada.');

      const song = await createSong({
        orgId,
        title: data.title.trim(),
        composer: data.composer.trim() || undefined,
        arranger: data.arranger.trim() || undefined,
        genre: data.genre.trim() || undefined,
        musicalKey: data.musicalKey || undefined,
        tempo: data.tempo ? parseInt(data.tempo, 10) : undefined,
        durationSeconds: data.durationSeconds ? parseInt(data.durationSeconds, 10) : undefined,
        notes: data.notes.trim() || undefined,
      });

      if (data.audioFile?.uri) {
        setData((prev) => ({
          ...prev,
          audioFile: prev.audioFile ? { ...prev.audioFile, uploadProgress: 1 } : null,
        }));
        const audioId = await uploadFile(
          data.audioFile.uri,
          'audio-track',
          data.audioFile.mimeType,
          {
            orgId,
            songId: song.id,
            displayName: data.audioFile.name,
            originalName: data.audioFile.name,
            onProgress: (pct) =>
              setData((prev) => ({
                ...prev,
                audioFile: prev.audioFile ? { ...prev.audioFile, uploadProgress: pct } : null,
              })),
          },
        );
        setData((prev) => ({
          ...prev,
          audioFile: prev.audioFile ? { ...prev.audioFile, uploadProgress: 100, assetId: audioId } : null,
        }));
      }

      if (data.pdfFile?.uri) {
        setData((prev) => ({
          ...prev,
          pdfFile: prev.pdfFile ? { ...prev.pdfFile, uploadProgress: 1 } : null,
        }));
        const pdfId = await uploadFile(
          data.pdfFile.uri,
          'music-score',
          data.pdfFile.mimeType,
          {
            orgId,
            songId: song.id,
            displayName: data.pdfFile.name,
            originalName: data.pdfFile.name,
            onProgress: (pct) =>
              setData((prev) => ({
                ...prev,
                pdfFile: prev.pdfFile ? { ...prev.pdfFile, uploadProgress: pct } : null,
              })),
          },
        );
        setData((prev) => ({
          ...prev,
          pdfFile: prev.pdfFile ? { ...prev.pdfFile, uploadProgress: 100, assetId: pdfId } : null,
        }));
      }

      Alert.alert('✅ ¡Listo!', `"${data.title}" fue agregada al repertorio.`, [
        { text: 'OK', onPress: () => navigation.goBack() },
      ]);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Error al guardar';
      Alert.alert('Error', msg);
    } finally {
      setSaving(false);
    }
  }

  const progressPct = ((step - 1) / 3) * 100 + 33;

  return (
    <SafeAreaView style={s.root} edges={['top', 'bottom']}>
      <View style={s.topBar}>
        {step === 1 ? (
          <Pressable onPress={() => navigation.goBack()} hitSlop={10}>
            <Text style={s.cancelBtn}>✕ Cancelar</Text>
          </Pressable>
        ) : (
          <Pressable onPress={() => setStep((p) => p - 1)} hitSlop={10}>
            <Text style={s.backBtn}>← Atrás</Text>
          </Pressable>
        )}
        <Text style={s.stepLabel}>Paso {step} de 3</Text>
        <View style={{ width: 70 }} />
      </View>

      <View style={s.progressContainer}>
        <ProgressBar value={progressPct} theme={theme} />
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={s.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {step === 1 && (
            <>
              <Text style={s.stepTitle}>Ficha Técnica 🎼</Text>
              <Text style={s.stepSub}>
                Define el título, la tonalidad y el tempo exacto.
              </Text>

              <Text style={s.label}>Título de la canción *</Text>
              <TextInput
                style={[s.input, !data.title && s.inputError]}
                placeholder="Ej. Le Petit Pêcheur"
                placeholderTextColor={theme.textMuted}
                value={data.title}
                onChangeText={(v) => update('title', v)}
                returnKeyType="next"
              />

              <Text style={s.label}>Artista / Compositor original</Text>
              <TextInput
                style={s.input}
                placeholder="Ej. Jean-Pierre Leblanc Trio"
                placeholderTextColor={theme.textMuted}
                value={data.composer}
                onChangeText={(v) => update('composer', v)}
                returnKeyType="next"
              />

              <Text style={s.label}>Arreglista (opcional)</Text>
              <TextInput
                style={s.input}
                placeholder="Ej. Juan López"
                placeholderTextColor={theme.textMuted}
                value={data.arranger}
                onChangeText={(v) => update('arranger', v)}
                returnKeyType="next"
              />

              <Text style={s.label}>Género musical (opcional)</Text>
              <TextInput
                style={s.input}
                placeholder="Ej. Jazz, Salsa, Clásico..."
                placeholderTextColor={theme.textMuted}
                value={data.genre}
                onChangeText={(v) => update('genre', v)}
                returnKeyType="next"
              />

              <Text style={s.label}>Tonalidad (Key)</Text>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={s.keyRow}
              >
                {MUSICAL_KEYS.map((k) => (
                  <Pressable
                    key={k}
                    onPress={() => update('musicalKey', data.musicalKey === k ? '' : k)}
                    style={[s.keyChip, data.musicalKey === k && s.keyChipActive]}
                  >
                    <Text style={[s.keyChipText, data.musicalKey === k && s.keyChipTextActive]}>
                      {k}
                    </Text>
                  </Pressable>
                ))}
              </ScrollView>
              <Text style={s.hint}>
                💡 La tonalidad evita confusión en la sección de vientos (trompetas en B♭, saxos en E♭).
              </Text>

              <View style={s.row}>
                <View style={{ flex: 1 }}>
                  <Text style={s.label}>Tempo (BPM)</Text>
                  <TextInput
                    style={s.input}
                    placeholder="120"
                    placeholderTextColor={theme.textMuted}
                    value={data.tempo}
                    onChangeText={(v) => update('tempo', v.replace(/[^0-9]/g, ''))}
                    keyboardType="numeric"
                    returnKeyType="next"
                  />
                </View>
                <View style={{ width: 12 }} />
                <View style={{ flex: 1 }}>
                  <Text style={s.label}>Duración (seg)</Text>
                  <TextInput
                    style={s.input}
                    placeholder="215"
                    placeholderTextColor={theme.textMuted}
                    value={data.durationSeconds}
                    onChangeText={(v) => update('durationSeconds', v.replace(/[^0-9]/g, ''))}
                    keyboardType="numeric"
                    returnKeyType="done"
                  />
                </View>
              </View>

              <Text style={s.hint}>
                ⏱ El BPM sincroniza el metrónomo integrado durante los ensayos.
              </Text>
            </>
          )}

          {step === 2 && (
            <>
              <Text style={s.stepTitle}>Archivos de Audio & Partituras 🎧</Text>
              <Text style={s.stepSub}>
                Sube la mezcla de ensayo y los arreglos en PDF a Cloudflare R2.
              </Text>

              <Text style={s.sectionTitle}>🔊 Archivo de Audio</Text>
              {data.audioFile ? (
                <View style={s.fileCard}>
                  <View style={s.fileCardRow}>
                    <Text style={s.fileCardIcon}>🎵</Text>
                    <View style={{ flex: 1 }}>
                      <Text style={s.fileCardName} numberOfLines={1}>{data.audioFile.name}</Text>
                      <Text style={s.fileCardSize}>
                        {(data.audioFile.size / 1024 / 1024).toFixed(1)} MB
                      </Text>
                    </View>
                      {data.audioFile.uploadProgress === 0 ? (
                      <Text style={s.fileCardDone}>📂</Text>
                    ) : data.audioFile.uploadProgress < 100 ? (
                      <ActivityIndicator size="small" color={theme.actionBrand} />
                    ) : (
                      <Text style={s.fileCardDone}>✓</Text>
                    )}
                  </View>
                  <View style={s.fileProgressTrack}>
                    <View
                      style={[
                        s.fileProgressFill,
                        { width: `${data.audioFile.uploadProgress}%` },
                      ]}
                    />
                  </View>
                  <Text style={s.fileProgressLabel}>
                    {data.audioFile.uploadProgress === 0
                      ? '📂 Listo para subir en el paso 3'
                      : data.audioFile.uploadProgress < 100
                      ? `Subiendo... ${data.audioFile.uploadProgress}%`
                      : '✓ Listo en R2'}
                  </Text>
                  <Pressable onPress={() => update('audioFile', null)} style={s.removeBtn}>
                    <Text style={s.removeBtnText}>Cambiar archivo</Text>
                  </Pressable>
                </View>
              ) : (
                <Pressable style={s.uploadBox} onPress={() => pickFile('audioFile')}>
                  <Text style={s.uploadBoxIcon}>📂</Text>
                  <Text style={s.uploadBoxTitle}>Seleccionar Audio</Text>
                  <Text style={s.uploadBoxSub}>MP3, WAV, AAC, M4A</Text>
                </Pressable>
              )}

              <Text style={s.hint}>
                💡 Los archivos de audio se transmiten en streaming sin gastar almacenamiento interno.
              </Text>

              <Text style={[s.sectionTitle, { marginTop: 20 }]}>📄 Partitura / Arreglo (PDF)</Text>
              {data.pdfFile ? (
                <View style={s.fileCard}>
                  <View style={s.fileCardRow}>
                    <Text style={s.fileCardIcon}>📄</Text>
                    <View style={{ flex: 1 }}>
                      <Text style={s.fileCardName} numberOfLines={1}>{data.pdfFile.name}</Text>
                      <Text style={s.fileCardSize}>
                        {(data.pdfFile.size / 1024 / 1024).toFixed(1)} MB
                      </Text>
                    </View>
                      {data.pdfFile.uploadProgress === 0 ? (
                      <Text style={s.fileCardDone}>📂</Text>
                    ) : data.pdfFile.uploadProgress < 100 ? (
                      <ActivityIndicator size="small" color={theme.actionBrand} />
                    ) : (
                      <Text style={s.fileCardDone}>✓</Text>
                    )}
                  </View>
                  <View style={s.fileProgressTrack}>
                    <View
                      style={[
                        s.fileProgressFill,
                        { width: `${data.pdfFile.uploadProgress}%` },
                      ]}
                    />
                  </View>
                  <Text style={s.fileProgressLabel}>
                    {data.pdfFile.uploadProgress === 0
                      ? '📂 Listo para subir en el paso 3'
                      : data.pdfFile.uploadProgress < 100
                      ? `Subiendo... ${data.pdfFile.uploadProgress}%`
                      : '✓ Partitura subida a R2'}
                  </Text>
                  <Pressable onPress={() => update('pdfFile', null)} style={s.removeBtn}>
                    <Text style={s.removeBtnText}>Cambiar archivo</Text>
                  </Pressable>
                </View>
              ) : (
                <Pressable style={s.uploadBox} onPress={() => pickFile('pdfFile')}>
                  <Text style={s.uploadBoxIcon}>📄</Text>
                  <Text style={s.uploadBoxTitle}>Subir Partitura</Text>
                  <Text style={s.uploadBoxSub}>Solo PDF</Text>
                </Pressable>
              )}

              <Text style={s.hint}>
                📥 Los archivos son opcionales. Podés agregarlos ahora o más tarde.
              </Text>
            </>
          )}

          {step === 3 && (
            <>
              <Text style={s.stepTitle}>Estructura & Guía de Ensayos 📝</Text>
              <Text style={s.stepSub}>
                Explicá a los músicos cómo se interpretará la obra.
              </Text>

              <Text style={s.label}>Notas de estructura / Forma musical</Text>
              <TextInput
                style={[s.input, s.inputMultiline]}
                placeholder={`Ej. Intro (8 compases) → Tema A → Solo Trompeta → Tema B → Coda con Ritardando.`}
                placeholderTextColor={theme.textMuted}
                value={data.notes}
                onChangeText={(v) => update('notes', v)}
                multiline
                numberOfLines={5}
                textAlignVertical="top"
              />

              <Text style={[s.sectionTitle, { marginTop: 20 }]}>Resumen</Text>
              <View style={s.summaryCard}>
                <Text style={s.summaryTitle}>🎼 {data.title}</Text>
                {data.composer ? (
                  <Text style={s.summaryLine}>👤 {data.composer}</Text>
                ) : null}
                <View style={s.summaryChips}>
                  {data.musicalKey ? (
                    <View style={s.summaryChip}>
                      <Text style={s.summaryChipText}>🎵 {data.musicalKey}</Text>
                    </View>
                  ) : null}
                  {data.tempo ? (
                    <View style={s.summaryChip}>
                      <Text style={s.summaryChipText}>⏱ {data.tempo} BPM</Text>
                    </View>
                  ) : null}
                  {data.durationSeconds ? (
                    <View style={s.summaryChip}>
                      <Text style={s.summaryChipText}>
                        ⌛ {Math.floor(parseInt(data.durationSeconds) / 60)}:{
                          String(parseInt(data.durationSeconds) % 60).padStart(2, '0')
                        }
                      </Text>
                    </View>
                  ) : null}
                </View>
                {data.audioFile ? (
                  <Text style={s.summaryLine}>
                    🔊 {data.audioFile.name} · {data.audioFile.uploadProgress === 100 ? 'Subido ✓' : 'Se sube al guardar'}
                  </Text>
                ) : null}
                {data.pdfFile ? (
                  <Text style={s.summaryLine}>
                    📄 {data.pdfFile.name} · {data.pdfFile.uploadProgress === 100 ? 'Subido ✓' : 'Se sube al guardar'}
                  </Text>
                ) : null}
                {data.notes ? (
                  <Text style={s.summaryNotes} numberOfLines={3}>{data.notes}</Text>
                ) : null}
              </View>
            </>
          )}
        </ScrollView>
      </KeyboardAvoidingView>

      <View style={s.footer}>
        {step < 3 ? (
          <Pressable
            style={[s.nextBtn, !canProceedStep1() && step === 1 && s.nextBtnDisabled]}
            onPress={() => {
              if (step === 1 && !canProceedStep1()) {
                Alert.alert('Campo requerido', 'El título de la canción es obligatorio.');
                return;
              }
              setStep((p) => p + 1);
            }}
          >
            <Text style={s.nextBtnText}>Siguiente →</Text>
          </Pressable>
        ) : (
          <Pressable
            style={[s.saveBtn, saving && s.saveBtnLoading]}
            onPress={handleSave}
            disabled={saving}
          >
            {saving ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={s.saveBtnText}>🚀 Guardar en Repertorio</Text>
            )}
          </Pressable>
        )}
      </View>
    </SafeAreaView>
  );
}


function makeStyles(t: ThemeColors) {
  return StyleSheet.create({
    root: { flex: 1, backgroundColor: t.surfaceApp },

    topBar: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 20,
      paddingVertical: 12,
    },
    cancelBtn: { fontSize: 14, color: t.textMuted },
    backBtn: { fontSize: 14, color: t.actionBrand, fontWeight: '600' },
    stepLabel: { fontSize: 13, fontWeight: '700', color: t.textSecondary },

    progressContainer: { paddingHorizontal: 20, marginBottom: 8 },

    scrollContent: { paddingHorizontal: 20, paddingBottom: 24 },

    stepTitle: {
      fontSize: 22,
      fontWeight: '800',
      color: t.textHeading,
      marginBottom: 6,
      letterSpacing: -0.3,
    },
    stepSub: { fontSize: 13, color: t.textMuted, lineHeight: 18, marginBottom: 20 },

    sectionTitle: { fontSize: 13, fontWeight: '700', color: t.textSecondary, marginBottom: 8 },

    label: { fontSize: 13, fontWeight: '600', color: t.textSecondary, marginBottom: 6, marginTop: 14 },
    hint: { fontSize: 12, color: t.textMuted, lineHeight: 16, marginTop: 6, fontStyle: 'italic' },

    input: {
      backgroundColor: t.surfaceCard,
      borderRadius: 12,
      paddingHorizontal: 14,
      paddingVertical: 12,
      fontSize: 15,
      color: t.textHeading,
      borderWidth: 1,
      borderColor: t.borderSubtle,
    },
    inputError: { borderColor: '#E05A5A' },
    inputMultiline: { minHeight: 110, paddingTop: 12 },

    row: { flexDirection: 'row', alignItems: 'flex-end' },

    keyRow: { flexDirection: 'row', gap: 8, paddingVertical: 4 },
    keyChip: {
      paddingHorizontal: 12,
      paddingVertical: 6,
      borderRadius: 20,
      backgroundColor: t.surfaceCard,
      borderWidth: 1,
      borderColor: t.borderSubtle,
    },
    keyChipActive: { backgroundColor: t.actionBrand + '22', borderColor: t.actionBrand },
    keyChipText: { fontSize: 13, fontWeight: '600', color: t.textMuted },
    keyChipTextActive: { color: t.actionBrand },

    uploadBox: {
      borderWidth: 1.5,
      borderColor: t.borderSubtle,
      borderStyle: 'dashed',
      borderRadius: 14,
      paddingVertical: 24,
      alignItems: 'center',
      backgroundColor: t.surfaceCard,
    },
    uploadBoxIcon: { fontSize: 28, marginBottom: 6 },
    uploadBoxTitle: { fontSize: 15, fontWeight: '700', color: t.textHeading },
    uploadBoxSub: { fontSize: 12, color: t.textMuted, marginTop: 2 },

    fileCard: {
      backgroundColor: t.surfaceCard,
      borderRadius: 12,
      padding: 14,
      borderWidth: 1,
      borderColor: t.actionBrand + '44',
    },
    fileCardRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 8 },
    fileCardIcon: { fontSize: 22 },
    fileCardName: { fontSize: 13, fontWeight: '600', color: t.textHeading },
    fileCardSize: { fontSize: 11, color: t.textMuted, marginTop: 1 },
    fileCardDone: { fontSize: 18, color: t.actionBrand },
    fileProgressTrack: { height: 4, backgroundColor: t.borderSubtle, borderRadius: 2 },
    fileProgressFill: { height: 4, backgroundColor: t.actionBrand, borderRadius: 2 },
    fileProgressLabel: { fontSize: 11, color: t.textMuted, marginTop: 4 },
    removeBtn: { marginTop: 8, alignSelf: 'flex-end' },
    removeBtnText: { fontSize: 12, color: t.textMuted, textDecorationLine: 'underline' },

    summaryCard: {
      backgroundColor: t.surfaceCard,
      borderRadius: 14,
      padding: 16,
      borderWidth: 1,
      borderColor: t.borderSubtle,
      borderLeftWidth: 4,
      borderLeftColor: t.actionBrand,
    },
    summaryTitle: { fontSize: 18, fontWeight: '800', color: t.textHeading, marginBottom: 8 },
    summaryLine: { fontSize: 13, color: t.textSecondary, marginBottom: 4 },
    summaryChips: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 8 },
    summaryChip: {
      paddingHorizontal: 8,
      paddingVertical: 3,
      borderRadius: 6,
      backgroundColor: t.actionBrand + '22',
    },
    summaryChipText: { fontSize: 12, fontWeight: '700', color: t.actionBrand },
    summaryNotes: { fontSize: 12, color: t.textMuted, fontStyle: 'italic', lineHeight: 16, marginTop: 4 },

    footer: { paddingHorizontal: 20, paddingVertical: 14, borderTopWidth: 1, borderTopColor: t.borderSubtle },
    nextBtn: { backgroundColor: t.actionBrand, borderRadius: 14, paddingVertical: 15, alignItems: 'center' },
    nextBtnDisabled: { opacity: 0.4 },
    nextBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
    saveBtn: { backgroundColor: t.actionBrand, borderRadius: 14, paddingVertical: 15, alignItems: 'center' },
    saveBtnLoading: { opacity: 0.7 },
    saveBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  });
}
