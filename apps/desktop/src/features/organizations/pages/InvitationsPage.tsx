import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { getInviteLinks, revokeInviteLink, createInviteLink, getMyOrganizations } from '@regieart/api';
import type { InviteLink, MemberRole } from '@regieart/types';
import p from '../../../shared/layout/page.module.scss';
import s from './InvitationsPage.module.scss';
import { getActiveOrganization } from '../../../shared/utils/activeOrganization';

const ROLE_COLOR: Record<MemberRole,string> = { OWNER:'#F59E0B', ADMIN:'#649D98', MEMBER:'#8C949B', EXTERNAL_TECH:'#565D63' };

export function InvitationsPage() {
  const { t } = useTranslation();
  const [orgId, setOrgId] = useState('');
  const [links, setLinks] = useState<InviteLink[]>([]);
  const [loading, setLoading] = useState(true);
  const [selRole, setSelRole] = useState<MemberRole>('MEMBER');

  useEffect(() => {
    getMyOrganizations().then(async (orgs) => {
      const id = getActiveOrganization(orgs)?.id;
      if (!id) return;
      setOrgId(id);
      const lnks = await getInviteLinks(id);
      setLinks(lnks);
    }).finally(() => setLoading(false));
  }, []);

  async function handleCreate() {
    if (!orgId) return;
    const l = await createInviteLink(orgId, { role: selRole, expiresAt: new Date(Date.now()+7*24*60*60*1000).toISOString() } as any);
    setLinks((prev) => [l, ...prev]);
  }

  async function handleRevoke(linkId: string) {
    await revokeInviteLink(orgId, linkId);
    setLinks((prev) => prev.filter((l) => l.id !== linkId));
  }

  const active = links.filter((l) => new Date(l.expiresAt) > new Date());
  const expired = links.filter((l) => new Date(l.expiresAt) <= new Date());

  return (
    <div className={p.page}>
      <h1 className={p.pageTitle}>{t('band_management.invitations_title')}</h1>

      <div className={p.card} style={{ marginBottom:20 }}>
        <div style={{ display:'flex', gap:8, alignItems:'center', flexWrap:'wrap' }}>
          <select className={s.select} value={selRole} onChange={(e) => setSelRole(e.target.value as MemberRole)}>
            {(['MEMBER','ADMIN','EXTERNAL_TECH'] as MemberRole[]).map((r) => <option key={r} value={r}>{r}</option>)}
          </select>
          <button className={p.btnPrimary} onClick={handleCreate}>{t('band_management.generate_link')}</button>
        </div>
      </div>

      {loading ? <div className={p.spinner} /> : (
        <>
          {active.length > 0 && (
            <div className={p.card} style={{ marginBottom:16 }}>
              <div style={{ fontSize:11, fontWeight:700, letterSpacing:'1px', textTransform:'uppercase', color:'var(--text-muted)', marginBottom:12 }}>{t('band_management.active_links')}</div>
              {active.map((l) => (
                <div key={l.id} className={s.linkRow}>
                  <span style={{ fontSize:11, fontWeight:700, color: ROLE_COLOR[l.role] }}>{l.role}</span>
                  <code style={{ flex:1, fontSize:11, color:'var(--text-secondary)', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{l.token}</code>
                  <span style={{ fontSize:11, color:'var(--text-muted)' }}>{new Date(l.expiresAt).toLocaleDateString()}</span>
                  <button style={{ fontSize:12, color:'var(--status-error)', background:'none', border:'none', cursor:'pointer' }} onClick={() => handleRevoke(l.id)}>{t('band_management.revoke')}</button>
                </div>
              ))}
            </div>
          )}
          {expired.length > 0 && (
            <div className={p.card}>
              <div style={{ fontSize:11, fontWeight:700, letterSpacing:'1px', textTransform:'uppercase', color:'var(--text-muted)', marginBottom:12 }}>{t('band_management.expired_links')}</div>
              {expired.map((l) => (
                <div key={l.id} className={s.linkRow} style={{ opacity:0.5 }}>
                  <span style={{ fontSize:11, fontWeight:700 }}>{l.role}</span>
                  <code style={{ flex:1, fontSize:11, color:'var(--text-muted)', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{l.token}</code>
                  <span style={{ fontSize:11, color:'var(--status-error)' }}>{t('common.expired')}</span>
                </div>
              ))}
            </div>
          )}
          {links.length===0 && <div className={p.empty}><div className={p.emptyTitle}>{t('common.no_results')}</div></div>}
        </>
      )}
    </div>
  );
}