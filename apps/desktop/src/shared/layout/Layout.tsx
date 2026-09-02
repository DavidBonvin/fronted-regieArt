import React, { useEffect, useRef, useState } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { getMe, getMyOrganizations, listNotifications, markNotificationRead, markAllNotificationsRead, acceptInvitation, rejectInvitation } from '@regieart/api';
import type { User, Organization, Notification } from '@regieart/types';
import { CreateEventWizard } from '../../features/events';
import { CreateSongWizard } from '../../features/songs';
import { CreateOrganizationModal } from '../../features/organizations/pages/CreateOrganizationModal';
import { InviteModal } from '../../features/organizations/pages/MembersPage';
import type { EmailInvitation } from '@regieart/types';
import { setActiveOrganization } from '../utils/activeOrganization';
import { GlobalCreateModal } from './GlobalCreateModal';
import { OrgSwitcherModal } from './OrgSwitcherModal';
import s from './Layout.module.scss';

const NAV_SECTIONS = [
  {
    label: 'nav.today',
    items: [
      { label: 'nav.dashboard', icon: '◈', to: '/' },
      { label: 'nav.timeline', icon: '⏱', to: '/timeline' },
    ],
  },
  {
    label: 'nav.music',
    items: [
      { label: 'nav.repertoire', icon: '♪', to: '/repertoire' },
    ],
  },
  {
    label: 'nav.operations',
    items: [
      { label: 'nav.convoy', icon: '◎', to: '/convoy' },
      { label: 'nav.backline', icon: '☰', to: '/backline' },
      { label: 'nav.finance', icon: '₿', to: '/finance' },
    ],
  },
  {
    label: 'nav.people',
    items: [
      { label: 'nav.messages', icon: '✉', to: '/messages' },
      { label: 'nav.talent_search', icon: '⊕', to: '/talents' },
      { label: 'nav.band_management', icon: '⊞', to: '/band' },
    ],
  },
];

/* 5 most important nav items — shown in the LinkedIn-style top nav */
const NAV_MAIN = [
  { label: 'nav.dashboard',  icon: '◈', to: '/' },
  { label: 'nav.timeline',   icon: '⏱', to: '/timeline' },
  { label: 'nav.repertoire', icon: '♪', to: '/repertoire' },
  { label: 'nav.messages',   icon: '✉', to: '/messages' },
  { label: 'nav.people',     icon: '⊞', to: '/band' },
];

