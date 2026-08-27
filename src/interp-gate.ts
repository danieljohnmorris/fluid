// Hysteresis gate for dye interpolation. ProMotion-style displays adapt
// their refresh rate mid-session (24-120 Hz), so the decision to blend
// pre-step and post-step dye fields needs two thresholds and a sustained
// hold: a single boundary threshold flaps as the rate hunts, and each flap
// is itself a visible mode change.
export class InterpGate {
  private mode = false;
  private hold = 0;

  constructor(
    // Enable only clearly above the sim rate; disable clearly below it.
    private readonly onBelowMs: number = 11.8, // ~85 Hz
    private readonly offAboveMs: number = 14.3, // ~70 Hz
    private readonly holdFrames: number = 30,
  ) {}

  update(meanIntervalMs: number): boolean {
    if (this.mode) {
      if (meanIntervalMs > this.offAboveMs) {
        if (++this.hold >= this.holdFrames) {
          this.mode = false;
          this.hold = 0;
        }
      } else {
        this.hold = 0;
      }
    } else if (meanIntervalMs > 0 && meanIntervalMs < this.onBelowMs) {
      if (++this.hold >= this.holdFrames) {
        this.mode = true;
        this.hold = 0;
      }
    } else {
      this.hold = 0;
    }
    return this.mode;
  }

  get interpolating(): boolean {
    return this.mode;
  }
}
