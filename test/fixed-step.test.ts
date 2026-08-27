import { describe, expect, it } from "vitest";
import { fixedStepCount } from "../src/fixed-step";

const STEP = 1 / 60;

describe("fixedStepCount", () => {
  it("never takes two steps in one frame under a creeping 60 Hz clock", () => {
    // Chrome rAF on a 60 Hz display averages slightly over 16.67 ms after an
    // adaptive-refresh ramp. The accumulator must not bank a catch-up burst.
    let acc = 0;
    const steps = [];
    for (let i = 0; i < 1000; i++) {
      const r = fixedStepCount(acc, 0.0170 + (i % 4) * 0.0007);
      steps.push(r.steps);
      acc = r.accumulator;
    }
    expect(Math.max(...steps)).toBe(1);
  });

  it("still runs one step per frame at an exact 60 Hz rate", () => {
    let acc = 0;
    let total = 0;
    for (let i = 0; i < 600; i++) {
      const r = fixedStepCount(acc, STEP);
      total += r.steps;
      acc = r.accumulator;
    }
    expect(total).toBe(600);
  });

  it("alternates 0 and 1 steps at twice the step rate", () => {
    let acc = 0;
    const steps = [];
    for (let i = 0; i < 12; i++) {
      const r = fixedStepCount(acc, STEP / 2);
      steps.push(r.steps);
      acc = r.accumulator;
    }
    expect(steps).toEqual([0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1]);
  });

  it("clamps the remainder after a late frame instead of banking it", () => {
    const r = fixedStepCount(STEP - 0.001, 0.033);
    expect(r.steps).toBe(1);
    expect(r.accumulator).toBeLessThan(STEP);
    // The clamped accumulator yields at most one step on the next frame too.
    const next = fixedStepCount(r.accumulator, 0.017);
    expect(next.steps).toBe(1);
    expect(next.accumulator).toBeLessThan(STEP);
  });
});
