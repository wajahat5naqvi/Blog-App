'use client';

import { useState, useCallback } from 'react';

interface UseFetchState<T> {
  data: T | null;
  loading: boolean;
  error: Error | null;
}

interface UseFetchActions<T> {
  fetchData: () => Promise<T>;
  setData: (data: T) => void;
  setError: (error: Error) => void;
  reset: () => void;
}

export function useFetch<T>(
  fetchFunction: () => Promise<T>
): [UseFetchState<T>, UseFetchActions<T>] {
  const [state, setState] = useState<UseFetchState<T>>({
    data: null,
    loading: false,
    error: null,
  });

  const fetchData = useCallback(async () => {
    setState(prev => ({ ...prev, loading: true, error: null }));
    
    try {
      const data = await fetchFunction();
      setState({ data, loading: false, error: null });
      return data;
    } catch (error) {
      setState(prev => ({ ...prev, loading: false, error: error as Error }));
      throw error;
    }
  }, [fetchFunction]);

  const setData = useCallback((data: T) => {
    setState(prev => ({ ...prev, data }));
  }, []);

  const setError = useCallback((error: Error) => {
    setState(prev => ({ ...prev, error }));
  }, []);

  const reset = useCallback(() => {
    setState({ data: null, loading: false, error: null });
  }, []);

  return [
    state,
    { fetchData, setData, setError, reset }
  ];
}

export default useFetch;