export interface RawSensorData {
  acceleration: { x: number; y: number; z: number };
  gyro: { x: number; y: number; z: number };
  timestamp: number;
}

export interface NormalizedFeatures {
  accelMagnitude: number;
  gyroMagnitude: number;
  jerk: number;
}

export class FeatureNormalizer {
  private lastAccel: { x: number; y: number; z: number } | null = null;
  private lastTimestamp: number | null = null;

  public normalize(data: RawSensorData): NormalizedFeatures {
    const accelMag = Math.sqrt(
      data.acceleration.x ** 2 +
      data.acceleration.y ** 2 +
      data.acceleration.z ** 2
    );

    const gyroMag = Math.sqrt(
      data.gyro.x ** 2 +
      data.gyro.y ** 2 +
      data.gyro.z ** 2
    );

    let jerk = 0;

    if (this.lastAccel && this.lastTimestamp) {
      const dt = data.timestamp - this.lastTimestamp;
      if (dt > 0) {
        const dAx = data.acceleration.x - this.lastAccel.x;
        const dAy = data.acceleration.y - this.lastAccel.y;
        const dAz = data.acceleration.z - this.lastAccel.z;
        jerk = Math.sqrt(dAx ** 2 + dAy ** 2 + dAz ** 2) / (dt / 1000); // Jerk in m/s^3 assuming ms timestamp
      }
    }

    this.lastAccel = { ...data.acceleration };
    this.lastTimestamp = data.timestamp;

    return {
      accelMagnitude: accelMag,
      gyroMagnitude: gyroMag,
      jerk: jerk,
    };
  }

  public reset() {
    this.lastAccel = null;
    this.lastTimestamp = null;
  }
}
