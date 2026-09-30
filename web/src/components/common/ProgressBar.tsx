import React from 'react';
import { StatusLevel } from '../../utils/status';

export interface ProgressBarProps {
  pct: number | null | undefined;
  status?: StatusLevel | null;
  cap?: number;
  height?: 'sm' | 'md' | 'lg';
  className?: string;
}

export const ProgressBar: React.FC<ProgressBarProps> = ({
  pct = 0,
  status = 'green',
  cap = 120,
  height = 'md',
  className = '',
}) => {
  const safePct = pct ?? 0;
  const actualPct = safePct <= 2 ? safePct * 100 : safePct;
  const clampedPct = Math.min(Math.max(actualPct, 0), cap);
  const visualWidth = (clampedPct / cap) * 100;

  const heightClasses = {
    sm: 'h-1.5',
    md: 'h-2',
    lg: 'h-3',
  };

  const fillColors: Record<'red' | 'amber' | 'green', string> = {
    red: 'bg-[#B33636]',
    amber: 'bg-[#E0A100]',
    green: 'bg-[#1F9D55]',
  };

  const key = status && fillColors[status] ? status : 'green';

  return (
    <div className={`w-full bg-surface-muted rounded-full overflow-hidden ${heightClasses[height]} ${className}`}>
      <div
        className={`h-full rounded-full transition-all duration-300 ease-out ${fillColors[key]}`}
        style={{ width: `${visualWidth}%` }}
      />
    </div>
  );
};
