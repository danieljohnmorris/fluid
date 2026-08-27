import { describe, expect, it } from "vitest";
import { InterpGate } from "../src/interp-gate";

describe("InterpGate", () => {
  it("stays off at a steady 60 Hz rate", () => {
    const gate = new InterpGate();
    for (let i = 0; i < 300; i++) gate.update(16.7);
    expect(gate.interpolating).toBe(false);
  });

  it("switches on after a sustained fast rate", () => {
    const gate = new InterpGate();
    for (let i = 0; i < 200; i++) gate.update(8.3);
    expect(gate.interpolating).toBe(true);
  });

  it("does not enable on a single fast sample", () => {
    const gate = new InterpGate();
    for (let i = 0; i < 100; i++) gate.update(16.7);
    gate.update(8.3);
    expect(gate.interpolating).toBe(false);
  });

  it("does not flap when the rate oscillates across the single threshold", () => {
    const gate = new InterpGate();
    for (let i = 0; i < 200; i++) gate.update(8.3);
    expect(gate.interpolating).toBe(true);
    // ProMotion hunting between rates: intervals bouncing around the old
    // 12.5 ms boundary must not toggle the mode.
    for (let i = 0; i < 200; i++) gate.update(i % 2 === 0 ? 11.0 : 15.0);
    expect(gate.interpolating).toBe(true);
  });

  it("switches off after the display ramps down to 60 Hz", () => {
    const gate = new InterpGate();
    for (let i = 0; i < 200; i++) gate.update(8.3);
    expect(gate.interpolating).toBe(true);
    for (let i = 0; i < 200; i++) gate.update(16.7);
    expect(gate.interpolating).toBe(false);
  });

  it("does not switch off on a single slow sample", () => {
    const gate = new InterpGate();
    for (let i = 0; i < 200; i++) gate.update(8.3);
    gate.update(33);
    expect(gate.interpolating).toBe(true);
  });
});
