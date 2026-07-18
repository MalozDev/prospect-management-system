import { useEffect, useState, useCallback } from "react";
import { apiFetch, getToken } from "./api-client";

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
  const [data, setData] = useState<T>(defaultValue);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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
      setData(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch data");
      // Keep old data on error
    } finally {
      setLoading(false);
    }
  }, [url]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    refetch();
  }, [refetch]);

  return { data, loading, error, refetch };
}
