import { useEffect, useState, useCallback, useRef } from "react";
import { apiFetch, getToken } from "./api-client";
import { readCache, writeCache } from "./api-cache";

interface UseApiDataResult<T> {
  data: T;
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

export function useApiData<T>(
  url: string | null,
  defaultValue: T
): UseApiDataResult<T> {
  // Hydrate from cache immediately if available
  const cached = url ? readCache<T>(url) : null;
  const [data, setData] = useState<T>(cached ?? defaultValue);
  const [loading, setLoading] = useState(!cached); // skip loading if we have cache
  const [error, setError] = useState<string | null>(null);
  const mountedRef = useRef(true);

  const refetch = useCallback(async () => {
    if (!url) {
      setData(defaultValue);
      setLoading(false);
      return;
    }

    if (!getToken()) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const result = await apiFetch<T>(url);
      if (mountedRef.current) {
        setData(result);
        // Write to cache for instant navigation next time
        writeCache(url, result);
      }
    } catch (err) {
      if (mountedRef.current) {
        setError(err instanceof Error ? err.message : "Failed to fetch data");
        // Keep old data on error
      }
    } finally {
      if (mountedRef.current) {
        setLoading(false);
      }
    }
  }, [url]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    refetch();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [url]);

  return { data, loading, error, refetch };
}
