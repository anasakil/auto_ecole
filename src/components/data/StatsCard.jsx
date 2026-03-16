'use client';
import React from 'react';

function StatsCard({
  title,
  value,
  icon,
  trend,
  trendLabel,
  color = 'primary',
  size = 'md',
  loading = false,
  onClick,
  className = '',
  gradient = false,
}) {
  const colors = {
    primary: {
      icon: 'bg-primary-500/10 text-primary-500',
      gradient: 'from-primary-500 to-primary-400',
    },
    success: {
      icon: 'bg-accent-green/10 text-accent-green',
      gradient: 'from-accent-green to-emerald-300',
    },
    warning: {
      icon: 'bg-accent-yellow/10 text-accent-yellow',
      gradient: 'from-accent-yellow to-amber-300',
    },
    danger: {
      icon: 'bg-accent-red/10 text-accent-red',
      gradient: 'from-accent-red to-red-300',
    },
    info: {
      icon: 'bg-accent-blue/10 text-accent-blue',
      gradient: 'from-accent-blue to-blue-300',
    },
    gray: {
      icon: 'bg-dark-muted/10 text-dark-muted',
      gradient: 'from-gray-400 to-gray-300',
    },
  };

  const sizes = {
    sm: { padding: 'p-4', icon: 'w-10 h-10', iconInner: 'w-5 h-5', value: 'text-xl', title: 'text-xs' },
    md: { padding: 'p-5', icon: 'w-11 h-11', iconInner: 'w-5 h-5', value: 'text-2xl', title: 'text-sm' },
    lg: { padding: 'p-6', icon: 'w-14 h-14', iconInner: 'w-7 h-7', value: 'text-3xl', title: 'text-base' },
  };

  const colorConfig = colors[color];
  const sizeConfig = sizes[size];

  if (gradient) {
    return (
      <div
        className={`bg-gradient-to-br ${colorConfig.gradient} rounded-2xl ${sizeConfig.padding} shadow-card ${onClick ? 'cursor-pointer hover:shadow-card-hover transition-shadow' : ''} ${className}`}
        onClick={onClick}
      >
        <p className={`text-white/80 font-medium ${sizeConfig.title}`}>{title}</p>
        {loading ? (
          <div className="animate-pulse h-8 bg-white/20 rounded w-20 mt-2" />
        ) : (
          <p className={`font-bold text-white mt-1 ${sizeConfig.value}`}>{value}</p>
        )}
      </div>
    );
  }

  return (
    <div
      className={`bg-white rounded-2xl shadow-soft ${sizeConfig.padding} ${onClick ? 'cursor-pointer hover:shadow-card-hover transition-shadow' : ''} ${className}`}
      onClick={onClick}
    >
      <div className="flex items-center justify-between">
        <div className="min-w-0">
          <p className={`text-dark-muted font-medium ${sizeConfig.title}`}>{title}</p>
          {loading ? (
            <div className="animate-pulse h-8 bg-surface-200 rounded w-16 mt-1" />
          ) : (
            <p className={`font-bold text-dark mt-1 ${sizeConfig.value}`}>{value}</p>
          )}
          {trend !== undefined && (
            <div className={`flex items-center gap-1 mt-2 ${trend > 0 ? 'text-accent-green' : trend < 0 ? 'text-accent-red' : 'text-dark-muted'}`}>
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={trend > 0 ? 'M5 10l7-7m0 0l7 7m-7-7v18' : trend < 0 ? 'M19 14l-7 7m0 0l-7-7m7 7V3' : 'M5 12h14'} />
              </svg>
              <span className="text-sm font-medium">{Math.abs(trend)}%</span>
              {trendLabel && <span className="text-dark-muted text-xs ml-1">{trendLabel}</span>}
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

function StatsGrid({ children, columns = 4, className = '' }) {
  return (
    <div className={`grid gap-4 sm:gap-5 grid-cols-1 sm:grid-cols-2 lg:grid-cols-${columns} ${className}`}>
      {children}
    </div>
  );
}

StatsCard.Grid = StatsGrid;

export default StatsCard;
