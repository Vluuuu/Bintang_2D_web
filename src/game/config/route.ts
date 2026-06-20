/**
 * Continuous world layout for Bintang Journey.
 *
 * Every segment has an ABSOLUTE world X position (units = screen pixels at base
 * 1280px canvas, pxPerUnit = 1). The world scrolls continuously based on
 * `worldDistance`; nothing teleports or swaps scene on a threshold.
 *
 * - kind "city"     : informational/label segment. City background is a global
 *                     horizontally-looping tile, so city segments mainly drive
 *                     the HUD location label in the gaps between landmarks.
 * - kind "landmark" : a full 16:9 image that slides in from the right, is passed
 *                     naturally, and slides out to the left. `id` must match a
 *                     landmark key in assets config.
 *
 * Easy to edit: change start/width/enabled, reorder, or toggle landmarks here.
 */
export type SegmentKind = 'city' | 'landmark';

export interface WorldSegment {
  id: string;
  kind: SegmentKind;
  start: number;        // absolute world X (left edge)
  width: number;        // world width
  locationLabel: string;
  enabled: boolean;
}

export const SEGMENT_WIDTH = 1280; // a landmark image is one full screen wide

export const route: WorldSegment[] = [
  { id: 'city-start',    kind: 'city',     start: -3000, width: 4800, locationLabel: 'Kota Jakarta',  enabled: true },
  { id: 'upnvj',         kind: 'landmark', start: 1800,  width: 1280, locationLabel: 'UPNVJ',         enabled: true },
  { id: 'city-mid-1',    kind: 'city',     start: 3080,  width: 1520, locationLabel: 'Kota Jakarta',  enabled: true },
  { id: 'lenteng',       kind: 'landmark', start: 4600,  width: 1280, locationLabel: 'Lenteng Agung', enabled: true },
  { id: 'city-mid-2',    kind: 'city',     start: 5880,  width: 1520, locationLabel: 'Kota Jakarta',  enabled: true },
  { id: 'ps-gacor',      kind: 'landmark', start: 7400,  width: 1280, locationLabel: 'PS GACOR',      enabled: true },
  { id: 'city-mid-3',    kind: 'city',     start: 8680,  width: 1520, locationLabel: 'Kota Jakarta',  enabled: true },
  { id: 'blok-m',        kind: 'landmark', start: 10200, width: 1280, locationLabel: 'Blok M',        enabled: true },
  { id: 'city-end',      kind: 'city',     start: 11480, width: 4800, locationLabel: 'Kota Jakarta',  enabled: true },
];

/** World center X of a segment. */
export function segmentCenter(s: WorldSegment): number {
  return s.start + s.width / 2;
}
