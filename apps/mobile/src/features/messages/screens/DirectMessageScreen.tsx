import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  Pressable,
  FlatList,
  TextInput,
  StyleSheet,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  AppState,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp, NativeStackScreenProps } from '@react-navigation/native-stack';
import { useTranslation } from 'react-i18next';
import { getConversation, sendMessage, getMe } from '@regieart/api';
import type { Message } from '@regieart/types';
import { useTheme } from '../../../shared/theme';
import type { ThemeColors } from '@regieart/ui';
import type { RootStackParamList } from '../../../navigation';

type Props = NativeStackScreenProps<RootStackParamList, 'DirectMessage'>;
type Nav = NativeStackNavigationProp<RootStackParamList>;

const POLL_MS = 5_000;
const GROUP_WINDOW_MS = 5 * 60_000;

type Row = {
  message: Message;
  mine: boolean;
  dayLabel: string | null;
  startsGroup: boolean;
  endsGroup: boolean;
  pending: boolean;
};

function initialsOf(name: string): string {
  return name.split(' ').slice(0, 2).map((w) => w[0]?.toUpperCase() ?? '').join('') || '?';
}

function sortByDate(messages: Message[]): Message[] {
  return [...messages].sort(
    (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
  );
}

function isSameDay(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear()
    && a.getMonth() === b.getMonth()
    && a.getDate() === b.getDate();
}

function clockTime(iso: string): string {
  return new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });
}

