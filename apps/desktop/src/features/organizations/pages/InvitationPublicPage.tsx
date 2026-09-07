import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { getPublicInvitation, acceptInvitation, rejectInvitation } from '@regieart/api';
import type { InvitationPublic, MemberRole } from '@regieart/types';
import s from './InvitationPublicPage.module.scss';

const ROLE_LABEL: Record<MemberRole, string> = {
  OWNER:         'Propriétaire',
  ADMIN:         'Administrateur',
  MEMBER:        'Membre',
  EXTERNAL_TECH: 'Technicien externe',
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
        setError('Cette invitation a été envoyée à une autre adresse e-mail. Déconnectez-vous et connectez-vous avec le bon compte.');
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
            <h2 className={s.notFoundTitle}>Invitation introuvable</h2>
            <p className={s.notFoundBody}>
              Ce lien a peut-être expiré ou n’est plus valide.
            </p>
            <Link to="/login" className={s.loginBtn}>Retour à l’accueil</Link>
          </div>
        </div>
      </div>
    );
  }

  const inv = invitation!;
  const isExpired = inv.status === 'EXPIRED' || new Date(inv.expiresAt).getTime() < Date.now();
  const isConsumed = inv.status === 'ACCEPTED' || inv.status === 'REJECTED';
  const expiresDate = new Date(inv.expiresAt).toLocaleDateString('fr-FR', {
    day: 'numeric', month: 'long', year: 'numeric',
  });

  return (
    <div className={s.shell}>
      <header className={s.header}>
        <div className={s.headerBrand}>
          <div className={s.brandMark}>RA</div>
          <span className={s.brandName}>RégieArt</span>
        </div>
        <Link to="/login" className={s.headerLogin}>Se connecter</Link>
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
              👋 <strong>{inv.createdBy.displayName}</strong> vous invite à rejoindre l’organisation.
            </p>

            <div className={s.detailsSection}>
              <div className={s.detailsTitle}>Détails de l’invitation</div>
              <div className={s.detailRow}>
                <span>{ROLE_ICON[inv.role]}</span>
                <span>Rôle : <strong>{ROLE_LABEL[inv.role]}</strong></span>
              </div>
              {inv.instrument && (
                <div className={s.detailRow}>
                  <span>🎹</span>
                  <span>Instrument : <strong>{inv.instrument}</strong></span>
                </div>
              )}
              <div className={s.detailRow}>
                <span>📅</span>
                <span>Expire le : <strong>{expiresDate}</strong></span>
              </div>
            </div>

            {inv.personalMessage && (
              <div className={s.messageBox}>
                <div className={s.messageLabel}>Message de {inv.createdBy.displayName} :</div>
                <p className={s.messageText}>"{inv.personalMessage}"</p>
              </div>
            )}

            <div className={s.divider} />

            {done === 'accepted' && (
              <div className={s.successBox}>
                <span className={s.successIcon}>✅</span>
                <div>
                  <div className={s.successTitle}>Vous avez rejoint {inv.organization.name} !</div>
                  <div className={s.successSub}>Redirection vers le tableau de bord…</div>
                </div>
              </div>
            )}

            {done === 'rejected' && (
              <div className={s.rejectedBox}>
                <span>Vous avez refusé l’invitation.</span>
                <Link to="/" className={s.loginBtn}>Retour à l’accueil</Link>
              </div>
            )}

            {!done && (isExpired || isConsumed) && (
              <div className={s.invalidBox}>
                <span className={s.invalidIcon}>⚠️</span>
                <div>
                  <div className={s.invalidTitle}>
                    {isExpired ? 'Cette invitation a expiré.' : 'Cette invitation n’est plus active.'}
                  </div>
                  <div className={s.invalidSub}>Demandez à un administrateur de vous en envoyer une nouvelle.</div>
                </div>
              </div>
            )}

            {!done && !isExpired && !isConsumed && !authenticated && (
              <div className={s.authSection}>
                <p className={s.authHint}>
                  Pour répondre à cette invitation, connectez-vous ou créez un compte.
                </p>
                <div className={s.authBtns}>
                  <Link to={`/register?invite=${token}`} className={s.registerBtn}>
                    Créer un compte
                  </Link>
                  <Link to={`/login?redirect=/invitations/${token}`} className={s.loginBtn}>
                    Se connecter
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
                    {rejecting ? <span className={s.spinner} /> : '✕ Refuser'}
                  </button>
                  <button
                    className={s.acceptBtn}
                    onClick={handleAccept}
                    disabled={accepting}
                  >
                    {accepting ? <span className={s.spinner} /> : '✓ Accepter et rejoindre'}
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
