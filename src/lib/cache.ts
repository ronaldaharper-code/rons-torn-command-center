type CacheEntry<T> = {
  value: T;
  expires: number;
};

const cache = new Map<string, CacheEntry<unknown>>();

export async function cached<T>(key: string, ttlSeconds: number, loader: () => Promise<T>): Promise<T> {
  const now = Date.now();
  const entry = cache.get(key) as CacheEntry<T> | undefined;

  if (entry && entry.expires > now) {
    return entry.value;
  }

  const value = await loader();
  cache.set(key, { value, expires: now + ttlSeconds * 1000 });
  return value;
}
