import React, { useEffect, useState } from 'react';
import { getOrganization } from '@regieart/api';
import type { Organization, OrganizationDetail } from '@regieart/types';
import s from './OrgSwitcherModal.module.scss';

interface Props {
  orgs: Organization[];
  activeOrgId: string;
  currentUserId: string;
  onSelect: (org: Organization) => void;
  onCreateOrganization: () => void;
  onInviteByEmail: () => void;
  onClose: () => void;
}

export function OrgSwitcherModal({ orgs, activeOrgId, currentUserId, onSelect, onCreateOrganization, onInviteByEmail, onClose }: Props) {
  const [query, setQuery] = useState('');
  const [detail, setDetail] = useState<OrganizationDetail | null>(null);

  useEffect(() => {
    if (!activeOrgId) return;
    getOrganization(activeOrgId).then(setDetail).catch(() => null);
  }, [activeOrgId]);

  useEffect(() => {
    function onKey(e: KeyboardEvent) { if (e.key === 'Escape') onClose(); }
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

  const q = query.toLowerCase();
  const filtered = orgs.filter(
    (o) => o.name.toLowerCase().includes(q) || o.slug.toLowerCase().includes(q),
  );
  const activeOrg = filtered.find((o) => o.id === activeOrgId);
  const others = filtered.filter((o) => o.id !== activeOrgId);

  const myRole = detail?.members.find((m) => m.user.id === currentUserId)?.role ?? null;

  function initials(name: string) {
    return name.split(/\s+/).slice(0, 2).map((w) => w[0]?.toUpperCase() ?? '').join('');
  }

  function handleSelect(org: Organization) {
    onSelect(org);
    onClose();
  }

  return (
    <div className={s.overlay} onClick={onClose}>
      <div className={s.modal} onClick={(e) => e.stopPropagation()}>

        <div className={s.header}>
          <span className={s.title}>Sélectionner un espace de travail / groupe</span>
          <button className={s.closeBtn} onClick={onClose} aria-label="Fermer">×</button>
        </div>

        <div className={s.body}>
          <p className={s.subtitle}>
            Sélectionnez l’organisation active pour mettre à jour votre agenda, vos concerts et vos finances.
          </p>

          <div className={s.searchWrapper}>
            <span className={s.searchIcon}>🔍</span>
            <input
              className={s.searchInput}
              placeholder="Filtrer par nom de groupe..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              autoFocus
            />
          </div>

          {activeOrg && (
            <section className={s.section}>
              <div className={s.sectionLabel}>ORGANISATION ACTUELLEMENT ACTIVE</div>
              <div className={`${s.orgCard} ${s.orgCardActive}`}>
                <div className={s.orgLogo}>{initials(activeOrg.name)}</div>
                <div className={s.orgInfo}>
                  <div className={s.orgName}>{activeOrg.name}</div>
                  {activeOrg.description && (
                    <div className={s.orgDesc}>{activeOrg.description}</div>
                  )}
                  <div className={s.orgMeta}>
                    {detail && <span>👥 {detail.members.length} Membres</span>}
                    {myRole && <span>Votre rôle : {myRole}</span>}
                  </div>
                </div>
                <div className={s.activeBadge}>ACTIVE ✓</div>
              </div>
            </section>
          )}

          {others.length > 0 && (
            <section className={s.section}>
              <div className={s.sectionLabel}>AUTRES ORGANISATIONS</div>
              {others.map((org) => (
                <div key={org.id} className={s.orgCard}>
                  <div className={s.orgLogo}>{initials(org.name)}</div>
                  <div className={s.orgInfo}>
                    <div className={s.orgName}>{org.name}</div>
                    {org.description && (
                      <div className={s.orgDesc}>{org.description}</div>
                    )}
                    <div className={s.orgMeta}>
                      <span>{org.slug}</span>
                    </div>
                  </div>
                  <button className={s.selectBtn} onClick={() => handleSelect(org)}>
                    SÉLECTIONNER
                  </button>
                </div>
              ))}
            </section>
          )}

          {filtered.length === 0 && (
            <p className={s.emptyState}>Aucune organisation trouvée.</p>
          )}
        </div>

        <div className={s.footer}>
          <button
            className={s.footerLink}
            onClick={onInviteByEmail}
          >
            ✉ Inviter par e-mail
          </button>
          <div className={s.footerRight}>
            <button className={s.footerCancel} onClick={onClose}>Annuler</button>
            <button
              className={s.footerCreate}
              onClick={onCreateOrganization}
            >
              + NOUVEAU GROUPE
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}
