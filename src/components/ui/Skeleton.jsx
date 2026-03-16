'use client';
import React from 'react';

function Skeleton({ className = '', variant = 'text', width, height, count = 1 }) {
  const baseClasses = 'animate-pulse bg-surface-200 rounded';

  const variantClasses = {
    text: 'h-4 rounded',
    title: 'h-6 rounded',
    avatar: 'rounded-full',
    thumbnail: 'rounded-lg',
    button: 'h-10 rounded-lg',
    card: 'rounded-lg',
  };

  const elements = Array.from({ length: count }, (_, i) => (
    <div
      key={i}
      className={`${baseClasses} ${variantClasses[variant]} ${className}`}
      style={{ width, height }}
    />
  ));

  return count === 1 ? elements[0] : <div className="space-y-2">{elements}</div>;
}

// Table skeleton
function TableSkeleton({ rows = 5, columns = 5 }) {
  return (
    <div className="animate-pulse">
      {/* Header */}
      <div className="bg-surface-100 p-4 rounded-t-lg flex gap-4">
        {Array.from({ length: columns }).map((_, i) => (
          <div key={i} className="h-4 bg-surface-300 rounded flex-1" />
        ))}
      </div>

      {/* Rows */}
      {Array.from({ length: rows }).map((_, rowIndex) => (
        <div key={rowIndex} className="bg-white p-4 border-b flex gap-4">
          {Array.from({ length: columns }).map((_, colIndex) => (
            <div key={colIndex} className="h-4 bg-surface-200 rounded flex-1" />
          ))}
        </div>
      ))}
    </div>
  );
}

// Card skeleton
function CardSkeleton({ hasImage = false, lines = 3 }) {
  return (
    <div className="animate-pulse bg-white rounded-2xl shadow-soft p-6">
      {hasImage && (
        <div className="h-40 bg-surface-200 rounded-lg mb-4" />
      )}
      <div className="space-y-3">
        <div className="h-5 bg-surface-200 rounded w-3/4" />
        {Array.from({ length: lines }).map((_, i) => (
          <div key={i} className="h-4 bg-surface-200 rounded" style={{ width: `${85 - i * 10}%` }} />
        ))}
      </div>
    </div>
  );
}

// Stats skeleton
function StatsSkeleton({ count = 4 }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="animate-pulse bg-white rounded-2xl shadow-soft p-6">
          <div className="flex items-center justify-between">
            <div className="space-y-2">
              <div className="h-4 bg-surface-200 rounded w-24" />
              <div className="h-8 bg-surface-200 rounded w-16" />
            </div>
            <div className="w-12 h-12 bg-surface-200 rounded-full" />
          </div>
        </div>
      ))}
    </div>
  );
}

// List skeleton
function ListSkeleton({ items = 5, hasAvatar = false }) {
  return (
    <div className="animate-pulse space-y-4">
      {Array.from({ length: items }).map((_, i) => (
        <div key={i} className="flex items-center gap-4 p-4 bg-white rounded-lg">
          {hasAvatar && <div className="w-10 h-10 bg-surface-200 rounded-full" />}
          <div className="flex-1 space-y-2">
            <div className="h-4 bg-surface-200 rounded w-1/3" />
            <div className="h-3 bg-surface-200 rounded w-1/2" />
          </div>
          <div className="h-6 w-16 bg-surface-200 rounded-full" />
        </div>
      ))}
    </div>
  );
}

Skeleton.Table = TableSkeleton;
Skeleton.Card = CardSkeleton;
Skeleton.Stats = StatsSkeleton;
Skeleton.List = ListSkeleton;

export default Skeleton;
