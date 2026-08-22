import { IncidentCard } from './IncidentCard';
import type { EventType, Priority } from '@rescuenet/shared';

export interface AlertData {
  id: string;
  type: EventType;
  priority: Priority;
  distance?: number;
  timeAgo: string;
  confidence: number;
}

interface AlertListProps {
  alerts: AlertData[];
}

export function AlertList({ alerts }: AlertListProps) {
  if (alerts.length === 0) {
    return (
      <div className="text-center text-gray-500 py-8 bg-gray-50 rounded-xl border border-dashed border-gray-300">
        No active alerts in your area.
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {alerts.map((alert) => (
        <IncidentCard 
          key={alert.id}
          type={alert.type}
          priority={alert.priority}
          distance={alert.distance}
          timeAgo={alert.timeAgo}
          confidence={alert.confidence}
        />
      ))}
    </div>
  );
}
