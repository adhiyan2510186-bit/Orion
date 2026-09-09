/**
 * Ocean and sea names.
 *
 * Oceanographic labels only - no country names. The dataset lives entirely in open
 * Pacific water, so country labels would add clutter a long way from anything the user
 * is looking at, while "SOUTH PACIFIC OCEAN" under the float track is orientation.
 *
 * Set in the condensed uppercase register DESIGN.md calls the cartographic voice, in
 * Graphite, which is the colour for anything that labels a measurement without being
 * one. Drawn for both vector and satellite styles; the graticule style stays bare.
 */

import { CollisionFilterExtension } from '@deck.gl/extensions';
import { TextLayer, type TextLayerProps } from '@deck.gl/layers';
import { fonts, rgb } from '@/design/tokens';
import { registerLayer } from './registry';
import { BASEMAP_PARAMETERS } from './basemapShared';

interface OceanLabel {
  name: string;
  lon: number;
  lat: number;
  /** Natural Earth scalerank: 0 is an ocean basin, higher is a smaller sea. */
  rank: number;
}

/**
 * Labels are sized in pixels, so zooming out marches 29 basin names into the same few
 * hundred pixels and they turn to mush. Collision filtering drops the ones that would
 * overlap and keeps the higher-priority name legible - what a chart does when it runs
 * out of room.
 *
 * The extension's props are read at runtime but are not declared on TextLayerProps in
 * deck.gl 9.1's types, so the assertion is scoped to just these four keys rather than
 * loosening the whole layer.
 */
const COLLISION_PROPS = {
  extensions: [new CollisionFilterExtension()],
  collisionEnabled: true,
  /** Negative rank so ocean basins (rank 0) outrank marginal seas. */
  getCollisionPriority: (d: OceanLabel) => -d.rank,
  collisionTestProps: { sizeScale: 1.4 },
} as unknown as Partial<TextLayerProps<OceanLabel>>;

export const oceanLabels = registerLayer({
  id: 'ocean-labels',
  label: 'Ocean labels',
  supports: () => true,
  build: (ctx) => {
    if (ctx.basemap === 'graticule') return null;

    return new TextLayer<OceanLabel>({
      id: 'ocean-labels',
      data: '/basemap/ocean-labels.json',
      getPosition: (d) => [d.lon, d.lat, 0],
      getText: (d) => d.name,
      // Basin names carry further than marginal seas. Natural Earth already encodes
      // that distinction in the strings themselves - basins arrive uppercase, seas in
      // title case - so size and alpha only need to reinforce it.
      getSize: (d) => (d.rank === 0 ? 12 : 10),
      sizeUnits: 'pixels',
      characterSet: 'auto',
      fontFamily: fonts.condensed,
      fontWeight: 700,
      getColor: (d) => [...rgb.secondary, d.rank === 0 ? 170 : 125],
      getTextAnchor: 'middle',
      getAlignmentBaseline: 'center',
      parameters: BASEMAP_PARAMETERS,
      ...COLLISION_PROPS,
    });
  },
});
