import React, { useEffect, useRef, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  getOrganization,
  updateOrganization,
  getInviteLinks,
  revokeInviteLink,
  createInviteLink,
  listEvents,
  listConversations,
  listNotifications,
  getMe,
  searchAssets,
  getDownloadUrl,
  resolveImageUrls,
} from '@regieart/api';
import type { OrganizationDetail, InviteLink, MemberRole, Event, Conversation, Notification } from '@regieart/types';
import {
  AvatarSourceModal, AvatarCropModal, AvatarUploadingModal,
  BannerSourceModal, BannerCropModal,
  OrgR2GalleryModal,
  runOrgLogoUpload, runOrgBannerUpload,
} from '../../profile/pages/AvatarFlowModals';
import type { OrgLogoFlowMode, OrgBannerFlowMode } from '../../profile/pages/AvatarFlowModals';
import p from '../../../shared/layout/page.module.scss';
import s from './OrganizationProfileView.module.scss';
import { InviteModal } from './MembersPage';
import { EditOrganizationModal } from './EditOrganizationModal';

type TabId = 'about' | 'members' | 'repertoire' | 'finance';

const ROLE_COLOR: Record<MemberRole, string> = {
  OWNER: '#F59E0B',
  ADMIN: '#4A827E',
  MEMBER: '#8C949B',
  EXTERNAL_TECH: '#565D63',
};

const ADMIN_ROLES: MemberRole[] = ['OWNER', 'ADMIN'];

const orgLogoKey = (id: string) => `regieart:orgLogo:${id}`;
const orgBannerKey = (id: string) => `regieart:orgBanner:${id}`;

function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((res, rej) => {
    const reader = new FileReader();
    reader.onload = () => res(reader.result as string);
    reader.onerror = rej;
    reader.readAsDataURL(blob);
  });
}

