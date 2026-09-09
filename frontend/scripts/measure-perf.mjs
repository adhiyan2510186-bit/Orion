/**
 * Measures the P6 budget from IMPLEMENTATION_PLAN.md: 50k points at 60fps.
 *
 * Caveat stated up front: headless Chromium here uses SwiftShader, a SOFTWARE
 * rasteriser. Numbers are a floor, not a representative figure - real hardware GPUs are
 * far faster. A pass here is strong evidence; a fail is inconclusive and needs a run on
 * a real GPU before anyone concludes the budget is missed.
 */

import { chromium } from 'playwright';

const URL = 'http://localhost:3000';
const QUERY = process.argv[2] ?? 'deeper than 200 m since 2024';

/**
 * Two modes, because the renderer decides whether the numbers mean anything.
 *
 *   npm run perf            software (SwiftShader) - reproducible, but a floor only
 *   PERF_GPU=1 npm run perf hardware GPU if the machine exposes one to Chromium
 *
 * ADR 0003 is open precisely because only the software path had ever been measured.
 * The script prints the renderer it actually got, so a run can be interpreted rather
 * than trusted.
 */
const USE_GPU = process.env.PERF_GPU === '1';
const browser = await chromium.launch({
  // Headless Chromium still needs to be told it may use the GPU; a headed window is
  // the most reliable way to get a hardware context on Windows.
  headless: !USE_GPU,
  args: USE_GPU
    ? ['--ignore-gpu-blocklist', '--enable-gpu-rasterization', '--enable-zero-copy']
    : ['--use-gl=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'],
});
const page = await browser.newPage({ viewport: { width: 1600, height: 950 } });
await page.goto(URL, { waitUntil: 'networkidle', timeout: 90_000 });
await page.waitForTimeout(5000);

const input = page.locator('input[aria-label="Natural language query"]');
await input.fill(QUERY);
// Submit with Enter rather than clicking the button: the deck.gl canvas can overlap
// the click target during a re-layout and swallow the event.
await input.press('Enter');
await page.waitForTimeout(14_000);

const rendered = await page.evaluate(() => {
  const match = document.body.innerText.match(/([\d,]+) points rendered/);
  return match ? Number(match[1].replace(/,/g, '')) : 0;
});

// Sample frame intervals while the time cursor is animating, which is the worst case:
// every frame re-evaluates the colour accessor for every visible point.
const play = page.getByRole('button', { name: /play through time/i });
if (await play.count()) await play.click({ force: true }).catch(() => {});

const frames = await page.evaluate(
  () =>
    new Promise((resolve) => {
      const samples = [];
      let last = performance.now();
      let count = 0;
      const tick = (now) => {
        samples.push(now - last);
        last = now;
        count += 1;
        if (count < 150) requestAnimationFrame(tick);
        else resolve(samples.slice(10)); // discard warm-up
      };
      requestAnimationFrame(tick);
    }),
);

const sorted = [...frames].sort((a, b) => a - b);
const median = sorted[Math.floor(sorted.length / 2)];
const p95 = sorted[Math.floor(sorted.length * 0.95)];
const mean = frames.reduce((a, b) => a + b, 0) / frames.length;

console.log(`\nquery         ${QUERY}`);
console.log(`points        ${rendered.toLocaleString()}`);
console.log(`frames        ${frames.length} sampled during playback`);
console.log(`median        ${median.toFixed(1)} ms  (${(1000 / median).toFixed(1)} fps)`);
console.log(`mean          ${mean.toFixed(1)} ms  (${(1000 / mean).toFixed(1)} fps)`);
console.log(`p95           ${p95.toFixed(1)} ms  (${(1000 / p95).toFixed(1)} fps)`);
const renderer = await page.evaluate(() => {
  const canvas = document.querySelector('canvas');
  const gl = canvas?.getContext('webgl2') ?? canvas?.getContext('webgl');
  if (!gl) return 'no context';
  const info = gl.getExtension('WEBGL_debug_renderer_info');
  return gl.getParameter(info ? info.UNMASKED_RENDERER_WEBGL : gl.RENDERER);
});
const software = /swiftshader|llvmpipe|software/i.test(String(renderer));
console.log(`renderer      ${renderer}`);
console.log(
  software
    ? 'NOTE          SOFTWARE rasteriser - frame times here do NOT represent real hardware (ADR 0003)'
    : 'NOTE          hardware GPU - these numbers are meaningful',
);

const fps = 1000 / median;
console.log(
  `\nP6 budget (50k pts @ 60fps): points ${rendered >= 50_000 ? 'MET' : 'below target'}, ` +
    `frame rate ${fps >= 55 ? 'MET' : `${fps.toFixed(0)} fps on software rasteriser`}`,
);

await browser.close();
