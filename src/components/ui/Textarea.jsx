'use client';
import React, { forwardRef } from 'react';

const Textarea = forwardRef(({
  label,
  error,
  hint,
  required = false,
  disabled = false,
  rows = 3,
  maxLength,
  showCount = false,
  className = '',
  containerClassName = '',
  value = '',
  ...props
}, ref) => {
  const hasError = Boolean(error);
  const charCount = value?.length || 0;

  return (
    <div className={`form-group ${containerClassName}`}>
      {label && (
        <label className="form-label">
          {label}
          {required && <span className="text-red-500 ml-1">*</span>}
        </label>
      )}

      <div className="relative">
        <textarea
          ref={ref}
          rows={rows}
          disabled={disabled}
          maxLength={maxLength}
          value={value}
          className={`
            form-textarea
            ${hasError ? 'border-red-500 focus:border-red-500 focus:ring-red-500' : ''}
            ${disabled ? 'bg-gray-100 cursor-not-allowed' : ''}
            ${className}
          `}
          {...props}
        />
      </div>

      <div className="flex justify-between mt-1">
        <div>
          {hint && !error && (
            <p className="text-sm text-gray-500">{hint}</p>
          )}
          {error && (
            <p className="text-sm text-red-600 flex items-center">
              <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
              {error}
            </p>
          )}
        </div>

        {showCount && maxLength && (
          <p className={`text-sm ${charCount >= maxLength ? 'text-red-500' : 'text-gray-400'}`}>
            {charCount}/{maxLength}
          </p>
        )}
      </div>
    </div>
  );
});

Textarea.displayName = 'Textarea';

export default Textarea;
