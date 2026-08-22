import React, { useEffect, useId, useRef, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  getOrganization,
  getOrganizationMembers,
  listEmailInvitations,
  inviteByEmail,
  revokeEmailInvitation,
  resendEmailInvitation,
  removeMember,
} from '@regieart/api';
import type {
  OrganizationDetail,
  OrganizationMember,
  EmailInvitation,
  MemberRole,
  InvitationStatus,
} from '@regieart/types';
import p from '../../../shared/layout/page.module.scss';
import s from './MembersPage.module.scss';

const ROLE_META: Record<MemberRole, { label: string; color: string; bg: string }> = {
  OWNER:         { label: 'Owner',         color: '#F59E0B', bg: 'rgba(245,158,11,0.12)' },
  ADMIN:         { label: 'Admin',         color: '#4A827E', bg: 'rgba(74,130,126,0.12)' },
  MEMBER:        { label: 'Miembro',       color: '#8C949B', bg: 'rgba(140,148,155,0.12)' },
  EXTERNAL_TECH: { label: 'Técnico Ext.',  color: '#6B8AC4', bg: 'rgba(107,138,196,0.12)' },
};

const STATUS_META: Record<InvitationStatus, { label: string; color: string; bg: string }> = {
  PENDING:  { label: 'Pendiente', color: '#F59E0B', bg: 'rgba(245,158,11,0.12)' },
  ACCEPTED: { label: 'Aceptada',  color: '#10B981', bg: 'rgba(16,185,129,0.12)' },
  REJECTED: { label: 'Rechazada', color: '#EF4444', bg: 'rgba(239,68,68,0.12)' },
  EXPIRED:  { label: 'Expirada',  color: '#64748B', bg: 'rgba(100,116,139,0.12)' },
};

type Tab = 'members' | 'invitations';

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const minutes = Math.floor(diff / 60_000);
  if (minutes < 60) return `Hace ${minutes}m`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `Hace ${hours}h`;
  return `Hace ${Math.floor(hours / 24)}d`;
}

function expiresIn(iso: string): string {
  const diff = new Date(iso).getTime() - Date.now();
  if (diff <= 0) return 'Expiró';
  const days = Math.ceil(diff / 86_400_000);
  return `Expira en ${days} días`;
}

interface InviteModalProps {
  orgId: string;
  onClose: () => void;
  onSuccess: (inv: EmailInvitation) => void;
}

