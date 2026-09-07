import React, { useId, useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { loginWithPassword, clearImageCache } from '@regieart/api';
import { clearProfileMediaCache } from '../../../shared/utils/profileMediaCache';
import s from './LoginPage.module.scss';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const FEATURES = [
  { icon: '📋', label: 'DaySheets & planning en temps réel' },
  { icon: '🚐', label: 'Logistique du convoi & des véhicules' },
  { icon: '💰', label: 'Suivi financier & per diem' },
  { icon: '🎵', label: 'Répertoire & partitions R2' },
];

export function LoginPage() {
  const navigate = useNavigate();
  const emailId = useId();
  const passwordId = useId();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [remember, setRemember] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showForgot, setShowForgot] = useState(false);

  useEffect(() => {
    const debug = localStorage.getItem('__auth_debug');
    if (debug) {
      try {
        const d = JSON.parse(debug) as { when: string; cause: string; url?: string };
        setError(`[debug] ${d.cause}${d.url ? ' — ' + d.url : ''} (${d.when})`);
      } catch { /* ignore */ }
      localStorage.removeItem('__auth_debug');
    }
    const raw = localStorage.getItem('regieart_tokens');
    if (raw) {
      try {
        const t = JSON.parse(raw) as { expiresAt?: number; refreshExpiresAt?: number };
        const now = Date.now();
        if ((t.refreshExpiresAt ?? 0) > now) {
          navigate('/', { replace: true });
        } else {
          // Both tokens are expired — clear them so ProtectedRoute doesn't loop
          localStorage.removeItem('regieart_tokens');
        }
      } catch {
        localStorage.removeItem('regieart_tokens');
      }
    }
  }, [navigate]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email || !password) { setError('Veuillez remplir tous les champs obligatoires.'); return; }
    if (!EMAIL_RE.test(email)) { setError('Le format de l’adresse e-mail n’est pas valide.'); return; }
    if (password.length < 8) { setError('Le mot de passe doit contenir au moins 8 caractères.'); return; }
    setLoading(true);
    setError('');
    try {
      await loginWithPassword(email, password);
      // A different account may have left cached images behind.
      clearProfileMediaCache();
      clearImageCache();
      navigate('/');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'E-mail ou mot de passe incorrect.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className={s.root}>
      <div className={s.hero}>
        <div className={s.heroContent}>
          <div className={s.heroLogo}>
            <div className={s.heroLogoMark}>RA</div>
            <span className={s.heroLogoName}>RégieArt</span>
          </div>
          <h1 className={s.heroTagline}>
            La plateforme de gestion logistique et de production pour les groupes en live.
          </h1>
          <ul className={s.heroFeatures}>
            {FEATURES.map((f) => (
              <li key={f.label} className={s.heroFeatureItem}>
                <span className={s.heroFeatureIcon}>{f.icon}</span>
                <span>{f.label}</span>
              </li>
            ))}
          </ul>
        </div>
        <div className={s.heroOverlay} aria-hidden />
      </div>

      <div className={s.panel}>
        <div className={s.panelInner}>
          {!showForgot ? (
            <>
              <div className={s.panelHeader}>
                <h2 className={s.panelTitle}>Bienvenue sur RégieArt !</h2>
                <p className={s.panelSubtitle}>Saisissez les identifiants de votre organisation.</p>
              </div>

              <form className={s.form} onSubmit={handleSubmit} noValidate>
                <div className={s.field}>
                  <label className={s.label} htmlFor={emailId}>Adresse e-mail</label>
                  <div className={s.inputWrap}>
                    <input
                      id={emailId}
                      className={s.input}
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="votre@email.com"
                      autoComplete="email"
                      autoFocus
                    />
                    <span className={s.inputIcon} aria-hidden>✉</span>
                  </div>
                </div>

                <div className={s.field}>
                  <label className={s.label} htmlFor={passwordId}>Mot de passe</label>
                  <div className={s.inputWrap}>
                    <input
                      id={passwordId}
                      className={s.input}
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••••"
                      autoComplete="current-password"
                    />
                    <button
                      type="button"
                      className={s.eyeBtn}
                      onClick={() => setShowPassword((v) => !v)}
                      aria-label={showPassword ? 'Masquer le mot de passe' : 'Afficher le mot de passe'}
                    >
                      {showPassword ? '🙈' : '👁'}
                    </button>
                  </div>
                </div>

                {error && <p className={s.error} role="alert">{error}</p>}

                <div className={s.formRow}>
                  <label className={s.checkLabel}>
                    <input
                      type="checkbox"
                      className={s.check}
                      checked={remember}
                      onChange={(e) => setRemember(e.target.checked)}
                    />
                    <span>Se souvenir de la session</span>
                  </label>
                  <button
                    type="button"
                    className={s.forgotBtn}
                    onClick={() => setShowForgot(true)}
                  >
                    Oublié ?
                  </button>
                </div>

                <button className={s.primaryBtn} type="submit" disabled={loading}>
                  {loading
                    ? <span className={s.spinner} />
                    : 'SE CONNECTER'}
                </button>

                <div className={s.divider}>
                  <span className={s.dividerLine} />
                  <span className={s.dividerLabel}>OU</span>
                  <span className={s.dividerLine} />
                </div>

                <button type="button" className={s.socialBtn}>
                  <span className={s.socialBtnG}>G</span>
                  <span>Continuer avec Google</span>
                </button>
              </form>

              <p className={s.noAccount}>
                Pas encore de compte ?{' '}
                <button type="button" className={s.inviteLink} onClick={() => navigate('/register')}>
                  Créer un compte
                </button>
              </p>
            </>
          ) : (
            <ForgotPanel onBack={() => setShowForgot(false)} />
          )}

          <div className={s.panelFooter}>
            v1.0.0 Enterprise · Keycloak Auth Protected
          </div>
        </div>
      </div>
    </div>
  );
}

