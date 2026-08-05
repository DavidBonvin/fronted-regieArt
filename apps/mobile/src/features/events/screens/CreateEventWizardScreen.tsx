import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Animated,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import {
  createEvent,
  addRosterMember,
  getOrganizationMembers,
  listVenues,
  createVenue,
} from '@regieart/api';
import type { EventType } from '@regieart/types';
import type { Venue, OrganizationMember } from '@regieart/types';
import type { RootStackParamList } from '../../../navigation';

type Nav = NativeStackNavigationProp<RootStackParamList>;

const SELECTED_ORG_KEY = '@regieart:selectedOrgId';


const EVENT_TYPES: { value: EventType; label: string; icon: string; color: string }[] = [
  { value: 'CONCERT', label: 'Concierto', icon: '🎤', color: '#4A827E' },
  { value: 'REHEARSAL', label: 'Ensayo', icon: '🎸', color: '#7E7B4A' },
  { value: 'AUDITION', label: 'Audición', icon: '🎼', color: '#6E4A7E' },
  { value: 'TOUR_DATE', label: 'Gira', icon: '🚌', color: '#4A6E7E' },
  { value: 'RECORDING_SESSION', label: 'Grabación', icon: '🎙️', color: '#7E4F4A' },
];


const STEPS = ['Tipo', 'Fecha', 'Notas', 'Roster'];


function toIso(dateStr: string, timeStr: string): string {
  const d = dateStr.trim() || '2025-01-01';
  const t = timeStr.trim() || '00:00';
  return new Date(`${d}T${t}:00`).toISOString();
}

function tomorrowStr(): string {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  return d.toISOString().slice(0, 10);
}


interface DateTimeFieldProps {
  label: string;
  dateValue: string;
  timeValue: string;
  onDateChange: (v: string) => void;
  onTimeChange: (v: string) => void;
  optional?: boolean;
}

function DateTimeField({ label, dateValue, timeValue, onDateChange, onTimeChange, optional }: DateTimeFieldProps) {
  return (
    <View style={dtStyles.container}>
      <Text style={dtStyles.label}>
        {label}
        {optional && <Text style={dtStyles.optional}> (opcional)</Text>}
      </Text>
      <View style={dtStyles.row}>
        <TextInput
          style={[dtStyles.input, dtStyles.dateInput]}
          value={dateValue}
          onChangeText={onDateChange}
          placeholder="AAAA-MM-DD"
          placeholderTextColor="#4B5563"
          keyboardType="numeric"
          maxLength={10}
        />
        <TextInput
          style={[dtStyles.input, dtStyles.timeInput]}
          value={timeValue}
          onChangeText={onTimeChange}
          placeholder="HH:MM"
          placeholderTextColor="#4B5563"
          keyboardType="numbers-and-punctuation"
          maxLength={5}
        />
      </View>
    </View>
  );
}

const dtStyles = StyleSheet.create({
  container: { marginBottom: 16 },
  label: { fontSize: 13, fontWeight: '600', color: '#8A96A8', marginBottom: 6, letterSpacing: 0.3 },
  optional: { fontWeight: '400', color: '#5A6370' },
  row: { flexDirection: 'row', gap: 8 },
  input: {
    backgroundColor: '#232B34',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#2E3845',
    color: '#E8ECF0',
    fontSize: 15,
    paddingHorizontal: 12,
    paddingVertical: 11,
  },
  dateInput: { flex: 1.6 },
  timeInput: { flex: 1 },
});


interface VenueSearchProps {
  selectedVenue: Venue | null;
  onSelect: (venue: Venue | null) => void;
}

