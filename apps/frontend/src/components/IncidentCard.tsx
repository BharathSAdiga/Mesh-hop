import type { EventType } from '@rescuenet/shared';
import { PriorityBadge } from './PriorityBadge';
import type { Priority } from '@rescuenet/shared';

interface IncidentCardProps {
  type: EventType;
  priority: Priority;
  distance?: number;
  timeAgo: string;
  confidence: number;
}

export function IncidentCard({ type, priority, distance, timeAgo, confidence }: IncidentCardProps) {
  return (
    <div className="bg-white p-4 rounded-xl shadow border border-gray-100 flex flex-col space-y-3">
      <div className="flex justify-between items-start">
        <h3 className="font-bold text-gray-800 text-lg">{type.replace('_', ' ')}</h3>
        <PriorityBadge priority={priority} />
      </div>
      
      <div className="flex text-sm text-gray-500 justify-between items-center">
        <span>{timeAgo}</span>
        {distance !== undefined && <span>{distance}m away</span>}
      </div>

      <div className="w-full bg-gray-200 rounded-full h-2 mt-2">
        <div 
          className="bg-red-500 h-2 rounded-full" 
          style={{ width: `${Math.min(100, Math.max(0, confidence * 100))}%` }}
        />
      </div>
      <p className="text-xs text-right text-gray-400">Confidence: {Math.round(confidence * 100)}%</p>
    </div>
  );
}
