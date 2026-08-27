import { index_of } from "./fluid-common.wgsl";

// `phase` first so the struct is 16 bytes (f32 + pad + vec2f), which the
// uniform address space requires.
struct DisplayConfig {
  phase: f32,
  output_size: vec2f,
}
const DYE_SIZE = vec2u(512, 288);
@group(0) @binding(0) var<uniform> config: DisplayConfig;
@group(0) @binding(1) var<storage, read> dye: array<vec4f>;
@group(0) @binding(2) var<storage, read> prev_dye: array<vec4f>;

fn sample_dye(p: vec2f) -> vec3f {
  let grid = clamp(p * vec2f(DYE_SIZE) - 0.5, vec2f(0), vec2f(DYE_SIZE) - 1.0);
  let cell = vec2i(floor(grid));
  let f = fract(grid);
  let il = index_of(cell, DYE_SIZE);
  let ir = index_of(cell + vec2i(1, 0), DYE_SIZE);
  let iu = index_of(cell + vec2i(0, 1), DYE_SIZE);
  let id = index_of(cell + vec2i(1, 1), DYE_SIZE);
  let curr = mix(mix(dye[il].rgb, dye[ir].rgb, f.x), mix(dye[iu].rgb, dye[id].rgb, f.x), f.y);
  let prev = mix(mix(prev_dye[il].rgb, prev_dye[ir].rgb, f.x), mix(prev_dye[iu].rgb, prev_dye[id].rgb, f.x), f.y);
  // The solver steps at a fixed 60 Hz; displays refresh faster. Blend the
  // pre-step and post-step dye fields by the phase between steps so motion
  // advances on every presented frame instead of quantising to step frames.
  return mix(prev, curr, config.phase);
}

@fragment
fn fragment_main(@builtin(position) position: vec4f) -> @location(0) vec4f {
  var uv = position.xy / config.output_size;
  uv.y = 1.0 - uv.y; // WebGPU fragment coordinates start at the top; the solver's +Y points up.
  let density = sample_dye(uv);
  let color = 1.0 - exp(-density * 1.35);
  let vignette = 0.68 + 0.32 * pow(max(0.0, 1.0 - dot(uv - 0.5, uv - 0.5) * 1.9), 1.5);
  return vec4f((vec3f(0.003, 0.005, 0.014) + color) * vignette, 1.0);
}
