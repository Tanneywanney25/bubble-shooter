export interface StorageLike {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

const BEST_KEY = 'storm-shelter.best';

/** Tracks the current run's survival time and near-miss count, plus the stored best. */
export class SurvivalTracker {
  private elapsed = 0;
  private nearMisses = 0;
  private running = false;

  constructor(private readonly storage: StorageLike) {}

  get timeSeconds(): number {
    return this.elapsed;
  }

  get nearMissCount(): number {
    return this.nearMisses;
  }

  get best(): number {
    const parsed = Number(this.storage.getItem(BEST_KEY));
    return Number.isFinite(parsed) && parsed > 0 ? parsed : 0;
  }

  start(): void {
    this.elapsed = 0;
    this.nearMisses = 0;
    this.running = true;
  }

  tick(dtSeconds: number): void {
    if (this.running) this.elapsed += dtSeconds;
  }

  /**
   * Classify a bolt impact at `distance` px from the umbrella center.
   * Within `radius` (but not a hit) counts as one near miss.
   */
  registerBoltLanding(distance: number, radius: number): boolean {
    const near = this.running && distance <= radius;
    if (near) this.nearMisses += 1;
    return near;
  }

  /** End the run; persists a new best when beaten. Returns final time. */
  end(): number {
    this.running = false;
    if (this.elapsed > this.best) {
      this.storage.setItem(BEST_KEY, this.elapsed.toFixed(1));
    }
    return this.elapsed;
  }
}
