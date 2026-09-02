import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { getMyOrganizations, getOrganizationMembers } from '@regieart/api';
import type { OrganizationMember } from '@regieart/types';
import p from '../../../shared/layout/page.module.scss';
import s from './BandChatPage.module.scss';
import { getActiveOrganization } from '../../../shared/utils/activeOrganization';
import { useActiveOrganizationId } from '../../../shared/utils/useActiveOrganizationId';

export function BandChatPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const activeOrgId = useActiveOrganizationId();
  const [members, setMembers] = useState<OrganizationMember[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getMyOrganizations().then((orgs) => {
      const orgId = getActiveOrganization(orgs)?.id;
      if (!orgId) { setLoading(false); return; }
      return getOrganizationMembers(orgId);
    }).then((m) => { if (m) setMembers(m); }).finally(() => setLoading(false));
  }, [activeOrgId]);

  return (
    <div className={p.page}>
      <h1 className={p.pageTitle}>{t('messages.band_chat_title')}</h1>
      <p className={p.pageSubtitle} style={{ marginBottom:20 }}>{t('messages.band_chat_subtitle')}</p>

      {loading ? <div className={p.spinner} /> : (
        <div className={p.card}>
          {members.map((m) => (
            <div key={m.id} className={s.row} onClick={() => navigate(`/messages/${m.user.id}`)}>
              <div className={s.avatar}>{(m.user.displayName?.[0] ?? '?').toUpperCase()}</div>
              <div className={s.info}>
                <div className={s.name}>{m.user.displayName}</div>
                <div className={s.role}>{m.role}</div>
              </div>
              <div className={s.arrow}>→</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}