function ForgotPanel({ onBack }: { onBack: () => void }) {
  const emailId = useId();
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  async function handleSend(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim()) return;
    setLoading(true);
    const keycloakBase = import.meta.env.VITE_KEYCLOAK_URL as string;
    const realm = import.meta.env.VITE_KEYCLOAK_REALM as string;
    const clientId = import.meta.env.VITE_KEYCLOAK_CLIENT_ID as string;
    try {
      await fetch(
        `${keycloakBase}/realms/${realm}/login-actions/reset-credentials?client_id=${clientId}`,
      );
    } catch {
      /* ignore */
    } finally {
      setLoading(false);
      setSent(true);
    }
  }

  return (
    <div className={s.forgotPanel}>
      <button type="button" className={s.backBtn} onClick={onBack}>
        <span>←</span> Retour à la connexion
      </button>

      {!sent ? (
        <>
          <div className={s.panelHeader}>
            <h2 className={s.panelTitle}>Réinitialiser le mot de passe</h2>
            <p className={s.panelSubtitle}>Saisissez l’adresse e-mail associée à votre compte RégieArt. Nous vous enverrons les instructions de réinitialisation.</p>
          </div>

          <form className={s.form} onSubmit={handleSend} noValidate>
            <div className={s.field}>
              <label className={s.label} htmlFor={emailId}>Adresse e-mail</label>
              <div className={s.inputWrap}>
                <input
                  id={emailId}
                  className={s.input}
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="votre@email.com"
                  autoFocus
                />
                <span className={s.inputIcon} aria-hidden>✉</span>
              </div>
            </div>

            <button className={s.primaryBtn} type="submit" disabled={loading}>
              {loading
                ? <span className={s.spinner} />
                : 'ENVOYER LES INSTRUCTIONS'}
            </button>
          </form>

          <div className={s.hintBox}>
            <span className={s.hintIcon}>ℹ</span>
            <span>Vous recevrez un e-mail de confirmation de Keycloak. Vérifiez votre boîte de réception ou vos spams.</span>
          </div>
        </>
      ) : (
        <div className={s.successBox}>
          <span className={s.successIcon}>✅</span>
          <p className={s.successTitle}>Instructions envoyées !</p>
          <p className={s.successSubtitle}>Vous recevrez un e-mail de confirmation de Keycloak. Vérifiez votre boîte de réception ou vos spams.</p>
          <button type="button" className={s.primaryBtn} onClick={onBack}>
            RETOUR À LA CONNEXION
          </button>
        </div>
      )}
    </div>
  );
}

