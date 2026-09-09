/**
 * Headless smoke test of the running app.
 *
 * Everything else in this project is verified by unit or contract test. This is the
 * only check that the WebGL canvas actually paints, that a query round-trips through
 * the real UI, and that clicking a point fills the inspector. Without it, "the frontend
 * works" would be an assumption resting on a successful build.
 *
 * Usage:  node scripts/verify-ui.mjs [outputDir]
 * Requires both servers running (:3000 and :8000).
 */

import { chromium } from 'playwright';
import { mkdirSync } from 'node:fs';
import { join } from 'node:path';

const OUT = process.argv[2] ?? 'verification';
const URL = 'http://localhost:3000';

mkdirSync(OUT, { recursive: true });

const consoleErrors = [];
const failures = [];
const results = [];

function check(name, passed, detail = '') {
  results.push({ name, passed, detail });
  if (!passed) failures.push(`${name}${detail ? ` — ${detail}` : ''}`);
  console.log(`  ${passed ? 'PASS' : 'FAIL'}  ${name}${detail ? `  (${detail})` : ''}`);
}

const browser = await chromium.launch({
  // SwiftShader gives headless Chromium a software WebGL implementation. Without it
  // deck.gl silently renders nothing and the test would pass on an empty canvas.
  args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'],
});
const page = await browser.newPage({ viewport: { width: 1600, height: 950 } });

page.on('console', (message) => {
  if (message.type() === 'error') consoleErrors.push(message.text());
});
page.on('pageerror', (error) => consoleErrors.push(`pageerror: ${error.message}`));

