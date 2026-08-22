import type { Priority } from '@rescuenet/shared';

interface PriorityBadgeProps {
  priority: Priority;
}

export function PriorityBadge({ priority }: PriorityBadgeProps) {
  const styles = {
    LOW: 'bg-blue-100 text-blue-800 border-blue-200',
    MEDIUM: 'bg-yellow-100 text-yellow-800 border-yellow-200',
    HIGH: 'bg-orange-100 text-orange-800 border-orange-200',
    CRITICAL: 'bg-red-100 text-red-800 border-red-200 font-bold',
  };

  return (
    <span className={`px-2.5 py-0.5 rounded text-xs border ${styles[priority]}`}>
      {priority}
    </span>
  );
}
