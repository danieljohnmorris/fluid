import { describe, expect, it, vi, beforeEach } from "vitest";
import { installStirInput } from "../src/pointer-input";

type Handler = (event: unknown) => void;
interface FakeCanvas {
  handlers: Map<string, Handler>;
  style: Record<string, string>;
  getBoundingClientRect: () => { left: number; top: number; width: number; height: number };
  setPointerCapture: (id: number) => void;
  hasPointerCapture: (id: number) => boolean;
  releasePointerCapture: (id: number) => void;
  addEventListener: (name: string, fn: Handler) => void;
  removeEventListener: (name: string) => void;
}

function fakeCanvas(): FakeCanvas {
  const handlers = new Map<string, Handler>();
  return {
    handlers,
    style: {} as Record<string, string>,
    getBoundingClientRect: () => ({ left: 0, top: 0, width: 1000, height: 500 }),
    setPointerCapture: vi.fn(),
    hasPointerCapture: vi.fn(() => true),
    releasePointerCapture: vi.fn(),
    addEventListener: (name: string, fn: Handler) => handlers.set(name, fn),
    removeEventListener: (name: string) => handlers.delete(name),
  };
}

function pointerEvent(
  type: string,
  { x, y, t, isPrimary = true }: { x: number; y: number; t: number; isPrimary?: boolean },
) {
  const event = new Event(type);
  const props = { isPrimary, pointerId: 1, clientX: x, clientY: y, timeStamp: t };
  for (const [key, value] of Object.entries(props)) {
    Object.defineProperty(event, key, { value, configurable: true });
  }
  return event;
}

function moveSequence(
  canvas: FakeCanvas,
  points: Array<[number, number]>,
  startMs = 1000,
  perMoveMs = 4,
) {
  points.forEach(([x, y], index) => {
    canvas.handlers.get("pointermove")!(
      pointerEvent("pointermove", { x, y, t: startMs + index * perMoveMs }),
    );
  });
}

describe("installStirInput", () => {
  let canvas: FakeCanvas;

  beforeEach(() => {
    canvas = fakeCanvas();
  });

  it("collapses multiple moves between steps into one continuous segment", () => {
    const input = installStirInput(canvas as unknown as HTMLCanvasElement);

    canvas.handlers.get("pointerdown")!(
      pointerEvent("pointerdown", { x: 100, y: 250, t: 1000 }),
    );
    // Four input samples arrive between two sim steps (input rate > step rate).
    moveSequence(canvas, [
      [160, 250],
      [220, 250],
      [280, 250],
      [340, 250],
    ]);

    // The splat segment must span the whole path since the last consumed
    // point, not just the final two samples of the burst.
    expect(input.from).toEqual([0.1, 0.5]);
    expect(input.to).toEqual([0.34, 0.5]);

    input.consumeStep();
    expect(input.from).toEqual([0.34, 0.5]);

    input.dispose();
  });

  it("keeps velocity derived from consecutive input samples", () => {
    const input = installStirInput(canvas as unknown as HTMLCanvasElement);

    canvas.handlers.get("pointerdown")!(
      pointerEvent("pointerdown", { x: 100, y: 250, t: 1000 }),
    );
    // Two sub-clamp moves: 2px then 8px, 4ms apart. Velocity stays
    // per-sample (2.0), not aggregated over the whole burst.
    moveSequence(canvas, [[102, 250], [110, 250]], 1004, 4);

    expect(input.velocity[0]).toBeCloseTo(2.0, 3);
    expect(input.velocity[1]).toBe(0);

    input.dispose();
  });
});
