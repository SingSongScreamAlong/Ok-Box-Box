declare module 'node-cache' {
  interface KeyVal {
    [key: string]: any;
  }

  interface Stats {
    keys: number;
    hits: number;
    misses: number;
    ksize: number;
    vsize: number;
  }

  interface Options {
    stdTTL?: number;
    checkperiod?: number;
    errorOnMissing?: boolean;
    useClones?: boolean;
    deleteOnExpire?: boolean;
    maxKeys?: number;
  }

  class NodeCache {
    constructor(options?: Options);

    set<T>(key: string, value: T, ttl?: number | string): boolean;
    set<T>(keyValueSet: KeyVal): boolean;
    
    get<T>(key: string): T | undefined;
    get<T>(keys: string[]): KeyVal;
    
    has(key: string): boolean;
    
    del(keys: string | string[]): number;
    
    ttl(key: string, ttl: number): boolean;
    getTtl(key: string): number | undefined;
    
    keys(): string[];
    
    getStats(): Stats;
    
    flushStats(): void;
    
    flushAll(): void;
    
    close(): void;
    
    // Event emitters
    on(event: 'del', callback: (key: string, value: any) => void): void;
    on(event: 'expired', callback: (key: string, value: any) => void): void;
    on(event: 'flush', callback: () => void): void;
    on(event: 'flush_stats', callback: () => void): void;
    on(event: string, callback: (...args: any[]) => void): void;
  }

  export = NodeCache;
}
