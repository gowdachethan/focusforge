import React from 'react';

interface CircularProgressProps {
  percent: number;
  size?: number;
  strokeWidth?: number;
  trackColor?: string;
  progressColor?: string;
  label?: string;
  sublabel?: string;
  children?: React.ReactNode;
}

export const CircularProgress: React.FC<CircularProgressProps> = ({
  percent,
  size = 112,
  strokeWidth = 9,
  trackColor = 'stroke-slate-200 dark:stroke-navy-700',
  progressColor = 'stroke-blue-500',
  label,
  sublabel,
  children,
}) => {
  const clamped = Math.max(0, Math.min(100, percent));
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (clamped / 100) * circumference;

  return (
    <div
      className="relative inline-flex items-center justify-center shrink-0"
      style={{ width: size, height: size }}
    >
      <svg width={size} height={size} className="-rotate-90 transform">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="transparent"
          strokeWidth={strokeWidth}
          className={trackColor}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="transparent"
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
          className={`${progressColor} transition-all duration-500 ease-out`}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
        {children ? (
          children
        ) : (
          <>
            <span className="text-lg font-bold tabular-nums text-slate-900 dark:text-slate-100">
              {label ?? `${Math.round(clamped)}%`}
            </span>
            {sublabel && (
              <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400">
                {sublabel}
              </span>
            )}
          </>
        )}
      </div>
    </div>
  );
};