export function OrganizationProfileView() {
  const { orgId } = useParams<{ orgId: string }>();
  const navigate = useNavigate();

  const [org, setOrg] = useState<OrganizationDetail | null>(null);
  const [links, setLinks] = useState<InviteLink[]>([]);
  const [events, setEvents] = useState<Event[]>([]);
  const [convos, setConvos] = useState<Conversation[]>([]);
  const [notifs, setNotifs] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<TabId>('about');
  const [isAdmin, setIsAdmin] = useState(false);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);

  const [memberAvatarUrls, setMemberAvatarUrls] = useState<Record<string, string | null>>({});

  const [logoUrl, setLogoUrl] = useState<string | null>(() => {
    try {
      const cached = orgId ? localStorage.getItem(orgLogoKey(orgId)) : null;
      return cached?.startsWith('data:') ? cached : null;
    } catch { return null; }
  });
  const [bannerUrl, setBannerUrl] = useState<string | null>(() => {
    try {
      const cached = orgId ? localStorage.getItem(orgBannerKey(orgId)) : null;
      return cached?.startsWith('data:') ? cached : null;
    } catch { return null; }
  });

  const [logoMode, setLogoMode] = useState<OrgLogoFlowMode>(null);
  const [logoCropSrc, setLogoCropSrc] = useState<string | null>(null);
  const [logoProgress, setLogoProgress] = useState(0);
  const [logoStep, setLogoStep] = useState(0);

  const [bannerMode, setBannerMode] = useState<OrgBannerFlowMode>(null);
  const [bannerCropSrc, setBannerCropSrc] = useState<string | null>(null);
  const [bannerProgress, setBannerProgress] = useState(0);
  const [bannerStep, setBannerStep] = useState(0);

  const currentUserIdRef = useRef<string | null>(null);

  useEffect(() => {
    if (!orgId) return;
    async function load() {
      try {
        const now = new Date();
        const from = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
        const to = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 14).toISOString();
        const [data, me, invLinks, eventsRes, convosRes, notifsRes] = await Promise.all([
          getOrganization(orgId!),
          getMe().catch(() => null),
          getInviteLinks(orgId!).catch(() => [] as InviteLink[]),
          listEvents({ orgId: orgId!, from, to, limit: 5 }).catch(() => ({ events: [] as Event[] })),
          listConversations().catch(() => [] as Conversation[]),
          listNotifications({ limit: 20 }).catch(() => ({ notifications: [] as Notification[] })),
        ]);
        setOrg(data);
        const orgAssets = await searchAssets({
          assetType: 'org-banner',
          orgId: orgId!,
          limit: 100,
        }).catch(() => null);
        const assets = Array.isArray(orgAssets?.assets) ? orgAssets.assets : [];
        const latestAsset = (prefix: string) => assets
          .filter((asset) => (asset.displayName ?? asset.originalName).startsWith(prefix))
          .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())[0];
        const [logoAsset, bannerAsset] = [latestAsset('org-logo'), latestAsset('org-banner')];
        const [logoDownload, bannerDownload] = await Promise.all([
          logoAsset ? getDownloadUrl(logoAsset.id).catch(() => null) : Promise.resolve(null),
          bannerAsset ? getDownloadUrl(bannerAsset.id).catch(() => null) : Promise.resolve(null),
        ]);
        if (logoDownload?.downloadUrl) setLogoUrl(logoDownload.downloadUrl);
        if (bannerDownload?.downloadUrl) setBannerUrl(bannerDownload.downloadUrl);
        if (me) {
          currentUserIdRef.current = me.id;
          const myMember = data.members.find((m) => m.user.id === me.id);
          setIsAdmin(myMember ? ADMIN_ROLES.includes(myMember.role) : false);
        }
        const rawUrls = data.members.map((m) => m.user.avatarUrl);
        resolveImageUrls(rawUrls).then((resolved) => {
          const map: Record<string, string | null> = {};
          data.members.forEach((m, i) => { map[m.user.id] = resolved[i]; });
          setMemberAvatarUrls(map);
        }).catch(() => {});
        setLinks(invLinks.filter((l) => new Date(l.expiresAt) > new Date()));
        setEvents(eventsRes.events ?? []);
        setConvos((Array.isArray(convosRes) ? convosRes : []).slice(0, 5));
        setNotifs((notifsRes.notifications ?? []).filter((n) => !n.isRead).slice(0, 5));
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [orgId]);

  async function handleRevoke(linkId: string) {
    if (!orgId) return;
    await revokeInviteLink(orgId, linkId);
    setLinks((prev) => prev.filter((l) => l.id !== linkId));
  }

  async function handleGenerateLink(role: MemberRole) {
    if (!orgId) return;
    const link = await createInviteLink(orgId, {
      role,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
    });
    setLinks((prev) => [link, ...prev]);
  }

  async function handleLogoBlob(blob: Blob) {
    if (!orgId) return;
    const dataUrl = await blobToDataUrl(blob);
    setLogoUrl(dataUrl);
    try { localStorage.setItem(orgLogoKey(orgId), dataUrl); } catch { /* ignore */ }
    setLogoMode('uploading');
    setLogoProgress(0); setLogoStep(0);
    try {
      await runOrgLogoUpload(blob, orgId, (p, step) => { setLogoProgress(p); setLogoStep(step); });
    } catch { /* local display already updated */ }
    finally { setLogoMode(null); }
  }

  async function handleBannerBlob(blob: Blob) {
    if (!orgId) return;
    const dataUrl = await blobToDataUrl(blob);
    setBannerUrl(dataUrl);
    try { localStorage.setItem(orgBannerKey(orgId), dataUrl); } catch { /* ignore */ }
    setBannerMode('uploading');
    setBannerProgress(0); setBannerStep(0);
    try {
      await runOrgBannerUpload(blob, orgId, (p, step) => { setBannerProgress(p); setBannerStep(step); });
    } catch { /* local display already updated */ }
    finally { setBannerMode(null); }
  }

  async function handleOrganizationSave(dto: Parameters<typeof updateOrganization>[1]) {
    if (!orgId) return;
    const updated = await updateOrganization(orgId, dto);
    setOrg((previous) => previous ? { ...previous, ...updated } : previous);
    setShowEditModal(false);
  }

  if (loading) return <div className={p.page}><div className={p.spinner} /></div>;
  if (!org) return <div className={p.page}><p>Introuvable</p></div>;

  const createdYear = new Date(org.createdAt).getFullYear();
  const today = new Date();
  const todayEvent = events.find((e) => {
    const d = new Date(e.startTime);
    return d.getFullYear() === today.getFullYear() && d.getMonth() === today.getMonth() && d.getDate() === today.getDate();
  });
  const unreadMessages = convos.filter((c) => c.unreadCount > 0).length;

  const tabs: { id: TabId; label: string }[] = [
    { id: 'about', label: 'Infos' },
    { id: 'members', label: 'Membres' },
    { id: 'repertoire', label: 'Répertoire' },
    { id: 'finance', label: 'Finances' },
  ];

  return (
    <div className={p.pageWide}>
      <div className={s.bannerWrapper}>
        <div
          className={s.banner}
          style={bannerUrl ? { backgroundImage: `url("${bannerUrl}")` } : undefined}
        />
        <div className={s.bannerOverlay}>
          <button
            className={s.orgLogoBox}
            onClick={() => isAdmin && setLogoMode('source')}
            disabled={!isAdmin}
            type="button"
            title={isAdmin ? 'Changer le logo de l’organisation' : undefined}
          >
            {logoUrl
              ? <img src={logoUrl} alt={org.name} className={s.orgLogoImg} />
              : <span className={s.orgLogoInitials}>
                  {org.name.split(' ').slice(0, 2).map((w) => w[0]?.toUpperCase() ?? '').join('')}
                </span>
            }
            {isAdmin && <span className={s.logoEditOverlay}>📷</span>}
          </button>
          <div className={s.orgHeading}>
            <h1 className={s.orgName}>{org.name}</h1>
            {org.description && <p className={s.orgTagline}>{org.description}</p>}
            <div className={s.orgMeta}>
              {org.website && <span>🌐 <a href={org.website} target="_blank" rel="noreferrer">{org.website.replace(/^https?:\/\//, '')}</a></span>}
              {org.phone && <span>📞 {org.phone}</span>}
              <span>👥 {org.members.length} Membres</span>
              <span>Créée en {createdYear}</span>
            </div>
          </div>
        </div>
        {isAdmin && (
          <button
            className={s.bannerEditBtn}
            onClick={() => setBannerMode('source')}
            title="Changer la bannière de l’organisation"
          >
            📷 Changer la bannière
          </button>
        )}
      </div>

      <div className={s.actionBar}>
        <button className={s.btnPrimary} onClick={() => navigate(`/organization/${orgId}/members`)}>
          Gérer l’équipe
        </button>
        <button
          className={s.btnSecondary}
          onClick={() => setShowEditModal(true)}
          disabled={!isAdmin}
          title={isAdmin ? 'Modifier les informations de l’organisation' : 'Réservé aux administrateurs'}
        >
          Modifier le profil ✏
        </button>
        <button className={s.btnSecondary}>Exporter le rider 📄</button>
      </div>

      <div className={s.dashStats}>
        <div className={p.statCard}>
          <div className={p.statLabel}>Prochains événements</div>
          <div className={p.statValue}>{events.length}</div>
          <div className={p.statSub}>14 prochains jours</div>
        </div>
        <div className={p.statCard}>
          <div className={p.statLabel}>Messages non lus</div>
          <div className={p.statValue}>{unreadMessages}</div>
          <div className={p.statSub}>Conversations</div>
        </div>
        <div className={p.statCard}>
          <div className={p.statLabel}>Notifications</div>
          <div className={p.statValue}>{notifs.length}</div>
          <div className={p.statSub}>Non lues</div>
        </div>
        <div className={p.statCard}>
          <div className={p.statLabel}>Événement du jour</div>
          <div className={p.statValue} style={{ fontSize: 14, fontWeight: 600 }}>{todayEvent ? todayEvent.title : 'Aucun événement'}</div>
          <div className={p.statSub}>{todayEvent ? new Date(todayEvent.startTime).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }) : ''}</div>
        </div>
      </div>

      <div className={s.tabBar}>
        {tabs.map((tb) => (
          <button
            key={tb.id}
            className={`${s.tabBtn} ${tab === tb.id ? s.tabBtnActive : ''}`}
            onClick={() => setTab(tb.id)}
          >
            {tb.label}
          </button>
        ))}
      </div>

      <div className={s.layout}>
        <div className={s.main}>
          {tab === 'about' && (
            <>
              {org.description && (
                <div className={p.card}>
                  <h3 className={s.sectionTitle}>Biographie</h3>
                  <p className={s.bodyText}>{org.description}</p>
                </div>
              )}

              <div className={`${p.card} ${s.mt}`}>
                <h3 className={s.sectionTitle}>Équipe</h3>
                {org.members.map((m) => {
                  const initials = m.user.displayName.split(' ').slice(0, 2).map((w) => w[0]?.toUpperCase() ?? '').join('');
                  return (
                    <div key={m.id} className={s.memberRow}>
                      <div
                        className={s.memberAvatar}
                        style={memberAvatarUrls[m.user.id] ? undefined : { backgroundImage: 'none' }}
                      >
                        {memberAvatarUrls[m.user.id]
                          ? <img src={memberAvatarUrls[m.user.id]!} alt={m.user.displayName} className={s.avatarImg} />
                          : <span className={s.avatarInitials}>{initials}</span>
                        }
                      </div>
                      <div className={s.memberInfo}>
                        <span className={s.memberName}>{m.user.displayName}</span>
                        {m.user.phone && <span className={s.memberSub}>📞 {m.user.phone}</span>}
                      </div>
                      <span className={s.roleBadge} style={{ background: ROLE_COLOR[m.role] }}>{m.role}</span>
                    </div>
                  );
                })}
              </div>
              <div className={`${p.card} ${s.mt}`}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 12 }}>
                  <h3 className={s.sectionTitle}>Messages</h3>
                  <button className={s.viewAllLink} onClick={() => navigate('/messages')}>Tout voir →</button>
                </div>
                {convos.length === 0
                  ? <p className={s.emptyText}>Aucun résultat</p>
                  : convos.map((c) => (
                    <div key={c.userId} className={s.convoRow} onClick={() => navigate(`/messages/direct/${c.userId}`)} role="button" tabIndex={0}
                      onKeyDown={(e) => e.key === 'Enter' && navigate(`/messages/direct/${c.userId}`)}>
                      <div className={s.convoAvatar}>{c.user.displayName?.[0]?.toUpperCase() ?? '?'}</div>
                      <div className={s.convoMeta}>
                        <span className={s.convoName}>{c.user.displayName}</span>
                        {c.lastMessage && <span className={s.convoLast}>{c.lastMessage.content}</span>}
                      </div>
                      {c.unreadCount > 0 && <span className={s.unreadBadge}>{c.unreadCount}</span>}
                    </div>
                  ))}
              </div>
            </>
          )}

          {tab === 'members' && (
            <div className={p.card}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 16 }}>
                <h3 className={s.sectionTitle} style={{ marginBottom: 0 }}>Équipe</h3>
                <button className={s.viewAllLink} onClick={() => navigate(`/organization/${orgId}/members`)}>
                  Gérer toute l’équipe →
                </button>
              </div>
              <table className={p.table}>
                <thead>
                  <tr>
                    <th className={p.th}>Nom</th>
                    <th className={p.th}>Rôle</th>
                    <th className={p.th}>A rejoint</th>
                  </tr>
                </thead>
                <tbody>
                  {org.members.map((m) => (
                    <tr key={m.id} className={p.tr} onClick={() => navigate(`/profile/${m.user.id}`)} style={{ cursor: 'pointer' }}>
                      <td className={p.td}>{m.user.displayName}</td>
                      <td className={p.td}>
                        <span className={s.roleBadge} style={{ background: ROLE_COLOR[m.role] }}>{m.role}</span>
                      </td>
                      <td className={p.td}>{new Date(m.joinedAt).toLocaleDateString('fr-FR')}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {(tab === 'repertoire' || tab === 'finance') && (
            <div className={p.card}>
              <p className={s.emptyText}>Aucun résultat</p>
            </div>
          )}
        </div>

        <aside className={s.sidebar}>
          <div className={p.card}>
            <h4 className={s.sidebarTitle}>Panneau d’administration</h4>
            <div className={s.adminActions}>
              <button className={s.adminBtn} onClick={() => setShowInviteModal(true)}>
                Inviter par e-mail
              </button>
              <button className={s.adminBtn}>Importer des ressources</button>
              <button className={s.adminBtn}>Paramètres du groupe</button>
            </div>
          </div>

          {links.length > 0 && (
            <div className={`${p.card} ${s.mt}`}>
              <h4 className={s.sidebarTitle}>Liens actifs</h4>
              {links.map((link) => {
                const days = Math.max(0, Math.round((new Date(link.expiresAt).getTime() - Date.now()) / 86400000));
                return (
                  <div key={link.id} className={s.linkCard}>
                    <div className={s.linkInfo}>
                      <span className={s.linkToken}>🔗 /join/{link.token.slice(0, 12)}…</span>
                      <span className={s.linkMeta}>{link.role} · expire dans {days} j</span>
                    </div>
                    <button className={s.revokeBtn} onClick={() => handleRevoke(link.id)}>
                      Révoquer
                    </button>
                  </div>
                );
              })}
            </div>
          )}

          <div className={`${p.card} ${s.mt}`}>
            <h4 className={s.sidebarTitle}>Résumé des ressources</h4>
            <div className={s.resourceList}>
              <div className={s.resourceItem}>
                <span>🎼</span>
                <span>0 morceaux</span>
              </div>
              <div className={s.resourceItem}>
                <span>🎪</span>
                <span>{events.length} événements</span>
              </div>
              <div className={s.resourceItem}>
                <span>🚌</span>
                <span>0 convois</span>
              </div>
            </div>
          </div>
        </aside>
      </div>

      {logoMode === 'source' && (
        <AvatarSourceModal
          onFile={(src) => { setLogoCropSrc(src); setLogoMode('crop'); }}
          onWebcam={() => setLogoMode('crop')}
          onR2={() => setLogoMode('r2')}
          onClose={() => setLogoMode(null)}
        />
      )}
      {logoMode === 'crop' && logoCropSrc && (
        <AvatarCropModal
          imageSrc={logoCropSrc}
          userName={org.name}
          onConfirm={(blob) => handleLogoBlob(blob)}
          onChangeImage={() => setLogoMode('source')}
          onCancel={() => setLogoMode(null)}
        />
      )}
      {logoMode === 'r2' && orgId && (
        <OrgR2GalleryModal
          orgId={orgId}
          onSelect={(url) => {
            setLogoUrl(url);
            setLogoMode(null);
          }}
          onCancel={() => setLogoMode('source')}
        />
      )}
      {logoMode === 'uploading' && (
        <AvatarUploadingModal progress={logoProgress} step={logoStep} />
      )}

      {bannerMode === 'source' && (
        <BannerSourceModal
          onFile={(src) => { setBannerCropSrc(src); setBannerMode('crop'); }}
          onR2={() => setBannerMode('r2')}
          onClose={() => setBannerMode(null)}
        />
      )}
      {bannerMode === 'crop' && bannerCropSrc && (
        <BannerCropModal
          imageSrc={bannerCropSrc}
          onConfirm={(blob) => handleBannerBlob(blob)}
          onChangeImage={() => setBannerMode('source')}
          onCancel={() => setBannerMode(null)}
        />
      )}
      {bannerMode === 'r2' && orgId && (
        <OrgR2GalleryModal
          orgId={orgId}
          onSelect={(url) => {
            setBannerUrl(url);
            setBannerMode(null);
          }}
          onCancel={() => setBannerMode('source')}
        />
      )}
      {bannerMode === 'uploading' && (
        <AvatarUploadingModal progress={bannerProgress} step={bannerStep} />
      )}

      {showInviteModal && orgId && (
        <InviteModal
          orgId={orgId}
          onClose={() => setShowInviteModal(false)}
          onSuccess={() => setShowInviteModal(false)}
        />
      )}

      {showEditModal && org && (
        <EditOrganizationModal
          organization={org}
          onSave={handleOrganizationSave}
          onClose={() => setShowEditModal(false)}
        />
      )}
    </div>
  );
}
