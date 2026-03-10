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
        <nav className="flex items-center text-sm text-gray-500 mb-4">
          {breadcrumbs.map((crumb, index) => (
            <React.Fragment key={index}>
              {index > 0 && (
                <svg className="w-4 h-4 mx-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              )}
              {crumb.href ? (
                <a href={crumb.href} className="hover:text-gray-700 transition-colors">{crumb.label}</a>
              ) : (
                <span className={index === breadcrumbs.length - 1 ? 'text-gray-900 font-medium' : ''}>{crumb.label}</span>
              )}
            </React.Fragment>
          ))}
        </nav>
      )}

      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-4">
          {(backLink || onBack) && (
            <button onClick={onBack || (() => window.history.back())} className="flex-shrink-0 p-2 -ml-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
            </button>
          )}
          {icon && (
            <div className="flex-shrink-0 w-12 h-12 bg-primary-100 text-primary-600 rounded-xl flex items-center justify-center">{icon}</div>
          )}
          <div className="min-w-0">
            <h1 className="text-2xl font-bold text-gray-900 truncate">{title}</h1>
            {subtitle && <p className="text-gray-500 text-sm mt-1">{subtitle}</p>}
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
        <div className="mt-6 border-b border-gray-200">
          <nav className="flex gap-6 -mb-px">
            {tabs.map((tab) => (
              <button
                key={tab.key}
                onClick={() => onTabChange?.(tab.key)}
                className={`py-3 px-1 text-sm font-medium border-b-2 transition-colors ${activeTab === tab.key ? 'border-primary-600 text-primary-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}`}
              >
                <span className="flex items-center gap-2">
                  {tab.icon}
                  {tab.label}
                  {tab.count !== undefined && (
                    <span className={`px-2 py-0.5 text-xs rounded-full ${activeTab === tab.key ? 'bg-primary-100 text-primary-600' : 'bg-gray-100 text-gray-600'}`}>
                      {tab.count}
                    </span>
                  )}
                </span>
              </button>
            ))}
          </nav>
        </div>
      )}
    </div>
  );
}

export default PageHeader;
