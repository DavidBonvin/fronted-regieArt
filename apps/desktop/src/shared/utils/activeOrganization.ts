import type { Organization } from '@regieart/types';

export const ACTIVE_ORG_KEY = 'regieart_active_org_id';
export const ACTIVE_ORG_CHANGED_EVENT = 'regieart:organization-changed';

export function getActiveOrganization(orgs: Organization[]): Organization | null {
  const activeId = localStorage.getItem(ACTIVE_ORG_KEY);
  return (activeId ? orgs.find((org) => org.id === activeId) : null) ?? orgs[0] ?? null;
}

export function setActiveOrganization(org: Organization): void {
  localStorage.setItem(ACTIVE_ORG_KEY, org.id);
  window.dispatchEvent(new Event(ACTIVE_ORG_CHANGED_EVENT));
}
