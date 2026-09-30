import React, { forwardRef } from 'react';

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  helperText?: string;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, helperText, className = '', id, ...props }, ref) => {
    const inputId = id || (label ? label.toLowerCase().replace(/\s+/g, '-') : undefined);

    return (
      <div className="w-full space-y-1.5 text-left">
        {label && (
          <label htmlFor={inputId} className="block text-label-md text-on-surface font-semibold">
            {label}
          </label>
        )}
        <div className="relative">
          <input
            ref={ref}
            id={inputId}
            className={`w-full h-11 px-3 bg-surface border rounded-md text-body-lg text-on-surface placeholder:text-on-surface-muted/60 transition-colors focus:outline-none focus:ring-2 focus:ring-secondary focus:border-transparent disabled:bg-surface-muted disabled:cursor-not-allowed ${
              error ? 'border-status-red focus:ring-status-red' : 'border-border-strong'
            } ${className}`}
            {...props}
          />
        </div>
        {error && <p className="text-body-sm text-status-red">{error}</p>}
        {!error && helperText && <p className="text-body-sm text-on-surface-muted">{helperText}</p>}
      </div>
    );
  }
);

Input.displayName = 'Input';
