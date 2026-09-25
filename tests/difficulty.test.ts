import { describe, expect, it } from 'vitest';
import { curveAt, windForce } from '../src/systems/difficulty';

describe('curveAt', () => {
  const rising = { start: 60, end: 140, rampSeconds: 90 };
  const falling = { start: 2600, end: 900, rampSeconds: 120 };

  it('returns start at t=0 and end once fully ramped', () => {
    expect(curveAt(rising, 0)).toBe(60);
    expect(curveAt(rising, 90)).toBe(140);
    expect(curveAt(rising, 400)).toBe(140); // holds after the ramp
  });

  it('interpolates linearly mid-ramp', () => {
    expect(curveAt(rising, 45)).toBeCloseTo(100);
    expect(curveAt(rising, 22.5)).toBeCloseTo(80);
  });

  it('supports falling curves (bolt interval shrinks)', () => {
    expect(curveAt(falling, 0)).toBe(2600);
    expect(curveAt(falling, 60)).toBeCloseTo(1750);
    expect(curveAt(falling, 120)).toBe(900);
  });

  it('clamps negative elapsed to start', () => {
    expect(curveAt(rising, -10)).toBe(60);
  });

  it('a zero-length ramp jumps straight to end', () => {
    expect(curveAt({ start: 1, end: 5, rampSeconds: 0 }, 0)).toBe(5);
  });
});

describe('windForce', () => {
  it('applies F = m·a horizontally only', () => {
    const f = windForce(0.004, 0.0008);
    expect(f.x).toBeCloseTo(0.0000032, 10);
    expect(f.y).toBe(0);
  });

  it('carries the wind direction sign', () => {
    expect(windForce(2, -0.5).x).toBeCloseTo(-1);
    expect(windForce(2, 0.5).x).toBeCloseTo(1);
  });

  it('heavier bodies feel proportionally more force (same acceleration)', () => {
    const light = windForce(1, 0.3);
    const heavy = windForce(4, 0.3);
    expect(heavy.x / light.x).toBeCloseTo(4);
  });

  it('zero wind produces zero force', () => {
    expect(windForce(10, 0)).toEqual({ x: 0, y: 0 });
  });
});
