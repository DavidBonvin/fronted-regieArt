import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  getMe, getMyOrganizations, getOrganizationMembers, getUserById,
  listConversations, getConversation, sendMessage,
} from '@regieart/api';
import type { Conversation, Message, OrganizationMember } from '@regieart/types';
import { getActiveOrganization } from '../../../shared/utils/activeOrganization';
import { useActiveOrganizationId } from '../../../shared/utils/useActiveOrganizationId';
import p from '../../../shared/layout/page.module.scss';
import s from './MessagesPage.module.scss';

const ROLE_LABEL: Record<string, string> = {
  OWNER: 'Propriétaire', ADMIN: 'Administrateur', MEMBER: 'Membre', EXTERNAL_TECH: 'Technicien externe',
};

const THREAD_POLL_MS = 5_000;
const LIST_POLL_MS = 20_000;
const GROUP_WINDOW_MS = 5 * 60_000;

type Peer = { id: string; displayName: string; avatarUrl: string | null };

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

function dayLabel(iso: string): string {
  const date = new Date(iso);
  const today = new Date();
  const yesterday = new Date();
  yesterday.setDate(today.getDate() - 1);
  if (isSameDay(date, today)) return "Aujourd'hui";
  if (isSameDay(date, yesterday)) return 'Hier';
  return date.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' });
}

function clockTime(iso: string): string {
  return new Date(iso).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
}

