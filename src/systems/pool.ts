/**
 * Fixed-capacity object pool. Instances are created once via the factory and
 * recycled thereafter — no per-frame allocation for the ~140 rain drops.
 */
export class Pool<T> {
  private readonly free: T[] = [];
  private readonly used = new Set<T>();
  private created = 0;

  constructor(
    private readonly capacity: number,
    private readonly factory: () => T,
  ) {}

  /** Number of instances currently in use. */
  get activeCount(): number {
    return this.used.size;
  }

  /** Total instances ever constructed (never exceeds capacity). */
  get createdCount(): number {
    return this.created;
  }

  /** Borrow an instance; returns null when the pool is exhausted. */
  acquire(): T | null {
    let item = this.free.pop();
    if (item === undefined) {
      if (this.created >= this.capacity) return null;
      item = this.factory();
      this.created += 1;
    }
    this.used.add(item);
    return item;
  }

  /** Return an instance to the pool. Unknown/double releases are ignored. */
  release(item: T): void {
    if (!this.used.delete(item)) return;
    this.free.push(item);
  }

  /** Iterate the active set (snapshot — safe to release during iteration). */
  forEachActive(fn: (item: T) => void): void {
    for (const item of [...this.used]) fn(item);
  }

  /** Release everything. */
  releaseAll(): void {
    for (const item of this.used) this.free.push(item);
    this.used.clear();
  }
}
