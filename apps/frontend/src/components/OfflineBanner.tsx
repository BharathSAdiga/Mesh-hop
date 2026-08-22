interface OfflineBannerProps {
  isOffline: boolean;
}

export function OfflineBanner({ isOffline }: OfflineBannerProps) {
  if (!isOffline) return null;

  return (
    <div className="bg-orange-600 text-white px-4 py-2 text-center text-sm font-semibold shadow-md fixed top-0 left-0 right-0 z-50 animate-in fade-in slide-in-from-top-2">
      You are currently offline. Running in Store-Carry-Forward mode.
    </div>
  );
}
