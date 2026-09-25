import { describe, expect, it } from 'vitest';
import { Pool } from '../src/systems/pool';

describe('Pool', () => {
  it('creates lazily up to capacity and then returns null', () => {
    let created = 0;
    const pool = new Pool(2, () => ({ id: ++created }));
    const a = pool.acquire();
    const b = pool.acquire();
    expect(a).not.toBeNull();
    expect(b).not.toBeNull();
    expect(pool.acquire()).toBeNull();
    expect(created).toBe(2);
  });

  it('reuses released instances instead of constructing new ones', () => {
    let created = 0;
    const pool = new Pool(5, () => ({ id: ++created }));
    const first = pool.acquire()!;
    pool.release(first);
    const second = pool.acquire()!;
    expect(second).toBe(first); // same object identity — true reuse
    expect(created).toBe(1);
  });

  it('tracks active count through acquire/release cycles', () => {
    const pool = new Pool(3, () => ({}));
    const a = pool.acquire()!;
    const b = pool.acquire()!;
    expect(pool.activeCount).toBe(2);
    pool.release(a);
    expect(pool.activeCount).toBe(1);
    pool.release(b);
    expect(pool.activeCount).toBe(0);
  });

  it('ignores double release and foreign objects', () => {
    const pool = new Pool(2, () => ({}));
    const a = pool.acquire()!;
    pool.release(a);
    pool.release(a); // double release
    pool.release({}); // never acquired
    expect(pool.acquire()).toBe(a);
    expect(pool.acquire()).not.toBeNull(); // capacity still intact
    expect(pool.acquire()).toBeNull();
  });

  it('releaseAll returns everything for reuse', () => {
    let created = 0;
    const pool = new Pool(3, () => ({ id: ++created }));
    pool.acquire();
    pool.acquire();
    pool.acquire();
    pool.releaseAll();
    expect(pool.activeCount).toBe(0);
    pool.acquire();
    pool.acquire();
    pool.acquire();
    expect(created).toBe(3); // no new constructions
  });

  it('forEachActive tolerates releases during iteration', () => {
    const pool = new Pool(4, () => ({}));
    for (let i = 0; i < 4; i++) pool.acquire();
    let visited = 0;
    pool.forEachActive((item) => {
      visited += 1;
      pool.release(item);
    });
    expect(visited).toBe(4);
    expect(pool.activeCount).toBe(0);
  });
});
