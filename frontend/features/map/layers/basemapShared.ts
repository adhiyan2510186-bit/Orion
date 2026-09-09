/**
 * Shared constants for the basemap layers.
 *
 * The occlusion problem, and why every basemap layer disables depth testing:
 *
 * `depthToZ()` places measurements at NEGATIVE z - a 2000 m float sits 0.7 degrees
 * below the z=0 sea surface. Geography drawn as an opaque plane at z=0 with normal
 * depth testing would therefore sit directly on top of the entire point cloud and hide
 * it from any downward viewing angle. The basemap would erase the data it exists to
 * give context to.
 *
 * Disabling the depth test, combined with these layers being registered FIRST (draw
 * order is registration order in `useLayerBuilder`), makes the basemap unconditionally
 * a backdrop: it paints before the data and can never occlude it, at any camera angle.
 *
 * The trade-off is honest and deliberate: the basemap does not participate in the 3D
 * depth sort, so orbiting beneath the surface still shows it through the water. That is
 * the correct compromise for a backdrop - the alternative loses the measurements.
 */

/** Equirectangular world extent. Exact in OrbitView, where world units are degrees. */
export const BASEMAP_BOUNDS: [number, number, number, number] = [-180, -90, 180, 90];

/**
 * luma.gl v9 parameter names (deck.gl 9.x). The v8 spelling was `depthTest: false`;
 * writing that here would silently do nothing.
 */
export const BASEMAP_PARAMETERS = {
  depthCompare: 'always' as const,
  depthWriteEnabled: false,
};
