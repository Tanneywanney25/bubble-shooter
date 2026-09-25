import Matter from 'matter-js';
import type { GameConfig } from '../config';
import { randRange } from '../core/rng';
import { Pool } from '../systems/pool';
import { curveAt, windForce } from '../systems/difficulty';
import type { SurvivalTracker } from '../systems/survival';

export type GameState = 'menu' | 'playing' | 'gameover';

export interface Drop {
  body: Matter.Body;
  radius: number;
}

export interface Bolt {
  x: number;
  y: number;
  /** Sprite frame index for flicker. */
  frame: number;
}

export interface StepInput {
  left: boolean;
  right: boolean;
}

/**
 * The physics world: pooled Matter.js rain drops under gravity + ramping wind,
 * a kinematic umbrella canopy, and falling thunderbolts that end the run on a hit.
 */
export class RainWorld {
  readonly engine: Matter.Engine;
  state: GameState = 'menu';
  umbrellaX: number;
  elapsed = 0;
  /** Current signed wind acceleration (for the HUD). */
  windNow = 0;

  private readonly pool: Pool<Drop>;
  private readonly umbrellaBody: Matter.Body;
  readonly bolts: Bolt[] = [];
  private boltTimerMs = 0;

  constructor(
    private readonly cfg: GameConfig,
    private readonly rng: () => number,
    private readonly tracker: SurvivalTracker,
  ) {
    this.engine = Matter.Engine.create();
    this.engine.gravity.y = cfg.physics.gravityY;
    this.umbrellaX = cfg.canvas.width / 2;

    this.umbrellaBody = Matter.Bodies.rectangle(
      this.umbrellaX,
      cfg.umbrella.y,
      cfg.umbrella.width,
      cfg.umbrella.thickness,
      { isStatic: true, restitution: 0.6, friction: 0.05 },
    );
    Matter.Composite.add(this.engine.world, this.umbrellaBody);

    this.pool = new Pool<Drop>(cfg.drops.poolMax, () => ({
      body: Matter.Bodies.circle(
        0,
        -50,
        randRange(this.rng, cfg.drops.minRadius, cfg.drops.maxRadius),
        { restitution: 0.4, frictionAir: 0.01, density: 0.002 },
      ),
      radius: 0, // set on spawn from the body's circleRadius
    }));
  }

  get activeDrops(): number {
    return this.pool.activeCount;
  }

  forEachDrop(fn: (drop: Drop) => void): void {
    this.pool.forEachActive(fn);
  }

  start(): void {
    this.state = 'playing';
    this.elapsed = 0;
    this.boltTimerMs = 0;
    this.bolts.length = 0;
    this.umbrellaX = this.cfg.canvas.width / 2;
    this.pool.forEachActive((drop) => this.recycle(drop));
    this.tracker.start();
  }

  private recycle(drop: Drop): void {
    Matter.Composite.remove(this.engine.world, drop.body);
    this.pool.release(drop);
  }

  private spawnDrop(): void {
    const drop = this.pool.acquire();
    if (!drop) return;
    const { width } = this.cfg.canvas;
    drop.radius = drop.body.circleRadius ?? this.cfg.drops.minRadius;
    Matter.Body.setPosition(drop.body, {
      x: randRange(this.rng, 0, width),
      y: randRange(this.rng, -160, -10),
    });
    Matter.Body.setVelocity(drop.body, { x: 0, y: 0 });
    Matter.Composite.add(this.engine.world, drop.body);
  }

  /** Advance the world by dtMs. Umbrella input comes from the render layer. */
  step(dtMs: number, input: StepInput): void {
    if (this.state !== 'playing') return;
    const dt = dtMs / 1000;
    this.elapsed += dt;
    this.tracker.tick(dt);

    // Umbrella movement (kinematic).
    const { width } = this.cfg.canvas;
    const move = (Number(input.right) - Number(input.left)) * this.cfg.umbrella.speed * dt;
    this.umbrellaX = Math.min(width - 40, Math.max(40, this.umbrellaX + move));
    Matter.Body.setPosition(this.umbrellaBody, { x: this.umbrellaX, y: this.cfg.umbrella.y });

    // Wind: strength ramps with time, direction gusts sinusoidally.
    const strength = curveAt(this.cfg.drops.windCurve, this.elapsed);
    this.windNow = strength * Math.sin(this.elapsed * 0.35);
    this.pool.forEachActive((drop) => {
      Matter.Body.applyForce(
        drop.body,
        drop.body.position,
        windForce(drop.body.mass, this.windNow),
      );
    });

    // Keep the active-drop count at the ramping target.
    const target = Math.round(curveAt(this.cfg.drops.countCurve, this.elapsed));
    while (this.pool.activeCount < target) {
      const before = this.pool.activeCount;
      this.spawnDrop();
      if (this.pool.activeCount === before) break; // pool exhausted
    }

    // Recycle drops that fell past the floor or drifted far off-canvas.
    const { height } = this.cfg.canvas;
    this.pool.forEachActive((drop) => {
      const { x, y } = drop.body.position;
      if (y > height + 30 || x < -60 || x > width + 60) this.recycle(drop);
    });

    // Thunderbolts.
    this.boltTimerMs += dtMs;
    const interval = curveAt(this.cfg.bolts.intervalCurve, this.elapsed);
    if (this.boltTimerMs >= interval) {
      this.boltTimerMs = 0;
      this.bolts.push({ x: randRange(this.rng, 20, width - 20), y: -this.cfg.bolts.height, frame: 0 });
    }
    for (let i = this.bolts.length - 1; i >= 0; i--) {
      const bolt = this.bolts[i];
      if (!bolt) continue;
      bolt.y += this.cfg.bolts.fallSpeed * dt;
      bolt.frame += 1;

      const canopyY = this.cfg.umbrella.y - this.cfg.umbrella.thickness / 2;
      const halfSpan = (this.cfg.umbrella.width + this.cfg.bolts.width) / 2;
      const boltTip = bolt.y + this.cfg.bolts.height / 2;

      if (boltTip >= canopyY && Math.abs(bolt.x - this.umbrellaX) <= halfSpan) {
        // Direct hit — run over.
        this.state = 'gameover';
        this.tracker.end();
        this.bolts.splice(i, 1);
        continue;
      }
      if (boltTip >= height) {
        this.tracker.registerBoltLanding(
          Math.abs(bolt.x - this.umbrellaX),
          this.cfg.nearMissRadius,
        );
        this.bolts.splice(i, 1);
      }
    }

    Matter.Engine.update(this.engine, dtMs);
  }

  /** Live settings hooks. */
  setGravity(y: number): void {
    this.engine.gravity.y = y;
  }
}
