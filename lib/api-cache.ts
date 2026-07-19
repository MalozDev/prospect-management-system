const CACHE_PREFIX = "crm-cache:";
const CACHE_VERSION_KEY = "crm-cache-version";
const CACHE_VERSION = "v1";
const DEFAULT_TTL_MS = 30_000; // 30 seconds — fast navigation, fresh enough

interface CacheEntry<T> {
  data: T;
  fetchedAt: number;
}

/** Ensure old cache versions are wiped on app deploy */
function ensureCacheVersion() {
  if (typeof window === "undefined") return;
  const stored = localStorage.getItem(CACHE_VERSION_KEY);
  if (stored !== CACHE_VERSION) {
    // Wipe all cache entries from previous version
    const keysToRemove: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key?.startsWith(CACHE_PREFIX)) {
        keysToRemove.push(key);
      }
    }
    keysToRemove.forEach((k) => localStorage.removeItem(k));
    localStorage.setItem(CACHE_VERSION_KEY, CACHE_VERSION);
  }
}

// Run once on module load
ensureCacheVersion();

/** Build a stable cache key from the URL (strip query params that are irrelevant) */
function cacheKey(url: string): string {
  return `${CACHE_PREFIX}${url}`;
}

/** Read a cached entry. Returns `null` if missing or expired. */
export function readCache<T>(url: string): T | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(cacheKey(url));
    if (!raw) return null;

    const entry = JSON.parse(raw) as CacheEntry<T>;
    const age = Date.now() - entry.fetchedAt;

    if (age > DEFAULT_TTL_MS) {
      // Expired — remove it so next read misses
      localStorage.removeItem(cacheKey(url));
      return null;
    }

    return entry.data;
  } catch {
    // Corrupt entry — remove it
    try {
      localStorage.removeItem(cacheKey(url));
    } catch {
      // ignore
    }
    return null;
  }
}

/** Write a response into the cache. */
export function writeCache<T>(url: string, data: T): void {
  if (typeof window === "undefined") return;
  try {
    const entry: CacheEntry<T> = { data, fetchedAt: Date.now() };
    localStorage.setItem(cacheKey(url), JSON.stringify(entry));
  } catch {
    // localStorage full or unavailable — silently skip
  }
}

/** Invalidate a specific cache entry. */
export function invalidateCache(url: string): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.removeItem(cacheKey(url));
  } catch {
    // ignore
  }
}

/** Invalidate all cache entries whose key starts with a given prefix path.
 *  E.g. invalidatePrefix("/api/prospects") clears /api/prospects, /api/prospects?status=NEW, etc. */
export function invalidatePrefix(prefix: string): void {
  if (typeof window === "undefined") return;
  const searchPrefix = cacheKey(prefix);
  try {
    const keysToRemove: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key?.startsWith(searchPrefix)) {
        keysToRemove.push(key);
      }
    }
    keysToRemove.forEach((k) => localStorage.removeItem(k));
  } catch {
    // ignore
  }
}

/** Clear ALL API caches (e.g. on logout). */
export function clearAllCaches(): void {
  if (typeof window === "undefined") return;
  const keysToRemove: string[] = [];
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key?.startsWith(CACHE_PREFIX)) {
      keysToRemove.push(key);
    }
  }
  keysToRemove.forEach((k) => localStorage.removeItem(k));
}
