'use client';
import React from 'react';

function Pulse({ className = '' }) {
  return <div className={`animate-pulse bg-gray-200 rounded ${className}`} />;
}

export default function FormPageSkeleton({ fields = 8 }) {
  return (
    <div className="animate-fadeIn">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Pulse className="w-10 h-10 rounded-lg" />
          <div className="space-y-2">
            <Pulse className="h-6 w-36" />
            <Pulse className="h-4 w-52" />
          </div>
        </div>
        <Pulse className="h-10 w-32 rounded-lg" />
      </div>

      {/* Form Card */}
      <div className="bg-white rounded-xl shadow-sm p-6 max-w-3xl">
        <div className="space-y-5">
          {Array.from({ length: fields }).map((_, i) => (
            <div key={i}>
              <Pulse className="h-4 w-28 mb-2" />
              <Pulse className="h-10 w-full rounded-lg" />
            </div>
          ))}
        </div>
        <div className="flex justify-end gap-3 mt-8">
          <Pulse className="h-10 w-24 rounded-lg" />
          <Pulse className="h-10 w-32 rounded-lg" />
        </div>
      </div>
    </div>
  );
}
