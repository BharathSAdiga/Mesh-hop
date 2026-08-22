interface StatusIndicatorProps {
  status: 'online' | 'offline' | 'connecting' | 'warning';
  label: string;
}

export function StatusIndicator({ status, label }: StatusIndicatorProps) {
  const colors = {
    online: 'bg-green-500',
    offline: 'bg-red-500',
    connecting: 'bg-yellow-500 animate-pulse',
    warning: 'bg-orange-500'
  };

  return (
    <div className="flex items-center space-x-2 text-sm font-medium text-gray-700 bg-gray-100 px-3 py-1.5 rounded-full border border-gray-200 shadow-sm">
      <div className={`w-3 h-3 rounded-full ${colors[status]}`} />
      <span>{label}</span>
    </div>
  );
}
