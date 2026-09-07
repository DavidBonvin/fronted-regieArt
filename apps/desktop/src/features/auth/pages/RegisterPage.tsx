import React, { useId, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { registerUser, loginWithPassword, updateMe } from '@regieart/api';
import s from './RegisterPage.module.scss';

const HERO_FEATURES = [
  { icon: '✔', label: 'Accès aux DaySheets et aux plannings' },
  { icon: '✔', label: 'Attribution du backline et de l’inventaire' },
  { icon: '✔', label: 'Reçus et paiements des per diem' },
];

export function RegisterPage() {
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
    if (!firstName || !lastName || !email || !password) { setError('Veuillez remplir tous les champs obligatoires.'); return; }
    if (!acceptTerms) { setError('Vous devez accepter les Conditions d’utilisation pour continuer.'); return; }

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
            Créez votre profil de musicien professionnel et connectez-vous à votre organisation.
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
            <h2 className={s.panelTitle}>Créer un nouveau compte</h2>
            <p className={s.panelSubtitle}>Commencez à gérer la logistique de vos concerts.</p>
          </div>

          {/* Google */}
          <button type="button" className={s.socialBtn}>
            <span className={s.socialBtnG}>G</span>
            <span>S’inscrire avec Google</span>
          </button>

          <div className={s.divider}>
            <span className={s.dividerLine} />
            <span className={s.dividerLabel}>OU</span>
            <span className={s.dividerLine} />
          </div>

          <form className={s.form} onSubmit={handleSubmit} noValidate>
            {/* First + Last name row */}
            <div className={s.fieldRow}>
              <div className={s.field}>
                <label className={s.label} htmlFor={firstNameId}>Prénom</label>
                <input
                  id={firstNameId}
                  className={s.input}
                  type="text"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  placeholder="Jean-Pierre"
                  autoComplete="given-name"
                  autoFocus
                />
              </div>
              <div className={s.field}>
                <label className={s.label} htmlFor={lastNameId}>Nom de famille</label>
                <input
                  id={lastNameId}
                  className={s.input}
                  type="text"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  placeholder="Leblanc"
                  autoComplete="family-name"
                />
              </div>
            </div>

            {/* Display name */}
            <div className={s.field}>
              <label className={s.label} htmlFor={displayNameId}>Nom artistique / Alias</label>
              <div className={s.inputWrap}>
                <input
                  id={displayNameId}
                  className={s.input}
                  type="text"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  placeholder="ex. Jean-Pierre Leblanc"
                  autoComplete="nickname"
                />
                <span className={s.inputIcon} aria-hidden>👤</span>
              </div>
            </div>

            {/* Email */}
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
                />
                <span className={s.inputIcon} aria-hidden>✉</span>
              </div>
            </div>

            {/* Password */}
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
                  autoComplete="new-password"
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

            {/* Terms */}
            <label className={s.termsLabel}>
              <input
                type="checkbox"
                className={s.check}
                checked={acceptTerms}
                onChange={(e) => setAcceptTerms(e.target.checked)}
              />
              <span>J’accepte les Conditions d’utilisation et la Politique de confidentialité</span>
            </label>

            <button className={s.primaryBtn} type="submit" disabled={loading}>
              {loading ? <span className={s.spinner} /> : 'CRÉER UN COMPTE'}
            </button>
          </form>

          <p className={s.loginLink}>
            Vous avez déjà un compte ?{' '}
            <button type="button" className={s.loginAnchor} onClick={() => navigate('/login')}>
              Se connecter
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
