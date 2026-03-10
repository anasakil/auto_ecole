'use client';
import React, { useState } from 'react';
import Badge from '../ui/Badge';

function FilterBar({
  filters = [],
  onReset,
  activeFiltersCount = 0,
  collapsible = false,
  className = '',
}) {
  const [isExpanded, setIsExpanded] = useState(true);

  const hasActiveFilters = activeFiltersCount > 0 || filters.some(f => f.value && f.value !== '' && f.value !== 'all');

  if (filters.length === 0) return null;

  return (
    <div className={`bg-white rounded-lg border border-gray-200 ${className}`}>
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
        <div className="flex items-center gap-2">
          <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
          </svg>
          <span className="text-sm font-medium text-gray-700">Filtres</span>
          {hasActiveFilters && <Badge variant="primary" size="sm">{activeFiltersCount || 'actif'}</Badge>}
        </div>
        <div className="flex items-center gap-2">
          {hasActiveFilters && onReset && (
            <button onClick={onReset} className="text-sm text-gray-500 hover:text-gray-700 transition-colors">Réinitialiser</button>
          )}
          {collapsible && (
            <button onClick={() => setIsExpanded(!isExpanded)} className="p-1 text-gray-400 hover:text-gray-600 rounded transition-colors">
              <svg className={`w-5 h-5 transition-transform ${isExpanded ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>
          )}
        </div>
      </div>

      {(!collapsible || isExpanded) && (
        <div className="p-4">
          <div className="flex flex-wrap gap-4">
            {filters.map((filter) => (
              <div key={filter.key} className="min-w-[150px]">
                <label className="block text-xs font-medium text-gray-500 mb-1.5">{filter.label}</label>
                {filter.type === 'select' || !filter.type ? (
                  <select
                    value={filter.value || ''}
                    onChange={(e) => filter.onChange(e.target.value)}
                    className="w-full h-9 px-3 text-sm border border-gray-300 rounded-lg bg-white focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 transition-colors"
                  >
                    {filter.options.map((opt) => (
                      <option key={opt.value} value={opt.value}>{opt.label}</option>
                    ))}
                  </select>
                ) : filter.type === 'date' ? (
                  <input
                    type="date"
                    value={filter.value || ''}
                    onChange={(e) => filter.onChange(e.target.value)}
                    className="w-full h-9 px-3 text-sm border border-gray-300 rounded-lg bg-white focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 transition-colors"
                  />
                ) : filter.type === 'daterange' ? (
                  <div className="flex items-center gap-2">
                    <input type="date" value={filter.value?.start || ''} onChange={(e) => filter.onChange({ ...filter.value, start: e.target.value })} className="flex-1 h-9 px-2 text-sm border border-gray-300 rounded-lg bg-white focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 transition-colors" />
                    <span className="text-gray-400">à</span>
                    <input type="date" value={filter.value?.end || ''} onChange={(e) => filter.onChange({ ...filter.value, end: e.target.value })} className="flex-1 h-9 px-2 text-sm border border-gray-300 rounded-lg bg-white focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 transition-colors" />
                  </div>
                ) : null}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function FilterChips({ options = [], onChange, multiple = false, className = '' }) {
  return (
    <div className={`flex flex-wrap gap-2 ${className}`}>
      {options.map((option) => (
        <button
          key={option.key}
          onClick={() => onChange(option.key)}
          className={`px-3 py-1.5 text-sm font-medium rounded-full border transition-colors ${option.active ? 'bg-primary-100 border-primary-300 text-primary-700' : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'}`}
        >
          {option.label}
          {option.count !== undefined && <span className={`ml-1.5 ${option.active ? 'text-primary-500' : 'text-gray-400'}`}>({option.count})</span>}
        </button>
      ))}
    </div>
  );
}

FilterBar.Chips = FilterChips;

export default FilterBar;
