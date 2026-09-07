import type { Message, Conversation } from '@regieart/types';
import { getHttpClient } from '../client/httpClient';
import type { ApiRes } from '../client/types';

// The API names the message text `body`; the rest of the codebase reads `content`.
type RawMessage = Omit<Message, 'content'> & { content?: string; body?: string };

function normalizeMessage(raw: RawMessage): Message {
  const { body, ...rest } = raw;
  return { ...rest, content: raw.content ?? body ?? '' };
}

type ConversationPeer = { id: string; displayName: string; avatarUrl: string | null };

// The API has not settled on a name for the other participant, and older rows
// can come back without one at all.
type RawConversation = {
  userId?: string;
  otherUserId?: string;
  user?: Partial<ConversationPeer>;
  otherUser?: Partial<ConversationPeer>;
  participant?: Partial<ConversationPeer>;
  recipient?: Partial<ConversationPeer>;
  lastMessage?: RawMessage;
  unreadCount?: number;
};

function normalizeConversation(raw: RawConversation): Conversation | null {
  const peer = raw.user ?? raw.otherUser ?? raw.participant ?? raw.recipient;
  const userId = raw.userId ?? raw.otherUserId ?? peer?.id;
  if (!userId) return null;

  return {
    userId,
    user: {
      id: peer?.id ?? userId,
      displayName: peer?.displayName ?? 'Utilisateur',
      avatarUrl: peer?.avatarUrl ?? null,
    },
    lastMessage: raw.lastMessage ? normalizeMessage(raw.lastMessage) : undefined,
    unreadCount: raw.unreadCount ?? 0,
  };
}

export async function sendMessage(recipientId: string, content: string): Promise<Message> {
  const res = await getHttpClient()
    .post('messages', { json: { recipientId, body: content } })
    .json<ApiRes<RawMessage>>();
  return normalizeMessage(res.data);
}

export async function listConversations(): Promise<Conversation[]> {
  const res = await getHttpClient()
    .get('messages/conversations')
    .json<ApiRes<RawConversation[]>>();
  return res.data.map(normalizeConversation).filter((c): c is Conversation => c !== null);
}

export async function getConversation(
  userId: string,
  params?: { page?: number; limit?: number },
): Promise<{
  messages: Message[];
  total: number;
  page: number;
  limit: number;
}> {
  const res = await getHttpClient()
    .get(`messages/conversations/${userId}`, {
      searchParams: (params ?? {}) as Record<string, number>,
    })
    .json<ApiRes<{ messages: RawMessage[]; total: number; page: number; limit: number }>>();
  return { ...res.data, messages: res.data.messages.map(normalizeMessage) };
}

export async function markMessageRead(messageId: string): Promise<Message> {
  const res = await getHttpClient()
    .patch(`messages/${messageId}/read`)
    .json<ApiRes<RawMessage>>();
  return normalizeMessage(res.data);
}
