interface EmergencyButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  label?: string;
  isPulsing?: boolean;
}

export function EmergencyButton({ label = 'SOS', isPulsing = false, className = '', ...props }: EmergencyButtonProps) {
  return (
    <button
      className={`
        bg-red-600 hover:bg-red-700 text-white font-bold 
        py-8 px-16 rounded-full shadow-[0_0_20px_rgba(220,38,38,0.6)]
        transform transition-all active:scale-95 text-4xl
        flex items-center justify-center
        ${isPulsing ? 'animate-pulse' : ''}
        ${className}
      `}
      {...props}
    >
      {label}
    </button>
  );
}