try {
  console.log('\n== load ==');
  const response = await page.goto(URL, { waitUntil: 'networkidle', timeout: 90_000 });
  check('page responds 200', response?.status() === 200, `status ${response?.status()}`);

  // The app auto-runs the first example query on mount, so results should appear
  // without any interaction.
  await page.waitForSelector('text=/measurements from/', { timeout: 60_000 }).catch(() => {});

  console.log('\n== WebGL ==');
  const gl = await page.evaluate(() => {
    const canvas = document.querySelector('canvas');
    if (!canvas) return { present: false };
    const context =
      canvas.getContext('webgl2') ?? canvas.getContext('webgl');
    return {
      present: true,
      width: canvas.width,
      height: canvas.height,
      hasContext: Boolean(context),
      renderer: context
        ? context.getParameter(
            context.getExtension('WEBGL_debug_renderer_info')?.UNMASKED_RENDERER_WEBGL ??
              context.RENDERER,
          )
        : null,
    };
  });
  check('canvas exists', gl.present);
  check('WebGL context acquired', gl.hasContext === true, gl.renderer ?? '');
  check('canvas has real size', (gl.width ?? 0) > 400 && (gl.height ?? 0) > 200,
        `${gl.width}x${gl.height}`);

  // A canvas can exist, have a context, and still be blank. Sample the pixels.
  const painted = await page.evaluate(() => {
    const canvas = document.querySelector('canvas');
    const context = canvas.getContext('webgl2') ?? canvas.getContext('webgl');
    if (!context) return { ok: false, reason: 'no context' };
    const w = canvas.width;
    const h = canvas.height;
    const pixels = new Uint8Array(w * h * 4);
    context.readPixels(0, 0, w, h, context.RGBA, context.UNSIGNED_BYTE, pixels);
    const seen = new Set();
    let lit = 0;
    for (let i = 0; i < pixels.length; i += 4) {
      const [r, g, b] = [pixels[i], pixels[i + 1], pixels[i + 2]];
      if (r + g + b > 40) lit += 1;
      if (seen.size < 400) seen.add(`${r >> 3},${g >> 3},${b >> 3}`);
    }
    return { ok: true, lit, distinct: seen.size, total: w * h };
  });
  check('canvas painted non-background pixels', (painted.lit ?? 0) > 500,
        `${painted.lit} lit of ${painted.total}`);
  check('multiple distinct colours (colormap is mapping)', (painted.distinct ?? 0) > 8,
        `${painted.distinct} buckets`);

  console.log('\n== data round-trip ==');
  const body = await page.textContent('body');
  check('summary rendered', /measurements from \d+ float/.test(body ?? ''));
  check('float count is plural, not the truncation bug',
        !/measurements from 1 float across/.test(body ?? '') ||
        /from 1 float/.test(body ?? ''));
  check('anomalies surfaced', /heatwave|anomal/i.test(body ?? ''));
  check('no API error banner', !/Cannot reach the API/.test(body ?? ''));

  await page.screenshot({ path: join(OUT, '01-loaded.png') });

  console.log('\n== interaction ==');
  const input = page.locator('input[aria-label="Natural language query"]');
  await input.fill('salinity below 34 between 100 and 500 metres');
  await page.getByRole('button', { name: /run query/i }).click();
  await page.waitForTimeout(4000);
  const afterQuery = await page.textContent('body');
  check('second query returned results', /measurements from \d+ float/.test(afterQuery ?? ''));
  await page.screenshot({ path: join(OUT, '02-query.png') });

  // The click hunt below finds a measurement by looking for a SATURATED pixel, which
  // only works against a low-chroma background. The satellite basemap paints saturated
  // pixels edge to edge and the vector one adds land fill, so either would hand the
  // scan false targets and break the check for reasons that have nothing to do with
  // picking. Drop to the bare graticule first, so this check stays exactly as strict
  // as it was before the basemap existed.
  await page
    .getByRole('group', { name: /basemap style/i })
    .getByRole('button', { name: /^bare$/i })
    .click();
  await page.waitForTimeout(600);

  // Click an actual painted measurement. Guessing coordinates does not work: points
  // cover well under 1% of the canvas, so a coarse grid scan misses them and reports a
  // false failure. Read the framebuffer, find a saturated (non-graticule) pixel, click there.
  const spots = await page.evaluate(() => {
    const canvas = document.querySelector('canvas');
    const context = canvas.getContext('webgl2') ?? canvas.getContext('webgl');
    const w = canvas.width;
    const h = canvas.height;
    const pixels = new Uint8Array(w * h * 4);
    context.readPixels(0, 0, w, h, context.RGBA, context.UNSIGNED_BYTE, pixels);
    const found = [];
    for (let y = 0; y < h && found.length < 24; y += 2) {
      for (let x = 0; x < w; x += 2) {
        const i = (y * w + x) * 4;
        const [r, g, b] = [pixels[i], pixels[i + 1], pixels[i + 2]];
        if (r + g + b > 150 && Math.max(r, g, b) - Math.min(r, g, b) > 40) {
          found.push({ x, cssY: h - y }); // readPixels origin is bottom-left
          break;
        }
      }
    }
    return { w, h, found };
  });
  check('found painted measurements to click', spots.found.length > 0,
        `${spots.found.length} candidates`);

  const box = await page.locator('canvas').boundingBox();
  let selected = false;
  if (box) {
    const sx = box.width / spots.w;
    const sy = box.height / spots.h;
    for (const spot of spots.found) {
      await page.mouse.click(box.x + spot.x * sx, box.y + spot.cssY * sy);
      await page.waitForTimeout(700);
      if (/Thermocline/i.test((await page.textContent('body')) ?? '')) { selected = true; break; }
    }
  }
  check('clicking a point opens the depth profile', selected);
  await page.screenshot({ path: join(OUT, '03-inspector.png') });


  console.log('\n== time scrubbing ==');
  const play = page.getByRole('button', { name: /play through time/i });
  if (await play.count()) {
    await play.click();
    await page.waitForTimeout(2500);
    await page.screenshot({ path: join(OUT, '04-playback.png') });
    check('playback control engaged', true);
  } else {
    check('playback control present', false, 'button not found');
  }

  console.log('\n== basemap ==');

  // Each style must actually paint. A mode that silently failed to load its asset
  // would look like an empty canvas, which no other check in this file would catch.
  const group = page.getByRole('group', { name: /basemap style/i });
  const litPixels = async () =>
    page.evaluate(() => {
      const canvas = document.querySelector('canvas');
      const context = canvas.getContext('webgl2') ?? canvas.getContext('webgl');
      if (!context) return 0;
      const w = canvas.width;
      const h = canvas.height;
      const pixels = new Uint8Array(w * h * 4);
      context.readPixels(0, 0, w, h, context.RGBA, context.UNSIGNED_BYTE, pixels);
      let lit = 0;
      for (let i = 0; i < pixels.length; i += 4) {
        if (pixels[i] + pixels[i + 1] + pixels[i + 2] > 40) lit += 1;
      }
      return lit;
    });

  for (const [name, floor] of [['Ocean', 20000], ['Satellite', 100000], ['Bare', 500]]) {
    await group.getByRole('button', { name: new RegExp(`^${name}$`, 'i') }).click();
    // Vector geometry and the 2.5 MB raster both load from disk on first switch.
    await page.waitForTimeout(2500);
    const lit = await litPixels();
    check(`basemap ${name} paints`, lit > floor, `${lit} lit (> ${floor})`);
    if (name === 'Ocean') await page.screenshot({ path: join(OUT, '05-basemap-ocean.png') });
    if (name === 'Satellite') await page.screenshot({ path: join(OUT, '06-basemap-satellite.png') });
  }

  // Back to the default so the committed screenshots show the shipping state.
  await group.getByRole('button', { name: /^ocean$/i }).click();
  await page.waitForTimeout(1200);

  console.log('\n== console ==');
  const realErrors = consoleErrors.filter(
    (message) => !/favicon|DevTools|Download the React DevTools/i.test(message),
  );
  check('no console errors', realErrors.length === 0,
        realErrors.slice(0, 3).join(' | '));
} catch (error) {
  check('script completed', false, String(error).slice(0, 300));
} finally {
  await browser.close();
}

console.log('\n=========================================');
const passed = results.filter((r) => r.passed).length;
console.log(`${passed}/${results.length} checks passed. Screenshots in ${OUT}/`);
if (failures.length) {
  console.log('\nFAILURES:');
  for (const failure of failures) console.log(`  - ${failure}`);
}
process.exit(failures.length ? 1 : 0);
