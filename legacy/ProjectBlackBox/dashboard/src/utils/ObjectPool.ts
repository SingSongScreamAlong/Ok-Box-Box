/**
 * Generic object pool implementation for efficient object reuse
 * Reduces garbage collection overhead for frequently created/destroyed objects
 */
export class ObjectPool<T> {
  private pool: T[] = [];
  private factory: () => T;
  private reset?: (obj: T) => void;
  private maxSize: number;
  
  /**
   * Create a new object pool
   * 
   * @param factory Function that creates new objects for the pool
   * @param reset Optional function to reset an object before returning it to the pool
   * @param initialSize Number of objects to pre-populate the pool with
   * @param maxSize Maximum size of the pool (to prevent memory leaks)
   */
  constructor(
    factory: () => T, 
    reset?: (obj: T) => void,
    initialSize: number = 10,
    maxSize: number = 100
  ) {
    this.factory = factory;
    this.reset = reset;
    this.maxSize = maxSize;
    
    // Pre-populate pool
    for (let i = 0; i < initialSize; i++) {
      this.pool.push(this.factory());
    }
  }
  
  /**
   * Get an object from the pool or create a new one if the pool is empty
   */
  get(): T {
    if (this.pool.length > 0) {
      return this.pool.pop()!;
    }
    return this.factory();
  }
  
  /**
   * Return an object to the pool for reuse
   * If a reset function was provided, it will be called on the object
   * If the pool is at maximum capacity, the object will be discarded
   */
  release(obj: T): void {
    if (this.pool.length >= this.maxSize) {
      return; // Discard the object if pool is at max capacity
    }
    
    if (this.reset) {
      this.reset(obj);
    }
    
    this.pool.push(obj);
  }
  
  /**
   * Get the current size of the pool
   */
  size(): number {
    return this.pool.length;
  }
  
  /**
   * Clear all objects from the pool
   */
  clear(): void {
    this.pool = [];
  }
}
