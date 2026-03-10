'use client';
import React, { forwardRef } from 'react';

const Select = forwardRef(({
  label,
  error,
  hint,
  options = [],
  placeholder = '-- Sélectionner --',
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
        <select
          ref={ref}
          disabled={disabled}
          className={`
            form-select
            ${hasError ? 'border-red-500 focus:border-red-500 focus:ring-red-500' : ''}
            ${disabled ? 'bg-gray-100 cursor-not-allowed' : ''}
            ${className}
          `}
          {...props}
        >
          {placeholder && <option value="">{placeholder}</option>}
          {options.map((option) => (
            <option
              key={option.value}
              value={option.value}
              disabled={option.disabled}
            >
              {option.label}
            </option>
          ))}
        </select>
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

Select.displayName = 'Select';

export default Select;
