'use client';
import React, { useState, useRef, useEffect } from 'react';

function SearchInput({
  value,
  onChange,
  placeholder = 'Rechercher...',
  onSearch,
  debounceMs = 300,
  showClear = true,
  size = 'md',
  fullWidth = false,
  autoFocus = false,
  className = '',
}) {
  const [localValue, setLocalValue] = useState(value || '');
  const debounceRef = useRef(null);
  const inputRef = useRef(null);

  const sizes = { sm: 'h-8 text-sm pl-8 pr-8', md: 'h-10 text-sm pl-10 pr-10', lg: 'h-12 text-base pl-12 pr-12' };
  const iconSizes = { sm: 'w-4 h-4 left-2', md: 'w-5 h-5 left-3', lg: 'w-6 h-6 left-3' };

  useEffect(() => { setLocalValue(value || ''); }, [value]);
  useEffect(() => { if (autoFocus && inputRef.current) inputRef.current.focus(); }, [autoFocus]);

  const handleChange = (e) => {
    const newValue = e.target.value;
    setLocalValue(newValue);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => { onChange?.(newValue); }, debounceMs);
  };

  const handleClear = () => {
    setLocalValue('');
    onChange?.('');
    inputRef.current?.focus();
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      onChange?.(localValue);
      onSearch?.(localValue);
    }
    if (e.key === 'Escape') handleClear();
  };

  return (
    <div className={`relative ${fullWidth ? 'w-full' : 'w-64'} ${className}`}>
      <svg className={`absolute top-1/2 -translate-y-1/2 text-gray-400 ${iconSizes[size]}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
      </svg>
      <input
        ref={inputRef}
        type="text"
        value={localValue}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        className={`w-full rounded-lg border border-gray-300 bg-white focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 placeholder-gray-400 transition-colors ${sizes[size]}`}
      />
      {showClear && localValue && (
        <button onClick={handleClear} className="absolute top-1/2 -translate-y-1/2 right-2 p-1 text-gray-400 hover:text-gray-600 rounded-md transition-colors">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      )}
    </div>
  );
}

export default SearchInput;
