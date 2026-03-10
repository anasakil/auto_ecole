'use client';
import React from 'react';

const variants = {
  primary: 'bg-primary-600 text-white hover:bg-primary-700 focus:ring-primary-500',
  secondary: 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50 focus:ring-primary-500',
  success: 'bg-green-600 text-white hover:bg-green-700 focus:ring-green-500',
  danger: 'bg-red-600 text-white hover:bg-red-700 focus:ring-red-500',
  warning: 'bg-yellow-500 text-white hover:bg-yellow-600 focus:ring-yellow-500',
  ghost: 'text-gray-600 hover:bg-gray-100 focus:ring-gray-500',
};

const sizes = {
  xs: 'px-2 py-1 text-xs',
  sm: 'px-3 py-1.5 text-sm',
  md: 'px-4 py-2 text-sm',
  lg: 'px-5 py-2.5 text-base',
  xl: 'px-6 py-3 text-lg',
};

function Button({
  children,
  variant = 'primary',
  size = 'md',
  icon,
  iconPosition = 'left',
  loading = false,
  disabled = false,
  fullWidth = false,
  className = '',
  ...props
}) {
  const baseClasses = 'inline-flex items-center justify-center font-medium rounded-lg transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed';

  return (
    <button
      className={`${baseClasses} ${variants[variant]} ${sizes[size]} ${fullWidth ? 'w-full' : ''} ${className}`}
      disabled={disabled || loading}
      {...props}
    >
      {loading ? (
        <>
          <svg className="animate-spin -ml-1 mr-2 h-4 w-4" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
          </svg>
          Chargement...
        </>
      ) : (
        <>
          {icon && iconPosition === 'left' && <span className="mr-2">{icon}</span>}
          {children}
          {icon && iconPosition === 'right' && <span className="ml-2">{icon}</span>}
        </>
      )}
    </button>
  );
}

export default Button;