export function DirectMessageScreen({ route }: Props) {
  const { userId, displayName } = route.params;
  const { theme } = useTheme();
  const { t } = useTranslation();
  const navigation = useNavigation<Nav>();
  const s = makeStyles(theme);

  const [messages, setMessages] = useState<Message[]>([]);
  const [pending, setPending] = useState<Message[]>([]);
  const [myId, setMyId] = useState<string | null>(null);
  const [text, setText] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const listRef = useRef<FlatList<Row>>(null);

  useEffect(() => {
    navigation.setOptions({ title: displayName ?? 'Message' });
  }, [navigation, displayName]);

  const loadMessages = useCallback(async () => {
    const conv = await getConversation(userId, { limit: 100 });
    setMessages(sortByDate(conv.messages));
  }, [userId]);

  useEffect(() => {
    Promise.all([getMe(), loadMessages()])
      .then(([me]) => setMyId(me.id))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [loadMessages]);

  useEffect(() => {
    const timer = setInterval(() => {
      if (AppState.currentState !== 'active') return;
      loadMessages().catch(() => {});
    }, POLL_MS);
    return () => clearInterval(timer);
  }, [loadMessages]);

  const rows: Row[] = useMemo(() => {
    const all = [...messages, ...pending];
    return all.map((message, i) => {
      const prev = all[i - 1];
      const next = all[i + 1];
      const at = new Date(message.createdAt).getTime();
      const newDay = !prev || !isSameDay(new Date(prev.createdAt), new Date(message.createdAt));

      let label: string | null = null;
      if (newDay) {
        const date = new Date(message.createdAt);
        const today = new Date();
        const yesterday = new Date();
        yesterday.setDate(today.getDate() - 1);
        label = isSameDay(date, today)
          ? t('messages.today')
          : isSameDay(date, yesterday)
            ? t('messages.yesterday')
            : date.toLocaleDateString(undefined, { weekday: 'long', day: 'numeric', month: 'long' });
      }

      return {
        message,
        mine: message.senderId === myId,
        dayLabel: label,
        startsGroup: newDay || !prev || prev.senderId !== message.senderId
          || at - new Date(prev.createdAt).getTime() > GROUP_WINDOW_MS,
        endsGroup: !next || next.senderId !== message.senderId
          || !isSameDay(new Date(next.createdAt), new Date(message.createdAt))
          || new Date(next.createdAt).getTime() - at > GROUP_WINDOW_MS,
        pending: message.id.startsWith('pending-'),
      };
    });
  }, [messages, pending, myId, t]);

  async function handleSend() {
    const body = text.trim();
    if (!body || sending || !myId) return;

    const draft: Message = {
      id: `pending-${Date.now()}`,
      senderId: myId,
      recipientId: userId,
      content: body,
      isRead: false,
      createdAt: new Date().toISOString(),
    };

    setSending(true);
    setText('');
    setPending((prev) => [...prev, draft]);

    try {
      const saved = await sendMessage(userId, body);
      setMessages((prev) => sortByDate([...prev, saved]));
      setPending((prev) => prev.filter((m) => m.id !== draft.id));
    } catch {
      setPending((prev) => prev.filter((m) => m.id !== draft.id));
      setText(body);
    } finally {
      setSending(false);
    }
  }

  function renderRow({ item }: { item: Row }) {
    const { message, mine, endsGroup, startsGroup } = item;
    return (
      <View>
        {item.dayLabel && (
          <View style={s.daySepWrap}>
            <Text style={s.daySep}>{item.dayLabel}</Text>
          </View>
        )}
        <View style={[s.msgRow, mine && s.msgRowMine, startsGroup && !item.dayLabel && s.groupGap]}>
          {!mine && (endsGroup ? (
            <View style={s.avatarSm}>
              <Text style={s.avatarSmText}>{initialsOf(displayName ?? '?')}</Text>
            </View>
          ) : <View style={s.avatarSpacer} />)}

          <View
            style={[
              s.bubble,
              mine ? s.bubbleMine : s.bubbleTheirs,
              endsGroup && (mine ? s.bubbleTailMine : s.bubbleTail),
              item.pending && s.bubblePending,
            ]}
          >
            <Text style={[s.bubbleText, mine && s.bubbleTextMine]}>{message.content}</Text>
            <View style={s.msgMeta}>
              <Text style={[s.msgTime, mine && s.msgTimeMine]}>
                {item.pending ? t('messages.sending') : clockTime(message.createdAt)}
              </Text>
              {mine && !item.pending && (
                <Text style={[s.msgTime, s.msgTimeMine]}>{message.isRead ? '✓✓' : '✓'}</Text>
              )}
            </View>
          </View>
        </View>
      </View>
    );
  }

  if (loading) {
    return (
      <View style={[s.root, s.center]}>
        <ActivityIndicator color={theme.actionBrand} size="large" />
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={s.root}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={90}
    >
      <FlatList
        ref={listRef}
        data={rows}
        keyExtractor={(item) => item.message.id}
        renderItem={renderRow}
        contentContainerStyle={rows.length === 0 ? s.listEmpty : s.listContent}
        onContentSizeChange={() => listRef.current?.scrollToEnd({ animated: false })}
        ListEmptyComponent={
          <View style={s.emptyState}>
            <Text style={s.emptyIcon}>💬</Text>
            <Text style={s.emptyTitle}>{t('messages.start_conversation')}</Text>
            <Text style={s.emptyHint}>
              {t('messages.start_conversation_hint', { name: displayName ?? '' })}
            </Text>
          </View>
        }
      />

      <SafeAreaView edges={['bottom']} style={s.inputBar}>
        <TextInput
          style={s.input}
          placeholder={t('messages.input_placeholder')}
          placeholderTextColor={theme.inputPlaceholder}
          value={text}
          onChangeText={setText}
          maxLength={2000}
          multiline
        />
        <Pressable
          style={({ pressed }) => [
            s.sendBtn,
            pressed && s.sendBtnPressed,
            (!text.trim() || sending) && s.sendBtnDisabled,
          ]}
          onPress={handleSend}
          disabled={!text.trim() || sending}
          accessibilityLabel={t('messages.send_btn')}
        >
          {sending
            ? <ActivityIndicator color="#fff" size="small" />
            : <Text style={s.sendIcon}>↑</Text>}
        </Pressable>
      </SafeAreaView>
    </KeyboardAvoidingView>
  );
}

function makeStyles(theme: ThemeColors) {
  return StyleSheet.create({
    root: { flex: 1, backgroundColor: theme.surfaceApp },
    center: { alignItems: 'center', justifyContent: 'center' },
    listContent: { paddingHorizontal: 14, paddingVertical: 12, paddingBottom: 8 },
    listEmpty: { flexGrow: 1 },

    daySepWrap: { alignItems: 'center', marginTop: 16, marginBottom: 10 },
    daySep: {
      paddingHorizontal: 12,
      paddingVertical: 4,
      borderRadius: 999,
      backgroundColor: theme.surfaceRaised,
      color: theme.textSecondary,
      fontSize: 11,
      fontWeight: '600',
      overflow: 'hidden',
    },

    msgRow: { flexDirection: 'row', alignItems: 'flex-end', gap: 8, marginTop: 2 },
    msgRowMine: { flexDirection: 'row-reverse' },
    groupGap: { marginTop: 10 },
    avatarSpacer: { width: 28 },
    avatarSm: {
      width: 28,
      height: 28,
      borderRadius: 14,
      backgroundColor: theme.actionBrand,
      alignItems: 'center',
      justifyContent: 'center',
    },
    avatarSmText: { fontSize: 10, fontWeight: '700', color: '#fff' },

    bubble: {
      maxWidth: '78%',
      borderRadius: 16,
      paddingHorizontal: 13,
      paddingTop: 9,
      paddingBottom: 7,
    },
    bubbleTheirs: { backgroundColor: theme.surfaceCard, borderWidth: 1, borderColor: theme.borderSubtle },
    bubbleMine: { backgroundColor: theme.actionBrand },
    bubbleTail: { borderBottomLeftRadius: 5 },
    bubbleTailMine: { borderBottomRightRadius: 5 },
    bubblePending: { opacity: 0.6 },
    bubbleText: { fontSize: 15, lineHeight: 21, color: theme.textBody },
    bubbleTextMine: { color: '#fff' },

    msgMeta: { flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end', gap: 4, marginTop: 3 },
    msgTime: { fontSize: 10, color: theme.textMuted },
    msgTimeMine: { color: 'rgba(255,255,255,0.72)' },

    emptyState: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 6, padding: 32 },
    emptyIcon: { fontSize: 40, opacity: 0.3 },
    emptyTitle: { fontSize: 15, fontWeight: '600', color: theme.textBody, marginTop: 4 },
    emptyHint: { fontSize: 13, color: theme.textMuted, textAlign: 'center', lineHeight: 19 },

    inputBar: {
      flexDirection: 'row',
      alignItems: 'flex-end',
      paddingHorizontal: 12,
      paddingVertical: 10,
      borderTopWidth: 1,
      borderTopColor: theme.borderSubtle,
      backgroundColor: theme.surfaceCard,
      gap: 10,
    },
    input: {
      flex: 1,
      minHeight: 42,
      maxHeight: 120,
      backgroundColor: theme.inputBackground,
      borderWidth: 1,
      borderColor: theme.inputBorder,
      borderRadius: 20,
      paddingHorizontal: 16,
      paddingTop: 11,
      paddingBottom: 11,
      fontSize: 15,
      color: theme.inputText,
    },
    sendBtn: {
      width: 42,
      height: 42,
      borderRadius: 21,
      backgroundColor: theme.actionBrand,
      alignItems: 'center',
      justifyContent: 'center',
    },
    sendBtnPressed: { backgroundColor: theme.actionBrandDim },
    sendBtnDisabled: { opacity: 0.4 },
    sendIcon: { fontSize: 18, color: '#fff', fontWeight: '700' },
  });
}
