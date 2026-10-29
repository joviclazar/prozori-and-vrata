export interface MergeThresholds {
  readonly maxPositionDiffRatio: number;
  readonly maxGapRatio: number;
  readonly minDoubleSpacingRatio: number;
  readonly minDoubleOverlapRatio: number;
}

export const MERGE_THRESHOLDS: MergeThresholds = {
  maxPositionDiffRatio: 0.1,
  maxGapRatio: 0.1,
  minDoubleSpacingRatio: 0.02,
  minDoubleOverlapRatio: 0.5,
};

export interface GridThresholds {
  readonly minSideCoverage: number;
  readonly maxEndGapRatio: number;
}

export const GRID_THRESHOLDS: GridThresholds = {
  minSideCoverage: 0.5,
  maxEndGapRatio: 0.15,
};
