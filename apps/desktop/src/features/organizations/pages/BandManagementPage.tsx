import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getMyOrganizations, getOrganizationMembers, getInviteLinks, revokeInviteLink, listEmailInvitations, revokeEmailInvitation, resendEmailInvitation, updateMemberRole, removeMember, getMe } from '@regieart/api';
import type { OrganizationMember, InviteLink, MemberRole, Organization, EmailInvitation } from '@regieart/types';
import { CreateOrganizationModal } from './CreateOrganizationModal';
import p from '../../../shared/layout/page.module.scss';
import s from './BandManagementPage.module.scss';
import { getActiveOrganization } from '../../../shared/utils/activeOrganization';
import { InviteModal } from './MembersPage';

const ROLE_COLOR: Record<MemberRole, string> = { OWNER:'#F59E0B', ADMIN:'#649D98', MEMBER:'#8C949B', EXTERNAL_TECH:'#565D63' };

export function BandManagementPage() {
  const navigate = useNavigate();
  const [orgId, setOrgId] = useState('');
  const [members, setMembers] = useState<OrganizationMember[]>([]);
  const [links, setLinks] = useState<InviteLink[]>([]);
  const [invitations, setInvitations] = useState<EmailInvitation[]>([]);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [showInvitations, setShowInvitations] = useState(false);
  const [toast, setToast] = useState('');
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);

  useEffect(() => {
    getMyOrganizations().then(async (orgs) => {
      const id = getActiveOrganization(orgs)?.id;
      if (!id) {
        setLoading(false);
        return;
      }
      setOrgId(id);
      const [mems, lnks, invs, me] = await Promise.all([
        getOrganizationMembers(id), getInviteLinks(id), listEmailInvitations(id), getMe(),
      ]);
      setMembers(mems);
      setLinks(lnks.filter((l) => new Date(l.expiresAt) > new Date()));
      setInvitations(invs);
      setCurrentUserId(me.id);
    }).finally(() => setLoading(false));
  }, []);

  async function handleRevoke(linkId: string) {
    await revokeInviteLink(orgId, linkId);
    setLinks((prev) => prev.filter((l) => l.id !== linkId));
  }

  const currentRole = members.find((m) => m.user.id === currentUserId)?.role;
  const canManage = currentRole === 'OWNER' || currentRole === 'ADMIN';
  const isOwner = currentRole === 'OWNER';
  const filteredMembers = members.filter((member) => {
    const query = search.toLowerCase();
    return !query || member.user.displayName.toLowerCase().includes(query) || (member.user.email ?? '').toLowerCase().includes(query);
  });

  function showMessage(message: string) {
    setToast(message);
    window.setTimeout(() => setToast(''), 3500);
  }

  async function handleRole(memberId: string, role: MemberRole) {
    if (!orgId || !isOwner) return;
    await updateMemberRole(orgId, memberId, role);
    setMembers((previous) => previous.map((member) => member.id === memberId ? { ...member, role } : member));
    showMessage('Rôle mis à jour.');
  }

  async function handleRemove(member: OrganizationMember) {
    if (!orgId || !canManage || member.role === 'OWNER' || member.user.id === currentUserId) return;
    if (!window.confirm(`Retirer ${member.user.displayName} de l’organisation ?`)) return;
    await removeMember(orgId, member.user.id);
    setMembers((previous) => previous.filter((item) => item.id !== member.id));
    showMessage(`${member.user.displayName} a été retiré.`);
  }

  async function handleInviteSuccess(invitation: EmailInvitation) {
    setInvitations((previous) => [invitation, ...previous]);
    setShowInviteModal(false);
    showMessage(`Invitation envoyée à ${invitation.targetEmail}.`);
  }

  async function handleRevokeInvitation(invitation: EmailInvitation) {
    if (!orgId) return;
    await revokeEmailInvitation(orgId, invitation.id);
    setInvitations((previous) => previous.filter((item) => item.id !== invitation.id));
    showMessage('Invitation révoquée.');
  }

  async function handleResendInvitation(invitation: EmailInvitation) {
    if (!orgId) return;
    await resendEmailInvitation(orgId, invitation.id);
    showMessage('Invitation renvoyée.');
  }

  function handleOrgCreated(org: Organization) {
    setShowCreateModal(false);
    navigate(`/organization/${org.id}`);
  }

  return (
    <div className={p.page}>
      {toast && <div className={s.toast} role="status">{toast}</div>}
      <div className={p.pageHeader}>
        <h1 className={p.pageTitle}>Équipe ({members.length})</h1>
        {!orgId && !loading && (
          <button className={s.createOrgBtn} onClick={() => setShowCreateModal(true)}>
            + Créer un nouveau groupe
          </button>
        )}
        {orgId && (
          <button className={s.viewProfileBtn} onClick={() => navigate(`/organization/${orgId}`)}>
            Ouvrir l’organisation →
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
              <div className={s.memberToolbar}>
                <input className={s.searchInput} type="search" placeholder="Rechercher un nom ou e-mail…" value={search} onChange={(event) => setSearch(event.target.value)} aria-label="Rechercher un membre" />
                <button className={s.inviteBtn} onClick={() => setShowInviteModal(true)} disabled={!canManage}>+ Inviter par e-mail</button>
              </div>
              <table className={p.table}>
                <thead><tr>
                  <th className={p.th}>Nom</th>
                  <th className={p.th}>Rôle</th>
                  <th className={p.th}>A rejoint</th><th className={p.th}>Actions</th>
                </tr></thead>
                <tbody>
                  {filteredMembers.map((m) => (
                    <tr key={m.id} className={p.tr}>
                      <td className={p.td}>{m.user.displayName}</td>
                      <td className={p.td}>
                        {isOwner && m.role !== 'OWNER' ? <select className={s.roleSelect} value={m.role} onChange={(event) => void handleRole(m.id, event.target.value as MemberRole)} aria-label={`Modifier le rôle de ${m.user.displayName}`}><option value="ADMIN">ADMIN</option><option value="MEMBER">MEMBER</option><option value="EXTERNAL_TECH">EXTERNAL TECH</option></select> : <span style={{ fontSize:11, fontWeight:700, color: ROLE_COLOR[m.role] }}>{m.role}</span>}
                      </td>
                      <td className={p.td}>{new Date(m.joinedAt).toLocaleDateString('fr-FR')}</td>
                      <td className={p.td}><div className={s.rowActions}><button className={s.actionBtn} onClick={() => navigate(`/profile/${m.user.id}`)}>Profil</button>{canManage && m.role !== 'OWNER' && m.user.id !== currentUserId && <button className={s.actionDanger} onClick={() => void handleRemove(m)}>Retirer</button>}</div></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div>
            <div className={p.card}>
            <div style={{ fontSize:11, fontWeight:700, letterSpacing:'1px', textTransform:'uppercase', color:'var(--text-muted)', marginBottom:12 }}>Inviter des membres</div>
            {links.map((l) => (
              <div key={l.id} className={s.linkRow}>
                <span style={{ fontSize:11, fontWeight:700, color: ROLE_COLOR[l.role] }}>{l.role}</span>
                <code style={{ flex:1, fontSize:11, color:'var(--text-secondary)', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{l.token}</code>
                <button style={{ fontSize:12, color:'var(--action-danger)', background:'none', border:'none', cursor:'pointer' }} onClick={() => handleRevoke(l.id)}>Révoquer</button>
              </div>
            ))}
            <button className={s.linkToggle} onClick={() => setShowInvitations((value) => !value)}>{showInvitations ? 'Masquer' : 'Voir'} les invitations par e-mail ({invitations.length})</button>
            {showInvitations && invitations.map((invitation) => <div key={invitation.id} className={s.linkRow}><span>{invitation.targetEmail}</span><span className={s.invitationStatus}>{invitation.status}</span>{canManage && <><button className={s.linkAction} onClick={() => void handleResendInvitation(invitation)}>Renvoyer</button><button className={s.linkActionDanger} onClick={() => void handleRevokeInvitation(invitation)}>Révoquer</button></>}</div>)}
          </div>
        </div>
      </div>
      {showInviteModal && orgId && <InviteModal orgId={orgId} onClose={() => setShowInviteModal(false)} onSuccess={handleInviteSuccess} />}
    </div>
  );
}