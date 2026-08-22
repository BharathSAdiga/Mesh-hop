import { RescuePacket } from '@rescuenet/shared';

// Distance calculation using Haversine formula
function getDistanceFromLatLonInMeters(lat1: number, lon1: number, lat2: number, lon2: number) {
  const R = 6371e3; // Radius of the earth in m
  const dLat = (lat2 - lat1) * (Math.PI / 180);
  const dLon = (lon2 - lon1) * (Math.PI / 180);
  const a = 
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) * 
    Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a)); 
  return R * c; 
}

export class SimilarityCalculator {
  
  public calculateGroupSimilarity(packets: RescuePacket[]) {
    if (packets.length <= 1) {
      return {
        behavioralSimilarity: 1.0,
        temporalSimilarity: 1.0,
        spatialSimilarity: 1.0,
        eventTypeSimilarity: 1.0,
      };
    }

    let totalPairs = 0;
    let sumBehavioral = 0;
    let sumTemporal = 0;
    let sumSpatial = 0;
    let sumEventType = 0;

    for (let i = 0; i < packets.length; i++) {
      for (let j = i + 1; j < packets.length; j++) {
        const p1 = packets[i];
        const p2 = packets[j];

        // Event Type (1 if same, 0 if diff)
        sumEventType += p1.eventType === p2.eventType ? 1 : 0;

        // Temporal: 1 if diff = 0, 0 if diff >= 30000ms (30s)
        const timeDiff = Math.abs(p1.timestamp - p2.timestamp);
        sumTemporal += Math.max(0, 1 - (timeDiff / 30000));

        // Spatial: 1 if dist = 0, 0 if dist >= 100m
        if (p1.location && p2.location) {
          const dist = getDistanceFromLatLonInMeters(
            p1.location.latitude, p1.location.longitude,
            p2.location.latitude, p2.location.longitude
          );
          sumSpatial += Math.max(0, 1 - (dist / 100));
        } else {
          // If no location, we assume lowest similarity to prevent false correlation
          sumSpatial += 0;
        }

        // Behavioral: Similarity of their anomaly scores (diff of scores)
        const scoreDiff = Math.abs(p1.anomalyScore - p2.anomalyScore);
        sumBehavioral += Math.max(0, 1 - scoreDiff);

        totalPairs++;
      }
    }

    return {
      behavioralSimilarity: sumBehavioral / totalPairs,
      temporalSimilarity: sumTemporal / totalPairs,
      spatialSimilarity: sumSpatial / totalPairs,
      eventTypeSimilarity: sumEventType / totalPairs,
    };
  }
}
