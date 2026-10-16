import { POINTER_TYPES, PointerType, Stroke, StrokePoint } from './stroke';

export interface CanvasSize {
  readonly width: number;
  readonly height: number;
}

const SKETCH_FILE_VERSION = 1;

export interface SketchFile {
  readonly version: typeof SKETCH_FILE_VERSION;
  readonly strokes: readonly Stroke[];
  readonly canvas: CanvasSize;
}

const COORDINATE_DECIMALS = 2;
const TIME_DECIMALS = 0;
const PRESSURE_DECIMALS = 3;

export function serializeSketch(strokes: readonly Stroke[], canvas: CanvasSize): string {
  const file: SketchFile = {
    version: SKETCH_FILE_VERSION,
    strokes: strokes.map((stroke) => ({
      ...stroke,
      points: stroke.points.map(roundPoint),
    })),
    canvas,
  };

  return JSON.stringify(file);
}

function roundPoint(p: StrokePoint): StrokePoint {
  const base = {
    x: roundTo(p.x, COORDINATE_DECIMALS),
    y: roundTo(p.y, COORDINATE_DECIMALS),
    time: roundTo(p.time, TIME_DECIMALS),
  };

  return p.pressure === undefined
    ? base
    : { ...base, pressure: roundTo(p.pressure, PRESSURE_DECIMALS) };
}

function roundTo(value: number, decimals: number): number {
  const factor = 10 ** decimals;
  return Math.round(value * factor) / factor;
}

export function parseSketchFile(text: string): SketchFile {
  let value: unknown;
  try {
    value = JSON.parse(text);
  } catch {
    throw new Error('sketch file: invalid JSON');
  }

  if (!isRecord(value)) {
    throw new Error('sketch file: expected an object');
  }
  if (value['version'] !== SKETCH_FILE_VERSION) {
    throw new Error('version: expected ' + SKETCH_FILE_VERSION);
  }

  const strokes = readArray(value, 'strokes', '').map((s, i) => readStroke(s, `strokes[${i}]`));
  assertUniqueIds(strokes);

  return {
    version: SKETCH_FILE_VERSION,
    canvas: readCanvas(value['canvas'], 'canvas'),
    strokes,
  };
}

function assertUniqueIds(strokes: readonly Stroke[]): void {
  const firstIndexById = new Map<number, number>();
  strokes.forEach((stroke, i) => {
    const firstIndex = firstIndexById.get(stroke.id);
    if (firstIndex !== undefined) {
      throw new Error(
        `strokes[${i}].id: duplicate id ${stroke.id}, already used by strokes[${firstIndex}]`,
      );
    }
    firstIndexById.set(stroke.id, i);
  });
}

function readCanvas(value: unknown, path: string): CanvasSize {
  if (!isRecord(value)) {
    throw new Error(`${path}: expected an object`);
  }
  return {
    width: readNumber(value, 'width', path),
    height: readNumber(value, 'height', path),
  };
}

function readStroke(value: unknown, path: string): Stroke {
  if (!isRecord(value)) {
    throw new Error(`${path}: expected an object`);
  }

  const pointerType = value['pointerType'];
  if (!isPointerType(pointerType)) {
    throw new Error(`${path}.pointerType: expected one of ${POINTER_TYPES.join(', ')}`);
  }

  const points = readArray(value, 'points', path);
  if (points.length === 0) {
    throw new Error(`${path}.points: expected at least one point`);
  }

  return {
    id: readNumber(value, 'id', path),
    pointerType,
    points: points.map((p, j) => readPoint(p, `${path}.points[${j}]`)),
  };
}

function readPoint(value: unknown, path: string): StrokePoint {
  if (!isRecord(value)) {
    throw new Error(`${path}: expected an object`);
  }

  const base = {
    x: readNumber(value, 'x', path),
    y: readNumber(value, 'y', path),
    time: readNumber(value, 'time', path),
  };

  return value['pressure'] === undefined
    ? base
    : { ...base, pressure: readNumber(value, 'pressure', path) };
}

function readNumber(obj: Record<string, unknown>, key: string, path: string): number {
  const v = obj[key];
  if (typeof v !== 'number' || !Number.isFinite(v)) {
    throw new Error(`${joinPath(path, key)}: expected a number`);
  }
  return v;
}

function readArray(obj: Record<string, unknown>, key: string, path: string): readonly unknown[] {
  const v = obj[key];
  if (!Array.isArray(v)) {
    throw new Error(`${joinPath(path, key)}: expected an array`);
  }
  return v;
}

function joinPath(path: string, key: string): string {
  return path === '' ? key : `${path}.${key}`;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isPointerType(value: unknown): value is PointerType {
  return POINTER_TYPES.some((t) => t === value);
}
