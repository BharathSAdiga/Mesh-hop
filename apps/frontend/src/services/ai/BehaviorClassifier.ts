import { BehaviorPattern } from '@rescuenet/shared';
import { NormalizedFeatures } from './FeatureNormalizer';

export interface ClassificationResult {
  pattern: BehaviorPattern;
  confidence: number;
}

export class BehaviorClassifier {
  public classify(features: NormalizedFeatures): ClassificationResult {
    const { accelMagnitude, gyroMagnitude, jerk } = features;

    // Thresholds for deterministic logic based on typical 9.81m/s^2 baseline
    const BASE_G = 9.81;

    if (accelMagnitude > BASE_G * 3 && jerk > 150) {
      return { pattern: 'SUDDEN_IMPACT', confidence: 0.92 };
    }

    if (accelMagnitude > BASE_G * 2 && gyroMagnitude > 5) {
      return { pattern: 'RAPID_MOVEMENT', confidence: 0.85 };
    }

    if (accelMagnitude < BASE_G * 0.5 && gyroMagnitude < 0.5) {
      return { pattern: 'COLLAPSE_PATTERN', confidence: 0.88 };
    }

    // High sustained acceleration with erratic movement
    if (accelMagnitude > BASE_G * 1.5 && jerk > 50 && gyroMagnitude > 2) {
      return { pattern: 'STAMPEDE_PATTERN', confidence: 0.80 };
    }

    return { pattern: 'NORMAL', confidence: 0.95 };
  }
}
