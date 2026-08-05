import { useState, useCallback, useRef } from 'react';
import { getAddressAutocomplete } from '@regieart/api';
import type { AutocompleteResult, SupportedCountry } from '@regieart/types';

export function useAddressAutocomplete(country: SupportedCountry) {
  const [suggestions, setSuggestions] = useState<AutocompleteResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const search = useCallback(
    (q: string) => {
      if (timerRef.current) clearTimeout(timerRef.current);
      if (q.length < 2) { setSuggestions([]); return; }

      timerRef.current = setTimeout(async () => {
        setIsLoading(true);
        try {
          const results = await getAddressAutocomplete(q, country);
          setSuggestions(results);
        } catch {
          setSuggestions([]);
        } finally {
          setIsLoading(false);
        }
      }, 300);
    },
    [country],
  );

  const clear = useCallback(() => setSuggestions([]), []);

  return { suggestions, search, isLoading, clear };
}