function VenueSearch({ selectedVenue, onSelect }: VenueSearchProps) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Venue[]>([]);
  const [loading, setLoading] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const search = useCallback((q: string) => {
    if (timerRef.current) clearTimeout(timerRef.current);
    if (!q.trim()) { setResults([]); setShowResults(false); return; }
    timerRef.current = setTimeout(async () => {
      setLoading(true);
      try {
        const data = await listVenues(q);
        setResults(data);
        setShowResults(true);
      } catch {
        setResults([]);
      } finally {
        setLoading(false);
      }
    }, 350);
  }, []);

  const handleTextChange = (v: string) => {
    setQuery(v);
    if (selectedVenue) onSelect(null);
    search(v);
  };

  const handleSelect = (venue: Venue) => {
    onSelect(venue);
    setQuery(venue.name);
    setShowResults(false);
  };

  const handleCreateNew = async () => {
    if (!query.trim()) return;
    setLoading(true);
    try {
      const v = await createVenue({ name: query.trim(), city: '—' });
      onSelect(v);
      setQuery(v.name);
      setShowResults(false);
    } catch { /* venue creation failed silently, user can retry */ } finally {
      setLoading(false);
    }
  };

  return (
    <View style={venStyles.wrapper}>
      <Text style={venStyles.label}>Lugar / Venue <Text style={venStyles.optional}>(opcional)</Text></Text>
      <View style={venStyles.inputRow}>
        <TextInput
          style={[venStyles.input, selectedVenue ? venStyles.inputSelected : null]}
          value={query}
          onChangeText={handleTextChange}
          placeholder="Buscar o crear venue..."
          placeholderTextColor="#4B5563"
        />
        {loading && <ActivityIndicator size="small" color="#4A827E" style={venStyles.spinner} />}
        {selectedVenue && (
          <Pressable onPress={() => { onSelect(null); setQuery(''); }} hitSlop={8}>
            <Text style={venStyles.clearBtn}>✕</Text>
          </Pressable>
        )}
      </View>

      {showResults && !selectedVenue && (
        <View style={venStyles.dropdown}>
          {results.map((v) => (
            <Pressable key={v.id} style={venStyles.dropdownItem} onPress={() => handleSelect(v)}>
              <Text style={venStyles.dropdownName}>{v.name}</Text>
              <Text style={venStyles.dropdownCity}>{v.city}</Text>
            </Pressable>
          ))}
          {query.trim() && (
            <Pressable style={venStyles.createItem} onPress={handleCreateNew}>
              <Text style={venStyles.createItemText}>{'+ Crear "'}{query.trim()}{'"'}</Text>
            </Pressable>
          )}
        </View>
      )}
    </View>
  );
}

const venStyles = StyleSheet.create({
  wrapper: { marginBottom: 16, zIndex: 10 },
  label: { fontSize: 13, fontWeight: '600', color: '#8A96A8', marginBottom: 6, letterSpacing: 0.3 },
  optional: { fontWeight: '400', color: '#5A6370' },
  inputRow: { flexDirection: 'row', alignItems: 'center', position: 'relative' },
  input: {
    flex: 1,
    backgroundColor: '#232B34',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#2E3845',
    color: '#E8ECF0',
    fontSize: 15,
    paddingHorizontal: 12,
    paddingVertical: 11,
    paddingRight: 40,
  },
  inputSelected: {
    borderColor: '#4A827E',
    backgroundColor: '#1A2A28',
  },
  spinner: { position: 'absolute', right: 10 },
  clearBtn: { position: 'absolute', right: 10, color: '#6B7685', fontSize: 15 },
  dropdown: {
    backgroundColor: '#1E2630',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#2E3845',
    marginTop: 4,
    overflow: 'hidden',
  },
  dropdownItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 11,
    borderBottomWidth: 1,
    borderBottomColor: '#2A3240',
  },
  dropdownName: { fontSize: 14, color: '#E8ECF0', fontWeight: '500' },
  dropdownCity: { fontSize: 12, color: '#6B7685' },
  createItem: { paddingHorizontal: 14, paddingVertical: 11 },
  createItemText: { fontSize: 14, color: '#4A827E', fontWeight: '600' },
});


