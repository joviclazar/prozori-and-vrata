export interface MergeThresholds {
  readonly maxPositionDiffRatio: number;
  readonly maxGapRatio: number;
}

export const MERGE_THRESHOLDS: MergeThresholds = {
  maxPositionDiffRatio: 0.1,
  maxGapRatio: 0.1,
};
