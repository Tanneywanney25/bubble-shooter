import type p5 from 'p5';
import type { GameConfig } from './config';
import type { RainWorld } from './game/world';
import { randRange } from './core/rng';

export interface SketchDeps {
  cfg: GameConfig;
  world: RainWorld;
  rng: () => number;
  onFrame: () => void;
}

interface BatState {
  x: number;
  y: number;
  dir: 1 | -1;
  frameTimerMs: number;
  frameIndex: number;
  active: boolean;
  spawnTimerMs: number;
}

/** p5 render layer: gradient sky, pooled drops, umbrella, thunderbolts, decorative bat. */
export function createSketch(deps: SketchDeps): (p: p5) => void {
  return (p: p5): void => {
    const { cfg, world } = deps;
    const thunderImgs: p5.Image[] = [];
    const batImgs: p5.Image[] = [];
    const bat: BatState = {
      x: 0,
      y: 120,
      dir: 1,
      frameTimerMs: 0,
      frameIndex: 0,
      active: false,
      spawnTimerMs: 0,
    };

    p.preload = () => {
      for (let i = 1; i <= 4; i++) thunderImgs.push(p.loadImage(`assets/thunder/${i}.png`));
      for (let i = 1; i <= 12; i++) batImgs.push(p.loadImage(`assets/bat/bat${i}.png`));
    };

    p.setup = () => {
      p.createCanvas(cfg.canvas.width, cfg.canvas.height).parent('stage');
      p.imageMode(p.CENTER);
      p.textFont('Segoe UI, system-ui, sans-serif');
    };

    p.keyPressed = (event?: KeyboardEvent) => {
      if (p.key === ' ') {
        if (world.state !== 'playing') world.start();
        event?.preventDefault();
      }
    };

    function drawSky(): void {
      // Simple two-stop vertical gradient without per-pixel cost.
      const top = p.color(12, 17, 30);
      const bottom = p.color(30, 42, 66);
      const bands = 24;
      p.noStroke();
      for (let i = 0; i < bands; i++) {
        const c = p.lerpColor(top, bottom, i / (bands - 1));
        p.fill(c);
        p.rect(0, (cfg.canvas.height / bands) * i, cfg.canvas.width, cfg.canvas.height / bands + 1);
      }
    }

    function drawDrops(): void {
      p.noStroke();
      p.fill(150, 190, 255, 200);
      world.forEachDrop((drop) => {
        const { x, y } = drop.body.position;
        p.circle(x, y, drop.radius * 2);
      });
    }

    function drawUmbrella(): void {
      const x = world.umbrellaX;
      const y = cfg.umbrella.y;
      const w = cfg.umbrella.width;
      p.stroke(90, 60, 40);
      p.strokeWeight(4);
      p.line(x, y, x, y + 80);
      p.noStroke();
      p.fill(220, 80, 90);
      p.arc(x, y, w, w * 0.9, p.PI, 0, p.CHORD);
      p.fill(180, 55, 70);
      for (let i = -1; i <= 1; i++) {
        p.arc(x + (i * w) / 3, y, w / 3, 18, 0, p.PI, p.CHORD);
      }
    }

    function drawBolts(): void {
      for (const bolt of world.bolts) {
        const img = thunderImgs[Math.floor(bolt.frame / 4) % thunderImgs.length];
        if (img) p.image(img, bolt.x, bolt.y, cfg.bolts.width, cfg.bolts.height);
      }
    }

    function updateAndDrawBat(dtMs: number): void {
      if (!bat.active) {
        bat.spawnTimerMs += dtMs;
        if (bat.spawnTimerMs >= cfg.bat.intervalMs) {
          bat.spawnTimerMs = 0;
          bat.active = true;
          bat.dir = deps.rng() < 0.5 ? 1 : -1;
          bat.x = bat.dir === 1 ? -40 : cfg.canvas.width + 40;
          bat.y = randRange(deps.rng, 60, 220);
          bat.frameIndex = 0;
        }
        return;
      }
      bat.x += bat.dir * cfg.bat.speed * (dtMs / 1000);
      bat.frameTimerMs += dtMs;
      if (bat.frameTimerMs >= cfg.bat.frameMs) {
        bat.frameTimerMs = 0;
        bat.frameIndex = (bat.frameIndex + 1) % batImgs.length;
      }
      const img = batImgs[bat.frameIndex];
      if (img) {
        p.push();
        p.translate(bat.x, bat.y);
        p.scale(bat.dir, 1);
        p.image(img, 0, 0, 64, 48);
        p.pop();
      }
      if (bat.x < -60 || bat.x > cfg.canvas.width + 60) bat.active = false;
    }

    function overlay(title: string, subtitle: string): void {
      p.fill(0, 0, 0, 150);
      p.rect(0, 0, cfg.canvas.width, cfg.canvas.height);
      p.fill(255);
      p.textAlign(p.CENTER);
      p.textSize(38);
      p.text(title, cfg.canvas.width / 2, cfg.canvas.height / 2 - 24);
      p.textSize(16);
      p.text(subtitle, cfg.canvas.width / 2, cfg.canvas.height / 2 + 14);
    }

    p.draw = () => {
      const dtMs = Math.min(p.deltaTime, 100);
      world.step(dtMs, {
        left: p.keyIsDown(p.LEFT_ARROW) || p.keyIsDown(65),
        right: p.keyIsDown(p.RIGHT_ARROW) || p.keyIsDown(68),
      });

      drawSky();
      updateAndDrawBat(dtMs);
      drawDrops();
      drawBolts();
      drawUmbrella();

      if (world.state === 'menu') {
        overlay('Storm Shelter', '←/→ or A/D to move the umbrella. Dodge the lightning. Space to start.');
      } else if (world.state === 'gameover') {
        overlay('Struck!', 'Space to try again');
      }
      deps.onFrame();
    };
  };
}
