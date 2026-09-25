/** DOM HUD: survival time, near misses, wind, best. */
export class Hud {
  private readonly timeEl: HTMLElement;
  private readonly nearEl: HTMLElement;
  private readonly windEl: HTMLElement;
  private readonly bestEl: HTMLElement;

  constructor() {
    this.timeEl = Hud.require('#hud-time');
    this.nearEl = Hud.require('#hud-near');
    this.windEl = Hud.require('#hud-wind');
    this.bestEl = Hud.require('#hud-best');
  }

  private static require(selector: string): HTMLElement {
    const el = document.querySelector<HTMLElement>(selector);
    if (!el) throw new Error(`Missing HUD element ${selector}`);
    return el;
  }

  update(timeSeconds: number, nearMisses: number, wind: number, best: number): void {
    this.timeEl.textContent = `Time: ${timeSeconds.toFixed(1)}s`;
    this.nearEl.textContent = `Near misses: ${nearMisses}`;
    const arrow = wind > 0 ? '→' : wind < 0 ? '←' : '·';
    this.windEl.textContent = `Wind: ${arrow} ${(Math.abs(wind) * 10000).toFixed(1)}`;
    this.bestEl.textContent = `Best: ${best.toFixed(1)}s`;
  }
}
