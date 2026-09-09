import React, { useEffect, useRef, useState } from 'react';
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { getMe, getMyOrganizations, listNotifications, getPublicInvitation, markNotificationRead, markAllNotificationsRead, acceptInvitation, rejectInvitation, clearImageCache } from '@regieart/api';
import type { User, Organization, Notification } from '@regieart/types';
import { CreateEventWizard } from '../../features/events';
import { CreateSongWizard } from '../../features/songs';
import { CreateOrganizationModal } from '../../features/organizations/pages/CreateOrganizationModal';
import { InviteModal } from '../../features/organizations/pages/MembersPage';
import type { EmailInvitation } from '@regieart/types';
import { setActiveOrganization } from '../utils/activeOrganization';
import { clearProfileMediaCache } from '../utils/profileMediaCache';
import { notificationTarget } from '../utils/notificationTarget';
import { playNotificationChime, isNotificationMuted, setNotificationMuted } from '../utils/notificationSound';
import { GlobalCreateModal } from './GlobalCreateModal';
import { OrgSwitcherModal } from './OrgSwitcherModal';
import { SignOutConfirmModal } from './SignOutConfirmModal';
import { InvitationPromptModal } from './InvitationPromptModal';
import s from './Layout.module.scss';

const NAV_SECTIONS = [
  {
    label: 'Aujourd’hui',
    items: [
      { label: 'Tableau de bord', icon: '◈', to: '/' },
      { label: 'Chronologie', icon: '⏱', to: '/timeline' },
    ],
  },
  {
    label: 'Musique',
    items: [
      { label: 'Répertoire', icon: '♪', to: '/repertoire' },
    ],
  },
  {
    label: 'Opérations',
    items: [
      { label: 'Convoi', icon: '◎', to: '/convoy' },
      { label: 'Backline', icon: '☰', to: '/backline' },
      { label: 'Finances', icon: '₿', to: '/finance' },
    ],
  },
  {
    label: 'Personnes',
    items: [
      { label: 'Messages', icon: '✉', to: '/messages' },
      { label: 'Recherche de talents', icon: '⊕', to: '/talents' },
      { label: 'Gestion du groupe', icon: '⊞', to: '/band' },
    ],
  },
];

/* 5 most important nav items — shown in the LinkedIn-style top nav */
const NAV_MAIN = [
  { label: 'Tableau de bord', icon: '◈', to: '/' },
  { label: 'Chronologie',     icon: '⏱', to: '/timeline' },
  { label: 'Répertoire',      icon: '♪', to: '/repertoire' },
  { label: 'Messages',        icon: '✉', to: '/messages' },
  { label: 'Personnes',       icon: '⊞', to: '/band' },
];

