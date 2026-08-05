import { useState, useCallback, useRef } from 'react';
import { calculateRoute } from '@regieart/api';
import type { RouteResult } from '@regieart/types';

interface State {
  isLoading: boolean;
  error: string | null;
  errorStatus: number | null;
}

export function useCalculateRoute(
  eventId: string,
  vehicleId: string,
  onSuccess?: () => void,
) {
  const [state, setState] = useState<State>({ isLoading: false, error: null, errorStatus: null });
  const onSuccessRef = useRef(onSuccess);
  onSuccessRef.current = onSuccess;

  const calculate = useCallback(async (): Promise<RouteResult> => {
    setState({ isLoading: true, error: null, errorStatus: null });
    try {
      const result = await calculateRoute(eventId, vehicleId);
      onSuccessRef.current?.();
      setState({ isLoading: false, error: null, errorStatus: null });
      return result;
    } catch (err: unknown) {
      let msg = 'Error al calcular la ruta';
      let status: number | null = null;
      if (err && typeof err === 'object' && 'response' in err) {
        const httpErr = err as { response: Response };
        status = httpErr.response.status;
        try {
          const body = (await httpErr.response.json()) as { message?: string };
          msg = body.message ?? msg;
        } catch { /* keep default */ }
      } else if (err instanceof Error) {
        msg = err.message;
      }
      setState({ isLoading: false, error: msg, errorStatus: status });
      throw err;
    }
  }, [eventId, vehicleId]);

  return { calculate, ...state };
}
