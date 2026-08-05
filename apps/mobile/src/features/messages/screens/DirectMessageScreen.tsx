import React, { useCallback, useEffect, useRef, useState } from 'react';
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
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp, NativeStackScreenProps } from '@react-navigation/native-stack';
import { getConversation, sendMessage, getMe } from '@regieart/api';
import type { Message } from '@regieart/types';
import { useTheme } from '../../../shared/theme';
import type { ThemeColors } from '@regieart/ui';
import type { RootStackParamList } from '../../../navigation';

type Props = NativeStackScreenProps<RootStackParamList, 'DirectMessage'>;
type Nav = NativeStackNavigationProp<RootStackParamList>;

function formatTime(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });
}

export function DirectMessageScreen({ route }: Props) {
  const { userId, displayName } = route.params;
  const { theme } = useTheme();
  const navigation = useNavigation<Nav>();
  const s = makeStyles(theme);

  const [messages, setMessages] = useState<Message[]>([]);
  const [myId, setMyId] = useState<string | null>(null);
  const [text, setText] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const listRef = useRef<FlatList>(null);

  useEffect(() => {
    navigation.setOptions({ title: displayName ?? 'Message' });
  }, [navigation, displayName]);

  const loadMessages = useCallback(async () => {
    const [conv, me] = await Promise.all([
      getConversation(userId, { limit: 50 }),
      getMe(),
    ]);
    setMessages([...conv.messages].reverse());
    setMyId(me.id);
  }, [userId]);

  useEffect(() => {
    loadMessages().finally(() => setLoading(false));
  }, [loadMessages]);

  async function handleSend() {
    const trimmed = text.trim();
    if (!trimmed || sending) return;
    setSending(true);
    setText('');
    try {
      const msg = await sendMessage(userId, trimmed);
      setMessages((prev) => [...prev, msg]);
      setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 100);
    } finally {
      setSending(false);
    }
  }

  function renderMessage({ item }: { item: Message }) {
    const isMe = item.senderId === myId;
    return (
      <View style={[s.bubble, isMe ? s.bubbleMe : s.bubbleThem]}>
        <Text style={[s.bubbleText, isMe ? s.bubbleTextMe : s.bubbleTextThem]}>
          {item.content}
        </Text>
        <Text style={[s.bubbleTime, isMe ? s.bubbleTimeMe : s.bubbleTimeThem]}>
          {formatTime(item.createdAt)}
        </Text>
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
        data={messages}
        keyExtractor={(item) => item.id}
        renderItem={renderMessage}
        contentContainerStyle={s.listContent}
        onContentSizeChange={() => listRef.current?.scrollToEnd({ animated: false })}
        ListEmptyComponent={
          <View style={s.emptyState}>
            <Text style={s.emptyTitle}>Start the conversation</Text>
          </View>
        }
      />

      <SafeAreaView edges={['bottom']} style={s.inputBar}>
        <TextInput
          style={s.input}
          placeholder="Write a message..."
          placeholderTextColor={theme.textMuted}
          value={text}
          onChangeText={setText}
          multiline
          returnKeyType="send"
          blurOnSubmit
          onSubmitEditing={handleSend}
        />
        <Pressable
          style={({ pressed }) => [s.sendBtn, pressed && s.sendBtnPressed, !text.trim() && s.sendBtnDisabled]}
          onPress={handleSend}
          disabled={!text.trim() || sending}
          accessibilityLabel="Send"
        >
          {sending ? (
            <ActivityIndicator color="#fff" size="small" />
          ) : (
            <Text style={s.sendIcon}>↑</Text>
          )}
        </Pressable>
      </SafeAreaView>
    </KeyboardAvoidingView>
  );
}

function makeStyles(theme: ThemeColors) {
  return StyleSheet.create({
    root: { flex: 1, backgroundColor: theme.surfaceApp },
    center: { alignItems: 'center', justifyContent: 'center' },
    listContent: { paddingHorizontal: 16, paddingVertical: 12, paddingBottom: 8, gap: 6 },
    bubble: {
      maxWidth: '78%',
      borderRadius: 16,
      paddingHorizontal: 14,
      paddingVertical: 10,
    },
    bubbleMe: {
      alignSelf: 'flex-end',
      backgroundColor: theme.actionBrand,
      borderBottomRightRadius: 4,
    },
    bubbleThem: {
      alignSelf: 'flex-start',
      backgroundColor: theme.surfaceCard,
      borderBottomLeftRadius: 4,
    },
    bubbleText: { fontSize: 15, lineHeight: 22 },
    bubbleTextMe: { color: '#FFFFFF' },
    bubbleTextThem: { color: theme.textHeading },
    bubbleTime: { fontSize: 10, marginTop: 4 },
    bubbleTimeMe: { color: 'rgba(255,255,255,0.6)', textAlign: 'right' },
    bubbleTimeThem: { color: theme.textMuted },
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
      backgroundColor: theme.surfaceRaised,
      borderRadius: 20,
      paddingHorizontal: 16,
      paddingVertical: 10,
      fontSize: 15,
      color: theme.textHeading,
      maxHeight: 120,
    },
    sendBtn: {
      width: 40,
      height: 40,
      borderRadius: 20,
      backgroundColor: theme.actionBrand,
      alignItems: 'center',
      justifyContent: 'center',
    },
    sendBtnPressed: { backgroundColor: theme.actionBrandDim },
    sendBtnDisabled: { opacity: 0.4 },
    sendIcon: { fontSize: 18, color: '#fff', fontWeight: '700' },
    emptyState: { alignItems: 'center', paddingTop: 60 },
    emptyTitle: { fontSize: 15, color: theme.textSecondary },
  });
}

