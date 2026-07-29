export type NotificationType =
  | 'EVENT_ASSIGNED'
  | 'EXPENSE_APPROVED'
  | 'EXPENSE_REJECTED'
  | 'INSTRUMENT_ASSIGNED'
  | 'INVITE_ACCEPTED'
  | 'ROLE_CHANGED'
  | 'MESSAGE_RECEIVED';

export interface Notification {
  id: string;
  userId: string;
  type: NotificationType;
  title: string;
  body?: string;
  isRead: boolean;
  createdAt: string;
  metadata?: Record<string, string>;
}
