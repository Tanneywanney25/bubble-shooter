# Storm Shelter (bubble-shooter)

Storm Shelter is a physics rain-dodge game — an honest renaming of a repo originally labeled "bubble-shooter" that never shot bubbles. You slide an umbrella along the bottom of a stormy sky while up to 140 pooled Matter.js rain drops fall under gravity and a gusting wind whose strength ramps over 90 seconds. Thunderbolts crash down on a shrinking interval: a direct hit on the canopy ends the run, while strikes landing nearby increment a near-miss counter. The HUD tracks survival time, near misses, live wind, and your localStorage best; a settings panel tunes gravity, wind ceiling, and drop count mid-storm. Rendering (including the original 12-frame bat animation) is a thin typed p5.js layer, while object pooling, difficulty curves, F = ma wind forces, and survival tracking are pure TypeScript modules under Vitest. Vite build, ESLint + Prettier, GitHub Actions CI, and Vercel deploy config included.

> **Naming note:** the repository name is historical. The original course sketch was an
> umbrella-vs-rain scene with thunder and a bat sprite — this rebuild keeps that identity
> and drops the misleading "bubble shooter" framing.

## Controls

| Input | Action |
| --- | --- |
| `←` / `→` or `A` / `D` | Move the umbrella |
| `Space` | Start · retry |
| Settings button | Gravity, max wind, drop count sliders |

## How it works

- **Pooled physics drops** — a fixed-capacity `Pool` recycles Matter.js circle bodies;
  drops that fall past the floor or blow off-canvas return to the pool, so there is no
  per-frame allocation (`src/systems/pool.ts`).
- **Difficulty ramp** — linear curves (`src/systems/difficulty.ts`) raise the active-drop
  target (60 → 140) and wind ceiling over 90 s, and shrink the bolt interval
  (2.6 s → 0.9 s) over 120 s.
- **Wind** — strength follows the ramp while direction gusts sinusoidally; each tick
  applies `F = m·a` per drop, so heavier drops drift realistically.
- **Bolts & near misses** — a bolt reaching canopy height within the umbrella's span ends
  the run; one landing within 90 px of the umbrella center counts as a near miss.
- **Rendering** — a typed p5 instance draws the gradient sky, drops, umbrella, flickering
  thunder sprites, and the decorative bat; all game state lives outside p5.

## Tech stack

TypeScript (strict) · Vite · Matter.js (typed) · p5.js (render only) · Vitest ·
ESLint + Prettier · GitHub Actions

## Local development

```bash
npm install
npm run dev
npm test
npm run lint
npm run build
```

## Testing

- `tests/pool.test.ts` — capacity, identity-level reuse, double-release safety.
- `tests/difficulty.test.ts` — rising/falling curve values, clamping, F = m·a wind math.
- `tests/survival.test.ts` — timer gating, near-miss boundaries, best-time persistence.

CI runs lint, tests, and build on every push.

## Deploy

```bash
npm i -g vercel   # once
vercel deploy
```

`vercel.json` is preconfigured for the Vite static build.

## Project history

2022 course sketch (umbrella, ~100 Matter drops, thunder sprites, bat animation) rebuilt
in 2026: typed modules, object pooling, difficulty ramp, survival scoring, tests, CI,
and deploy config — original thunder/bat art retained.
