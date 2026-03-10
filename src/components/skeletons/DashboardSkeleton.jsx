'use client';
import React from 'react';

function Pulse({ className = '' }) {
  return <div className={`animate-pulse bg-gray-200 rounded ${className}`} />;
}

export default function DashboardSkeleton() {
  return (
    <div className="animate-fadeIn">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <Pulse className="w-10 h-10 rounded-lg" />
        <div className="space-y-2">
          <Pulse className="h-6 w-48" />
          <Pulse className="h-4 w-64" />
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {[1, 2, 3, 4].map(i => (
          <div key={i} className="bg-white rounded-xl shadow-sm p-5 border border-gray-100">
            <div className="flex items-center justify-between">
              <div className="space-y-3">
                <Pulse className="h-4 w-24" />
                <Pulse className="h-8 w-16" />
              </div>
              <Pulse className="w-12 h-12 rounded-xl" />
            </div>
          </div>
        ))}
      </div>

      {/* Finance Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        {[1, 2, 3].map(i => (
          <div key={i} className="bg-white rounded-xl shadow-sm p-5 border-l-4 border-gray-200">
            <Pulse className="h-4 w-28 mb-2" />
            <Pulse className="h-8 w-32" />
          </div>
        ))}
      </div>

      {/* Time Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        {[1, 2, 3].map(i => (
          <div key={i} className="bg-white rounded-xl shadow-sm p-5 border-l-4 border-gray-200">
            <Pulse className="h-4 w-32 mb-3" />
            <Pulse className="h-6 w-20 mb-2" />
            <Pulse className="h-4 w-24" />
          </div>
        ))}
      </div>

      {/* Alerts */}
      <div className="bg-white rounded-xl shadow-sm p-5 mb-6">
        <div className="flex items-center justify-between mb-4">
          <Pulse className="h-6 w-40" />
          <Pulse className="h-4 w-20" />
        </div>
        <div className="space-y-3">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="p-3 rounded-lg border-l-4 border-gray-200 bg-gray-50">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Pulse className="h-4 w-28" />
                  <Pulse className="h-4 w-48" />
                </div>
                <Pulse className="h-3 w-16" />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Two columns */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {[1, 2].map(col => (
          <div key={col} className="bg-white rounded-xl shadow-sm p-5">
            <div className="flex items-center justify-between mb-4">
              <Pulse className="h-5 w-36" />
              <Pulse className="h-4 w-16" />
            </div>
            <div className="space-y-4">
              {[1, 2, 3, 4, 5].map(i => (
                <div key={i} className="flex items-center justify-between py-2 border-b border-gray-50">
                  <div className="space-y-1.5">
                    <Pulse className="h-4 w-32" />
                    <Pulse className="h-3 w-24" />
                  </div>
                  <Pulse className="h-6 w-20 rounded-full" />
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
