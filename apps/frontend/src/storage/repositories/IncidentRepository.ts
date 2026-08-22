import { getDB } from '../db';
import type { StoredIncident } from '../db';

export class IncidentRepository {
  
  static async storeIncident(incident: StoredIncident): Promise<void> {
    const db = await getDB();
    await db.put('incidents', incident);
  }

  static async getIncidents(): Promise<StoredIncident[]> {
    const db = await getDB();
    return await db.getAll('incidents');
  }
  
}