function InviteModal({ orgId, onClose, onSuccess }: InviteModalProps) {
  const emailId = useId();
  const roleId = useId();
  const instrumentId = useId();
  const msgId = useId();

  const [email, setEmail] = useState('');
  const [role, setRole] = useState<MemberRole>('MEMBER');
  const [instrument, setInstrument] = useState('');
  const [message, setMessage] = useState('');
  const [validity, setValidity] = useState(7);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim()) { setError('El correo es requerido.'); return; }
    setLoading(true);
    setError('');
    try {
      const inv = await inviteByEmail(orgId, {
        email: email.trim(),
        role,
        instrument: instrument.trim() || undefined,
        message: message.trim() || undefined,
        validityDays: validity,
      });
      onSuccess(inv);
    } catch (err) {
      const raw = err instanceof Error ? err.message : String(err);
      if (raw.includes('409') || raw.toLowerCase().includes('pendiente')) {
        setError('Ya existe una invitación pendiente para este correo.');
      } else if (raw.toLowerCase().includes('miembro') || raw.toLowerCase().includes('member')) {
        setError('Este usuario ya es miembro de la organización.');
      } else {
        setError(raw);
      }
    } finally {
      setLoading(false);
    }
  }

  function handleBackdrop(e: React.MouseEvent) {
    if (e.target === e.currentTarget) onClose();
  }

  const charsLeft = 500 - message.length;

  return (
    <div className={s.backdrop} onClick={handleBackdrop} role="dialog" aria-modal>
      <div className={s.modal}>
        <div className={s.modalHead}>
          <div>
            <h2 className={s.modalTitle}>Invitar nuevo integrante</h2>
            <p className={s.modalSub}>Se enviará un correo con la invitación.</p>
          </div>
          <button className={s.closeBtn} onClick={onClose} aria-label="Cerrar">×</button>
        </div>

        <form onSubmit={handleSubmit} noValidate>
          <div className={s.fieldGroup}>
            <label className={s.label} htmlFor={emailId}>Correo electrónico *</label>
            <input
              id={emailId}
              className={s.input}
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="alice@gmail.com"
              autoFocus
              autoComplete="off"
            />
            <span className={s.hint}>Si ya tiene cuenta recibirá una notificación in-app.</span>
          </div>

          <div className={s.fieldRow}>
            <div className={s.fieldGroup}>
              <label className={s.label} htmlFor={roleId}>Rol en la organización *</label>
              <select
                id={roleId}
                className={s.select}
                value={role}
                onChange={(e) => setRole(e.target.value as MemberRole)}
              >
                <option value="MEMBER">Miembro (MEMBER)</option>
                <option value="ADMIN">Administrador (ADMIN)</option>
                <option value="EXTERNAL_TECH">Técnico Externo (EXTERNAL_TECH)</option>
              </select>
            </div>
            <div className={s.fieldGroup}>
              <label className={s.label} htmlFor={instrumentId}>Instrumento / Especialidad</label>
              <input
                id={instrumentId}
                className={s.input}
                type="text"
                value={instrument}
                onChange={(e) => setInstrument(e.target.value)}
                placeholder="Piano, Guitarra, Sonido…"
              />
            </div>
          </div>

          <div className={s.fieldGroup}>
            <label className={s.label} htmlFor={msgId}>Mensaje personal</label>
            <textarea
              id={msgId}
              className={s.textarea}
              value={message}
              onChange={(e) => setMessage(e.target.value.slice(0, 500))}
              placeholder="¡Hola! Queremos que te unas al proyecto…"
              rows={3}
            />
            <span className={s.hint}>{charsLeft} caracteres restantes</span>
          </div>

          <div className={s.fieldGroup}>
            <label className={s.label}>Validez de la invitación</label>
            <div className={s.radioGroup}>
              {[7, 14, 30].map((d) => (
                <label key={d} className={s.radioLabel}>
                  <input
                    type="radio"
                    name="validity"
                    value={d}
                    checked={validity === d}
                    onChange={() => setValidity(d)}
                  />
                  <span>{d} días{d === 7 ? ' (recomendado)' : ''}</span>
                </label>
              ))}
            </div>
          </div>

          {error && <p className={s.modalError} role="alert">{error}</p>}

          <div className={s.modalActions}>
            <button type="button" className={s.cancelBtn} onClick={onClose}>Cancelar</button>
            <button type="submit" className={s.submitBtn} disabled={loading}>
              {loading ? <span className={s.spinner} /> : 'Enviar Invitación →'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export function MembersPage() {
  const { orgId } = useParams<{ orgId: string }>();
  const { t } = useTranslation();
  const navigate = useNavigate();

  const [org, setOrg] = useState<OrganizationDetail | null>(null);
  const [members, setMembers] = useState<OrganizationMember[]>([]);
  const [invitations, setInvitations] = useState<EmailInvitation[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<Tab>('members');
  const [search, setSearch] = useState('');
  const [filterRole, setFilterRole] = useState<MemberRole | ''>('');
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [toast, setToast] = useState('');
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!orgId) return;
    Promise.all([
      getOrganization(orgId),
      getOrganizationMembers(orgId),
      listEmailInvitations(orgId),
    ]).then(([o, m, inv]) => {
      setOrg(o);
      setMembers(m);
      setInvitations(inv);
    }).catch((err: unknown) => {
      const status = (err as { response?: { status?: number } })?.response?.status;
      if (status === 401) navigate('/login');
    }).finally(() => setLoading(false));
  }, [orgId, navigate]);

  function showToast(msg: string) {
    setToast(msg);
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(''), 4000);
  }

  function handleInviteSuccess(inv: EmailInvitation) {
    setInvitations((prev) => [inv, ...prev]);
    setShowInviteModal(false);
    setTab('invitations');
    showToast(`Invitación enviada a ${inv.email}`);
  }

  async function handleRevoke(invId: string) {
    if (!orgId) return;
    await revokeEmailInvitation(orgId, invId);
    setInvitations((prev) => prev.filter((i) => i.id !== invId));
    showToast('Invitación revocada.');
  }

  async function handleResend(invId: string) {
    if (!orgId) return;
    await resendEmailInvitation(orgId, invId);
    showToast('Invitación reenviada.');
  }

  async function handleCopyLink(inv: EmailInvitation) {
    const url = `${window.location.origin}/invitations/${(inv as EmailInvitation & { token?: string }).token ?? inv.id}`;
    await navigator.clipboard.writeText(url);
    showToast('Enlace copiado al portapapeles.');
  }

  async function handleRemoveMember(memberId: string, name: string) {
    if (!orgId) return;
    if (!window.confirm(`¿Eliminar a ${name} de la organización?`)) return;
    await removeMember(orgId, memberId);
    setMembers((prev) => prev.filter((m) => m.id !== memberId));
    showToast(`${name} fue eliminado.`);
  }

  const filteredMembers = members.filter((m) => {
    const matchSearch = !search ||
      m.user.displayName.toLowerCase().includes(search.toLowerCase()) ||
      (m.user.email ?? '').toLowerCase().includes(search.toLowerCase());
    const matchRole = !filterRole || m.role === filterRole;
    return matchSearch && matchRole;
  });

  const filteredInvitations = invitations.filter((i) => {
    const matchSearch = !search || i.email.toLowerCase().includes(search.toLowerCase());
    const matchRole = !filterRole || i.role === filterRole;
    return matchSearch && matchRole;
  });

  const pendingCount = invitations.filter((i) => i.status === 'PENDING').length;

  if (loading) return <div className={p.spinner} />;

  return (
    <div className={p.page}>
      {toast && (
        <div className={s.toast} role="status">
          <span className={s.toastDot} />
          {toast}
        </div>
      )}

      <div className={s.pageHead}>
        <div className={s.breadcrumb}>
          <Link to={`/organization/${orgId}`} className={s.backLink}>← {org?.name}</Link>
        </div>
        <div className={s.headRow}>
          <div>
            <h1 className={p.pageTitle}>Gestión de Equipo</h1>
            <p className={p.pageSubtitle}>{org?.name} · {members.length} integrantes</p>
          </div>
          <button className={s.inviteBtn} onClick={() => setShowInviteModal(true)}>
            + Invitar Miembro
          </button>
        </div>
      </div>

      <div className={s.toolbar}>
        <div className={s.tabs}>
          <button
            className={`${s.tab} ${tab === 'members' ? s.tabActive : ''}`}
            onClick={() => setTab('members')}
          >
            Miembros
            <span className={s.tabBadge}>{members.length}</span>
          </button>
          <button
            className={`${s.tab} ${tab === 'invitations' ? s.tabActive : ''}`}
            onClick={() => setTab('invitations')}
          >
            Invitaciones Pendientes
            {pendingCount > 0 && <span className={`${s.tabBadge} ${s.tabBadgePending}`}>{pendingCount}</span>}
          </button>
        </div>

        <div className={s.filters}>
          <div className={s.searchWrap}>
            <span className={s.searchIcon}>⊘</span>
            <input
              className={s.searchInput}
              type="search"
              placeholder="Buscar por email o nombre…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <select
            className={s.select}
            value={filterRole}
            onChange={(e) => setFilterRole(e.target.value as MemberRole | '')}
          >
            <option value="">Todos los roles</option>
            {(Object.keys(ROLE_META) as MemberRole[]).map((r) => (
              <option key={r} value={r}>{ROLE_META[r].label}</option>
            ))}
          </select>
        </div>
      </div>

      {tab === 'members' ? (
        <div className={p.card}>
          {filteredMembers.length === 0 ? (
            <div className={p.empty}>
              <div className={p.emptyTitle}>Sin resultados</div>
              <div className={p.emptyBody}>Intenta con otro filtro o invita nuevos miembros.</div>
            </div>
          ) : (
            <table className={p.table}>
              <thead>
                <tr>
                  <th className={p.th}>Integrante</th>
                  <th className={p.th}>Rol</th>
                  <th className={p.th}>Se unió</th>
                  <th className={p.th} />
                </tr>
              </thead>
              <tbody>
                {filteredMembers.map((m) => {
                  const rm = ROLE_META[m.role];
                  return (
                    <tr key={m.id} className={p.tr}>
                      <td className={p.td}>
                        <div className={s.memberCell}>
                          <div className={s.avatar}>
                            {m.user.displayName.slice(0, 2).toUpperCase()}
                          </div>
                          <div>
                            <div className={s.memberName}>{m.user.displayName}</div>
                            {m.user.email && (
                              <div className={s.memberEmail}>{m.user.email}</div>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className={p.td}>
                        <span
                          className={p.chip}
                          style={{ background: rm.bg, color: rm.color }}
                        >
                          {rm.label}
                        </span>
                      </td>
                      <td className={p.td}>
                        <span className={s.dateText}>
                          {new Date(m.joinedAt).toLocaleDateString('es-AR', { day: 'numeric', month: 'short', year: 'numeric' })}
                        </span>
                      </td>
                      <td className={p.td}>
                        <div className={s.rowActions}>
                          <button
                            className={s.actionBtn}
                            onClick={() => navigate(`/profile/${m.user.id}`)}
                          >
                            Ver perfil
                          </button>
                          {m.role !== 'OWNER' && (
                            <button
                              className={`${s.actionBtn} ${s.actionDanger}`}
                              onClick={() => handleRemoveMember(m.id, m.user.displayName)}
                            >
                              Eliminar
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      ) : (
        <div className={p.card}>
          {filteredInvitations.length === 0 ? (
            <div className={p.empty}>
              <div className={p.emptyTitle}>Sin invitaciones</div>
              <div className={p.emptyBody}>Invita a nuevos integrantes con el botón superior.</div>
            </div>
          ) : (
            <table className={p.table}>
              <thead>
                <tr>
                  <th className={p.th}>Invitado</th>
                  <th className={p.th}>Rol / Instrumento</th>
                  <th className={p.th}>Enviado / Expira</th>
                  <th className={p.th}>Estado</th>
                  <th className={p.th} />
                </tr>
              </thead>
              <tbody>
                {filteredInvitations.map((inv) => {
                  const rm = ROLE_META[inv.role];
                  const sm = STATUS_META[inv.status];
                  const isPending = inv.status === 'PENDING';
                  const isExpired = inv.status === 'EXPIRED';
                  return (
                    <tr key={inv.id} className={p.tr}>
                      <td className={p.td}>
                        <div className={s.inviteeCell}>
                          <span className={s.inviteeIcon}>✉</span>
                          <span className={s.inviteeEmail}>{inv.email}</span>
                        </div>
                      </td>
                      <td className={p.td}>
                        <span
                          className={p.chip}
                          style={{ background: rm.bg, color: rm.color }}
                        >
                          {rm.label}
                        </span>
                        {inv.instrument && (
                          <div className={s.instrument}>{inv.instrument}</div>
                        )}
                      </td>
                      <td className={p.td}>
                        <div className={s.dateStack}>
                          <span>{timeAgo(inv.createdAt)}</span>
                          <span className={s.expiry}>{expiresIn(inv.expiresAt)}</span>
                        </div>
                      </td>
                      <td className={p.td}>
                        <span
                          className={p.chip}
                          style={{ background: sm.bg, color: sm.color }}
                        >
                          {sm.label}
                        </span>
                      </td>
                      <td className={p.td}>
                        <div className={s.rowActions}>
                          {isPending && (
                            <button
                              className={s.actionBtn}
                              onClick={() => handleCopyLink(inv)}
                              title="Copiar enlace"
                            >
                              Copiar
                            </button>
                          )}
                          {isExpired && (
                            <button
                              className={s.actionBtn}
                              onClick={() => handleResend(inv.id)}
                            >
                              Reenviar
                            </button>
                          )}
                          {(isPending || isExpired) && (
                            <button
                              className={`${s.actionBtn} ${s.actionDanger}`}
                              onClick={() => handleRevoke(inv.id)}
                            >
                              {isPending ? 'Revocar' : 'Eliminar'}
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      )}

      {showInviteModal && orgId && (
        <InviteModal
          orgId={orgId}
          onClose={() => setShowInviteModal(false)}
          onSuccess={handleInviteSuccess}
        />
      )}
    </div>
  );
}
