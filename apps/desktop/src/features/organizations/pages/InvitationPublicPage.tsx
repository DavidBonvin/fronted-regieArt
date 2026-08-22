import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { getPublicInvitation, acceptInvitation, rejectInvitation } from '@regieart/api';
import type { InvitationPublic, MemberRole } from '@regieart/types';
import s from './InvitationPublicPage.module.scss';

const ROLE_LABEL: Record<MemberRole, string> = {
  OWNER:         'Propietario',
  ADMIN:         'Administrador',
  MEMBER:        'Miembro',
  EXTERNAL_TECH: 'Técnico Externo',
};

const ROLE_ICON: Record<MemberRole, string> = {
  OWNER:         '👑',
  ADMIN:         '🛡️',
  MEMBER:        '🛡️',
  EXTERNAL_TECH: '🛠️',
};

function isLoggedIn(): boolean {
  try {
    const raw = localStorage.getItem('regieart_tokens');
    if (!raw) return false;
    const t = JSON.parse(raw) as { refreshExpiresAt?: number };
    return (t.refreshExpiresAt ?? 0) > Date.now();
  } catch {
    return false;
  }
}

export function InvitationPublicPage() {
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();

  const [invitation, setInvitation] = useState<InvitationPublic | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [accepting, setAccepting] = useState(false);
  const [rejecting, setRejecting] = useState(false);
  const [done, setDone] = useState<'accepted' | 'rejected' | null>(null);
  const [error, setError] = useState('');

  const authenticated = isLoggedIn();

  useEffect(() => {
    if (!token) { setNotFound(true); setLoading(false); return; }
    getPublicInvitation(token)
      .then(setInvitation)
      .catch(() => setNotFound(true))
      .finally(() => setLoading(false));
  }, [token]);

  async function handleAccept() {
    if (!token) return;
    setAccepting(true);
    setError('');
    try {
      const { orgId } = await acceptInvitation(token);
      setDone('accepted');
      setTimeout(() => navigate(`/organization/${orgId}`), 2200);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      if (msg.includes('403') || msg.toLowerCase().includes('email')) {
        setError('Esta invitación fue enviada a otro correo. Cierra sesión e ingresa con la cuenta correcta.');
      } else {
        setError(msg);
      }
    } finally {
      setAccepting(false);
    }
  }

  async function handleReject() {
    if (!token) return;
    setRejecting(true);
    try {
      await rejectInvitation(token);
      setDone('rejected');
    } catch {
      setDone('rejected');
    } finally {
      setRejecting(false);
    }
  }

  if (loading) {
    return (
      <div className={s.shell}>
        <div className={s.loader} />
      </div>
    );
  }

  if (notFound) {
    return (
      <div className={s.shell}>
        <div className={s.card}>
          <div className={s.notFound}>
            <span className={s.notFoundIcon}>⚠️</span>
            <h2 className={s.notFoundTitle}>Invitación no encontrada</h2>
            <p className={s.notFoundBody}>
              Este enlace puede haber expirado o ya no es válido.
            </p>
            <Link to="/login" className={s.loginBtn}>Ir al inicio</Link>
          </div>
        </div>
      </div>
    );
  }

  const inv = invitation!;
  const isExpired = inv.status === 'EXPIRED' || new Date(inv.expiresAt).getTime() < Date.now();
  const isConsumed = inv.status === 'ACCEPTED' || inv.status === 'REJECTED';
  const expiresDate = new Date(inv.expiresAt).toLocaleDateString('es-AR', {
    day: 'numeric', month: 'long', year: 'numeric',
  });

  return (
    <div className={s.shell}>
      <header className={s.header}>
        <div className={s.headerBrand}>
          <div className={s.brandMark}>RA</div>
          <span className={s.brandName}>RégieArt</span>
        </div>
        <Link to="/login" className={s.headerLogin}>Iniciar Sesión</Link>
      </header>

      <main className={s.main}>
        <div className={s.card}>
          <div className={s.orgBanner}>
            <div className={s.orgBannerInner}>
              <div className={s.orgBannerIcon}>🥁</div>
              <h2 className={s.orgName}>{inv.organization.name}</h2>
              {inv.organization.description && (
                <p className={s.orgDesc}>{inv.organization.description}</p>
              )}
            </div>
          </div>

          <div className={s.body}>
            <p className={s.greeting}>
              👋 <strong>{inv.createdBy.displayName}</strong> te ha invitado a unirte a la organización.
            </p>

            <div className={s.detailsSection}>
              <div className={s.detailsTitle}>Detalles de la invitación</div>
              <div className={s.detailRow}>
                <span>{ROLE_ICON[inv.role]}</span>
                <span>Rol: <strong>{ROLE_LABEL[inv.role]}</strong></span>
              </div>
              {inv.instrument && (
                <div className={s.detailRow}>
                  <span>🎹</span>
                  <span>Instrumento: <strong>{inv.instrument}</strong></span>
                </div>
              )}
              <div className={s.detailRow}>
                <span>📅</span>
                <span>Expira el: <strong>{expiresDate}</strong></span>
              </div>
            </div>

            {inv.personalMessage && (
              <div className={s.messageBox}>
                <div className={s.messageLabel}>Mensaje de {inv.createdBy.displayName}:</div>
                <p className={s.messageText}>"{inv.personalMessage}"</p>
              </div>
            )}

            <div className={s.divider} />

            {done === 'accepted' && (
              <div className={s.successBox}>
                <span className={s.successIcon}>✅</span>
                <div>
                  <div className={s.successTitle}>¡Te has unido a {inv.organization.name}!</div>
                  <div className={s.successSub}>Redirigiendo al dashboard…</div>
                </div>
              </div>
            )}

            {done === 'rejected' && (
              <div className={s.rejectedBox}>
                <span>Has rechazado la invitación.</span>
                <Link to="/" className={s.loginBtn}>Ir al inicio</Link>
              </div>
            )}

            {!done && (isExpired || isConsumed) && (
              <div className={s.invalidBox}>
                <span className={s.invalidIcon}>⚠️</span>
                <div>
                  <div className={s.invalidTitle}>
                    {isExpired ? 'Esta invitación ha expirado.' : 'Esta invitación ya no está activa.'}
                  </div>
                  <div className={s.invalidSub}>Solicita a un administrador que te envíe una nueva.</div>
                </div>
              </div>
            )}

            {!done && !isExpired && !isConsumed && !authenticated && (
              <div className={s.authSection}>
                <p className={s.authHint}>
                  Para responder a esta invitación inicia sesión o crea una cuenta.
                </p>
                <div className={s.authBtns}>
                  <Link to={`/register?invite=${token}`} className={s.registerBtn}>
                    Crear Cuenta
                  </Link>
                  <Link to={`/login?redirect=/invitations/${token}`} className={s.loginBtn}>
                    Iniciar Sesión
                  </Link>
                </div>
              </div>
            )}

            {!done && !isExpired && !isConsumed && authenticated && (
              <>
                {error && (
                  <div className={s.errorBox} role="alert">
                    <span>⚠️</span>
                    <span>{error}</span>
                  </div>
                )}
                <div className={s.actionBtns}>
                  <button
                    className={s.rejectBtn}
                    onClick={handleReject}
                    disabled={rejecting}
                  >
                    {rejecting ? <span className={s.spinner} /> : '✕ Rechazar'}
                  </button>
                  <button
                    className={s.acceptBtn}
                    onClick={handleAccept}
                    disabled={accepting}
                  >
                    {accepting ? <span className={s.spinner} /> : '✓ Aceptar e Ingresar'}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