export function CreateEventWizardScreen() {
  const navigation = useNavigation<Nav>();

  const [step, setStep] = useState(0);
  const progressAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(progressAnim, {
      toValue: step / (STEPS.length - 1),
      duration: 240,
      useNativeDriver: false,
    }).start();
  }, [step, progressAnim]);

  const [eventType, setEventType] = useState<EventType | null>(null);
  const [title, setTitle] = useState('');
  const [isPublic, setIsPublic] = useState(false);
  const [description, setDescription] = useState('');

  const [startDate, setStartDate] = useState(tomorrowStr());
  const [startTime, setStartTime] = useState('20:00');
  const [endDate, setEndDate] = useState(tomorrowStr());
  const [endTime, setEndTime] = useState('23:00');
  const [selectedVenue, setSelectedVenue] = useState<Venue | null>(null);

  const [activeNoteTab, setActiveNoteTab] = useState(0);
  const [setlistNotes, setSetlistNotes] = useState('');
  const [daysheetNotes, setDaysheetNotes] = useState('');
  const [itineraryNotes, setItineraryNotes] = useState('');

  const [members, setMembers] = useState<OrganizationMember[]>([]);
  const [selectedMemberIds, setSelectedMemberIds] = useState<Set<string>>(new Set());
  const [memberRoles, setMemberRoles] = useState<Record<string, string>>({});
  const [loadingMembers, setLoadingMembers] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (step !== 3) return;
    (async () => {
      setLoadingMembers(true);
      try {
        const orgId = await AsyncStorage.getItem(SELECTED_ORG_KEY);
        if (!orgId) return;
        const data = await getOrganizationMembers(orgId);
        setMembers(data);
      } catch { /* member load failed silently */ } finally {
        setLoadingMembers(false);
      }
    })();
  }, [step]);

  const toggleMember = (userId: string) => {
    setSelectedMemberIds((prev) => {
      const next = new Set(prev);
      if (next.has(userId)) next.delete(userId);
      else next.add(userId);
      return next;
    });
  };

  const setMemberRole = (userId: string, role: string) => {
    setMemberRoles((prev) => ({ ...prev, [userId]: role }));
  };

  const canProceed = () => {
    if (step === 0) return !!eventType && title.trim().length >= 2;
    if (step === 1) return startDate.match(/^\d{4}-\d{2}-\d{2}$/) !== null;
    return true;
  };

  const handleSubmit = async () => {
    setSubmitting(true);
    setError(null);
    try {
      const orgId = await AsyncStorage.getItem(SELECTED_ORG_KEY);
      if (!orgId) throw new Error('No hay organización seleccionada');
      if (!eventType) throw new Error('Seleccioná un tipo de evento');

      const event = await createEvent({
        orgId,
        title: title.trim(),
        type: eventType,
        startTime: toIso(startDate, startTime),
        endTime: endDate.match(/^\d{4}-\d{2}-\d{2}$/)
          ? toIso(endDate, endTime)
          : undefined,
        venueId: selectedVenue?.id,
        description: description.trim() || undefined,
        isPublic,
        setlistNotes: setlistNotes.trim() || undefined,
        daysheetNotes: daysheetNotes.trim() || undefined,
        itineraryNotes: itineraryNotes.trim() || undefined,
      });

      const rosterPromises = Array.from(selectedMemberIds).map((userId) =>
        addRosterMember(event.id, {
          userId,
          role: memberRoles[userId] || 'Músico',
        }).catch(() => { /* non-fatal */ }),
      );
      await Promise.all(rosterPromises);

      navigation.goBack();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Error al crear el evento');
    } finally {
      setSubmitting(false);
    }
  };

  const goNext = () => setStep((s) => Math.min(s + 1, STEPS.length - 1));
  const goBack = () => {
    if (step === 0) navigation.goBack();
    else setStep((s) => s - 1);
  };

  const progressWidth = progressAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0%', '100%'],
  });


  function renderStep0() {
    return (
      <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
        <Text style={styles.stepHeading}>¿Qué tipo de evento?</Text>
        <View style={styles.typeGrid}>
          {EVENT_TYPES.map((et) => {
            const selected = eventType === et.value;
            return (
              <Pressable
                key={et.value}
                style={[
                  styles.typeCard,
                  selected && { borderColor: et.color, backgroundColor: et.color + '1A' },
                ]}
                onPress={() => setEventType(et.value)}
              >
                <Text style={styles.typeIcon}>{et.icon}</Text>
                <Text style={[styles.typeLabel, selected && { color: et.color }]}>{et.label}</Text>
              </Pressable>
            );
          })}
        </View>

        <Text style={styles.fieldLabel}>Nombre del evento</Text>
        <TextInput
          style={styles.input}
          value={title}
          onChangeText={setTitle}
          placeholder="Ej: Concierto de verano"
          placeholderTextColor="#4B5563"
          autoFocus
          returnKeyType="next"
          maxLength={120}
        />

        <Text style={styles.fieldLabel}>Descripción <Text style={styles.optional}>(opcional)</Text></Text>
        <TextInput
          style={[styles.input, styles.textarea]}
          value={description}
          onChangeText={setDescription}
          placeholder="Descripción corta del evento..."
          placeholderTextColor="#4B5563"
          multiline
          numberOfLines={3}
          textAlignVertical="top"
          maxLength={500}
        />

        <View style={styles.switchRow}>
          <View>
            <Text style={styles.switchLabel}>Evento público</Text>
            <Text style={styles.switchSub}>Visible fuera de la organización</Text>
          </View>
          <Switch
            value={isPublic}
            onValueChange={setIsPublic}
            trackColor={{ true: '#4A827E', false: '#2E3845' }}
            thumbColor="#FFF"
          />
        </View>
      </ScrollView>
    );
  }

  function renderStep1() {
    return (
      <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
        <Text style={styles.stepHeading}>Fecha y lugar</Text>
        <DateTimeField
          label="Inicio"
          dateValue={startDate}
          timeValue={startTime}
          onDateChange={setStartDate}
          onTimeChange={setStartTime}
        />
        <DateTimeField
          label="Fin"
          dateValue={endDate}
          timeValue={endTime}
          onDateChange={setEndDate}
          onTimeChange={setEndTime}
          optional
        />
        <VenueSearch selectedVenue={selectedVenue} onSelect={setSelectedVenue} />
      </ScrollView>
    );
  }

  function renderStep2() {
    const NOTE_TABS = ['Setlist', 'DaySheet', 'Itinerario'];
    const noteValues = [setlistNotes, daysheetNotes, itineraryNotes];
    const noteSetters = [setSetlistNotes, setDaysheetNotes, setItineraryNotes];
    const notePlaceholders = [
      '1. Canción de apertura\n2. ...',
      'Notas de producción, rider técnico...',
      '15:00 Entrada staff\n16:00 Soundcheck...',
    ];

    return (
      <View style={{ flex: 1 }}>
        <Text style={styles.stepHeading}>Notas del evento</Text>
        <View style={styles.noteTabs}>
          {NOTE_TABS.map((tab, i) => (
            <Pressable
              key={tab}
              style={[styles.noteTab, activeNoteTab === i && styles.noteTabActive]}
              onPress={() => setActiveNoteTab(i)}
            >
              <Text
                style={[styles.noteTabText, activeNoteTab === i && styles.noteTabTextActive]}
              >
                {tab}
              </Text>
            </Pressable>
          ))}
        </View>
        <TextInput
          style={[styles.input, styles.notesArea]}
          value={noteValues[activeNoteTab]}
          onChangeText={noteSetters[activeNoteTab]}
          placeholder={notePlaceholders[activeNoteTab]}
          placeholderTextColor="#4B5563"
          multiline
          numberOfLines={12}
          textAlignVertical="top"
        />
      </View>
    );
  }

  function renderStep3() {
    return (
      <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
        <View style={styles.summaryCard}>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryIcon}>
              {EVENT_TYPES.find((t) => t.value === eventType)?.icon ?? '📅'}
            </Text>
            <View style={{ flex: 1 }}>
              <Text style={styles.summaryTitle}>{title}</Text>
              <Text style={styles.summaryMeta}>
                {EVENT_TYPES.find((t) => t.value === eventType)?.label} ·{' '}
                {startDate} {startTime}
                {selectedVenue ? ` · ${selectedVenue.name}` : ''}
              </Text>
            </View>
          </View>
        </View>

        <Text style={styles.stepHeading}>Agregar músicos</Text>

        {loadingMembers ? (
          <ActivityIndicator color="#4A827E" style={{ marginTop: 16 }} />
        ) : members.length === 0 ? (
          <Text style={styles.emptyText}>No hay miembros en la organización.</Text>
        ) : (
          members.map((m) => {
            const isSelected = selectedMemberIds.has(m.user.id);
            return (
              <View key={m.id} style={[styles.memberRow, isSelected && styles.memberRowSelected]}>
                <Pressable
                  style={styles.memberCheckArea}
                  onPress={() => toggleMember(m.user.id)}
                >
                  <View style={[styles.checkbox, isSelected && styles.checkboxChecked]}>
                    {isSelected && <Text style={styles.checkmark}>✓</Text>}
                  </View>
                  <Text style={styles.memberName}>{m.user.displayName}</Text>
                </Pressable>
                {isSelected && (
                  <TextInput
                    style={styles.roleInput}
                    value={memberRoles[m.user.id] ?? ''}
                    onChangeText={(v) => setMemberRole(m.user.id, v)}
                    placeholder="Rol (ej: Guitarra)"
                    placeholderTextColor="#4B5563"
                    returnKeyType="done"
                    maxLength={40}
                  />
                )}
              </View>
            );
          })
        )}

        {error ? <Text style={styles.errorText}>{error}</Text> : null}
      </ScrollView>
    );
  }

  return (
    <SafeAreaView style={styles.root}>
      <View style={styles.header}>
        <Pressable onPress={goBack} hitSlop={12} style={styles.backBtn}>
          <Text style={styles.backBtnText}>‹</Text>
        </Pressable>
        <View style={styles.stepMeta}>
          <Text style={styles.stepCounter}>Paso {step + 1} de {STEPS.length}</Text>
          <Text style={styles.stepName}>{STEPS[step]}</Text>
        </View>
        {step < STEPS.length - 1 ? (
          <Pressable
            onPress={goNext}
            disabled={!canProceed()}
            style={[styles.nextBtn, !canProceed() && styles.nextBtnDisabled]}
          >
            <Text style={[styles.nextBtnText, !canProceed() && styles.nextBtnTextDisabled]}>
              Siguiente ›
            </Text>
          </Pressable>
        ) : (
          <View style={styles.nextBtn} />
        )}
      </View>

      <View style={styles.progressTrack}>
        <Animated.View style={[styles.progressFill, { width: progressWidth }]} />
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={0}
      >
        <View style={styles.stepContent}>
          {step === 0 && renderStep0()}
          {step === 1 && renderStep1()}
          {step === 2 && renderStep2()}
          {step === 3 && renderStep3()}
        </View>
      </KeyboardAvoidingView>

      <View style={styles.bottomBar}>
        {step < STEPS.length - 1 ? (
          <Pressable
            style={[styles.primaryBtn, !canProceed() && styles.primaryBtnDisabled]}
            onPress={goNext}
            disabled={!canProceed()}
          >
            <Text style={styles.primaryBtnText}>Siguiente</Text>
          </Pressable>
        ) : (
          <Pressable
            style={[styles.primaryBtn, submitting && styles.primaryBtnDisabled]}
            onPress={handleSubmit}
            disabled={submitting}
          >
            {submitting ? (
              <ActivityIndicator color="#FFF" />
            ) : (
              <Text style={styles.primaryBtnText}>Crear Evento</Text>
            )}
          </Pressable>
        )}
      </View>
    </SafeAreaView>
  );
}


