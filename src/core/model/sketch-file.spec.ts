import { describe, expect, it } from 'vitest';
import { parseSketchFile, serializeSketch } from './sketch-file';
import { Stroke } from './stroke';

const canvas = { width: 800, height: 600 };

const strokes: readonly Stroke[] = [
  {
    id: 1,
    pointerType: 'mouse',
    points: [
      { x: 10, y: 20, time: 0 },
      { x: 30.5, y: 40.25, time: 16 },
    ],
  },
  {
    id: 2,
    pointerType: 'pen',
    points: [{ x: 100, y: 200, time: 900, pressure: 0.5 }],
  },
];

function validPoint(): Record<string, unknown> {
  return { x: 10.5, y: 20.25, time: 0, pressure: 0.5 };
}

function validStroke(): Record<string, unknown> {
  return {
    id: 1,
    pointerType: 'pen',
    points: [validPoint(), { x: 20, y: 30, time: 16, pressure: 0.6 }],
  };
}

function validFile(): Record<string, unknown> {
  return { version: 1, canvas: { width: 800, height: 600 }, strokes: [validStroke()] };
}

function fileWith(overrides: Record<string, unknown>): string {
  return JSON.stringify({ ...validFile(), ...overrides });
}

function fileWithStroke(overrides: Record<string, unknown>): string {
  return fileWith({ strokes: [{ ...validStroke(), ...overrides }] });
}

function fileWithPoint(overrides: Record<string, unknown>): string {
  return fileWithStroke({ points: [{ ...validPoint(), ...overrides }] });
}

describe('serializeSketch', () => {
  it('writes version, canvas size and strokes', () => {
    const json = JSON.parse(serializeSketch(strokes, canvas));
    expect(json).toEqual({ version: 1, canvas, strokes });
  });

  it('rounds x and y to 2 decimals, time to whole ms and pressure to 3 decimals', () => {
    const input: readonly Stroke[] = [
      {
        id: 1,
        pointerType: 'pen',
        points: [{ x: 12.3456, y: -7.891, time: 15.6, pressure: 0.12345 }],
      },
    ];
    const json = JSON.parse(serializeSketch(input, canvas));
    expect(json.strokes[0].points[0]).toEqual({ x: 12.35, y: -7.89, time: 16, pressure: 0.123 });
  });

  it('does not add pressure to points that have none', () => {
    const json = JSON.parse(serializeSketch(strokes, canvas));
    expect(json.strokes[0].points[0]).not.toHaveProperty('pressure');
  });

  it('writes an empty sketch', () => {
    const json = JSON.parse(serializeSketch([], canvas));
    expect(json).toEqual({ version: 1, canvas, strokes: [] });
  });
});

describe('parseSketchFile', () => {
  it('reads back what serializeSketch wrote (round trip)', () => {
    expect(parseSketchFile(serializeSketch(strokes, canvas))).toEqual({
      version: 1,
      canvas,
      strokes,
    });
  });

  it('reads a hand-written valid file', () => {
    const sketch = parseSketchFile(JSON.stringify(validFile()));
    expect(sketch.canvas).toEqual({ width: 800, height: 600 });
    expect(sketch.strokes).toHaveLength(1);
    expect(sketch.strokes[0].pointerType).toBe('pen');
    expect(sketch.strokes[0].points[0]).toEqual({ x: 10.5, y: 20.25, time: 0, pressure: 0.5 });
  });

  it('accepts points outside the canvas (pointer capture allows negative coordinates)', () => {
    const sketch = parseSketchFile(fileWithPoint({ x: -15, y: 900 }));
    expect(sketch.strokes[0].points[0].x).toBe(-15);
  });

  it('accepts points without pressure', () => {
    const point = { x: 1, y: 2, time: 3 };
    const sketch = parseSketchFile(fileWithStroke({ pointerType: 'mouse', points: [point] }));
    expect(sketch.strokes[0].points[0]).toEqual(point);
  });

  it('accepts an empty sketch', () => {
    expect(parseSketchFile(fileWith({ strokes: [] })).strokes).toEqual([]);
  });

  it.each([
    ['text that is not JSON', '{not json'],
    ['a number instead of an object', '42'],
    ['null', 'null'],
    ['an array instead of an object', '[]'],
    ['a missing version', JSON.stringify({ canvas, strokes: [] })],
    ['an unsupported version', fileWith({ version: 2 })],
    ['a missing canvas', fileWith({ canvas: undefined })],
    ['a non-numeric canvas width', fileWith({ canvas: { width: '800', height: 600 } })],
    ['strokes that are not an array', fileWith({ strokes: {} })],
    ['a stroke that is not an object', fileWith({ strokes: [5] })],
    ['a stroke id that is not a number', fileWithStroke({ id: 'a' })],
    ['an unknown pointer type', fileWithStroke({ pointerType: 'stylus' })],
    ['a stroke without points', fileWithStroke({ points: [] })],
    ['points that are not an array', fileWithStroke({ points: 'abc' })],
    ['a point with a string coordinate', fileWithPoint({ x: '10' })],
    ['a point with a null coordinate', fileWithPoint({ y: null })],
    ['a point without time', fileWithPoint({ time: undefined })],
    ['a point with a non-numeric pressure', fileWithPoint({ pressure: 'high' })],
  ])('rejects %s', (_description, text) => {
    expect(() => parseSketchFile(text)).toThrow();
  });

  it('says where the problem is in the error message', () => {
    const text = fileWithStroke({ points: [validPoint(), { ...validPoint(), x: 'oops' }] });
    expect(() => parseSketchFile(text)).toThrow(/strokes\[0\]\.points\[1\]\.x/);
  });

  it('accepts unique ids that are not consecutive', () => {
    const text = fileWith({
      strokes: [
        { ...validStroke(), id: 3 },
        { ...validStroke(), id: 7 },
      ],
    });
    expect(parseSketchFile(text).strokes.map((s) => s.id)).toEqual([3, 7]);
  });

  it('rejects two strokes with the same id and names both of them', () => {
    const text = fileWith({
      strokes: [
        { ...validStroke(), id: 1 },
        { ...validStroke(), id: 2 },
        { ...validStroke(), id: 1 },
      ],
    });
    expect(() => parseSketchFile(text)).toThrow(/strokes\[2\]\.id.*strokes\[0\]/);
  });
});