export function Layout() {
  const { t } = useTranslation();
  const navigate = useNavigate();
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

  const unread = notifs.filter((n) => !n.isRead).length;

  useEffect(() => {
    Promise.all([getMe(), getMyOrganizations(), listNotifications({ limit: 15 })]).then(([me, orgs, notifsRes]) => {
      setUser(me);
      setAllOrgs(orgs);
      setNotifs(notifsRes.notifications);
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
    localStorage.removeItem('regieart_tokens');
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
              <div className={s.navSectionLabel}>{t(section.label)}</div>
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
                  {t(item.label)}
                </NavLink>
              ))}
            </div>
          ))}
          {org && (
            <div className={s.navSection}>
              <div className={s.navSectionLabel}>Organización</div>
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
          <div className={s.userRow} onClick={() => navigate('/profile/me')}>
            <div className={s.userAvatar}>{initials}</div>
            <div className={s.userInfo}>
              <div className={s.userName}>{user?.displayName ?? '…'}</div>
              <div className={s.userRole}>{org?.name ?? ''}</div>
            </div>
          </div>
        </div>
      </aside>

      <div className={s.appMain}>
        <header className={s.topbar}>

          {/* ── Desktop: LinkedIn-style top nav ─────────────────────────── */}
          <div className={s.desktopNav}>

            <NavLink to="/" className={s.brandLink} aria-label="RégieArt inicio">
              <div className={s.brandMark}>RA</div>
            </NavLink>

            <div className={s.searchBar} role="search" onClick={() => navigate('/talents')}>
              <span className={s.searchBarIcon}>🔍</span>
              <input
                className={s.searchBarInput}
                placeholder="Buscar..."
                readOnly
                aria-label="Buscar"
              />
            </div>

            <nav className={s.mainNav} aria-label="Navegación principal">
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
                  <span className={s.mainNavLabel}>{t(item.label)}</span>
                </NavLink>
              ))}
            </nav>

            <div className={s.topbarRight}>

              <button
                className={s.rightCreateBtn}
                onClick={() => setShowGlobalCreate(true)}
                aria-label="Crear nuevo"
              >
                + Crear
              </button>

              <button
                className={s.rightOrgBtn}
                onClick={() => setShowOrgSwitcher(true)}
                aria-label="Cambiar organización"
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
                  aria-label="Notificaciones"
                >
                  <span className={s.rightNavIcon}>🔔</span>
                  {unread > 0 && <span className={s.badge}>{unread > 9 ? '9+' : unread}</span>}
                </button>
                {showNotifPopover && (
                  <div ref={notifPopoverRef} className={s.notifPopover}>
                    <div className={s.notifPopoverHead}>
                      <span className={s.notifPopoverTitle}>Notificaciones</span>
                      {unread > 0 && (
                        <button className={s.markAllBtn} onClick={handleMarkAll}>
                          Marcar leídas
                        </button>
                      )}
                    </div>
                    <div className={s.notifList}>
                      {notifs.length === 0 ? (
                        <div className={s.notifEmpty}>Sin notificaciones</div>
                      ) : (
                        notifs.slice(0, 8).map((n) => {
                          const isNewInvite = !!n.metadata?.invitationToken && !n.isRead;
                          const isOldInvite = !!n.metadata?.invitationToken && n.isRead;
                          return (
                            <div
                              key={n.id}
                              className={`${s.notifItem} ${!n.isRead ? s.notifUnread : ''}`}
                              onClick={() => !n.isRead && !isNewInvite && void handleMarkRead(n.id)}
                            >
                              <div className={s.notifItemDot}>
                                {!n.isRead && <span className={s.unreadDot} />}
                              </div>
                              <div className={s.notifItemBody}>
                                <div className={s.notifItemTitle}>{n.title}</div>
                                {n.body && <div className={s.notifItemText}>{n.body}</div>}
                                <div className={s.notifItemTime}>
                                  {new Date(n.createdAt).toLocaleString('es-AR', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                                </div>
                                {isNewInvite && (
                                  <div className={s.notifInviteActions}>
                                    <button
                                      className={s.notifRejectBtn}
                                      onClick={(e) => { e.stopPropagation(); void handleRejectInvite(n); }}
                                    >
                                      Rechazar
                                    </button>
                                    <button
                                      className={s.notifAcceptBtn}
                                      onClick={(e) => { e.stopPropagation(); void handleAcceptInvite(n); }}
                                    >
                                      Aceptar →
                                    </button>
                                  </div>
                                )}
                                {isOldInvite && (
                                  <button
                                    className={s.notifDetailBtn}
                                    onClick={(e) => { e.stopPropagation(); setShowNotifPopover(false); navigate(`/invitations/${n.metadata!.invitationToken}`); }}
                                  >
                                    Ver detalles →
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
                      Ver todas las notificaciones
                    </button>
                  </div>
                )}
              </div>

              <button
                className={s.rightNavItem}
                onClick={() => navigate('/profile/me')}
                aria-label="Mi perfil"
              >
                <span className={s.rightProfileAvatar}>{initials}</span>
                <span className={s.rightNavLabel}>Yo</span>
                <span className={s.rightChevron}>▾</span>
              </button>

              <button
                className={`${s.rightNavItem} ${s.signOutBtn}`}
                onClick={handleSignOut}
                aria-label="Cerrar sesión"
                title="Cerrar sesión"
              >
                <span className={s.rightNavIcon}>⇥</span>
                <span className={s.rightNavLabel}>Salir</span>
              </button>

            </div>
          </div>

          {/* ── Mobile: barra compacta ──────────────────────────────────── */}
          <div className={s.mobileBar}>
            <button
              className={s.mobileOrgBtn}
              onClick={() => setShowOrgSwitcher(true)}
              aria-label="Cambiar organización"
            >
              <span className={s.mobileOrgAvatar}>{orgInitials}</span>
              <span className={s.mobileOrgName}>{org?.name ?? 'RégieArt'}</span>
              <span className={s.mobileOrgChevron}>▾</span>
            </button>
            <button
              className={s.iconBtn}
              onClick={() => navigate('/notifications')}
              aria-label="Notificaciones"
            >
              🔔
              {unread > 0 && <span className={s.badge}>{unread > 9 ? '9+' : unread}</span>}
            </button>
          </div>

        </header>

        <main className={s.appContent}>
          <Outlet />
        </main>

        <nav className={s.mobileBottomBar}>
          <NavLink
            to="/"
            end
            className={({ isActive }) => `${s.mobileTabItem}${isActive ? ' ' + s.active : ''}`}
          >
            <span className={s.mobileTabIcon}>◈</span>
            <span className={s.mobileTabLabel}>Inicio</span>
          </NavLink>
          <NavLink
            to="/repertoire"
            className={({ isActive }) => `${s.mobileTabItem}${isActive ? ' ' + s.active : ''}`}
          >
            <span className={s.mobileTabIcon}>♪</span>
            <span className={s.mobileTabLabel}>Repertorio</span>
          </NavLink>
          <button
            className={s.mobileFab}
            onClick={() => setShowGlobalCreate(true)}
            aria-label="Crear nuevo"
          >
            +
          </button>
          <NavLink
            to="/messages"
            className={({ isActive }) => `${s.mobileTabItem}${isActive ? ' ' + s.active : ''}`}
          >
            <span className={s.mobileTabIcon}>✉</span>
            <span className={s.mobileTabLabel}>Mensajes</span>
          </NavLink>
          <NavLink
            to="/profile/me"
            className={({ isActive }) => `${s.mobileTabItem}${isActive ? ' ' + s.active : ''}`}
          >
            <span className={s.mobileTabIcon}>◯</span>
            <span className={s.mobileTabLabel}>Perfil</span>
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
    </div>
  );
}
