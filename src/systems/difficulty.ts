import type { DifficultyCurve } from '../config';

/**
 * Linear ramp: value moves from `start` to `end` over `rampSeconds`, then holds.
 * Works for rising (drops, wind) and falling (bolt interval) curves alike.
 */
export function curveAt(curve: DifficultyCurve, elapsedSeconds: number): number {
  if (curve.rampSeconds <= 0) return curve.end;
  const t = Math.min(1, Math.max(0, elapsedSeconds / curve.rampSeconds));
  return curve.start + (curve.end - curve.start) * t;
}

/**
 * Horizontal wind force for a Matter body: F = m · a, applied every tick.
 * `windAccel` carries its sign (± = blowing right/left).
 */
export function windForce(mass: number, windAccel: number): { x: number; y: number } {
  return { x: mass * windAccel, y: 0 };
}
