'use client';
import React from 'react';

function Pulse({ className = '' }) {
  return <div className={`animate-pulse bg-gray-200 rounded ${className}`} />;
}

export default function TablePageSkeleton({ title = true, statsCount = 4, columns = 6, rows = 8 }) {
  return (
    <div className="animate-fadeIn">
      {/* Header */}
      {title && (
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <Pulse className="w-10 h-10 rounded-lg" />
            <div className="space-y-2">
              <Pulse className="h-6 w-40" />
              <Pulse className="h-4 w-56" />
            </div>
          </div>
          <div className="flex gap-3">
            <Pulse className="h-10 w-28 rounded-lg" />
            <Pulse className="h-10 w-36 rounded-lg" />
          </div>
        </div>
      )}

      {/* Stats Cards */}
      {statsCount > 0 && (
        <div className={`grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-${statsCount} gap-4 mb-6`}>
          {Array.from({ length: statsCount }).map((_, i) => (
            <div key={i} className="bg-white rounded-xl shadow-sm p-5 border border-gray-100">
              <div className="flex items-center justify-between">
                <div className="space-y-3">
                  <Pulse className="h-4 w-24" />
                  <Pulse className="h-7 w-14" />
                </div>
                <Pulse className="w-11 h-11 rounded-xl" />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Search & Filters */}
      <div className="bg-white rounded-xl shadow-sm p-4 mb-6">
        <div className="flex flex-wrap gap-4">
          <Pulse className="h-10 flex-1 min-w-[200px] rounded-lg" />
          <Pulse className="h-10 w-48 rounded-lg" />
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        {/* Table header */}
        <div className="bg-gray-50 px-6 py-3 flex gap-4 border-b border-gray-200">
          {Array.from({ length: columns }).map((_, i) => (
            <Pulse key={i} className="h-4 flex-1 rounded" />
          ))}
        </div>

        {/* Table rows */}
        {Array.from({ length: rows }).map((_, rowIndex) => (
          <div
            key={rowIndex}
            className="px-6 py-4 flex gap-4 border-b border-gray-50 items-center"
            style={{ opacity: 1 - rowIndex * 0.05 }}
          >
            {Array.from({ length: columns }).map((_, colIndex) => (
              <Pulse
                key={colIndex}
                className={`h-4 flex-1 rounded ${colIndex === 0 ? 'max-w-[40px]' : ''}`}
              />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
