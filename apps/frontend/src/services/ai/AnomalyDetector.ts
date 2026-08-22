import type { ClassificationResult } from './BehaviorClassifier';

export class AnomalyDetector {
  public calculateScore(result: ClassificationResult): number {
    const { pattern, confidence } = result;

    switch (pattern) {
      case 'NORMAL':
        return (1 - confidence) * 0.1; // Very low score
      case 'RAPID_MOVEMENT':
        return 0.4 + (confidence * 0.3); // Medium score
      case 'STAMPEDE_PATTERN':
        return 0.6 + (confidence * 0.3); // High score
      case 'COLLAPSE_PATTERN':
        return 0.7 + (confidence * 0.25); // Very High score
      case 'SUDDEN_IMPACT':
        return 0.8 + (confidence * 0.2); // Critical score
      default:
        return 0;
    }
  }
}
