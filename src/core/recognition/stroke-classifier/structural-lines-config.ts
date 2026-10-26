export interface StructuralLineThresholds {
  readonly minLengthRatio: number;
  readonly maxAxisDeviationDeg: number;
  readonly sharpCornerDeg: number;
  readonly minArmRatio: number;
}

export const STRUCTURAL_LINE_THRESHOLDS: StructuralLineThresholds = {
  minLengthRatio: 0.25,
  maxAxisDeviationDeg: 20,
  sharpCornerDeg: 75,
  minArmRatio: 0.25,
};
