import React, { useId, useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { loginWithPassword } from '@regieart/api';
import s from './LoginPage.module.scss';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const FEATURES = [
  { icon: '📋', label: 'DaySheets & Cronograma en tiempo real' },
  { icon: '🚐', label: 'Logística de Convoy & Vehículos' },
  { icon: '💰', label: 'Control Financiero & Viáticos' },
  { icon: '🎵', label: 'Repertorio & Partituras R2' },
];

export function LoginPage() {
  const { t } = useTranslation();
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
    if (localStorage.getItem('regieart_tokens')) {
      navigate('/', { replace: true });
    }
  }, [navigate]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email || !password) { setError(t('errors.required_fields')); return; }
    if (!EMAIL_RE.test(email)) { setError(t('errors.invalid_email')); return; }
    if (password.length < 8) { setError(t('errors.password_too_short')); return; }
    setLoading(true);
    setError('');
    try {
      await loginWithPassword(email, password);
      navigate('/');
    } catch (err) {
      setError(err instanceof Error ? err.message : t('errors.invalid_credentials'));
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
            La plataforma de gestión logística y producción para bandas en vivo.
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
                <h2 className={s.panelTitle}>{t('auth.sign_in_title')}</h2>
                <p className={s.panelSubtitle}>{t('auth.sign_in_subtitle')}</p>
              </div>

              <form className={s.form} onSubmit={handleSubmit} noValidate>
                <div className={s.field}>
                  <label className={s.label} htmlFor={emailId}>{t('auth.email_label')}</label>
                  <div className={s.inputWrap}>
                    <input
                      id={emailId}
                      className={s.input}
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder={t('auth.email_placeholder')}
                      autoComplete="email"
                      autoFocus
                    />
                    <span className={s.inputIcon} aria-hidden>✉</span>
                  </div>
                </div>

                <div className={s.field}>
                  <label className={s.label} htmlFor={passwordId}>{t('auth.password_label')}</label>
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
                      aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
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
                    <span>{t('auth.remember_session')}</span>
                  </label>
                  <button
                    type="button"
                    className={s.forgotBtn}
                    onClick={() => setShowForgot(true)}
                  >
                    {t('auth.forgot_password_short')}
                  </button>
                </div>

                <button className={s.primaryBtn} type="submit" disabled={loading}>
                  {loading
                    ? <span className={s.spinner} />
                    : t('auth.sign_in_button').toUpperCase()}
                </button>

                <div className={s.divider}>
                  <span className={s.dividerLine} />
                  <span className={s.dividerLabel}>{t('auth.or')}</span>
                  <span className={s.dividerLine} />
                </div>

                <button type="button" className={s.socialBtn}>
                  <span className={s.socialBtnG}>G</span>
                  <span>{t('auth.continue_google')}</span>
                </button>
              </form>

              <p className={s.noAccount}>
                {t('auth.no_account')}{' '}
                <button type="button" className={s.inviteLink} onClick={() => navigate('/register')}>
                  {t('auth.create_account')}
                </button>
              </p>
            </>
          ) : (
            <ForgotPanel onBack={() => setShowForgot(false)} t={t} />
          )}

          <div className={s.panelFooter}>
            v1.0.0 Enterprise · Keycloak Auth Protected
          </div>
        </div>
      </div>
    </div>
  );
}

function ForgotPanel({
  onBack,
  t,
}: {
  onBack: () => void;
  t: (key: string) => string;
}) {
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
        <span>←</span> {t('auth.back_to_login')}
      </button>

      {!sent ? (
        <>
          <div className={s.panelHeader}>
            <h2 className={s.panelTitle}>{t('auth.forgot_password_title')}</h2>
            <p className={s.panelSubtitle}>{t('auth.forgot_password_subtitle')}</p>
          </div>

          <form className={s.form} onSubmit={handleSend} noValidate>
            <div className={s.field}>
              <label className={s.label} htmlFor={emailId}>{t('auth.email_label')}</label>
              <div className={s.inputWrap}>
                <input
                  id={emailId}
                  className={s.input}
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder={t('auth.email_placeholder')}
                  autoFocus
                />
                <span className={s.inputIcon} aria-hidden>✉</span>
              </div>
            </div>

            <button className={s.primaryBtn} type="submit" disabled={loading}>
              {loading
                ? <span className={s.spinner} />
                : t('auth.send_instructions').toUpperCase()}
            </button>
          </form>

          <div className={s.hintBox}>
            <span className={s.hintIcon}>ℹ</span>
            <span>{t('auth.reset_email_hint')}</span>
          </div>
        </>
      ) : (
        <div className={s.successBox}>
          <span className={s.successIcon}>✅</span>
          <p className={s.successTitle}>¡Instrucciones enviadas!</p>
          <p className={s.successSubtitle}>{t('auth.reset_email_hint')}</p>
          <button type="button" className={s.primaryBtn} onClick={onBack}>
            {t('auth.back_to_login').toUpperCase()}
          </button>
        </div>
      )}
    </div>
  );
}

