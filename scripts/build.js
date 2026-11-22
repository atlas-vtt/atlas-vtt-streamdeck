import { mkdirSync, writeFileSync } from 'node:fs';
import { context, build } from 'esbuild';

/** Bundles the plugin into the one file Stream Deck runs (`bin/plugin.js`), dependencies included. */
const options = {
  entryPoints: ['src/plugin.ts'],
  outfile: 'dev.atlas-vtt.sound.sdPlugin/bin/plugin.js',
  bundle: true,
  platform: 'node',
  format: 'esm',
  target: 'node20',
  sourcemap: process.argv.includes('--watch') ? 'inline' : false,
  // `ws` reaches for optional native helpers it does without.
  external: ['bufferutil', 'utf-8-validate'],
  banner: { js: "import { createRequire } from 'node:module'; const require = createRequire(import.meta.url);" },
  logLevel: 'info',
};

// The installed plugin has no package.json above it, so say that `bin/plugin.js` is an ES module, as
// Elgato's own template does; Node would otherwise have to guess it from the syntax.
mkdirSync('dev.atlas-vtt.sound.sdPlugin/bin', { recursive: true });
writeFileSync('dev.atlas-vtt.sound.sdPlugin/bin/package.json', '{ "type": "module" }\n');

if (process.argv.includes('--watch')) await (await context(options)).watch();
else await build(options);