function timeAgo(iso: string): string {
  const minutes = Math.floor((Date.now() - new Date(iso).getTime()) / 60_000);
  if (minutes < 1) return "à l'instant";
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} h`;
  const days = Math.floor(hours / 24);
  if (days === 1) return 'hier';
  if (days < 7) return `${days} j`;
  return new Date(iso).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' });
}

function Avatar({ name, small }: { name: string; small?: boolean }) {
  return <span className={small ? s.avatarSm : s.avatar}>{initialsOf(name)}</span>;
}

export function MessagesPage() {
  const { userId } = useParams<{ userId: string }>();
  const navigate = useNavigate();
  const activeOrgId = useActiveOrganizationId();

  const [myId, setMyId] = useState('');
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [members, setMembers] = useState<OrganizationMember[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [pending, setPending] = useState<Message[]>([]);
  const [fetchedPeer, setFetchedPeer] = useState<Peer | null>(null);

  const [search, setSearch] = useState('');
  const [showMembers, setShowMembers] = useState(false);
  const [text, setText] = useState('');
  const [loadingList, setLoadingList] = useState(true);
  const [loadingThread, setLoadingThread] = useState(false);
  const [sending, setSending] = useState(false);

  const feedRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const stickToBottom = useRef(true);

  const refreshConversations = useCallback(async () => {
    const convs = await listConversations().catch(() => null);
    if (convs) setConversations(convs);
  }, []);

  useEffect(() => {
    Promise.all([getMe(), listConversations().catch(() => [] as Conversation[])])
      .then(([me, convs]) => { setMyId(me.id); setConversations(convs); })
      .finally(() => setLoadingList(false));
  }, []);

  useEffect(() => {
    getMyOrganizations()
      .then((orgs) => {
        const orgId = getActiveOrganization(orgs)?.id;
        return orgId ? getOrganizationMembers(orgId) : [];
      })
      .then(setMembers)
      .catch(() => setMembers([]));
  }, [activeOrgId]);

  useEffect(() => {
    const timer = setInterval(() => {
      if (!document.hidden) void refreshConversations();
    }, LIST_POLL_MS);
    return () => clearInterval(timer);
  }, [refreshConversations]);

  // ── Active thread ───────────────────────────────────────────────
  useEffect(() => {
    if (!userId) { setMessages([]); setPending([]); return; }
    let cancelled = false;
    setLoadingThread(true);
    setPending([]);
    stickToBottom.current = true;
    getConversation(userId, { limit: 100 })
      .then((conv) => { if (!cancelled) setMessages(sortByDate(conv.messages)); })
      .catch(() => { if (!cancelled) setMessages([]); })
      .finally(() => { if (!cancelled) setLoadingThread(false); });
    return () => { cancelled = true; };
  }, [userId]);

  useEffect(() => {
    if (!userId) return;
    const timer = setInterval(() => {
      if (document.hidden) return;
      getConversation(userId, { limit: 100 })
        .then((conv) => setMessages(sortByDate(conv.messages)))
        .catch(() => {});
    }, THREAD_POLL_MS);
    return () => clearInterval(timer);
  }, [userId]);

  // Opening a thread clears its unread badge on the server side too.
  useEffect(() => {
    if (!userId) return;
    setConversations((prev) => prev.map(
      (c) => c.userId === userId ? { ...c, unreadCount: 0 } : c,
    ));
  }, [userId, messages.length]);

  const peer: Peer | null = useMemo(() => {
    if (!userId) return null;
    const fromConv = conversations.find((c) => c.userId === userId)?.user;
    if (fromConv) return fromConv;
    const fromMember = members.find((m) => m.user.id === userId)?.user;
    if (fromMember) {
      return { id: fromMember.id, displayName: fromMember.displayName, avatarUrl: fromMember.avatarUrl };
    }
    return fetchedPeer?.id === userId ? fetchedPeer : null;
  }, [userId, conversations, members, fetchedPeer]);

  useEffect(() => {
    if (!userId || peer) return;
    let cancelled = false;
    getUserById(userId)
      .then((u) => {
        if (!cancelled) setFetchedPeer({ id: u.id, displayName: u.displayName, avatarUrl: u.avatarUrl });
      })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [userId, peer]);

  const peerRole = useMemo(
    () => members.find((m) => m.user.id === userId)?.role,
    [members, userId],
  );

  // ── Scrolling ───────────────────────────────────────────────────
  const timeline = useMemo(() => [...messages, ...pending], [messages, pending]);

  function handleFeedScroll() {
    const el = feedRef.current;
    if (!el) return;
    stickToBottom.current = el.scrollHeight - el.scrollTop - el.clientHeight < 120;
  }

  useEffect(() => {
    const el = feedRef.current;
    if (!el || !stickToBottom.current) return;
    el.scrollTop = el.scrollHeight;
  }, [timeline]);

  // ── Sending ─────────────────────────────────────────────────────
  async function handleSend() {
    const body = text.trim();
    if (!userId || !body || sending) return;

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
    stickToBottom.current = true;
    if (inputRef.current) inputRef.current.style.height = 'auto';

    try {
      const saved = await sendMessage(userId, body);
      setMessages((prev) => sortByDate([...prev, saved]));
      setPending((prev) => prev.filter((m) => m.id !== draft.id));
      void refreshConversations();
    } catch {
      setPending((prev) => prev.filter((m) => m.id !== draft.id));
      setText(body);
    } finally {
      setSending(false);
      inputRef.current?.focus();
    }
  }

  function handleComposerInput(e: React.ChangeEvent<HTMLTextAreaElement>) {
    setText(e.target.value);
    const el = e.target;
    el.style.height = 'auto';
    el.style.height = `${Math.min(el.scrollHeight, 140)}px`;
  }

  function openConversation(id: string) {
    setShowMembers(false);
    setSearch('');
    navigate(`/messages/direct/${id}`);
  }

  // ── Sidebar data ────────────────────────────────────────────────
  const query = search.trim().toLowerCase();

  const visibleConversations = useMemo(
    () => conversations.filter((c) => c.user.displayName.toLowerCase().includes(query)),
    [conversations, query],
  );

  const visibleMembers = useMemo(
    () => members
      .filter((m) => m.user.id !== myId)
      .filter((m) => m.user.displayName.toLowerCase().includes(query)),
    [members, myId, query],
  );

  const showMemberList = showMembers || (!loadingList && conversations.length === 0);
  const threadOpen = Boolean(userId);

  return (
    <div className={s.root}>
      <aside className={`${s.sidebar} ${threadOpen ? s.paneHidden : ''}`}>
        <div className={s.sidebarHead}>
          <h1 className={s.sidebarTitle}>Messages</h1>
          <button
            className={showMembers ? s.newChatBtnActive : s.newChatBtn}
            onClick={() => setShowMembers((v) => !v)}
            aria-pressed={showMembers}
            title="Nouvelle conversation"
          >
            {showMembers ? '✕' : '✎'}
          </button>
        </div>

        <div className={s.searchWrap}>
          <span className={s.searchIcon} aria-hidden>🔍</span>
          <input
            className={s.search}
            placeholder={showMemberList ? 'Rechercher un membre…' : 'Rechercher une conversation…'}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            aria-label="Rechercher"
          />
        </div>

        {loadingList ? (
          <div className={p.spinner} />
        ) : showMemberList ? (
          <>
            <div className={s.listLabel}>Membres du groupe</div>
            <div className={s.list}>
              {visibleMembers.length === 0 ? (
                <div className={s.sidebarEmpty}>
                  Aucun membre à afficher. Invitez votre groupe depuis la page Organisation.
                </div>
              ) : visibleMembers.map((m) => (
                <button key={m.id} className={s.convRow} onClick={() => openConversation(m.user.id)}>
                  <Avatar name={m.user.displayName} />
                  <span className={s.convBody}>
                    <span className={s.convName}>{m.user.displayName}</span>
                    <span className={s.convRole}>{ROLE_LABEL[m.role] ?? m.role}</span>
                  </span>
                </button>
              ))}
            </div>
          </>
        ) : (
          <div className={s.list}>
            {visibleConversations.length === 0 ? (
              <div className={s.sidebarEmpty}>Aucune conversation ne correspond à votre recherche.</div>
            ) : visibleConversations.map((c) => (
              <button
                key={c.userId}
                className={c.userId === userId ? s.convRowActive : s.convRow}
                onClick={() => openConversation(c.userId)}
              >
                <Avatar name={c.user.displayName} />
                <span className={s.convBody}>
                  <span className={s.convTop}>
                    <span className={s.convName}>{c.user.displayName}</span>
                    {c.lastMessage && <span className={s.convTime}>{timeAgo(c.lastMessage.createdAt)}</span>}
                  </span>
                  <span className={c.unreadCount > 0 ? s.convPreviewUnread : s.convPreview}>
                    {c.lastMessage
                      ? `${c.lastMessage.senderId === myId ? 'Vous : ' : ''}${c.lastMessage.content}`
                      : 'Aucun message'}
                  </span>
                </span>
                {c.unreadCount > 0 && (
                  <span className={s.convBadge}>{c.unreadCount > 9 ? '9+' : c.unreadCount}</span>
                )}
              </button>
            ))}
          </div>
        )}
      </aside>

      {!threadOpen ? (
        <section className={`${s.noSelection} ${s.paneHidden}`}>
          <span className={s.noSelectionIcon} aria-hidden>✉</span>
          <span className={s.noSelectionTitle}>Choisissez une conversation</span>
          <span className={s.noSelectionHint}>
            Sélectionnez un membre du groupe pour coordonner les répétitions, les départs et la logistique.
          </span>
        </section>
      ) : (
        <section className={s.thread}>
          <header className={s.threadHead}>
            <button className={s.backBtn} onClick={() => navigate('/messages')} aria-label="Retour">‹</button>
            <Avatar name={peer?.displayName ?? '?'} small />
            <span className={s.threadPeer}>
              <span className={s.threadName}>{peer?.displayName ?? 'Conversation'}</span>
              {peerRole && <span className={s.threadMeta}>{ROLE_LABEL[peerRole] ?? peerRole}</span>}
            </span>
            <button className={s.threadAction} onClick={() => navigate(`/profile/${userId}`)}>
              Voir le profil
            </button>
          </header>

          {loadingThread ? (
            <div className={s.centered}><div className={p.spinner} /></div>
          ) : timeline.length === 0 ? (
            <div className={s.threadEmpty}>
              <span className={s.threadEmptyIcon} aria-hidden>💬</span>
              <span className={s.threadEmptyTitle}>Démarrez la conversation</span>
              <span className={s.threadEmptyHint}>
                Envoyez le premier message à {peer?.displayName ?? 'ce membre'}.
              </span>
            </div>
          ) : (
            <div className={s.feed} ref={feedRef} onScroll={handleFeedScroll}>
              {timeline.map((m, i) => {
                const mine = m.senderId === myId;
                const prev = timeline[i - 1];
                const next = timeline[i + 1];
                const newDay = !prev || !isSameDay(new Date(prev.createdAt), new Date(m.createdAt));
                const startsGroup = newDay || !prev || prev.senderId !== m.senderId
                  || new Date(m.createdAt).getTime() - new Date(prev.createdAt).getTime() > GROUP_WINDOW_MS;
                const endsGroup = !next || next.senderId !== m.senderId
                  || !isSameDay(new Date(next.createdAt), new Date(m.createdAt))
                  || new Date(next.createdAt).getTime() - new Date(m.createdAt).getTime() > GROUP_WINDOW_MS;
                const isPending = m.id.startsWith('pending-');

                return (
                  <React.Fragment key={m.id}>
                    {newDay && <div className={s.daySep}>{dayLabel(m.createdAt)}</div>}
                    {startsGroup && !newDay && <div className={s.groupGap} />}
                    <div className={mine ? s.msgRowMine : s.msgRow}>
                      {!mine && (endsGroup
                        ? <Avatar name={peer?.displayName ?? '?'} small />
                        : <span className={s.avatarSpacer} />
                      )}
                      <div
                        className={[
                          mine ? s.bubbleMine : s.bubble,
                          endsGroup ? (mine ? s.bubbleTailMine : s.bubbleTail) : '',
                          isPending ? s.bubblePending : '',
                        ].filter(Boolean).join(' ')}
                      >
                        {m.content}
                        <span className={mine ? s.msgMetaMine : s.msgMeta}>
                          {isPending ? 'envoi…' : clockTime(m.createdAt)}
                          {mine && !isPending && (
                            <span className={s.readMark} title={m.isRead ? 'Lu' : 'Envoyé'}>
                              {m.isRead ? '✓✓' : '✓'}
                            </span>
                          )}
                        </span>
                      </div>
                    </div>
                  </React.Fragment>
                );
              })}
            </div>
          )}

          <div className={s.composer}>
            <textarea
              ref={inputRef}
              className={s.composerInput}
              placeholder="Écrire un message…"
              rows={1}
              maxLength={2000}
              value={text}
              onChange={handleComposerInput}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  void handleSend();
                }
              }}
              aria-label="Écrire un message"
            />
            <button
              className={s.sendBtn}
              onClick={() => void handleSend()}
              disabled={sending || !text.trim()}
              aria-label="Envoyer"
            >
              ↑
            </button>
          </div>
          <div className={s.composerHint}>Entrée pour envoyer · Maj + Entrée pour un saut de ligne</div>
        </section>
      )}
    </div>
  );
}
