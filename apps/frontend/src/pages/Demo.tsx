export function Demo() {
  const actions = [
    'NORMAL',
    'SUDDEN_IMPACT',
    'COLLAPSE_PATTERN',
    'STAMPEDE_PATTERN',
    'SEND_SOS',
    'GATEWAY_OFFLINE',
    'GATEWAY_ONLINE',
  ];

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-gray-800">Demo Controls</h2>
      <p className="text-sm text-gray-500">
        Trigger simulated disaster scenarios and mesh network states.
      </p>

      <div className="grid grid-cols-1 gap-3">
        {actions.map(action => (
          <button 
            key={action}
            onClick={() => alert(`Triggered: ${action}`)}
            className="w-full text-left px-4 py-3 bg-gray-800 hover:bg-gray-700 text-white font-mono text-sm rounded-lg"
          >
            &gt; trigger {action}
          </button>
        ))}
      </div>
    </div>
  );
}
