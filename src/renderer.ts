import { init, surface, type Gpu, type Surface } from "vgpu";

import { installStirInput } from "./pointer-input";
import {
  createFluid,
  interpolationPhase,
  prepareFluid,
  renderFluid,
  resizeFluid,
  stepFluid,
  type Fluid,
} from "./simulation";

const FIXED_STEP = 1 / 60;

interface RendererOptions {
  canvas: HTMLCanvasElement;
}

function fixedStepCount(accumulator: number, elapsed: number) {
  let next = accumulator + Math.min(elapsed, 1 / 30);
  let steps = 0;
  while (next >= FIXED_STEP && steps < 2) {
    next -= FIXED_STEP;
    steps++;
  }
  return { steps, accumulator: steps === 2 ? 0 : next };
}

export function createRenderer(options: RendererOptions) {
  let disposed = false;
  let gpu: Gpu | undefined;
  let canvasSurface: Surface | undefined;
  let fluid: Fluid | undefined;
  let input: ReturnType<typeof installStirInput> | undefined;
  let animationFrame = 0;
  let accumulator = 0;
  let previous = 0;
  // Live counters for the ?debug HUD: frames presented and sim steps taken.
  const stats = { frames: 0, steps: 0, lastStepsPerFrame: 0 };

  const tick = (now: number) => {
    if (disposed) return;
    if (!document.hidden && fluid && input && canvasSurface) {
      const fixed = fixedStepCount(accumulator, (now - previous) / 1000);
      accumulator = fixed.accumulator;
      stats.steps += fixed.steps;
      stats.lastStepsPerFrame = fixed.steps;
      for (let i = 0; i < fixed.steps; i++) {
        stepFluid(fluid, input);
      }
      // The sim runs at a fixed 60 Hz; displays refresh faster. Blend the
      // pre-step and post-step dye fields so presented frames advance on
      // every refresh instead of only on frames that stepped the sim.
      renderFluid(fluid, canvasSurface, interpolationPhase(accumulator, FIXED_STEP));
    }
    // Always reset the clock while hidden so visibility changes never catch up.
    previous = now;
    stats.frames++;
    animationFrame = requestAnimationFrame(tick);
  };

  function dispose() {
    if (disposed) return;
    disposed = true;
    if (animationFrame) cancelAnimationFrame(animationFrame);
    input?.dispose();
    gpu?.dispose();
  }

  function fail(error: unknown): never {
    dispose();
    throw error;
  }

  const initialize = async () => {
    if (disposed) return;
    const nextGpu = await init();
    if (disposed) {
      nextGpu.dispose();
      return;
    }
    gpu = nextGpu;
    // The dye field is 512x288; DPR > 1 only multiplies display-pass fragment
    // work with no fidelity to gain. Chrome's WebGPU path in particular pays
    // for the extra pixels and can drop frames at fullscreen retina sizes.
    canvasSurface = surface(gpu, options.canvas, { dpr: [1, 1] });
    fluid = createFluid(gpu);
    input = installStirInput(options.canvas);
    await prepareFluid(fluid, canvasSurface);
    if (disposed) return;
    canvasSurface.onResize(() => {
      if (disposed || !fluid || !canvasSurface) return;
      try {
        resizeFluid(fluid, canvasSurface);
      } catch (error) {
        fail(error);
      }
    });
    previous = performance.now();
    animationFrame = requestAnimationFrame(tick);
  };

  const ready = initialize().catch((error: unknown) => {
    if (disposed) return;
    fail(error);
  });

  return { ready, dispose, stats };
}
