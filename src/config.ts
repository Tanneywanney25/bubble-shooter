/** Central configuration for the rain-dodge game. */

export interface DifficultyCurve {
  /** Value at t = 0. */
  start: number;
  /** Value once fully ramped. */
  end: number;
  /** Seconds to ramp from start to end (linear). */
  rampSeconds: number;
}

export interface GameConfig {
  canvas: { width: number; height: number };
  physics: {
    /** Matter gravity scale (y). */
    gravityY: number;
  };
  drops: {
    /** Hard cap of pooled drop bodies. */
    poolMax: number;
    /** Active-drop target ramps between these over time. */
    countCurve: DifficultyCurve;
    minRadius: number;
    maxRadius: number;
    /** Horizontal wind acceleration ramps between these (px/s² equivalent). */
    windCurve: DifficultyCurve;
  };
  bolts: {
    /** Spawn interval ramps DOWN from start to end ms. */
    intervalCurve: DifficultyCurve;
    fallSpeed: number;
    width: number;
    height: number;
  };
  umbrella: {
    width: number;
    thickness: number;
    y: number;
    speed: number;
  };
  /** A bolt landing within this distance of the umbrella center counts as a near miss. */
  nearMissRadius: number;
  bat: { frameMs: number; speed: number; intervalMs: number };
}

export const defaultConfig: GameConfig = {
  canvas: { width: 480, height: 700 },
  physics: { gravityY: 1 },
  drops: {
    poolMax: 140,
    countCurve: { start: 60, end: 140, rampSeconds: 90 },
    minRadius: 2.5,
    maxRadius: 5,
    windCurve: { start: 0, end: 0.0009, rampSeconds: 90 },
  },
  bolts: {
    intervalCurve: { start: 2600, end: 900, rampSeconds: 120 },
    fallSpeed: 520,
    width: 26,
    height: 64,
    },
  umbrella: {
    width: 110,
    thickness: 14,
    y: 560,
    speed: 420,
  },
  nearMissRadius: 90,
  bat: { frameMs: 70, speed: 150, intervalMs: 9000 },
};
