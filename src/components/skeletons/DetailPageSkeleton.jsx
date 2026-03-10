'use client';
import React from 'react';

function Pulse({ className = '' }) {
  return <div className={`animate-pulse bg-gray-200 rounded ${className}`} />;
}

export default function DetailPageSkeleton() {
  return (
    <div className="animate-fadeIn">
      {/* Back button */}
      <Pulse className="h-8 w-24 rounded-lg mb-4" />

      {/* Header with profile */}
      <div className="bg-white rounded-xl shadow-sm p-6 mb-6">
        <div className="flex items-start gap-6">
          <Pulse className="w-24 h-24 rounded-xl flex-shrink-0" />
          <div className="flex-1 space-y-3">
            <Pulse className="h-7 w-56" />
            <div className="flex gap-3">
              <Pulse className="h-6 w-20 rounded-full" />
              <Pulse className="h-6 w-24 rounded-full" />
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4">
              {[1, 2, 3, 4].map(i => (
                <div key={i} className="space-y-1.5">
                  <Pulse className="h-3 w-16" />
                  <Pulse className="h-5 w-24" />
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-6">
        {[1, 2, 3, 4, 5].map(i => (
          <Pulse key={i} className="h-10 w-28 rounded-lg" />
        ))}
      </div>

      {/* Content */}
      <div className="bg-white rounded-xl shadow-sm p-6">
        <Pulse className="h-5 w-40 mb-4" />
        <div className="space-y-3">
          {[1, 2, 3, 4, 5, 6].map(i => (
            <div key={i} className="flex items-center justify-between py-3 border-b border-gray-50">
              <div className="space-y-1.5">
                <Pulse className="h-4 w-36" />
                <Pulse className="h-3 w-24" />
              </div>
              <Pulse className="h-6 w-20 rounded-full" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
