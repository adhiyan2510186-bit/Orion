/**
 * Zustand stores, one per concern. No global god-object: a component that only needs
 * the time cursor should not re-render when the selection changes.
 */

'use client';

import { create } from 'zustand';
import type { ArgoFloatPoint, QueryResponse } from '@/types/argo';

// --------------------------------------------------------------------------- query
interface QueryState {
  text: string;
  response: QueryResponse | null;
  /**
   * Measurements in the same region and period that did NOT match the query.
   *
   * Fetched by a second, relaxed query - see useArgoQuery and ADR 0006. Kept beside
   * the response rather than inside it because it is NOT part of the answer: nothing
   * in the summary, the inspector or the anomaly panel counts these, and a future
   * reader must not mistake them for results.
   */
  contextPoints: ArgoFloatPoint[];
  isLoading: boolean;
  error: string | null;
  history: string[];
  setText: (text: string) => void;
  setResponse: (response: QueryResponse | null) => void;
  setContextPoints: (points: ArgoFloatPoint[]) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  pushHistory: (text: string) => void;
}

export const useQueryStore = create<QueryState>((set) => ({
  text: '',
  response: null,
  contextPoints: [],
  isLoading: false,
  error: null,
  history: [],
  setText: (text) => set({ text }),
  setResponse: (response) => set({ response }),
  setContextPoints: (contextPoints) => set({ contextPoints }),
  setLoading: (isLoading) => set({ isLoading }),
  setError: (error) => set({ error }),
  pushHistory: (text) =>
    set((state) => ({ history: [text, ...state.history.filter((h) => h !== text)].slice(0, 12) })),
}));

// ---------------------------------------------------------------------------- time
interface TimeState {
  /** Epoch ms. The 4th dimension - drives which points the map shows. */
  cursor: number;
  domain: [number, number];
  /** Points within this many ms before the cursor stay visible, as a comet tail. */
  windowMs: number;
  isPlaying: boolean;
  speed: number;
  enabled: boolean;
  setCursor: (cursor: number) => void;
  setDomain: (domain: [number, number]) => void;
  setWindow: (windowMs: number) => void;
  setPlaying: (playing: boolean) => void;
  setSpeed: (speed: number) => void;
  setEnabled: (enabled: boolean) => void;
}

const DAY = 86_400_000;

export const useTimeStore = create<TimeState>((set) => ({
  cursor: 0,
  domain: [0, 1],
  windowMs: 30 * DAY,
  isPlaying: false,
  speed: 1,
  enabled: false,
  setCursor: (cursor) => set({ cursor }),
  setDomain: (domain) => set({ domain, cursor: domain[1] }),
  setWindow: (windowMs) => set({ windowMs }),
  setPlaying: (isPlaying) => set({ isPlaying }),
  setSpeed: (speed) => set({ speed }),
  setEnabled: (enabled) => set({ enabled }),
}));

// ----------------------------------------------------------------------- selection
interface SelectionState {
  floatId: string | null;
  cycle: number | null;
  hovered: ArgoFloatPoint | null;
  select: (floatId: string | null, cycle?: number | null) => void;
  hover: (point: ArgoFloatPoint | null) => void;
}

export const useSelectionStore = create<SelectionState>((set) => ({
  floatId: null,
  cycle: null,
  hovered: null,
  select: (floatId, cycle = null) => set({ floatId, cycle }),
  hover: (hovered) => set({ hovered }),
}));

// ---------------------------------------------------------------------------- view
/**
 * Basemap style. Local UI state - it never crosses the wire, so it is deliberately
 * NOT in contracts/. See docs/adr/0004-offline-basemap.md.
 */
export type BasemapMode = 'ocean' | 'satellite' | 'graticule';

interface ViewState {
  colorBy: string;
  /** Depth is metres against degrees of longitude, so it needs exaggerating to read. */
  depthExaggeration: number;
  showTrajectories: boolean;
  showGraticule: boolean;
  /** The non-matching measurements drawn beneath the results. Defaults ON. */
  showContext: boolean;
  basemap: BasemapMode;
  setColorBy: (key: string) => void;
  setDepthExaggeration: (value: number) => void;
  setBasemap: (mode: BasemapMode) => void;
  toggle: (key: 'showTrajectories' | 'showGraticule' | 'showContext') => void;
}

export const useViewStore = create<ViewState>((set) => ({
  colorBy: 'temperature_c',
  /**
   * x6, not x1, and this is a measured default rather than a taste.
   *
   * depthToZ scales metres into degrees at 0.35 deg/km, so at x1 the context cloud's
   * 300 m of water column is 0.105 degrees - about THREE pixels at the arrival zoom.
   * Every one of a profile's ~350 context points lands in that sliver, which is why
   * 41,492 of them measured a lit-pixel delta in the hundreds and the layer looked like
   * it was not rendering at all.
   *
   * At x6 the same column is ~18 px and reads as a column. The matched cloud is
   * unaffected: those points sit at 3-10 m, which is under a thousandth of a degree at
   * any exaggeration in range, so this changes how the WATER COLUMN reads and nothing
   * about where the results are.
   */
  depthExaggeration: 6,
  showTrajectories: true,
  showGraticule: true,
  /**
   * On by default. A filter shown as an absence is not shown at all - the whole reason
   * the layer exists is that the first frame should say what was excluded, and a
   * default-off control says it only to someone who already knew to look.
   */
  showContext: true,
  /** Vector ocean by default: it carries the geography without competing for chroma. */
  basemap: 'ocean',
  setColorBy: (colorBy) => set({ colorBy }),
  setDepthExaggeration: (depthExaggeration) => set({ depthExaggeration }),
  setBasemap: (basemap) => set({ basemap }),
  toggle: (key) => set((state) => ({ [key]: !state[key] }) as Partial<ViewState>),
}));
