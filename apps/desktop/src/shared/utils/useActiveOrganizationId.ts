import { useSyncExternalStore } from 'react';
import { ACTIVE_ORG_CHANGED_EVENT, ACTIVE_ORG_KEY } from './activeOrganization';

function subscribe(onStoreChange: () => void): () => void {
  window.addEventListener(ACTIVE_ORG_CHANGED_EVENT, onStoreChange);
  window.addEventListener('storage', onStoreChange);
  return () => {
    window.removeEventListener(ACTIVE_ORG_CHANGED_EVENT, onStoreChange);
    window.removeEventListener('storage', onStoreChange);
  };
}

function getSnapshot(): string | null {
  return localStorage.getItem(ACTIVE_ORG_KEY);
}

export function useActiveOrganizationId(): string | null {
  return useSyncExternalStore(subscribe, getSnapshot, () => null);
}
