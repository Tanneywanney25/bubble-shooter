import { describe, expect, it } from 'vitest';
import { SurvivalTracker, type StorageLike } from '../src/systems/survival';

function memoryStorage(initial: Record<string, string> = {}): StorageLike {
  const map = new Map(Object.entries(initial));
  return {
    getItem: (k) => map.get(k) ?? null,
    setItem: (k, v) => void map.set(k, v),
  };
}

describe('SurvivalTracker timer', () => {
  it('accumulates only while running', () => {
    const tracker = new SurvivalTracker(memoryStorage());
    tracker.tick(5); // not started yet
    expect(tracker.timeSeconds).toBe(0);
    tracker.start();
    tracker.tick(1.5);
    tracker.tick(0.5);
    expect(tracker.timeSeconds).toBeCloseTo(2);
    tracker.end();
    tracker.tick(3); // stopped
    expect(tracker.timeSeconds).toBeCloseTo(2);
  });

  it('start resets time and near misses', () => {
    const tracker = new SurvivalTracker(memoryStorage());
    tracker.start();
    tracker.tick(4);
    tracker.registerBoltLanding(10, 90);
    tracker.start();
    expect(tracker.timeSeconds).toBe(0);
    expect(tracker.nearMissCount).toBe(0);
  });
});

describe('near-miss classification', () => {
  it('counts landings inside the radius, ignores those outside', () => {
    const tracker = new SurvivalTracker(memoryStorage());
    tracker.start();
    expect(tracker.registerBoltLanding(89.9, 90)).toBe(true);
    expect(tracker.registerBoltLanding(90, 90)).toBe(true); // boundary inclusive
    expect(tracker.registerBoltLanding(90.1, 90)).toBe(false);
    expect(tracker.nearMissCount).toBe(2);
  });

  it('does not count near misses before the run starts', () => {
    const tracker = new SurvivalTracker(memoryStorage());
    expect(tracker.registerBoltLanding(5, 90)).toBe(false);
    expect(tracker.nearMissCount).toBe(0);
  });
});

describe('best time persistence', () => {
  it('stores a new best and keeps the old one when worse', () => {
    const storage = memoryStorage();
    const tracker = new SurvivalTracker(storage);
    tracker.start();
    tracker.tick(12.34);
    expect(tracker.end()).toBeCloseTo(12.34);
    expect(tracker.best).toBeCloseTo(12.3); // stored at 0.1s precision

    tracker.start();
    tracker.tick(5);
    tracker.end();
    expect(tracker.best).toBeCloseTo(12.3);

    tracker.start();
    tracker.tick(20);
    tracker.end();
    expect(tracker.best).toBeCloseTo(20);
  });

  it('treats corrupt stored values as no best', () => {
    const tracker = new SurvivalTracker(memoryStorage({ 'storm-shelter.best': 'junk' }));
    expect(tracker.best).toBe(0);
  });
});
