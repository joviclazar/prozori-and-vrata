import { describe, expect, it } from 'vitest';
import sketch_2026_10_16_10_25_16 from '../../../test-data/sketches/sketch-2026-10-16-10-25-16.json';
import sketch_2026_10_20_13_25_22 from '../../../test-data/sketches/sketch-2026-10-20-13-25-22.json';
import sketch_2026_10_20_13_25_42 from '../../../test-data/sketches/sketch-2026-10-20-13-25-42.json';
import sketch_2026_10_20_13_26_11 from '../../../test-data/sketches/sketch-2026-10-20-13-26-11.json';
import sketch_2026_10_20_13_26_37 from '../../../test-data/sketches/sketch-2026-10-20-13-26-37.json';
import sketch_2026_10_28_21_48_18 from '../../../test-data/sketches/sketch-2026-10-28-21-48-18.json';
import sketch_2026_10_29_21_19_15 from '../../../test-data/sketches/sketch-2026-10-29-21-19-15.json';
import sketch_2026_10_29_21_45_58 from '../../../test-data/sketches/sketch-2026-10-29-21-45-58.json';
import sketch_2026_10_29_21_46_46 from '../../../test-data/sketches/sketch-2026-10-29-21-46-46.json';
import sketch_2026_10_29_21_47_17 from '../../../test-data/sketches/sketch-2026-10-29-21-47-17.json';
import { parseSketchFile } from '../model/sketch-file';
import { GridNode } from './grid-builder/build-grid-tree';
import { parseSketch } from './sketch-parser';

interface GoldenCase {
  readonly name: string;
  readonly drawn: string;
  readonly json: unknown;
  readonly tree: string;
  readonly annotations: number;
}

const CASES: readonly GoldenCase[] = [
  {
    name: '2026-10-16-10-25-16',
    drawn: 'frame in four strokes, stulp',
    json: sketch_2026_10_16_10_25_16,
    tree: 'vertical[stulp](cell, cell)',
    annotations: 9,
  },
  {
    name: '2026-10-20-13-25-22',
    drawn: 'frame in two strokes, stulp',
    json: sketch_2026_10_20_13_25_22,
    tree: 'vertical[stulp](cell, cell)',
    annotations: 8,
  },
  {
    name: '2026-10-20-13-25-42',
    drawn: 'frame in two strokes, no divider',
    json: sketch_2026_10_20_13_25_42,
    tree: 'cell',
    annotations: 8,
  },
  {
    name: '2026-10-20-13-26-11',
    drawn: 'open top-right corner, stulp',
    json: sketch_2026_10_20_13_26_11,
    tree: 'vertical[stulp](cell, cell)',
    annotations: 9,
  },
  {
    name: '2026-10-20-13-26-37',
    drawn: 'frame in three strokes, accidental click',
    json: sketch_2026_10_20_13_26_37,
    tree: 'cell',
    annotations: 6,
  },
  {
    name: '2026-10-28-21-48-18',
    drawn: 'side in two strokes, side traced twice, stulp',
    json: sketch_2026_10_28_21_48_18,
    tree: 'vertical[stulp](cell, cell)',
    annotations: 4,
  },
  {
    name: '2026-10-29-21-19-15',
    drawn: 'T-profile as a double line',
    json: sketch_2026_10_29_21_19_15,
    tree: 'vertical[mullion](cell, cell)',
    annotations: 9,
  },
  {
    name: '2026-10-29-21-45-58',
    drawn: 'tight double line (12 px)',
    json: sketch_2026_10_29_21_45_58,
    tree: 'vertical[mullion](cell, cell)',
    annotations: 9,
  },
  {
    name: '2026-10-29-21-46-46',
    drawn: 'transom light as a horizontal double line',
    json: sketch_2026_10_29_21_46_46,
    tree: 'horizontal[mullion](cell, cell)',
    annotations: 9,
  },
  {
    name: '2026-10-29-21-47-17',
    drawn: 'frame in one stroke, no divider',
    json: sketch_2026_10_29_21_47_17,
    tree: 'cell',
    annotations: 8,
  },
];

function summarize(node: GridNode): string {
  if (node.kind === 'cell') {
    return 'cell';
  }
  const dividers = node.dividers.map((d) => (d.doubled ? 'mullion' : 'stulp')).join(', ');
  const children = node.children.map(summarize).join(', ');
  return `${node.direction}[${dividers}](${children})`;
}

describe('parseSketch on recorded sketches', () => {
  it.each(CASES)('$name ($drawn)', ({ json, tree, annotations }) => {
    const { strokes } = parseSketchFile(JSON.stringify(json));
    const result = parseSketch(strokes);

    expect(result.tree && summarize(result.tree)).toBe(tree);
    expect(result.annotations).toHaveLength(annotations);
    expect(result.grid?.rejected).toEqual([]);
  });
});
