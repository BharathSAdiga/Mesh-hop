export function ErrorState({ error, onRetry }: { error: string, onRetry?: () => void }) {
  return (
    <div className="bg-red-50 p-6 rounded-xl border border-red-200 text-center">
      <div className="text-red-500 mb-2">
        <svg className="w-10 h-10 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
        </svg>
      </div>
      <h3 className="text-red-800 font-bold mb-1">Error Occurred</h3>
      <p className="text-red-600 text-sm mb-4">{error}</p>
      {onRetry && (
        <button 
          onClick={onRetry}
          className="px-4 py-2 bg-red-100 text-red-700 rounded-lg text-sm font-semibold hover:bg-red-200 transition"
        >
          Try Again
        </button>
      )}
    </div>
  );
}
