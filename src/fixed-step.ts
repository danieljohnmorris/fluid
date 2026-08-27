// Fixed-timestep accounting for the 60 Hz sim loop, isolated from the GPU
// code so the pacing rules are unit-testable.
export const FIXED_STEP = 1 / 60;

export function fixedStepCount(accumulator: number, elapsed: number) {
  // At most one step per presented frame, and the accumulator saturates at
  // one step. Catch-up bursts are the visible bug: on a 60 Hz display whose
  // rAF averages slightly over 16.67 ms (Chrome after an adaptive-refresh
  // ramp), the accumulator creeps toward the boundary until a normal frame
  // crosses it twice, firing two sim steps in one frame - a hitch, then the
  // creep restarts. Saturating instead trades a marginal slow-down under
  // sustained load for the absence of bursts.
  const next = accumulator + Math.min(elapsed, 1 / 30);
  if (next < FIXED_STEP) return { steps: 0, accumulator: next };
  // Genuine remainder, clamped to one step so a late frame cannot bank a
  // catch-up burst for the next frame.
  return {
    steps: 1,
    accumulator: Math.min(next - FIXED_STEP, FIXED_STEP - 1e-6),
  };
}
