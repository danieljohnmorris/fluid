# Fluid

A compact pressure-projected Navier-Stokes fluid solver running as WebGPU compute shaders with [vgpu](https://vgpu.sh/): velocity advection, vorticity confinement, a Jacobi pressure solve, and dye advection on a fixed 60 Hz timestep. Drag across the canvas to stir the dye.

Source: adapted from the official `fluid` example (revision `8ca322aa`) in [vercel-labs/vgpu](https://github.com/vercel-labs/vgpu), MIT licensed. The React example wrapper was replaced with a vanilla entry point and an esbuild bundle. The example's WGSL module dialect (`import { Grid } from "./fluid-common.wgsl"`) is inlined at build time by an esbuild plugin in `build.mjs`, because vgpu runtime shader strings cannot carry import statements.

Live: https://fluid.danieljohnmorris.com

## Build

```bash
npm install
npm run build   # bundles src/ into dist/ (index.js + index.html)
```

## Deploy

Multi-stage Dockerfile: node builds with esbuild, nginx serves `dist/`. Deployed on Dokploy as `fluid.danieljohnmorris.com`.
