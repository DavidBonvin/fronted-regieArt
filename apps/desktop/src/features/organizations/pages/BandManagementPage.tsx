import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { getMyOrganizations, getOrganizationMembers, getInviteLinks, createInviteLink, revokeInviteLink } from '@regieart/api';
import type { OrganizationMember, InviteLink, MemberRole, Organization } from '@regieart/types';
import { CreateOrganizationModal } from './CreateOrganizationModal';
import p from '../../../shared/layout/page.module.scss';
import s from './BandManagementPage.module.scss';

const ROLE_COLOR: Record<MemberRole, string> = { OWNER:'#F59E0B', ADMIN:'#649D98', MEMBER:'#8C949B', EXTERNAL_TECH:'#565D63' };

export function BandManagementPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [orgId, setOrgId] = useState('');
  const [members, setMembers] = useState<OrganizationMember[]>([]);
  const [links, setLinks] = useState<InviteLink[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);

  useEffect(() => {
    getMyOrganizations().then(async (orgs) => {
      const id = orgs[0]?.id;
      if (!id) {
        setLoading(false);
        return;
      }
      setOrgId(id);
      const [mems, lnks] = await Promise.all([getOrganizationMembers(id), getInviteLinks(id)]);
      setMembers(mems);
      setLinks(lnks.filter((l) => new Date(l.expiresAt) > new Date()));
    }).finally(() => setLoading(false));
  }, []);

  async function handleGenerate(role: MemberRole) {
    if (!orgId) return;
    const l = await createInviteLink(orgId, { role, expiresAt: new Date(Date.now() + 7*24*60*60*1000).toISOString() } as any);
    setLinks((prev) => [l, ...prev]);
  }

  async function handleRevoke(linkId: string) {
    await revokeInviteLink(orgId, linkId);
    setLinks((prev) => prev.filter((l) => l.id !== linkId));
  }

  function handleOrgCreated(org: Organization) {
    setShowCreateModal(false);
    navigate(`/organization/${org.id}`);
  }

  return (
    <div className={p.page}>
      <div className={p.pageHeader}>
        <h1 className={p.pageTitle}>{t('band_management.members_title', { count: members.length })}</h1>
        {!orgId && !loading && (
          <button className={s.createOrgBtn} onClick={() => setShowCreateModal(true)}>
            + {t('org_selector.create_org')}
          </button>
        )}
        {orgId && (
          <button className={s.viewProfileBtn} onClick={() => navigate(`/organization/${orgId}`)}>
            {t('org_detail.edit_profile')} →
          </button>
        )}
      </div>

      {showCreateModal && (
        <CreateOrganizationModal
          onClose={() => setShowCreateModal(false)}
          onCreated={handleOrgCreated}
        />
      )}

      <div className={s.grid}>
        <div>
          {loading ? <div className={p.spinner} /> : (
            <div className={p.card}>
              <table className={p.table}>
                <thead><tr>
                  <th className={p.th}>{t('common.name')}</th>
                  <th className={p.th}>{t('common.role')}</th>
                  <th className={p.th}>{t('common.joined')}</th>
                </tr></thead>
                <tbody>
                  {members.map((m) => (
                    <tr key={m.id} className={p.tr} style={{ cursor:'pointer' }} onClick={() => navigate(`/profile/${m.user.id}`)}>
                      <td className={p.td}>{m.user.displayName}</td>
                      <td className={p.td}>
                        <span style={{ fontSize:11, fontWeight:700, color: ROLE_COLOR[m.role] }}>{m.role}</span>
                      </td>
                      <td className={p.td}>{new Date(m.joinedAt).toLocaleDateString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div>
          <div className={p.card}>
            <div style={{ fontSize:11, fontWeight:700, letterSpacing:'1px', textTransform:'uppercase', color:'var(--text-muted)', marginBottom:12 }}>{t('band_management.invite_section')}</div>
            <div style={{ display:'flex', flexWrap:'wrap', gap:8, marginBottom:16 }}>
              {(['MEMBER','ADMIN','EXTERNAL_TECH'] as MemberRole[]).map((r) => (
                <button key={r} className={p.btnSecondary} onClick={() => handleGenerate(r)}>+ {r}</button>
              ))}
            </div>
            {links.map((l) => (
              <div key={l.id} className={s.linkRow}>
                <span style={{ fontSize:11, fontWeight:700, color: ROLE_COLOR[l.role] }}>{l.role}</span>
                <code style={{ flex:1, fontSize:11, color:'var(--text-secondary)', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{l.token}</code>
                <button style={{ fontSize:12, color:'var(--action-danger)', background:'none', border:'none', cursor:'pointer' }} onClick={() => handleRevoke(l.id)}>{t('band_management.revoke')}</button>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}