interface CacheEntry<T> {
  value: T;
  expires: number;
}

export class Cache<T> {
  private cache: Map<string, CacheEntry<T>>;
  private ttl: number;

  constructor(ttlMs: number) {
    this.cache = new Map();
    this.ttl = ttlMs;
  }

  get(key: string): T | undefined {
    const entry = this.cache.get(key);
    if (!entry) return undefined;

    if (Date.now() > entry.expires) {
      this.cache.delete(key);
      return undefined;
    }

    return entry.value;
  }

  set(key: string, value: T): void {
    const expires = Date.now() + this.ttl;
    this.cache.set(key, { value, expires });
  }

  clear(): void {
    this.cache.clear();
  }
}