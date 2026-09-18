/**
 * Dark ocean vector basemap - landmasses, coastline, and bathymetric contours.
 *
 * The default style, and the one built for this application rather than borrowed. It
 * draws the ocean the way a paper chart does: land as flat fill, the coastline as the
 * one firm edge, and depth as fine contour line-work. Nothing here is saturated, so
 * the thermal and haline colour ramps on the point cloud keep the entire chromatic
 * range to themselves (see the Basemap section of DESIGN.md for the argument).
 *
 * Geometry comes from Natural Earth via `npm run basemap`, decimated to a viewing
 * tolerance and committed. Coordinates are raw [lon, lat] degrees, which is exactly
 * what OrbitView wants - no projection step.
 */

import { BitmapLayer, PathLayer, PolygonLayer } from '@deck.gl/layers';
import { basemapDetail, basemapRgb, bathymetryColor } from '@/design/tokens';
import { reliefFragmentInject } from '../shaders/relief.glsl';
import { registerLayer } from './registry';
import { BASEMAP_BOUNDS, BASEMAP_PARAMETERS } from './basemapShared';

/**
 * BitmapLayer that throws away most of the raster's chroma in the fragment shader.
 * See ../shaders/relief.glsl.ts for why this cannot be done with `tintColor`.
 */
class ReliefBitmapLayer extends BitmapLayer {
  static layerName = 'ReliefBitmapLayer';
  getShaders() {
    const shaders = super.getShaders();
    return {
      ...shaders,
      inject: { ...(shaders.inject ?? {}), ...reliefFragmentInject() },
    };
  }
}

type Ring = [number, number][];
interface BathymetryRing {
  depth_m: number;
  path: [number, number][];
}

/** The whole-globe water plane the geography sits on. */
const OCEAN_PLANE: Ring[] = [
  [
    [BASEMAP_BOUNDS[0], BASEMAP_BOUNDS[1]],
    [BASEMAP_BOUNDS[2], BASEMAP_BOUNDS[1]],
    [BASEMAP_BOUNDS[2], BASEMAP_BOUNDS[3]],
    [BASEMAP_BOUNDS[0], BASEMAP_BOUNDS[3]],
  ],
];

export const basemapVector = registerLayer({
  id: 'basemap-ocean',
  label: 'Dark ocean basemap',
  supports: () => true,
  build: (ctx) => {
    if (ctx.basemap !== 'ocean') return null;

    return [
      // Continental shelf - water shallower than the 200 m contour, and everything the
      // depth bands below do not cover. The lightest tone in the ocean; see the token.
      new PolygonLayer<Ring>({
        id: 'basemap-ocean-plane',
        data: OCEAN_PLANE,
        getPolygon: (d) => d,
        stroked: false,
        filled: true,
        getFillColor: [...basemapRgb.ocean, 255],
        parameters: BASEMAP_PARAMETERS,
      }),

      /*
       * Depth tinting - the filled bands, and the reason the canvas has a ground at all.
       *
       * Contour rings enclose water DEEPER than their level, and they nest (verified:
       * the demo view sits inside 200/1000/2000/3000/4000 m). Painting them shallow-first
       * lets each deeper band nest on top, so the visible colour at any pixel is its
       * deepest enclosing contour.
       *
       * ORDER DEPENDENCY, stated so it cannot break silently: this relies on
       * bathymetry.json already being ascending by depth, which it is because
       * scripts/build-basemap.mjs:32 iterates BATHY_LEVELS shallow-to-deep and pushes in
       * that order (verified: 200x60, 1000x60, 2000x88, 3000x156, 4000x126, 5000x112,
       * 6000x29, strictly ascending). Reordering BATHY_LEVELS would invert the tinting.
       *
       * Known approximation: a shallow rise inside deep water - a seamount - is drawn
       * before the deep band and gets overpainted by it. At a 0.25 degree simplification
       * tolerance and basin scale that is below the resolution of the data anyway.
       */
      new PolygonLayer<BathymetryRing>({
        id: 'basemap-bathymetry-fill',
        data: '/basemap/bathymetry.json',
        getPolygon: (d) => d.path,
        stroked: false,
        filled: true,
        getFillColor: (d) => [...bathymetryColor(d.depth_m), 255],
        parameters: BASEMAP_PARAMETERS,
      }),

      /*
       * Ocean relief. Real NASA topo+bathymetry, desaturated in the shader and held at
       * low opacity, painted OVER the depth bands so it modulates them rather than
       * replacing them.
       *
       * It has to sit here rather than under the shelf plane, which is opaque and would
       * hide it. It is drawn before land and the coastline, so the geography still wins
       * at the shore.
       */
      new ReliefBitmapLayer({
        id: 'basemap-ocean-relief',
        image: '/basemap/earth-bathy.jpg',
        bounds: BASEMAP_BOUNDS,
        opacity: basemapDetail.reliefOpacity,
        parameters: BASEMAP_PARAMETERS,
      }),

      // Contour line work. Drawn beneath the coastline so the shelf break tucks under
      // the shore rather than crossing it. Width was sub-pixel (0.7 / floor 0.5), which
      // is why 631 rings rendered as nothing.
      new PathLayer<BathymetryRing>({
        id: 'basemap-bathymetry',
        data: '/basemap/bathymetry.json',
        getPath: (d) => d.path,
        widthUnits: 'pixels',
        getWidth: basemapDetail.contourWidthPx,
        widthMinPixels: basemapDetail.contourMinPx,
        getColor: (d) => [...bathymetryColor(d.depth_m), 200],
        parameters: BASEMAP_PARAMETERS,
      }),

      new PolygonLayer<Ring>({
        id: 'basemap-land',
        data: '/basemap/land.json',
        getPolygon: (d) => d,
        stroked: false,
        filled: true,
        getFillColor: [...basemapRgb.land, 255],
        parameters: BASEMAP_PARAMETERS,
      }),

      // The ocean/land boundary is the one edge that has to read at every zoom, so it
      // is the firmest line in the basemap.
      new PathLayer<Ring>({
        id: 'basemap-coastline',
        data: '/basemap/coastline.json',
        getPath: (d) => d,
        widthUnits: 'pixels',
        getWidth: 1,
        widthMinPixels: 0.8,
        getColor: [...basemapRgb.landEdge, 255],
        parameters: BASEMAP_PARAMETERS,
      }),
    ];
  },
});
