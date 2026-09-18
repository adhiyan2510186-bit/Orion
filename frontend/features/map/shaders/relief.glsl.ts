/**
 * Desaturating fragment hook for the ocean relief raster.
 *
 * Why a shader at all: `public/basemap/earth-bathy.jpg` is NASA Blue Marble topo +
 * bathymetry, and it is the only asset in the repo that carries real per-pixel structure
 * over open ocean. Measured over the demo view it holds an interquartile luminance
 * spread of 7.3 across 212 distinct levels - against the vector contours, which can only
 * produce TWO tones there because the frame sits inside the 4000 m ring with 5000 m to
 * the west.
 *
 * But the raster is BLUE. Its mean chroma over that region is 22.2, and this work is held
 * to a ceiling of 8, because DESIGN.md's basemap rule exists to stop a viewer having to
 * learn which blues are water and which are a `haline` sample. So the luminance structure
 * is kept and most of the chroma is thrown away here; the permitted cool cast is
 * re-introduced through `bathymetryRamp` instead, so exactly one place governs hue.
 *
 * `tintColor` on BitmapLayer cannot do this: it multiplies, and multiplying by a grey
 * scales all three channels equally, which changes brightness and leaves saturation
 * untouched. Desaturation is a mix toward luminance, which needs a fragment hook.
 *
 * The saturation constant is compiled in from `design/tokens.ts` rather than plumbed
 * through as a uniform. It is a static design value, so a uniform would buy nothing but
 * per-draw state - and baking it keeps the token the single source.
 */

import { basemapDetail } from '@/design/tokens';

/**
 * Rec. 709 luma coefficients - the same weighting the measurement harness uses, so what
 * the shader preserves and what the acceptance criteria measure are the same quantity.
 */
export function reliefFragmentInject(): Record<string, string> {
  return {
    'fs:DECKGL_FILTER_COLOR': `
  float reliefLuma = dot(color.rgb, vec3(0.2126, 0.7152, 0.0722));
  color.rgb = mix(vec3(reliefLuma), color.rgb, ${basemapDetail.reliefSaturation.toFixed(3)});
`,
  };
}
