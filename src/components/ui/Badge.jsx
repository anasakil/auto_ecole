'use client';
import React from 'react';

const variants = {
  success: 'bg-accent-green/10 text-accent-green border-accent-green/20',
  warning: 'bg-accent-yellow/10 text-amber-700 border-accent-yellow/20',
  danger: 'bg-accent-red/10 text-accent-red border-accent-red/20',
  info: 'bg-accent-blue/10 text-blue-700 border-accent-blue/20',
  gray: 'bg-surface-200 text-dark-light border-surface-300',
  primary: 'bg-primary-500/10 text-primary-600 border-primary-500/20',
  purple: 'bg-primary-500/10 text-primary-600 border-primary-500/20',
  orange: 'bg-orange-100 text-orange-800 border-orange-200',
};

const sizes = {
  sm: 'px-2 py-0.5 text-xs',
  md: 'px-2.5 py-1 text-xs',
  lg: 'px-3 py-1.5 text-sm',
};

function Badge({
  children,
  variant = 'gray',
  size = 'md',
  dot = false,
  removable = false,
  onRemove,
  className = '',
}) {
  return (
    <span
      className={`inline-flex items-center font-medium rounded-full border ${variants[variant]} ${sizes[size]} ${className}`}
    >
      {dot && (
        <span className={`w-1.5 h-1.5 rounded-full mr-1.5 ${
          variant === 'success' ? 'bg-green-500' :
          variant === 'warning' ? 'bg-yellow-500' :
          variant === 'danger' ? 'bg-red-500' :
          variant === 'info' ? 'bg-blue-500' :
          'bg-gray-500'
        }`} />
      )}
      {children}
      {removable && (
        <button
          onClick={onRemove}
          className="ml-1.5 -mr-1 hover:bg-black/10 rounded-full p-0.5"
        >
          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      )}
    </span>
  );
}

export default Badge;
