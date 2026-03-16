'use client';
import React, { forwardRef } from 'react';

const Input = forwardRef(({
  label,
  error,
  hint,
  icon,
  iconPosition = 'left',
  required = false,
  disabled = false,
  className = '',
  containerClassName = '',
  ...props
}, ref) => {
  const hasError = Boolean(error);

  return (
    <div className={`form-group ${containerClassName}`}>
      {label && (
        <label className="form-label">
          {label}
          {required && <span className="text-red-500 ml-1">*</span>}
        </label>
      )}

      <div className="relative">
        {icon && iconPosition === 'left' && (
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-dark-muted">
            {icon}
          </div>
        )}

        <input
          ref={ref}
          disabled={disabled}
          className={`
            form-input
            ${icon && iconPosition === 'left' ? 'pl-10' : ''}
            ${icon && iconPosition === 'right' ? 'pr-10' : ''}
            ${hasError ? 'border-accent-red focus:border-accent-red focus:ring-accent-red/30' : ''}
            ${disabled ? 'bg-surface-100 cursor-not-allowed' : ''}
            ${className}
          `}
          {...props}
        />

        {icon && iconPosition === 'right' && (
          <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none text-dark-muted">
            {icon}
          </div>
        )}
      </div>

      {hint && !error && (
        <p className="mt-1 text-sm text-gray-500">{hint}</p>
      )}

      {error && (
        <p className="mt-1 text-sm text-red-600 flex items-center">
          <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
          </svg>
          {error}
        </p>
      )}
    </div>
  );
});

Input.displayName = 'Input';

export default Input;
