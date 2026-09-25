import p5 from 'p5';
import { defaultConfig } from './config';
import { mulberry32 } from './core/rng';
import { RainWorld } from './game/world';
import { createSketch } from './sketch';
import { SurvivalTracker } from './systems/survival';
import { Hud } from './ui/hud';
import { buildSettingsPanel, readSettings, writeSettings } from './ui/settings';

function safeStorage(): { getItem(k: string): string | null; setItem(k: string, v: string): void } {
  try {
    const probe = '__storm_probe__';
    window.localStorage.setItem(probe, '1');
    window.localStorage.removeItem(probe);
    return window.localStorage;
  } catch {
    const mem = new Map<string, string>();
    return { getItem: (k) => mem.get(k) ?? null, setItem: (k, v) => void mem.set(k, v) };
  }
}

const cfg = structuredClone(defaultConfig);
const storage = safeStorage();
const settings = readSettings(storage, {
  gravityY: cfg.physics.gravityY,
  windMax10k: Math.round(cfg.drops.windCurve.end * 10000),
  dropCap: cfg.drops.countCurve.end,
});

// Apply persisted settings to the live config before the world is built.
cfg.physics.gravityY = settings.gravityY;
cfg.drops.windCurve.end = settings.windMax10k / 10000;
cfg.drops.countCurve.end = settings.dropCap;

const rng = mulberry32(Date.now() >>> 0);
const tracker = new SurvivalTracker(storage);
const world = new RainWorld(cfg, rng, tracker);
const hud = new Hud();

new p5(
  createSketch({
    cfg,
    world,
    rng,
    onFrame: () => {
      hud.update(tracker.timeSeconds, tracker.nearMissCount, world.windNow, tracker.best);
    },
  }),
);

const panel = document.querySelector<HTMLElement>('#settings-panel');
const toggle = document.querySelector<HTMLElement>('#settings-toggle');
if (panel && toggle) {
  buildSettingsPanel(panel, toggle, settings, (next) => {
    world.setGravity(next.gravityY);
    cfg.drops.windCurve.end = next.windMax10k / 10000;
    cfg.drops.countCurve.end = next.dropCap;
    writeSettings(storage, next);
  });
}
