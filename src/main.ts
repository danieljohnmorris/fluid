import { createRenderer } from './renderer';

const canvas = document.getElementById('stage') as HTMLCanvasElement;
const notice = document.getElementById('notice') as HTMLElement;

if (!('gpu' in navigator)) {
  notice.hidden = false;
} else {
  const renderer = createRenderer({ canvas });

  // ?debug overlays live pacing counters: presented fps, sim steps/s, and the
  // step count of the most recent frame (0/1/2 at a 60 Hz sim).
  if (new URLSearchParams(location.search).has('debug')) {
    const hud = document.createElement('div');
    hud.style.cssText =
      'position:fixed;top:16px;right:16px;z-index:20;padding:8px 12px;' +
      'background:rgba(9,9,11,.85);border:1px solid rgba(250,250,252,.2);' +
      'font:11px/1.6 "IBM Plex Mono",monospace;letter-spacing:.08em;' +
      'color:rgba(250,250,252,.85);white-space:pre;pointer-events:none;';
    document.body.append(hud);
    let lastFrames = 0;
    let lastSteps = 0;
    let lastTime = performance.now();
    const update = () => {
      const now = performance.now();
      const seconds = (now - lastTime) / 1000;
      const fps = (renderer.stats.frames - lastFrames) / seconds;
      const sps = (renderer.stats.steps - lastSteps) / seconds;
      hud.textContent =
        `${fps.toFixed(0)} fps  ${sps.toFixed(0)} steps/s\n` +
        `last frame: ${renderer.stats.lastStepsPerFrame} step(s)\n` +
        `canvas: ${canvas.width}x${canvas.height} @${window.devicePixelRatio}x`;
      lastFrames = renderer.stats.frames;
      lastSteps = renderer.stats.steps;
      lastTime = now;
      setTimeout(update, 500);
    };
    setTimeout(update, 500);
  }
}
