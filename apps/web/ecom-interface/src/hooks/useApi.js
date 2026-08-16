import { useCallback, useEffect, useState } from 'react';

export function useApi(loader, dependencies = []) {
  const [state, setState] = useState({ data: null, loading: true, error: null, attempt: 0 });
  const retry = useCallback(() => setState((current) => ({ ...current, attempt: current.attempt + 1 })), []);
  useEffect(() => {
    const controller = new window.AbortController();
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setState((current) => ({ ...current, loading: true, error: null }));
    loader(controller.signal).then((data) => setState((current) => ({ ...current, data, loading: false }))).catch((error) => { if (error.name !== 'AbortError') setState((current) => ({ ...current, error, loading: false })); });
    return () => controller.abort();
    // Dependencies are supplied by callers to deliberately control refetching.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...dependencies, state.attempt]);
  return { ...state, retry };
}