export function Layout() {
  const navigate = useNavigate();
  const location = useLocation();
  const [user, setUser] = useState<User | null>(null);
  const [org, setOrg] = useState<Organization | null>(null);
  const [allOrgs, setAllOrgs] = useState<Organization[]>([]);
  const [notifs, setNotifs] = useState<Notification[]>([]);
  const [showNotifPopover, setShowNotifPopover] = useState(false);
  const [showGlobalCreate, setShowGlobalCreate] = useState(false);
  const [showEventWizard, setShowEventWizard] = useState(false);
  const [showSongWizard, setShowSongWizard] = useState(false);
  const [showOrgSwitcher, setShowOrgSwitcher] = useState(false);
  const [showCreateOrganization, setShowCreateOrganization] = useState(false);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [showSignOutConfirm, setShowSignOutConfirm] = useState(false);
  const [pendingInvitation, setPendingInvitation] = useState<{ token: string; invitation: import('@regieart/types').InvitationPublic } | null>(null);
  const [muted, setMuted] = useState(isNotificationMuted);

  function handleCreateAction(id: string) {
    setShowGlobalCreate(false);
    setTimeout(() => {
      if (id === 'event') setShowEventWizard(true);
      else if (id === 'song') setShowSongWizard(true);
      else if (id === 'expense') navigate('/finance/receipt');
      else if (id === 'message') navigate('/messages');
      else if (id === 'invite') setShowInviteModal(true);
    }, 80);
  }
  const notifBtnRef = useRef<HTMLButtonElement>(null);
  const notifPopoverRef = useRef<HTMLDivElement>(null);
  const knownNotifIds = useRef<Set<string> | null>(null);

  const unread = notifs.filter((n) => !n.isRead).length;

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => {
      document.getElementById('main-content')?.focus({ preventScroll: true });
    });
    return () => window.cancelAnimationFrame(frame);
  }, [location.pathname]);

  useEffect(() => {
    Promise.all([getMe(), getMyOrganizations(), listNotifications({ limit: 15 })]).then(([me, orgs, notifsRes]) => {
      setUser(me);
      setAllOrgs(orgs);
      setNotifs(notifsRes.notifications);
      knownNotifIds.current = new Set(notifsRes.notifications.map((n) => n.id));
      const invitationNotif = notifsRes.notifications.find((n) => !n.isRead && n.metadata?.invitationToken);
      const invitationToken = invitationNotif?.metadata?.invitationToken;
      const shownKey = invitationToken ? `regieart:invitationPrompt:${invitationToken}` : null;
      if (invitationToken && shownKey && !sessionStorage.getItem(shownKey)) {
        getPublicInvitation(invitationToken).then((invitation) => {
          sessionStorage.setItem(shownKey, '1');
          setPendingInvitation({ token: invitationToken, invitation });
        }).catch(() => {});
      }
      const savedId = localStorage.getItem('regieart_active_org_id');
      const active = (savedId ? orgs.find((o) => o.id === savedId) : null) ?? orgs[0] ?? null;
      setOrg(active);
      if (active) setActiveOrganization(active);
    }).catch((err: unknown) => {
      const status = (err as { response?: { status?: number } })?.response?.status;
      if (status === 401) navigate('/login');
    });
  }, [navigate]);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (
        showNotifPopover &&
        notifPopoverRef.current &&
        !notifPopoverRef.current.contains(e.target as Node) &&
        !notifBtnRef.current?.contains(e.target as Node)
      ) {
        setShowNotifPopover(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showNotifPopover]);

  // Poll for new notifications and chime once per genuinely new unread one.
  useEffect(() => {
    const timer = setInterval(() => {
      if (document.hidden) return;
      listNotifications({ limit: 15 })
        .then((res) => {
          const seen = knownNotifIds.current;
          const arriving = res.notifications.filter((n) => !n.isRead);
          if (seen && arriving.some((n) => !seen.has(n.id))) playNotificationChime();
          knownNotifIds.current = new Set(res.notifications.map((n) => n.id));
          setNotifs(res.notifications);
        })
        .catch(() => {});
    }, 30_000);
    return () => clearInterval(timer);
  }, []);

  function openNotification(n: Notification) {
    setShowNotifPopover(false);
    if (!n.isRead) void handleMarkRead(n.id);
    const target = notificationTarget(n);
    if (target) navigate(target);
  }

  function closeInvitationPrompt() {
    setPendingInvitation(null);
  }

  function toggleMute() {
    const next = !muted;
    setMuted(next);
    setNotificationMuted(next);
    if (!next) playNotificationChime();
  }

  function handleOrgSelect(selected: Organization) {
    setOrg(selected);
    setActiveOrganization(selected);
    window.location.reload();
  }

  function handleOrganizationCreated(created: Organization) {
    setAllOrgs((prev) => [...prev, created]);
    setOrg(created);
    setActiveOrganization(created);
    setShowCreateOrganization(false);
    window.location.assign(`/organization/${created.id}`);
  }

  function handleSignOut() {
    setShowSignOutConfirm(false);
    localStorage.removeItem('regieart_tokens');
    clearProfileMediaCache();
    clearImageCache();
    navigate('/login', { replace: true });
  }

  async function handleMarkAll() {
    await markAllNotificationsRead();
    setNotifs((prev) => prev.map((n) => ({ ...n, isRead: true })));
  }

  async function handleMarkRead(id: string) {
    await markNotificationRead(id);
    setNotifs((prev) => prev.map((n) => n.id === id ? { ...n, isRead: true } : n));
  }

  async function handleAcceptInvite(notif: Notification) {
    const token = notif.metadata?.invitationToken;
    if (!token) { navigate('/notifications'); return; }
    try {
      const { orgId } = await acceptInvitation(token);
      await handleMarkRead(notif.id);
      setShowNotifPopover(false);
      navigate(`/organization/${orgId}`);
    } catch {
      navigate(`/invitations/${token}`);
    }
  }

  async function handleRejectInvite(notif: Notification) {
    const token = notif.metadata?.invitationToken;
    if (!token) return;
    try {
      await rejectInvitation(token);
      await handleMarkRead(notif.id);
      setNotifs((prev) => prev.filter((n) => n.id !== notif.id));
    } catch { /* silently ignore */ }
  }

  const initials = user?.displayName
    .split(' ')
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? '')
    .join('') ?? '?';

  const orgInitials = org?.name
    .split(' ')
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? '')
    .join('') ?? 'RA';

  return (
    <div className={s.appShell}>
      <a className={s.skipLink} href="#main-content">Aller au contenu principal</a>
      <aside className={s.sidebar}>
        <div className={s.sidebarTop}>
          <div className={s.brand}>
            <div className={s.brandMark}>RA</div>
            <span className={s.brandName}>RégieArt</span>
          </div>
          {org && <div className={s.orgName}>{org.name}</div>}
        </div>

        <nav className={s.nav}>
          {NAV_SECTIONS.map((section) => (
            <div key={section.label} className={s.navSection}>
              <div className={s.navSectionLabel}>{section.label}</div>
              {section.items.map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  end={item.to === '/'}
                  className={({ isActive }) =>
                    `${s.navItem}${isActive ? ' ' + s.active : ''}`
                  }
                >
                  <span className={s.navIcon}>{item.icon}</span>
                  {item.label}
                </NavLink>
              ))}
            </div>
          ))}
          {org && (
            <div className={s.navSection}>
              <div className={s.navSectionLabel}>Organisation</div>
              <NavLink
                to={`/organization/${org.id}`}
                className={({ isActive }) =>
                  `${s.navItem}${isActive ? ' ' + s.active : ''}`
                }
              >
                <span className={s.navIcon}>◉</span>
                {org.name}
              </NavLink>
            </div>
          )}
        </nav>

        <div className={s.sidebarBottom}>
          <button
            className={s.userRow}
            onClick={() => navigate('/profile/me')}
            aria-label="Ouvrir mon profil"
          >
            <div className={s.userAvatar}>{initials}</div>
            <div className={s.userInfo}>
              <div className={s.userName}>{user?.displayName ?? '…'}</div>
              <div className={s.userRole}>{org?.name ?? ''}</div>
            </div>
          </button>
        </div>
      </aside>

      <div className={s.appMain}>
        <header className={s.topbar}>

          {/* ── Desktop: LinkedIn-style top nav ─────────────────────────── */}
          <div className={s.desktopNav}>

            <NavLink to="/" className={s.brandLink} aria-label="RégieArt accueil">
              <div className={s.brandMark}>RA</div>
            </NavLink>

            <div
              className={s.searchBar}
              role="search"
              tabIndex={0}
              aria-label="Rechercher des talents"
              onClick={() => navigate('/talents')}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  navigate('/talents');
                }
              }}
            >
              <span className={s.searchBarIcon}>🔍</span>
              <input
                className={s.searchBarInput}
                placeholder="Rechercher..."
                readOnly
                tabIndex={-1}
                aria-label="Rechercher"
              />
            </div>

            <nav className={s.mainNav} aria-label="Navigation principale">
              {NAV_MAIN.map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  end={item.to === '/'}
                  className={({ isActive }) =>
                    `${s.mainNavItem}${isActive ? ' ' + s.mainNavItemActive : ''}`
                  }
                >
                  <span className={s.mainNavIcon}>{item.icon}</span>
                  <span className={s.mainNavLabel}>{item.label}</span>
                </NavLink>
              ))}
            </nav>

            <div className={s.topbarRight}>

              <button
                className={s.rightCreateBtn}
                onClick={() => setShowGlobalCreate(true)}
                aria-label="Créer"
              >
                + Créer
              </button>

              <button
                className={s.rightOrgBtn}
                onClick={() => setShowOrgSwitcher(true)}
                aria-label="Changer d’organisation"
              >
                <span className={s.rightOrgAvatar}>{orgInitials}</span>
                <span className={s.rightOrgLabel}>{org?.name ?? '—'}</span>
                <span className={s.rightChevron}>▾</span>
              </button>

              <div className={s.notifWrapper}>
                <button
                  ref={notifBtnRef}
                  className={`${s.rightNavItem} ${showNotifPopover ? s.rightNavItemActive : ''}`}
                  onClick={() => setShowNotifPopover((v) => !v)}
                  aria-label="Notifications"
                >
                  <span className={s.rightNavIcon}>🔔</span>
                  {unread > 0 && <span className={s.badge}>{unread > 9 ? '9+' : unread}</span>}
                </button>
                {showNotifPopover && (
                  <div ref={notifPopoverRef} className={s.notifPopover}>
                    <div className={s.notifPopoverHead}>
                      <span className={s.notifPopoverTitle}>Notifications</span>
                      <button
                        className={s.notifMuteBtn}
                        onClick={toggleMute}
                        aria-pressed={muted}
                        title={muted ? 'Activer le son' : 'Couper le son'}
                      >
                        {muted ? '🔕' : '🔔'}
                      </button>
                      {unread > 0 && (
                        <button className={s.markAllBtn} onClick={handleMarkAll}>
                          Tout marquer comme lu
                        </button>
                      )}
                    </div>
                    <div className={s.notifList}>
                      {notifs.length === 0 ? (
                        <div className={s.notifEmpty}>Aucune notification</div>
                      ) : (
                        notifs.slice(0, 8).map((n) => {
                          const isNewInvite = !!n.metadata?.invitationToken && !n.isRead;
                          const isOldInvite = !!n.metadata?.invitationToken && n.isRead;
                          return (
                            <div
                              key={n.id}
                              className={`${s.notifItem} ${!n.isRead ? s.notifUnread : ''}`}
                              role="button"
                              tabIndex={0}
                              onClick={() => !isNewInvite && openNotification(n)}
                              onKeyDown={(e) => {
                                if (!isNewInvite && (e.key === 'Enter' || e.key === ' ')) {
                                  e.preventDefault();
                                  openNotification(n);
                                }
                              }}
                            >
                              <div className={s.notifItemDot}>
                                {!n.isRead && <span className={s.unreadDot} />}
                              </div>
                              <div className={s.notifItemBody}>
                                <div className={s.notifItemTitle}>{n.title}</div>
                                {n.body && <div className={s.notifItemText}>{n.body}</div>}
                                <div className={s.notifItemTime}>
                                  {new Date(n.createdAt).toLocaleString('fr-FR', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                                </div>
                                {isNewInvite && (
                                  <div className={s.notifInviteActions}>
                                    <button
                                      className={s.notifRejectBtn}
                                      onClick={(e) => { e.stopPropagation(); openNotification(n); }}
                                    >
                                      Voir l’invitation
                                    </button>
                                    <button
                                      className={s.notifAcceptBtn}
                                      onClick={(e) => { e.stopPropagation(); openNotification(n); }}
                                    >
                                      Accepter →
                                    </button>
                                  </div>
                                )}
                                {isOldInvite && (
                                  <button
                                    className={s.notifDetailBtn}
                                    onClick={(e) => { e.stopPropagation(); setShowNotifPopover(false); navigate(`/invitations/${n.metadata!.invitationToken}`); }}
                                  >
                                    Voir les détails →
                                  </button>
                                )}
                              </div>
                            </div>
                          );
                        })
                      )}
                    </div>
                    <button
                      className={s.notifViewAll}
                      onClick={() => { setShowNotifPopover(false); navigate('/notifications'); }}
                    >
                      Voir toutes les notifications
                    </button>
                  </div>
                )}
              </div>

              <button
                className={s.rightNavItem}
                onClick={() => navigate('/profile/me')}
                aria-label="Mon profil"
              >
                <span className={s.rightProfileAvatar}>{initials}</span>
                <span className={s.rightNavLabel}>Moi</span>
                <span className={s.rightChevron}>▾</span>
              </button>

              <button
                className={`${s.rightNavItem} ${s.signOutBtn}`}
                onClick={() => setShowSignOutConfirm(true)}
                aria-label="Se déconnecter"
                title="Se déconnecter"
              >
                <span className={s.rightNavIcon}>⇥</span>
                <span className={s.rightNavLabel}>Quitter</span>
              </button>

            </div>
          </div>

          {/* ── Mobile: barre compacte ───────────────────────────── */}
          <div className={s.mobileBar}>
            <button
              className={s.mobileOrgBtn}
              onClick={() => setShowOrgSwitcher(true)}
              aria-label="Changer d’organisation"
            >
              <span className={s.mobileOrgAvatar}>{orgInitials}</span>
              <span className={s.mobileOrgName}>{org?.name ?? 'RégieArt'}</span>
              <span className={s.mobileOrgChevron}>▾</span>
            </button>
            <div className={s.mobileBarActions}>
              <button
                className={s.iconBtn}
                onClick={() => navigate('/notifications')}
                aria-label="Notifications"
              >
                🔔
                {unread > 0 && <span className={s.badge}>{unread > 9 ? '9+' : unread}</span>}
              </button>
              <button
                className={s.iconBtn}
                onClick={() => setShowSignOutConfirm(true)}
                aria-label="Se déconnecter"
              >
                ⇥
              </button>
            </div>
          </div>

        </header>

        <main id="main-content" className={s.appContent} tabIndex={-1}>
          <Outlet />
        </main>

        <nav className={s.mobileBottomBar}>
          <NavLink
            to="/"
            end
            className={({ isActive }) => `${s.mobileTabItem}${isActive ? ' ' + s.active : ''}`}
          >
            <span className={s.mobileTabIcon}>◈</span>
            <span className={s.mobileTabLabel}>Accueil</span>
          </NavLink>
          <NavLink
            to="/repertoire"
            className={({ isActive }) => `${s.mobileTabItem}${isActive ? ' ' + s.active : ''}`}
          >
            <span className={s.mobileTabIcon}>♪</span>
            <span className={s.mobileTabLabel}>Répertoire</span>
          </NavLink>
          <button
            className={s.mobileFab}
            onClick={() => setShowGlobalCreate(true)}
            aria-label="Créer"
          >
            +
          </button>
          <NavLink
            to="/messages"
            className={({ isActive }) => `${s.mobileTabItem}${isActive ? ' ' + s.active : ''}`}
          >
            <span className={s.mobileTabIcon}>✉</span>
            <span className={s.mobileTabLabel}>Messages</span>
          </NavLink>
          <NavLink
            to="/profile/me"
            className={({ isActive }) => `${s.mobileTabItem}${isActive ? ' ' + s.active : ''}`}
          >
            <span className={s.mobileTabIcon}>◯</span>
            <span className={s.mobileTabLabel}>Profil</span>
          </NavLink>
        </nav>
      </div>

      {showGlobalCreate && (
        <GlobalCreateModal
          onClose={() => setShowGlobalCreate(false)}
          onAction={handleCreateAction}
        />
      )}

      {showInviteModal && org && (
        <InviteModal
          orgId={org.id}
          onClose={() => setShowInviteModal(false)}
          onSuccess={(_inv: EmailInvitation) => setShowInviteModal(false)}
        />
      )}

      {showEventWizard && (
        <CreateEventWizard onClose={() => setShowEventWizard(false)} />
      )}

      {showSongWizard && (
        <CreateSongWizard onClose={() => setShowSongWizard(false)} />
      )}

      {showOrgSwitcher && org && (
        <OrgSwitcherModal
          orgs={allOrgs}
          activeOrgId={org.id}
          currentUserId={user?.id ?? ''}
          onSelect={handleOrgSelect}
          onCreateOrganization={() => { setShowOrgSwitcher(false); setShowCreateOrganization(true); }}
          onInviteByEmail={() => { setShowOrgSwitcher(false); setShowInviteModal(true); }}
          onClose={() => setShowOrgSwitcher(false)}
        />
      )}

      {showCreateOrganization && (
        <CreateOrganizationModal
          onClose={() => setShowCreateOrganization(false)}
          onCreated={handleOrganizationCreated}
        />
      )}

      {showSignOutConfirm && (
        <SignOutConfirmModal
          initials={initials}
          userName={user?.displayName ?? ''}
          orgName={org?.name}
          onConfirm={handleSignOut}
          onCancel={() => setShowSignOutConfirm(false)}
        />
      )}

      {pendingInvitation && (
        <InvitationPromptModal
          token={pendingInvitation.token}
          invitation={pendingInvitation.invitation}
          onClose={closeInvitationPrompt}
          onAccepted={(orgId) => { setPendingInvitation(null); navigate(`/organization/${orgId}`); }}
          onRejected={() => setPendingInvitation(null)}
          onViewDetails={() => { setPendingInvitation(null); navigate(`/invitations/${pendingInvitation.token}`); }}
        />
      )}
    </div>
  );
}
