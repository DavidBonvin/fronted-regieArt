import React, { useId, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { registerUser, loginWithPassword, updateMe } from '@regieart/api';
import s from './RegisterPage.module.scss';

const HERO_FEATURES = [
  { icon: '✔', label: 'Acceso a DaySheets y cronogramas' },
  { icon: '✔', label: 'Asignación de backline e inventario' },
  { icon: '✔', label: 'Recibos y pagos de viáticos (Per Diem)' },
];

export function RegisterPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();

  const firstNameId = useId();
  const lastNameId = useId();
  const displayNameId = useId();
  const emailId = useId();
  const passwordId = useId();

  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [acceptTerms, setAcceptTerms] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!firstName || !lastName || !email || !password) { setError(t('errors.required_fields')); return; }
    if (!acceptTerms) { setError('Debes aceptar los Términos de Servicio para continuar.'); return; }

    setLoading(true);
    setError('');
    try {
      await registerUser({ email, password, firstName, lastName });
      await loginWithPassword(email, password);
      if (displayName) {
        await updateMe({ displayName, firstName, lastName });
      }
      navigate('/');
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      setError(msg);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className={s.root}>
      {/* ── Left hero ── */}
      <div className={s.hero}>
        <div className={s.heroContent}>
          <div className={s.heroLogo}>
            <div className={s.heroLogoMark}>RA</div>
            <span className={s.heroLogoName}>RégieArt</span>
          </div>
          <h1 className={s.heroTagline}>
            Crea tu perfil de músico profesional y conecta con tu organización.
          </h1>
          <ul className={s.heroFeatures}>
            {HERO_FEATURES.map((f) => (
              <li key={f.label} className={s.heroFeatureItem}>
                <span className={s.heroFeatureCheck}>{f.icon}</span>
                <span>{f.label}</span>
              </li>
            ))}
          </ul>
        </div>
        <div className={s.heroOverlay} aria-hidden />
      </div>

      {/* ── Right panel ── */}
      <div className={s.panel}>
        <div className={s.panelInner}>
          <div className={s.panelHeader}>
            <h2 className={s.panelTitle}>{t('auth.register_title_desktop')}</h2>
            <p className={s.panelSubtitle}>{t('auth.register_subtitle_desktop')}</p>
          </div>

          {/* Google */}
          <button type="button" className={s.socialBtn}>
            <span className={s.socialBtnG}>G</span>
            <span>{t('auth.register_google')}</span>
          </button>

          <div className={s.divider}>
            <span className={s.dividerLine} />
            <span className={s.dividerLabel}>{t('auth.or')}</span>
            <span className={s.dividerLine} />
          </div>

          <form className={s.form} onSubmit={handleSubmit} noValidate>
            {/* First + Last name row */}
            <div className={s.fieldRow}>
              <div className={s.field}>
                <label className={s.label} htmlFor={firstNameId}>{t('auth.first_name')}</label>
                <input
                  id={firstNameId}
                  className={s.input}
                  type="text"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  placeholder={t('auth.first_name_placeholder')}
                  autoComplete="given-name"
                  autoFocus
                />
              </div>
              <div className={s.field}>
                <label className={s.label} htmlFor={lastNameId}>{t('auth.last_name')}</label>
                <input
                  id={lastNameId}
                  className={s.input}
                  type="text"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  placeholder={t('auth.last_name_placeholder')}
                  autoComplete="family-name"
                />
              </div>
            </div>

            {/* Display name */}
            <div className={s.field}>
              <label className={s.label} htmlFor={displayNameId}>{t('auth.display_name')}</label>
              <div className={s.inputWrap}>
                <input
                  id={displayNameId}
                  className={s.input}
                  type="text"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  placeholder={t('auth.display_name_placeholder')}
                  autoComplete="nickname"
                />
                <span className={s.inputIcon} aria-hidden>👤</span>
              </div>
            </div>

            {/* Email */}
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
                />
                <span className={s.inputIcon} aria-hidden>✉</span>
              </div>
            </div>

            {/* Password */}
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
                  autoComplete="new-password"
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

            {/* Terms */}
            <label className={s.termsLabel}>
              <input
                type="checkbox"
                className={s.check}
                checked={acceptTerms}
                onChange={(e) => setAcceptTerms(e.target.checked)}
              />
              <span>{t('auth.accept_terms')}</span>
            </label>

            <button className={s.primaryBtn} type="submit" disabled={loading}>
              {loading ? <span className={s.spinner} /> : t('auth.create_account').toUpperCase()}
            </button>
          </form>

          <p className={s.loginLink}>
            {t('auth.already_have_account')}{' '}
            <button type="button" className={s.loginAnchor} onClick={() => navigate('/login')}>
              {t('auth.sign_in')}
            </button>
          </p>

          <div className={s.panelFooter}>
            v1.0.0 Enterprise · Keycloak Auth Protected
          </div>
        </div>
      </div>
    </div>
  );
}
