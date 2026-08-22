import type { CandidateEvent } from '@rescuenet/shared';
import { FeatureNormalizer } from './FeatureNormalizer';
import type { RawSensorData } from './FeatureNormalizer';
import { BehaviorClassifier } from './BehaviorClassifier';
import { AnomalyDetector } from './AnomalyDetector';

export class BehavioralAI {
  private featureNormalizer: FeatureNormalizer;
  private behaviorClassifier: BehaviorClassifier;
  private anomalyDetector: AnomalyDetector;

  constructor() {
    this.featureNormalizer = new FeatureNormalizer();
    this.behaviorClassifier = new BehaviorClassifier();
    this.anomalyDetector = new AnomalyDetector();
  }

  public processSensorData(data: RawSensorData): CandidateEvent {
    // 1. Feature Extraction
    const features = this.featureNormalizer.normalize(data);

    // 2. Behavioral Model Classification
    const classification = this.behaviorClassifier.classify(features);

    // 3. Anomaly Score Calculation
    const anomalyScore = this.anomalyDetector.calculateScore(classification);

    // 4. Candidate Event Generation (NEVER confirmed disaster directly)
    return {
      anomalyScore: Math.min(Math.max(anomalyScore, 0), 1),
      eventType: classification.pattern,
      confidence: classification.confidence,
      timestamp: Date.now(),
      featureSummary: {
        accelMagnitude: features.accelMagnitude,
        gyroMagnitude: features.gyroMagnitude,
        jerk: features.jerk,
      }
    };
  }

  public reset() {
    this.featureNormalizer.reset();
  }
}
