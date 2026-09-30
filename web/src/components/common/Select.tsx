import React from 'react';

export interface SelectOption {
  value: string;
  label: string;
  disabled?: boolean;
}

export interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
  helperText?: string;
  options: SelectOption[];
}

export const Select = React.forwardRef<HTMLSelectElement, SelectProps>(
  ({ label, error, helperText, options, className = '', id, ...props }, ref) => {
    const inputId = id || (label ? label.toLowerCase().replace(/\s+/g, '-') : undefined);

    return (
      <div className="w-full flex flex-col gap-1.5">
        {label && (
          <label htmlFor={inputId} className="text-label-md font-semibold text-on-surface">
            {label}
          </label>
        )}
        <div className="relative">
          <select
            ref={ref}
            id={inputId}
            className={`w-full h-11 px-3 bg-surface text-on-surface border rounded-md text-body-md transition-colors focus:outline-none focus:ring-2 focus:ring-secondary focus:border-transparent disabled:bg-surface-muted disabled:text-on-surface-muted disabled:cursor-not-allowed appearance-none cursor-pointer ${
              error ? 'border-status-red focus:ring-status-red' : 'border-border-strong hover:border-on-surface-muted'
            } ${className}`}
            {...props}
          >
            {options.map((opt) => (
              <option key={opt.value} value={opt.value} disabled={opt.disabled}>
                {opt.label}
              </option>
            ))}
          </select>
          <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3 text-on-surface-muted">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </div>
        </div>
        {error && <span className="text-body-sm text-status-red">{error}</span>}
        {!error && helperText && <span className="text-body-sm text-on-surface-muted">{helperText}</span>}
      </div>
    );
  }
);

Select.displayName = 'Select';
