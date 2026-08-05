import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getOrganization } from '@regieart/api';
import type { Organization, OrganizationDetail } from '@regieart/types';
import s from './OrgSwitcherModal.module.scss';

interface Props {
  orgs: Organization[];
  activeOrgId: string;
  currentUserId: string;
  onSelect: (org: Organization) => void;
  onClose: () => void;
}

export function OrgSwitcherModal({ orgs, activeOrgId, currentUserId, onSelect, onClose }: Props) {
  const navigate = useNavigate();
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
          <span className={s.title}>Seleccionar Espacio de Trabajo / Banda</span>
          <button className={s.closeBtn} onClick={onClose} aria-label="Cerrar">×</button>
        </div>

        <div className={s.body}>
          <p className={s.subtitle}>
            Selecciona la organización activa para actualizar tu agenda, shows y finanzas.
          </p>

          <div className={s.searchWrapper}>
            <span className={s.searchIcon}>🔍</span>
            <input
              className={s.searchInput}
              placeholder="Filtrar por nombre de banda..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              autoFocus
            />
          </div>

          {activeOrg && (
            <section className={s.section}>
              <div className={s.sectionLabel}>ORGANIZACIÓN ACTIVA ACTUALMENTE</div>
              <div className={`${s.orgCard} ${s.orgCardActive}`}>
                <div className={s.orgLogo}>{initials(activeOrg.name)}</div>
                <div className={s.orgInfo}>
                  <div className={s.orgName}>{activeOrg.name}</div>
                  {activeOrg.description && (
                    <div className={s.orgDesc}>{activeOrg.description}</div>
                  )}
                  <div className={s.orgMeta}>
                    {detail && <span>👥 {detail.members.length} Miembros</span>}
                    {myRole && <span>Tu Rol: {myRole}</span>}
                  </div>
                </div>
                <div className={s.activeBadge}>ACTIVA ✓</div>
              </div>
            </section>
          )}

          {others.length > 0 && (
            <section className={s.section}>
              <div className={s.sectionLabel}>OTRAS ORGANIZACIONES</div>
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
                    SELECCIONAR
                  </button>
                </div>
              ))}
            </section>
          )}

          {filtered.length === 0 && (
            <p className={s.emptyState}>No se encontraron organizaciones.</p>
          )}
        </div>

        <div className={s.footer}>
          <button
            className={s.footerLink}
            onClick={() => { onClose(); navigate('/organization/' + activeOrgId + '/invitations'); }}
          >
            🔗 Unirse a Banda
          </button>
          <div className={s.footerRight}>
            <button className={s.footerCancel} onClick={onClose}>Cancelar</button>
            <button
              className={s.footerCreate}
              onClick={() => { onClose(); navigate('/band'); }}
            >
              + NUEVA BANDA
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}
