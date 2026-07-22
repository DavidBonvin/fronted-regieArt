export type MessageType = 'text' | 'image' | 'file' | 'system';
export type ChannelType = 'group' | 'direct';

export interface MessageAttachment {
  fileUrl: string;
  fileKey: string;
  fileName: string;
  mimeType: string;
  sizeBytes: number;
}

export interface Message {
  id: string;
  content: string;
  type: MessageType;
  senderId: string;
  channelId: string;
  sentAt: string;
  editedAt?: string;
  readBy: string[];
  attachment?: MessageAttachment;
}

export interface Channel {
  id: string;
  name: string;
  type: ChannelType;
  organizationId: string;
  memberIds: string[];
  lastMessage?: Message;
  unreadCount: number;
  createdAt: string;
}

export interface MessageSendRequest {
  content: string;
  type: MessageType;
  channelId: string;
  attachment?: Omit<MessageAttachment, 'fileUrl'>;
}

export interface Notification {
  id: string;
  userId: string;
  title: string;
  body: string;
  read: boolean;
  createdAt: string;
  link?: string;
  metadata?: Record<string, string>;
}
