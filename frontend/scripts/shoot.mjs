/**
 * Screenshot the running app at the capture target, for visual review.
 *
 * `verify-ui.mjs` proves the app WORKS. This proves what it LOOKS like — which is the
 * deliverable for the UI polish pass, and the one thing neither tsc, next build nor a
 * lit-pixel count can tell you. Every visual change should be followed by a shot that
 * is actually looked at.
 *
 *   node scripts/shoot.mjs <label> [--wide|--inspector|--full]
 *
 * Writes verification/shots/<label>.png. Requires both servers running.
 *
 * Viewport is 1920x1080, the agreed capture target for the demo recording — NOT the
 * 1600x950 verify-ui.mjs uses. Reviewing the composition at any other size is
 * reviewing a frame that will never be recorded; the 380px inspector's fold lands in
 * a different place at every width.
 */

import { chromium } from 'playwright';
import { mkdirSync } from 'node:fs';
import { join } from 'node:path';

const label = process.argv[2] ?? 'shot';
const mode = process.argv.find((a) => a.startsWith('--'))?.slice(2) ?? 'wide';

const OUT = join('verification', 'shots');
mkdirSync(OUT, { recursive: true });

const browser = await chromium.launch({
  // SwiftShader gives headless Chromium a software WebGL implementation. Without it
  // deck.gl silently renders nothing and every shot would be of an empty canvas.
  args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'],
});
const page = await browser.newPage({
  viewport: { width: 1920, height: 1080 },
  // Chrome Room is dark-only by design, but an OS-level "reduce motion" on the capture
  // machine would silently disable the entire polish pass (UI_POLISH_PLAN.md §3.10).
  // Pinning it here means a shot never accidentally documents the reduced path.
  reducedMotion: 'no-preference',
});

const errors = [];
page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
page.on('pageerror', (e) => errors.push(`pageerror: ${e.message}`));

await page.goto('http://localhost:3000', { waitUntil: 'networkidle', timeout: 90_000 });

// The app auto-runs the first example query on mount, so a shot taken before that
// lands would document an empty state that no viewer will ever see.
await page.waitForSelector('text=/measurements from/', { timeout: 60_000 }).catch(() => {});
// Let the point cloud finish painting and any entry motion settle.
await page.waitForTimeout(2500);

const clip =
  mode === 'inspector'
    ? { x: 1540, y: 0, width: 380, height: 1080 }
    : mode === 'full'
      ? undefined
      : undefined;

await page.screenshot({ path: join(OUT, `${label}.png`), clip, fullPage: false });

// Fonts are self-hosted and the basemap is local, so a shot is only trustworthy if
// nothing 404ed on the way — a fallback-font frame looks plausible and is wrong.
const fontsLoaded = await page.evaluate(() =>
  [...document.fonts].filter((f) => f.status === 'loaded').map((f) => `${f.family} ${f.weight}`),
);

console.log(`${join(OUT, `${label}.png`)}  (${mode})`);
console.log(`fonts loaded: ${fontsLoaded.join(', ') || 'NONE — typography is falling back'}`);
if (errors.length) console.log(`console errors:\n  ${errors.join('\n  ')}`);

await browser.close();
