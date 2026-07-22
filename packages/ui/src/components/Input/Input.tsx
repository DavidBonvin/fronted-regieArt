import React from 'react';

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  hint?: string;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

export function Input({
  label,
  error,
  hint,
  leftIcon,
  rightIcon,
  id,
  className = '',
  ...props
}: InputProps) {
  return (
    <div data-component="ra-input-wrapper" data-error={!!error} className={`ra-input-wrapper ${className}`}>
      {label && (
        <label htmlFor={id} className="ra-input-label">
          {label}
        </label>
      )}
      <div className="ra-input-field">
        {leftIcon && <span className="ra-input-icon ra-input-icon--left">{leftIcon}</span>}
        <input
          {...props}
          id={id}
          data-has-left-icon={!!leftIcon}
          data-has-right-icon={!!rightIcon}
          aria-invalid={!!error}
          aria-describedby={error ? `${id}-error` : hint ? `${id}-hint` : undefined}
          className="ra-input"
        />
        {rightIcon && <span className="ra-input-icon ra-input-icon--right">{rightIcon}</span>}
      </div>
      {error && (
        <span id={`${id}-error`} className="ra-input-error" role="alert">
          {error}
        </span>
      )}
      {hint && !error && (
        <span id={`${id}-hint`} className="ra-input-hint">
          {hint}
        </span>
      )}
    </div>
  );
}
