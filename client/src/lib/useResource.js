import { useState, useEffect, useCallback } from 'react';

/**
 * Ruo UEMS — Lightweight Data Resource Hook
 * Handles loading, error, success states, and manual reload.
 */
export function useResource(fetchFn, deps = []) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const execute = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await fetchFn();
      setData(result);
      return result;
    } catch (err) {
      setError(err);
      return null;
    } finally {
      setLoading(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  useEffect(() => {
    execute();
  }, [execute]);

  return {
    data,
    loading,
    error,
    reload: execute,
    setData
  };
}

export default useResource;
