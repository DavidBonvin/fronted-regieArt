import React, { useEffect, useState, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { getConversation, sendMessage, getMe } from '@regieart/api';
import type { Message } from '@regieart/types';
import p from '../../../shared/layout/page.module.scss';
import s from './DirectMessagePage.module.scss';

export function DirectMessagePage() {
  const { userId } = useParams<{ userId: string }>();
  const { t } = useTranslation();
  const [messages, setMessages] = useState<Message[]>([]);
  const [myId, setMyId] = useState('');
  const [text, setText] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!userId) return;
    Promise.all([getMe(), getConversation(userId)]).then(([me, conv]) => {
      setMyId(me.id);
      setMessages(conv.messages);
    }).finally(() => setLoading(false));
  }, [userId]);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);

  async function handleSend() {
    if (!userId || !text.trim()) return;
    setSending(true);
    try {
      const msg = await sendMessage(userId, text.trim());
      setMessages((prev) => [...prev, msg]);
      setText('');
    } finally {
      setSending(false);
    }
  }

  return (
    <div className={s.root}>
      {loading ? <div className={p.spinner} style={{ margin: 'auto' }} /> : (
        <>
          <div className={s.feed}>
            {messages.map((m) => {
              const mine = m.senderId === myId;
              return (
                <div key={m.id} className={`${s.bubble} ${mine ? s.mine : s.theirs}`}>
                  <div className={s.text}>{m.content}</div>
                  <div className={s.ts}>{new Date(m.createdAt).toLocaleTimeString([], { hour:'2-digit', minute:'2-digit' })}</div>
                </div>
              );
            })}
            <div ref={bottomRef} />
          </div>
          <div className={s.composer}>
            <input
              className={s.input}
              placeholder={t('messages.input_placeholder')}
              value={text}
              onChange={(e) => setText(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && (e.preventDefault(), handleSend())}
              disabled={sending}
            />
            <button className={p.btnPrimary} onClick={handleSend} disabled={sending || !text.trim()}>
              {t('messages.send_btn')}
            </button>
          </div>
        </>
      )}
    </div>
  );
}