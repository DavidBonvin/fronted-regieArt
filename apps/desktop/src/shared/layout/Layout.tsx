import React, { useEffect, useState } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { getMe, getMyOrganizations } from '@regieart/api';
import type { User, Organization } from '@regieart/types';
import { CreateEventWizard } from '../../features/events';
import { OrgSwitcherModal } from './OrgSwitcherModal';
import s from './Layout.module.scss';

const ACTIVE_ORG_KEY = 'regieart_active_org_id';

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

export function Layout() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [user, setUser] = useState<User | null>(null);
  const [org, setOrg] = useState<Organization | null>(null);
  const [allOrgs, setAllOrgs] = useState<Organization[]>([]);
  const [unread] = useState(0);
  const [showCreateWizard, setShowCreateWizard] = useState(false);
  const [showOrgSwitcher, setShowOrgSwitcher] = useState(false);

  useEffect(() => {
    Promise.all([getMe(), getMyOrganizations()]).then(([me, orgs]) => {
      setUser(me);
      setAllOrgs(orgs);
      const savedId = localStorage.getItem(ACTIVE_ORG_KEY);
      const active = (savedId ? orgs.find((o) => o.id === savedId) : null) ?? orgs[0] ?? null;
      setOrg(active);
      if (active) localStorage.setItem(ACTIVE_ORG_KEY, active.id);
    }).catch((err: unknown) => {
      const status = (err as { response?: { status?: number } })?.response?.status;
      if (status === 401) navigate('/login');
    });
  }, [navigate]);

  function handleOrgSelect(selected: Organization) {
    setOrg(selected);
    localStorage.setItem(ACTIVE_ORG_KEY, selected.id);
  }

  function handleSignOut() {
    navigate('/login');
  }

  const initials = user?.displayName
    .split(' ')
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? '')
    .join('') ?? '?';

  return (
    <div className={s.root}>
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

      <div className={s.main}>
        <header className={s.topbar}>
          <span className={s.topbarTitle}>{org?.name ?? 'RégieArt'}</span>
          <div className={s.topbarActions}>
            <button
              className={s.orgSwitcherBtn}
              onClick={() => setShowOrgSwitcher(true)}
              aria-label="Cambiar organización"
            >
              <span className={s.orgSwitcherIcon}>⇄</span>
              <span className={s.orgSwitcherName}>{org?.name ?? 'Organización'}</span>
              <span className={s.orgSwitcherChevron}>▾</span>
            </button>
            <button
              className={s.createBtn}
              onClick={() => setShowCreateWizard(true)}
              aria-label="Crear nuevo"
            >
              + Crear
            </button>
            <button className={s.iconBtn} onClick={() => navigate('/notifications')} aria-label="Notifications">
              🔔
              {unread > 0 && <span className={s.badge} />}
            </button>
            <button className={s.iconBtn} onClick={handleSignOut} aria-label="Sign out" title="Sign out">
              ⇥
            </button>
          </div>
        </header>

        <main className={s.content}>
          <Outlet />
        </main>
      </div>

      {showCreateWizard && (
        <CreateEventWizard onClose={() => setShowCreateWizard(false)} />
      )}

      {showOrgSwitcher && org && (
        <OrgSwitcherModal
          orgs={allOrgs}
          activeOrgId={org.id}
          currentUserId={user?.id ?? ''}
          onSelect={handleOrgSelect}
          onClose={() => setShowOrgSwitcher(false)}
        />
      )}
    </div>
  );
}
