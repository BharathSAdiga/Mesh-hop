import { useState, useEffect } from 'react';

export class NetworkManager {
  static isOnline(): boolean {
    return navigator.onLine;
  }
}

export function useNetworkStatus() {
  const [isOnline, setIsOnline] = useState<boolean>(NetworkManager.isOnline());

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  return isOnline;
}
