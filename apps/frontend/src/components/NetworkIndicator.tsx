import { StatusIndicator } from './StatusIndicator';

interface NetworkIndicatorProps {
  meshConnected: boolean;
  gatewayConnected: boolean;
}

export function NetworkIndicator({ meshConnected, gatewayConnected }: NetworkIndicatorProps) {
  return (
    <div className="flex flex-col space-y-2">
      <StatusIndicator 
        status={gatewayConnected ? 'online' : 'offline'} 
        label={gatewayConnected ? 'Gateway Connected' : 'Gateway Offline'} 
      />
      <StatusIndicator 
        status={meshConnected ? 'online' : 'warning'} 
        label={meshConnected ? 'Mesh Active' : 'Mesh Degraded'} 
      />
    </div>
  );
}
