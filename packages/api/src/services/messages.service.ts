import type { Message, Conversation } from '@regieart/types';
import { getHttpClient } from '../client/httpClient';
import type { ApiRes } from '../client/types';

export async function sendMessage(recipientId: string, content: string): Promise<Message> {
  const res = await getHttpClient()
    .post('messages', { json: { recipientId, content } })
    .json<ApiRes<Message>>();
  return res.data;
}

export async function listConversations(): Promise<Conversation[]> {
  const res = await getHttpClient().get('messages/conversations').json<ApiRes<Conversation[]>>();
  return res.data;
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
    .json<ApiRes<{ messages: Message[]; total: number; page: number; limit: number }>>();
  return res.data;
}

export async function markMessageRead(messageId: string): Promise<Message> {
  const res = await getHttpClient()
    .patch(`messages/${messageId}/read`)
    .json<ApiRes<Message>>();
  return res.data;
}
