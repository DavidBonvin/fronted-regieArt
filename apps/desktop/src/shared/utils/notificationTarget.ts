import type { Notification } from '@regieart/types';

// Metadata keys are not stable across notification producers, so probe aliases.
function pick(meta: Record<string, string> | undefined, ...keys: string[]): string | undefined {
  if (!meta) return undefined;
  for (const key of keys) {
    if (meta[key]) return meta[key];
  }
  return undefined;
}

export function getInvitationToken(n: Notification): string | undefined {
  const meta = n.metadata;
  const direct = pick(meta, 'invitationToken', 'inviteToken', 'invitation_token', 'invite_token', 'token');
  if (direct) return direct;

  const url = pick(meta, 'invitationUrl', 'inviteUrl', 'url');
  const match = url?.match(/\/invitations\/([^/?#]+)/);
  return match?.[1];
}

/** Where clicking a notification should take the user. `null` when there is nowhere useful to go. */
export function notificationTarget(n: Notification): string | null {
  const meta = n.metadata;

  const invitationToken = getInvitationToken(n);
  if (invitationToken) return `/invitations/${invitationToken}`;

  const orgId = pick(meta, 'orgId', 'organizationId');

  switch (n.type) {
    case 'MESSAGE_RECEIVED': {
      const senderId = pick(meta, 'senderId', 'fromUserId', 'userId', 'authorId');
      return senderId ? `/messages/direct/${senderId}` : '/messages';
    }
    case 'EVENT_ASSIGNED': {
      const eventId = pick(meta, 'eventId', 'id');
      return eventId ? `/events/${eventId}` : '/timeline';
    }
    case 'EXPENSE_APPROVED':
    case 'EXPENSE_REJECTED': {
      const daysheetId = pick(meta, 'daysheetId', 'dayId');
      return daysheetId ? `/finance/${daysheetId}/expenses` : '/finance';
    }
    case 'INSTRUMENT_ASSIGNED':
      return '/backline';
    case 'INVITE_ACCEPTED':
      return orgId ? `/organization/${orgId}/members` : '/band';
    case 'ROLE_CHANGED':
      return orgId ? `/organization/${orgId}` : '/band';
    default:
      return null;
  }
}
