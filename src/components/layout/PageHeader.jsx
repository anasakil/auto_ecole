'use client';
import React from 'react';
import Button from '../ui/Button';

function PageHeader({
  title,
  subtitle,
  icon,
  backLink,
  onBack,
  actions,
  primaryAction,
  primaryActionLabel,
  onPrimaryAction,
  secondaryAction,
  secondaryActionLabel,
  onSecondaryAction,
  breadcrumbs,
  tabs,
  activeTab,
  onTabChange,
  className = '',
}) {
  return (
    <div className={`mb-6 ${className}`}>
      {breadcrumbs && breadcrumbs.length > 0 && (
        <nav className="flex items-center text-sm text-dark-muted mb-4">
          {breadcrumbs.map((crumb, index) => (
            <React.Fragment key={index}>
              {index > 0 && (
                <svg className="w-4 h-4 mx-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              )}
              {crumb.href ? (
                <a href={crumb.href} className="hover:text-dark transition-colors">{crumb.label}</a>
              ) : (
                <span className={index === breadcrumbs.length - 1 ? 'text-dark font-medium' : ''}>{crumb.label}</span>
              )}
            </React.Fragment>
          ))}
        </nav>
      )}

      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-4">
          {(backLink || onBack) && (
            <button onClick={onBack || (() => window.history.back())} className="flex-shrink-0 p-2 -ml-2 text-dark-muted hover:text-dark hover:bg-surface-100 rounded-xl transition-colors">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
            </button>
          )}
          {icon && (
            <div className="flex-shrink-0 w-12 h-12 bg-primary-500/10 text-primary-500 rounded-xl flex items-center justify-center">{icon}</div>
          )}
          <div className="min-w-0">
            {subtitle && <p className="text-xs font-medium text-dark-muted tracking-wider uppercase">{subtitle}</p>}
            <h1 className="text-2xl font-bold text-dark truncate">{title}</h1>
          </div>
        </div>

        <div className="flex items-center gap-3 flex-shrink-0">
          {actions}
          {secondaryActionLabel && onSecondaryAction && (
            <Button variant="secondary" onClick={onSecondaryAction}>{secondaryActionLabel}</Button>
          )}
          {primaryActionLabel && onPrimaryAction && (
            <Button onClick={onPrimaryAction}>{primaryActionLabel}</Button>
          )}
        </div>
      </div>

      {tabs && tabs.length > 0 && (
        <div className="mt-6">
          <div className="flex gap-1 p-1 bg-surface-200 rounded-xl w-fit">
            {tabs.map((tab) => (
              <button
                key={tab.key}
                onClick={() => onTabChange?.(tab.key)}
                className={`py-2 px-4 text-sm font-medium rounded-lg transition-all ${
                  activeTab === tab.key
                    ? 'bg-white text-dark shadow-sm'
                    : 'text-dark-muted hover:text-dark'
                }`}
              >
                <span className="flex items-center gap-2">
                  {tab.icon}
                  {tab.label}
                  {tab.count !== undefined && (
                    <span className={`px-2 py-0.5 text-xs rounded-full ${
                      activeTab === tab.key ? 'bg-primary-500/10 text-primary-500' : 'bg-surface-300 text-dark-muted'
                    }`}>
                      {tab.count}
                    </span>
                  )}
                </span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default PageHeader;
