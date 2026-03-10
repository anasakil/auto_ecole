'use client';
import React from 'react';

function Pulse({ className = '' }) {
  return <div className={`animate-pulse bg-gray-200 rounded ${className}`} />;
}

export default function CardPageSkeleton({ cards = 6, hasHeader = true }) {
  return (
    <div className="animate-fadeIn">
      {/* Header */}
      {hasHeader && (
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <Pulse className="w-10 h-10 rounded-lg" />
            <div className="space-y-2">
              <Pulse className="h-6 w-40" />
              <Pulse className="h-4 w-56" />
            </div>
          </div>
          <div className="flex gap-3">
            <Pulse className="h-10 w-32 rounded-lg" />
          </div>
        </div>
      )}

      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        {[1, 2, 3].map(i => (
          <div key={i} className="bg-white rounded-xl shadow-sm p-5">
            <Pulse className="h-4 w-28 mb-2" />
            <Pulse className="h-8 w-24" />
          </div>
        ))}
      </div>

      {/* Filter bar */}
      <div className="bg-white rounded-xl shadow-sm p-4 mb-6">
        <div className="flex flex-wrap gap-4">
          <Pulse className="h-10 flex-1 min-w-[200px] rounded-lg" />
          <Pulse className="h-10 w-40 rounded-lg" />
        </div>
      </div>

      {/* Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {Array.from({ length: cards }).map((_, i) => (
          <div key={i} className="bg-white rounded-xl shadow-sm p-5 border border-gray-100">
            <div className="flex justify-between items-start mb-3">
              <Pulse className="h-5 w-32" />
              <Pulse className="h-6 w-20 rounded-full" />
            </div>
            <div className="space-y-2">
              <Pulse className="h-4 w-full" />
              <Pulse className="h-4 w-3/4" />
              <Pulse className="h-4 w-1/2" />
            </div>
            <div className="flex gap-2 mt-4">
              <Pulse className="h-8 w-20 rounded-lg" />
              <Pulse className="h-8 w-20 rounded-lg" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
