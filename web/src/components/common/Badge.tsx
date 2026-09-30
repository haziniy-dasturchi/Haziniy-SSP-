import React from 'react';
import { StatusLevel } from '../../utils/status';

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  status?: StatusLevel | 'neutral' | null;
  children: React.ReactNode;
  className?: string;
}

export const Badge: React.FC<BadgeProps> = ({
  status = 'neutral',
  children,
  className = '',
  ...props
}) => {
  const styles: Record<'red' | 'amber' | 'green' | 'neutral', string> = {
    red: 'bg-[#FBE9E9] text-[#B33636] border border-[#F5C2C2]',
    amber: 'bg-[#FFF4D6] text-[#8A6100] border border-[#FBE099]',
    green: 'bg-[#E3F5EA] text-[#17703D] border border-[#BCE8CD]',
    neutral: 'bg-surface-muted text-on-surface-muted border border-border',
  };

  const key = status && styles[status] ? status : 'neutral';

  return (
    <span
      className={`inline-flex items-center justify-center font-semibold rounded-full px-2.5 py-0.5 text-xs leading-none tnum ${styles[key]} ${className}`}
      {...props}
    >
      {children}
    </span>
  );
};
