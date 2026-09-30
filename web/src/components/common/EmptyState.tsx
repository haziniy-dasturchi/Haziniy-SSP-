import React from 'react';
import { LucideIcon, Inbox } from 'lucide-react';
import { Button } from './Button';

export interface EmptyStateProps {
  icon?: LucideIcon;
  title: string;
  description?: string;
  actionLabel?: string;
  onAction?: () => void;
  className?: string;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  icon: Icon = Inbox,
  title,
  description,
  actionLabel,
  onAction,
  className = '',
}) => {
  return (
    <div className={`flex flex-col items-center justify-center p-8 sm:p-12 text-center bg-surface rounded-xl border border-dashed border-border ${className}`}>
      <div className="w-12 h-12 rounded-full bg-surface-muted flex items-center justify-center text-on-surface-muted mb-3">
        <Icon className="w-6 h-6" />
      </div>
      <h3 className="text-headline-sm font-semibold text-on-surface mb-1">{title}</h3>
      {description && <p className="text-body-md text-on-surface-muted max-w-sm mb-4">{description}</p>}
      {actionLabel && onAction && (
        <Button variant="primary" onClick={onAction}>
          {actionLabel}
        </Button>
      )}
    </div>
  );
};
