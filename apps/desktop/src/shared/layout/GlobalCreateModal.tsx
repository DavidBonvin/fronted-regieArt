import React, { useEffect } from 'react';
import s from './GlobalCreateModal.module.scss';

const ACTIONS = [
  {
    id: 'event',
    icon: '📅',
    accentHex: '#4A827E',
    title: 'Nuevo Evento',
    sub: 'Concierto, ensayo, audición, gira...',
    available: true,
  },
  {
    id: 'song',
    icon: '🎵',
    accentHex: '#7E7B4A',
    title: 'Nueva Canción',
    sub: 'Agregar al repertorio de la banda',
    available: true,
  },
  {
    id: 'expense',
    icon: '💰',
    accentHex: '#7E4F4A',
    title: 'Registrar Gasto',
    sub: 'Añadir viático o gasto de banda',
    available: true,
  },
  {
    id: 'message',
    icon: '💬',
    accentHex: '#4A4A8E',
    title: 'Nuevo Mensaje',
    sub: 'Escribir directamente a un músico',
    available: true,
  },
  {
    id: 'invite',
    icon: '👥',
    accentHex: '#6E4A7E',
    title: 'Generar Invitación',
    sub: 'Link de acceso a la organización',
    available: true,
  },
  {
    id: 'upload',
    icon: '📤',
    accentHex: '#4A6E7E',
    title: 'Subir Archivo',
    sub: 'Partitura, audio, documento técnico',
    available: false,
  },
] as const;

interface Props {
  onClose: () => void;
  onAction: (id: string) => void;
}

export function GlobalCreateModal({ onClose, onAction }: Props) {
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

  function handleAction(id: string, available: boolean) {
    if (!available) return;
    onAction(id);
  }

  return (
    <div className={s.overlay} onClick={onClose} role="dialog" aria-modal="true" aria-label="Crear nuevo">
      <div className={s.sheet} onClick={(e) => e.stopPropagation()}>
        <div className={s.handle} />

        <div className={s.header}>
          <span className={s.headerTitle}>¿Qué querés crear?</span>
          <button className={s.closeBtn} onClick={onClose} aria-label="Cerrar">✕</button>
        </div>

        <div className={s.actionList}>
          {ACTIONS.map((action, i) => {
            const showDivider = i === 4; // divider before "Subir Archivo" (disabled)
            return (
              <React.Fragment key={action.id}>
                {showDivider && <div className={s.divider} />}
                <button
                  className={`${s.actionRow} ${!action.available ? s.actionRowDisabled : ''}`}
                  onClick={() => handleAction(action.id, action.available)}
                  disabled={!action.available}
                >
                  <div
                    className={s.iconBadge}
                    style={{ backgroundColor: action.accentHex + '26' }}
                  >
                    <span className={s.icon}>{action.icon}</span>
                  </div>

                  <div className={s.textBlock}>
                    <span className={s.actionTitle}>{action.title}</span>
                    <span className={s.actionSub}>{action.sub}</span>
                  </div>

                  {action.available ? (
                    <div className={s.arrow} style={{ backgroundColor: action.accentHex }}>
                      ›
                    </div>
                  ) : (
                    <span className={s.lock}>🔒</span>
                  )}
                </button>
              </React.Fragment>
            );
          })}
        </div>
      </div>
    </div>
  );
}
