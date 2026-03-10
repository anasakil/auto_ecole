'use client';
import React from 'react';

function LoadingSpinner({ size = 'md', color = 'primary', text, fullScreen = false, overlay = false }) {
  const sizes = { xs: 'w-4 h-4', sm: 'w-6 h-6', md: 'w-8 h-8', lg: 'w-12 h-12', xl: 'w-16 h-16' };
  const colors = { primary: 'text-primary-600', white: 'text-white', gray: 'text-gray-600', success: 'text-green-600', danger: 'text-red-600' };

  const spinner = (
    <div className={`flex flex-col items-center justify-center ${fullScreen ? 'min-h-screen' : ''}`}>
      <svg className={`animate-spin ${sizes[size]} ${colors[color]}`} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
      </svg>
      {text && <p className={`mt-3 text-sm ${colors[color]}`}>{text}</p>}
    </div>
  );

  if (overlay) {
    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg p-6 shadow-xl">{spinner}</div>
      </div>
    );
  }

  return spinner;
}

function PageLoading({ text = 'Chargement...' }) {
  return (
    <div className="flex items-center justify-center h-64">
      <LoadingSpinner size="lg" text={text} />
    </div>
  );
}

function ButtonLoading({ size = 'sm' }) {
  return <LoadingSpinner size={size} color="white" />;
}

function InlineLoading({ text = 'Chargement...' }) {
  return (
    <span className="inline-flex items-center text-gray-500">
      <LoadingSpinner size="xs" color="gray" />
      <span className="ml-2 text-sm">{text}</span>
    </span>
  );
}

LoadingSpinner.Page = PageLoading;
LoadingSpinner.Button = ButtonLoading;
LoadingSpinner.Inline = InlineLoading;

export default LoadingSpinner;
