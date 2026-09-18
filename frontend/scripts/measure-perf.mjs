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

/**
 * Which basemap style to measure: Ocean (default), Satellite, or Bare.
 *
 *   PERF_BASEMAP=Bare PERF_GPU=1 npm run perf
 *
 * Bare is the CONTROL - graticule only, which is what the map drew before the basemap
 * existed. Comparing against it is the only way to attribute a frame-time change to the
 * geography rather than to the machine, and this file exists because ADR 0003 records
 * what happens when a number is trusted without that kind of control.
 */
const BASEMAP = process.env.PERF_BASEMAP ?? 'Ocean';
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

/*
 * Wait for the point count to STOP changing, rather than for a fixed interval.
 *
 * A fixed 14s wait used to be enough. It is not any more: this query returns 60,000
 * points as a 21 MB response, and the context cloud fires a second request of similar
 * size behind it. A run that sampled mid-flight reported `points 0` while still
 * printing a perfectly good frame rate - a measurement that looks like a points-budget
 * failure and is actually a stopwatch problem.
 */
async function settledPointCount(timeoutMs = 90_000) {
  const started = Date.now();
  let last = -1;
  let stableFor = 0;
  while (Date.now() - started < timeoutMs) {
    await page.waitForTimeout(1000);
    const now = await page.evaluate(() => {
      const node = document.querySelector('[data-point-count]');
      return node ? Number(node.getAttribute('data-point-count')) : 0;
    });
    stableFor = now === last ? stableFor + 1 : 0;
    last = now;
    if (last > 0 && stableFor >= 3) break;
  }
  return last;
}
await settledPointCount();

/*
 * And then for the context cloud, which lands several seconds after the matched result
 * because it is a second request of similar size that the app deliberately does not
 * await. Reading before it arrives reports "0 points" for a layer that is about to be
 * drawn - and would silently measure the frame rate of the control while claiming to
 * measure the layer.
 */
await page
  .waitForSelector('text=/excluded, shown dim/', { timeout: 60_000 })
  .catch(() => console.log('note: no context cloud for this query'));

// Read the machine-readable attribute, not the rendered label. This used to scrape
// innerText for "points rendered" and silently returned 0 the moment that label picked
// up text-transform: uppercase - a styling change must not be able to break a
// measurement, and a zero here would have been read as a points-budget failure.
const rendered = await page.evaluate(() => {
  const node = document.querySelector('[data-point-count]');
  return node ? Number(node.getAttribute('data-point-count')) : 0;
});

/*
 * Context cloud on or off. The CONTROL for the context layer, in exactly the shape
 * PERF_BASEMAP established for the basemap:
 *
 *   PERF_CONTEXT=off PERF_GPU=1 npm run perf
 *
 * ADR 0003 exists because a number was once trusted without a control. Attributing a
 * frame-time change to the context layer means measuring the same query with it off,
 * on the same machine, in the same run order - not against a remembered figure.
 */
const contextCount = await page.evaluate(() => {
  const match = document.body.innerText.match(/([0-9,]+) excluded/);
  return match ? Number(match[1].replace(/,/g, '')) : 0;
});
if (process.env.PERF_CONTEXT === 'off') {
  const toggle = page.getByRole('button', { name: 'Context', exact: true });
  if (await toggle.count()) await toggle.click().catch(() => {});
  await page.waitForTimeout(1500);
}

// Sample frame intervals while the time cursor is animating, which is the worst case:
// every frame re-evaluates the colour accessor for every visible point.
const play = page.getByRole('button', { name: /play through time/i });
if (await play.count()) await play.click({ force: true }).catch(() => {});

const group = page.getByRole('group', { name: /basemap style/i });
if (await group.count()) {
  await group
    .getByRole('button', { name: new RegExp(`^${BASEMAP}$`, 'i') })
    .click()
    .catch(() => {});
}

// Settle before sampling. The satellite raster is 2.5 MB to decode and the bathymetry
// contours tessellate on first draw; both are ONE-OFF costs, and sampling through them
// measures asset loading rather than the playback frame rate this script reports. Seen
// in practice: the same build measured 33.2 ms cold and 16.7 ms settled.
await page.waitForTimeout(4000);

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
console.log(
  `context       ${
    process.env.PERF_CONTEXT === 'off'
      ? `OFF (control) - ${contextCount.toLocaleString()} points withheld`
      : `ON - ${contextCount.toLocaleString()} points`
  }`,
);
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
const pointsVerdict = rendered >= 50_000 ? 'MET' : `below target (${rendered})`;
// On software the frame rate is not a failure, it is not a measurement. Reporting
// 'missed' there would repeat exactly the mistake ADR 0003 records.
const rateVerdict = software
  ? 'NOT ASSESSABLE on a software rasteriser - re-run with PERF_GPU=1'
  : fps >= 55
    ? `MET (${fps.toFixed(1)} fps)`
    : `MISSED (${fps.toFixed(1)} fps)`;
console.log(`\nP6 budget (50k pts @ 60fps)`);
console.log(`  points      ${pointsVerdict}`);
console.log(`  frame rate  ${rateVerdict}`);

await browser.close();
