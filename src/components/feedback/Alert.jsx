'use client';
import React from 'react';

function Alert({
  type = 'info',
  title,
  children,
  dismissible = false,
  onDismiss,
  icon,
  action,
  className = '',
}) {
  const styles = {
    info: { container: 'bg-blue-50 border-blue-400 text-blue-800', icon: 'text-blue-500', button: 'text-blue-600 hover:bg-blue-100' },
    success: { container: 'bg-green-50 border-green-400 text-green-800', icon: 'text-green-500', button: 'text-green-600 hover:bg-green-100' },
    warning: { container: 'bg-yellow-50 border-yellow-400 text-yellow-800', icon: 'text-yellow-500', button: 'text-yellow-600 hover:bg-yellow-100' },
    error: { container: 'bg-red-50 border-red-400 text-red-800', icon: 'text-red-500', button: 'text-red-600 hover:bg-red-100' },
  };

  const defaultIcons = {
    info: (<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>),
    success: (<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>),
    warning: (<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>),
    error: (<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>),
  };

  const style = styles[type];

  return (
    <div className={`flex items-start p-4 rounded-lg border-l-4 ${style.container} ${className}`} role="alert">
      <span className={`flex-shrink-0 ${style.icon}`}>{icon || defaultIcons[type]}</span>
      <div className="ml-3 flex-1 min-w-0">
        {title && <p className="font-semibold text-sm mb-1">{title}</p>}
        <div className="text-sm">{children}</div>
        {action && <div className="mt-3">{action}</div>}
      </div>
      {dismissible && (
        <button onClick={onDismiss} className={`ml-3 flex-shrink-0 p-1 rounded-md transition-colors ${style.button}`}>
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      )}
    </div>
  );
}

export default Alert;
