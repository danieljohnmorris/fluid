import { copyFileSync, readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { build } from 'esbuild';

// vgpu examples use a WGSL module dialect: `import { x } from "./other.wgsl"`.
// Runtime strings cannot carry imports (VGPU-WGSL-RUNTIME-IMPORT), so inline
// imported modules at build time: strip import lines from the importer and
// prepend the imported source with its `export` keywords removed.
function inlineWgsl(path, seen = new Set()) {
  const key = resolve(path);
  if (seen.has(key)) throw new Error(`WGSL import cycle at ${key}`);
  seen.add(key);

  let text = readFileSync(key, 'utf8');
  const importRe = /^import\s*\{[^}]*\}\s*from\s*["']([^"']+\.wgsl)["']\s*;?\s*$/gm;
  const imported = [];
  for (const match of text.matchAll(importRe)) {
    imported.push(inlineWgsl(resolve(dirname(key), match[1]), new Set(seen)));
  }
  text = text.replace(importRe, '').replace(/^[ \t]*export\s+/gm, '');
  return [...imported, text].join('\n');
}

const wgslInline = {
  name: 'wgsl-inline',
  setup(pluginBuild) {
    pluginBuild.onLoad({ filter: /\.wgsl$/ }, (args) => ({
      contents: inlineWgsl(args.path),
      loader: 'text',
    }));
  },
};

await build({
  entryPoints: ['src/main.ts'],
  bundle: true,
  minify: true,
  format: 'esm',
  target: 'es2022',
  outfile: 'dist/index.js',
  plugins: [wgslInline],
  legalComments: 'none',
  logLevel: 'info',
});

copyFileSync('index.html', 'dist/index.html');
