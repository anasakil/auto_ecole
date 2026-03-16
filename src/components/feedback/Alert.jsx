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
    info: { container: 'bg-accent-blue/5 border-accent-blue text-blue-800', icon: 'text-accent-blue', button: 'text-accent-blue hover:bg-accent-blue/10' },
    success: { container: 'bg-accent-green/5 border-accent-green text-green-800', icon: 'text-accent-green', button: 'text-accent-green hover:bg-accent-green/10' },
    warning: { container: 'bg-accent-yellow/5 border-accent-yellow text-amber-800', icon: 'text-accent-yellow', button: 'text-accent-yellow hover:bg-accent-yellow/10' },
    error: { container: 'bg-accent-red/5 border-accent-red text-red-800', icon: 'text-accent-red', button: 'text-accent-red hover:bg-accent-red/10' },
  };

  const defaultIcons = {
    info: (<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>),
    success: (<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>),
    warning: (<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>),
    error: (<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>),
  };

  const style = styles[type];

  return (
    <div className={`flex items-start p-4 rounded-xl border-l-4 ${style.container} ${className}`} role="alert">
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
