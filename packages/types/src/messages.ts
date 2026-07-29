export interface Message {
  id: string;
  senderId: string;
  recipientId: string;
  content: string;
  isRead: boolean;
  readAt?: string;
  createdAt: string;
  sender?: {
    id: string;
    displayName: string;
    avatarUrl: string | null;
  };
}

export interface Conversation {
  userId: string;
  user: {
    id: string;
    displayName: string;
    avatarUrl: string | null;
  };
  lastMessage?: Message;
  unreadCount: number;
}

export interface MessageAttachment {
  fileUrl: string;
  fileKey: string;
  fileName: string;
  mimeType: string;
  sizeBytes: number;
}


