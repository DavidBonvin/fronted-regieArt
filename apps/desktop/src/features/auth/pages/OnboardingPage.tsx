import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getMyOrganizations, getMe } from '@regieart/api';
import s from './OnboardingPage.module.scss';

export function OnboardingPage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([getMe(), getMyOrganizations()]).then(([, orgs]) => {
      if (orgs.length > 0) navigate('/', { replace: true });
    }).catch(() => {
      /* ignore */
    }).finally(() => setLoading(false));
  }, [navigate]);

  if (loading) return <div className={s.root}><div className={s.spinner} /></div>;

  return (
    <div className={s.root}>
      <div className={s.card}>
        <div className={s.brandMark}>RA</div>
        <h1 className={s.title}>Bienvenue sur RégieArt</h1>
        <p className={s.subtitle}>La plateforme logistique pour la musique live.</p>
        <button className={s.btnPrimary} onClick={() => navigate('/login')}>
          Commencer
        </button>
      </div>
    </div>
  );
}