'use client';
import React, { useState, useMemo } from 'react';
import { Skeleton } from '../ui';
import Pagination from './Pagination';
import EmptyState from './EmptyState';

function DataTable({
  columns,
  data = [],
  loading = false,
  emptyState,
  sortable = true,
  selectable = false,
  selectedRows = [],
  onSelectionChange,
  onRowClick,
  rowKey = 'id',
  pagination = null, // { page, pageSize, total, onPageChange }
  stickyHeader = false,
  striped = true,
  hoverable = true,
  compact = false,
  className = '',
}) {
  const [sortConfig, setSortConfig] = useState({ key: null, direction: 'asc' });

  const handleSort = (columnKey) => {
    if (!sortable) return;

    setSortConfig((prev) => ({
      key: columnKey,
      direction: prev.key === columnKey && prev.direction === 'asc' ? 'desc' : 'asc',
    }));
  };

  const sortedData = useMemo(() => {
    if (!sortConfig.key) return data;

    return [...data].sort((a, b) => {
      const aVal = a[sortConfig.key];
      const bVal = b[sortConfig.key];

      if (aVal === null || aVal === undefined) return 1;
      if (bVal === null || bVal === undefined) return -1;

      if (typeof aVal === 'string') {
        const comparison = aVal.localeCompare(bVal, 'fr', { numeric: true });
        return sortConfig.direction === 'asc' ? comparison : -comparison;
      }

      if (aVal < bVal) return sortConfig.direction === 'asc' ? -1 : 1;
      if (aVal > bVal) return sortConfig.direction === 'asc' ? 1 : -1;
      return 0;
    });
  }, [data, sortConfig]);

  const isAllSelected = data.length > 0 && selectedRows.length === data.length;
  const isSomeSelected = selectedRows.length > 0 && selectedRows.length < data.length;

  const handleSelectAll = () => {
    if (!onSelectionChange) return;

    if (isAllSelected) {
      onSelectionChange([]);
    } else {
      onSelectionChange(data.map((row) => row[rowKey]));
    }
  };

  const handleSelectRow = (rowId) => {
    if (!onSelectionChange) return;

    if (selectedRows.includes(rowId)) {
      onSelectionChange(selectedRows.filter((id) => id !== rowId));
    } else {
      onSelectionChange([...selectedRows, rowId]);
    }
  };

  if (loading) {
    return <Skeleton.Table rows={5} columns={columns.length} />;
  }

  if (data.length === 0) {
    return emptyState || <EmptyState title="Aucune donnée" description="Il n'y a pas de données à afficher." />;
  }

  return (
    <div className={`overflow-hidden ${className}`}>
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className={`bg-gray-50 ${stickyHeader ? 'sticky top-0 z-10' : ''}`}>
            <tr>
              {selectable && (
                <th className="px-4 py-3 w-12">
                  <input
                    type="checkbox"
                    checked={isAllSelected}
                    ref={(el) => {
                      if (el) el.indeterminate = isSomeSelected;
                    }}
                    onChange={handleSelectAll}
                    className="w-4 h-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                  />
                </th>
              )}
              {columns.map((column) => (
                <th
                  key={column.key}
                  className={`
                    px-4 ${compact ? 'py-2' : 'py-3'} text-left text-xs font-semibold text-gray-600 uppercase tracking-wider
                    ${sortable && column.sortable !== false ? 'cursor-pointer hover:bg-gray-100 select-none' : ''}
                    ${column.className || ''}
                  `}
                  style={{ width: column.width }}
                  onClick={() => column.sortable !== false && handleSort(column.key)}
                >
                  <div className="flex items-center gap-2">
                    <span>{column.header}</span>
                    {sortable && column.sortable !== false && (
                      <span className="flex flex-col">
                        <svg
                          className={`w-3 h-3 ${sortConfig.key === column.key && sortConfig.direction === 'asc' ? 'text-primary-600' : 'text-gray-300'}`}
                          fill="currentColor"
                          viewBox="0 0 20 20"
                        >
                          <path d="M10 3l7 7H3l7-7z" />
                        </svg>
                        <svg
                          className={`w-3 h-3 -mt-1 ${sortConfig.key === column.key && sortConfig.direction === 'desc' ? 'text-primary-600' : 'text-gray-300'}`}
                          fill="currentColor"
                          viewBox="0 0 20 20"
                        >
                          <path d="M10 17l-7-7h14l-7 7z" />
                        </svg>
                      </span>
                    )}
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {sortedData.map((row, rowIndex) => {
              const rowId = row[rowKey];
              const isSelected = selectedRows.includes(rowId);

              return (
                <tr
                  key={rowId || rowIndex}
                  className={`
                    ${striped && rowIndex % 2 === 1 ? 'bg-gray-50' : ''}
                    ${hoverable ? 'hover:bg-gray-100' : ''}
                    ${isSelected ? 'bg-primary-50' : ''}
                    ${onRowClick ? 'cursor-pointer' : ''}
                    transition-colors
                  `}
                  onClick={() => onRowClick?.(row)}
                >
                  {selectable && (
                    <td className="px-4 py-3 w-12" onClick={(e) => e.stopPropagation()}>
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => handleSelectRow(rowId)}
                        className="w-4 h-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                      />
                    </td>
                  )}
                  {columns.map((column) => (
                    <td
                      key={column.key}
                      className={`px-4 ${compact ? 'py-2' : 'py-3'} text-sm text-gray-700 ${column.cellClassName || ''}`}
                    >
                      {column.render ? column.render(row[column.key], row, rowIndex) : row[column.key]}
                    </td>
                  ))}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {pagination && (
        <div className="px-4 py-3 border-t border-gray-200 bg-gray-50">
          <Pagination
            currentPage={pagination.page}
            totalPages={Math.ceil(pagination.total / pagination.pageSize)}
            onPageChange={pagination.onPageChange}
            totalItems={pagination.total}
            pageSize={pagination.pageSize}
            showInfo
          />
        </div>
      )}
    </div>
  );
}

export default DataTable;