const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#181B1E' },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 8,
  },
  backBtn: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
  backBtnText: { fontSize: 28, color: '#8A96A8', lineHeight: 32 },
  stepMeta: { flex: 1, alignItems: 'center' },
  stepCounter: { fontSize: 12, color: '#6B7685', letterSpacing: 0.5 },
  stepName: { fontSize: 15, fontWeight: '700', color: '#E8ECF0', letterSpacing: -0.2 },
  nextBtn: { minWidth: 80, alignItems: 'flex-end' },
  nextBtnDisabled: { opacity: 0.35 },
  nextBtnText: { fontSize: 14, fontWeight: '600', color: '#4A827E' },
  nextBtnTextDisabled: { color: '#5A6370' },

  progressTrack: { height: 3, backgroundColor: '#232B34', marginHorizontal: 0 },
  progressFill: { height: 3, backgroundColor: '#4A827E', borderRadius: 2 },

  stepContent: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 8,
  },
  stepHeading: {
    fontSize: 20,
    fontWeight: '700',
    color: '#F6F8F9',
    letterSpacing: -0.4,
    marginBottom: 20,
  },

  typeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 24,
  },
  typeCard: {
    width: '47%',
    flexGrow: 1,
    backgroundColor: '#1C2430',
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: '#2E3845',
    paddingVertical: 16,
    paddingHorizontal: 12,
    alignItems: 'center',
    gap: 8,
  },
  typeIcon: { fontSize: 28 },
  typeLabel: { fontSize: 13, fontWeight: '600', color: '#8A96A8', textAlign: 'center' },

  fieldLabel: { fontSize: 13, fontWeight: '600', color: '#8A96A8', marginBottom: 6, letterSpacing: 0.3 },
  optional: { fontWeight: '400', color: '#5A6370' },
  input: {
    backgroundColor: '#232B34',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#2E3845',
    color: '#E8ECF0',
    fontSize: 15,
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginBottom: 16,
  },
  textarea: {
    minHeight: 80,
    textAlignVertical: 'top',
    paddingTop: 12,
  },
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#1C2430',
    borderRadius: 12,
    padding: 14,
    marginBottom: 16,
  },
  switchLabel: { fontSize: 14, fontWeight: '600', color: '#D0D8E4' },
  switchSub: { fontSize: 12, color: '#6B7685', marginTop: 2 },

  noteTabs: {
    flexDirection: 'row',
    backgroundColor: '#1C2430',
    borderRadius: 10,
    padding: 3,
    marginBottom: 12,
  },
  noteTab: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 8,
    alignItems: 'center',
  },
  noteTabActive: {
    backgroundColor: '#232B34',
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 1 },
    elevation: 2,
  },
  noteTabText: { fontSize: 13, fontWeight: '500', color: '#6B7685' },
  noteTabTextActive: { color: '#D0D8E4', fontWeight: '700' },
  notesArea: { flex: 1, minHeight: 200, textAlignVertical: 'top', paddingTop: 12 },

  summaryCard: {
    backgroundColor: '#1C2430',
    borderRadius: 14,
    padding: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#2E3845',
  },
  summaryRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  summaryIcon: { fontSize: 32 },
  summaryTitle: { fontSize: 16, fontWeight: '700', color: '#E8ECF0', letterSpacing: -0.2 },
  summaryMeta: { fontSize: 12, color: '#6B7685', marginTop: 3 },
  emptyText: { fontSize: 14, color: '#5A6370', textAlign: 'center', marginTop: 16 },

  memberRow: {
    backgroundColor: '#1C2430',
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#2E3845',
  },
  memberRowSelected: {
    borderColor: '#4A827E',
    backgroundColor: '#162220',
  },
  memberCheckArea: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 1.5,
    borderColor: '#4A6070',
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxChecked: { backgroundColor: '#4A827E', borderColor: '#4A827E' },
  checkmark: { color: '#FFF', fontSize: 13, fontWeight: '700' },
  memberName: { fontSize: 14, fontWeight: '500', color: '#D0D8E4' },
  roleInput: {
    marginTop: 8,
    backgroundColor: '#232B34',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#2E3845',
    color: '#E8ECF0',
    fontSize: 13,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },

  errorText: {
    color: '#E05A5A',
    fontSize: 13,
    marginTop: 8,
    textAlign: 'center',
    backgroundColor: '#2A1A1A',
    borderRadius: 8,
    padding: 10,
  },

  bottomBar: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    paddingBottom: Platform.OS === 'ios' ? 8 : 12,
    borderTopWidth: 1,
    borderTopColor: '#232B34',
  },
  primaryBtn: {
    backgroundColor: '#4A827E',
    borderRadius: 14,
    paddingVertical: 15,
    alignItems: 'center',
  },
  primaryBtnDisabled: { opacity: 0.4 },
  primaryBtnText: { fontSize: 16, fontWeight: '700', color: '#FFF', letterSpacing: -0.2 },
});
