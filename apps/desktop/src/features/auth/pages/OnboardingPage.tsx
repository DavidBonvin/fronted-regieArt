import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { getMyOrganizations, getMe } from '@regieart/api';
import s from './OnboardingPage.module.scss';

export function OnboardingPage() {
  const { t } = useTranslation();
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
        <h1 className={s.title}>{t('onboarding.welcome_title')}</h1>
        <p className={s.subtitle}>{t('onboarding.welcome_subtitle')}</p>
        <button className={s.btnPrimary} onClick={() => navigate('/login')}>
          {t('onboarding.get_started')}
        </button>
      </div>
    </div>
  );
}