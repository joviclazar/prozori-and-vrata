export interface SymbolThresholds {
  readonly maxCornerDeg: number;
  readonly minArmRatio: number;
  readonly maxJoinGapRatio: number;
}

export const SYMBOL_THRESHOLDS: SymbolThresholds = {
  maxCornerDeg: 110,
  minArmRatio: 0.5,
  maxJoinGapRatio: 0.25,
};
