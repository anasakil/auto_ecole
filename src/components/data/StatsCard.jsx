'use client';
import React from 'react';

function StatsCard({
  title,
  value,
  icon,
  trend,
  trendLabel,
  color = 'primary', // 'primary', 'success', 'warning', 'danger', 'info', 'gray'
  size = 'md', // 'sm', 'md', 'lg'
  loading = false,
  onClick,
  className = '',
}) {
  const colors = {
    primary: {
      bg: 'bg-primary-50',
      icon: 'bg-primary-100 text-primary-600',
      text: 'text-primary-600',
    },
    success: {
      bg: 'bg-green-50',
      icon: 'bg-green-100 text-green-600',
      text: 'text-green-600',
    },
    warning: {
      bg: 'bg-yellow-50',
      icon: 'bg-yellow-100 text-yellow-600',
      text: 'text-yellow-600',
    },
    danger: {
      bg: 'bg-red-50',
      icon: 'bg-red-100 text-red-600',
      text: 'text-red-600',
    },
    info: {
      bg: 'bg-blue-50',
      icon: 'bg-blue-100 text-blue-600',
      text: 'text-blue-600',
    },
    gray: {
      bg: 'bg-gray-50',
      icon: 'bg-gray-100 text-gray-600',
      text: 'text-gray-600',
    },
  };

  const sizes = {
    sm: {
      padding: 'p-4',
      icon: 'w-10 h-10',
      iconInner: 'w-5 h-5',
      value: 'text-xl',
      title: 'text-xs',
    },
    md: {
      padding: 'p-5',
      icon: 'w-12 h-12',
      iconInner: 'w-6 h-6',
      value: 'text-2xl',
      title: 'text-sm',
    },
    lg: {
      padding: 'p-6',
      icon: 'w-14 h-14',
      iconInner: 'w-7 h-7',
      value: 'text-3xl',
      title: 'text-base',
    },
  };

  const colorConfig = colors[color];
  const sizeConfig = sizes[size];

  const getTrendColor = () => {
    if (trend > 0) return 'text-green-600';
    if (trend < 0) return 'text-red-600';
    return 'text-gray-500';
  };

  const getTrendIcon = () => {
    if (trend > 0) {
      return (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 10l7-7m0 0l7 7m-7-7v18" />
        </svg>
      );
    }
    if (trend < 0) {
      return (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
        </svg>
      );
    }
    return (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 12h14" />
      </svg>
    );
  };

  if (loading) {
    return (
      <div className={`bg-white rounded-xl shadow-sm border border-gray-100 ${sizeConfig.padding} ${className}`}>
        <div className="animate-pulse">
          <div className="flex items-center justify-between">
            <div className="space-y-2">
              <div className="h-3 bg-gray-200 rounded w-20"></div>
              <div className="h-8 bg-gray-200 rounded w-16"></div>
            </div>
            <div className={`${sizeConfig.icon} bg-gray-200 rounded-xl`}></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      className={`
        bg-white rounded-xl shadow-sm border border-gray-100 ${sizeConfig.padding}
        ${onClick ? 'cursor-pointer hover:shadow-md transition-shadow' : ''}
        ${className}
      `}
      onClick={onClick}
    >
      <div className="flex items-center justify-between">
        <div className="min-w-0">
          <p className={`text-gray-500 font-medium ${sizeConfig.title}`}>{title}</p>
          <p className={`font-bold text-gray-900 mt-1 ${sizeConfig.value}`}>{value}</p>

          {trend !== undefined && (
            <div className={`flex items-center gap-1 mt-2 ${getTrendColor()}`}>
              {getTrendIcon()}
              <span className="text-sm font-medium">
                {Math.abs(trend)}%
              </span>
              {trendLabel && (
                <span className="text-gray-500 text-xs ml-1">{trendLabel}</span>
              )}
            </div>
          )}
        </div>

        {icon && (
          <div className={`flex-shrink-0 ${sizeConfig.icon} rounded-xl ${colorConfig.icon} flex items-center justify-center`}>
            <span className={sizeConfig.iconInner}>{icon}</span>
          </div>
        )}
      </div>
    </div>
  );
}

// Stats grid container
function StatsGrid({ children, columns = 4, className = '' }) {
  return (
    <div className={`grid gap-4 sm:gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-${columns} ${className}`}>
      {children}
    </div>
  );
}

StatsCard.Grid = StatsGrid;

export default StatsCard;
