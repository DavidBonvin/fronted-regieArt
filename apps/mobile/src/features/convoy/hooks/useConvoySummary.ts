import { useState, useEffect, useCallback } from 'react';
import { getConvoySummary } from '@regieart/api';
import type { ConvoySummaryItem } from '@regieart/types';

interface State {
  vehicles: ConvoySummaryItem[];
  isLoading: boolean;
  error: string | null;
}

export function useConvoySummary(eventId: string) {
  const [state, setState] = useState<State>({ vehicles: [], isLoading: true, error: null });

  const refetch = useCallback(async () => {
    setState((prev) => ({ ...prev, isLoading: true, error: null }));
    try {
      const vehicles = await getConvoySummary(eventId);
      setState({ vehicles, isLoading: false, error: null });
    } catch (err) {
      setState({
        vehicles: [],
        isLoading: false,
        error: err instanceof Error ? err.message : 'Error al cargar el convoy',
      });
    }
  }, [eventId]);

  useEffect(() => { refetch(); }, [refetch]);

  return { ...state, refetch };
}
