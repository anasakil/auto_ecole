'use client';
import React from 'react';

function Pagination({
  currentPage,
  totalPages,
  onPageChange,
  totalItems,
  pageSize,
  showInfo = true,
  siblingCount = 1,
  className = '',
}) {
  const range = (start, end) => {
    const length = end - start + 1;
    return Array.from({ length }, (_, idx) => idx + start);
  };

  const getPageNumbers = () => {
    const totalPageNumbers = siblingCount * 2 + 5; // siblings + first + last + current + 2 ellipsis

    if (totalPages <= totalPageNumbers) {
      return range(1, totalPages);
    }

    const leftSiblingIndex = Math.max(currentPage - siblingCount, 1);
    const rightSiblingIndex = Math.min(currentPage + siblingCount, totalPages);

    const showLeftEllipsis = leftSiblingIndex > 2;
    const showRightEllipsis = rightSiblingIndex < totalPages - 1;

    if (!showLeftEllipsis && showRightEllipsis) {
      const leftItemCount = 3 + 2 * siblingCount;
      const leftRange = range(1, leftItemCount);
      return [...leftRange, 'ellipsis-right', totalPages];
    }

    if (showLeftEllipsis && !showRightEllipsis) {
      const rightItemCount = 3 + 2 * siblingCount;
      const rightRange = range(totalPages - rightItemCount + 1, totalPages);
      return [1, 'ellipsis-left', ...rightRange];
    }

    if (showLeftEllipsis && showRightEllipsis) {
      const middleRange = range(leftSiblingIndex, rightSiblingIndex);
      return [1, 'ellipsis-left', ...middleRange, 'ellipsis-right', totalPages];
    }

    return range(1, totalPages);
  };

  const pageNumbers = getPageNumbers();

  const startItem = (currentPage - 1) * pageSize + 1;
  const endItem = Math.min(currentPage * pageSize, totalItems);

  if (totalPages <= 1) {
    return showInfo && totalItems > 0 ? (
      <div className={`text-sm text-gray-500 ${className}`}>
        {totalItems} élément{totalItems > 1 ? 's' : ''}
      </div>
    ) : null;
  }

  return (
    <div className={`flex flex-col sm:flex-row items-center justify-between gap-4 ${className}`}>
      {showInfo && totalItems > 0 && (
        <div className="text-sm text-gray-500">
          Affichage de {startItem} à {endItem} sur {totalItems} élément{totalItems > 1 ? 's' : ''}
        </div>
      )}

      <nav className="flex items-center gap-1">
        {/* Previous button */}
        <button
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage === 1}
          className={`
            flex items-center justify-center w-9 h-9 rounded-lg text-sm font-medium
            ${currentPage === 1
              ? 'text-gray-300 cursor-not-allowed'
              : 'text-gray-600 hover:bg-gray-100'}
            transition-colors
          `}
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>

        {/* Page numbers */}
        {pageNumbers.map((page, index) => {
          if (typeof page === 'string') {
            return (
              <span key={page} className="w-9 h-9 flex items-center justify-center text-gray-400">
                ...
              </span>
            );
          }

          return (
            <button
              key={page}
              onClick={() => onPageChange(page)}
              className={`
                flex items-center justify-center w-9 h-9 rounded-lg text-sm font-medium
                transition-colors
                ${currentPage === page
                  ? 'bg-primary-600 text-white'
                  : 'text-gray-600 hover:bg-gray-100'}
              `}
            >
              {page}
            </button>
          );
        })}

        {/* Next button */}
        <button
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage === totalPages}
          className={`
            flex items-center justify-center w-9 h-9 rounded-lg text-sm font-medium
            ${currentPage === totalPages
              ? 'text-gray-300 cursor-not-allowed'
              : 'text-gray-600 hover:bg-gray-100'}
            transition-colors
          `}
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </button>
      </nav>
    </div>
  );
}

// Simple pagination (prev/next only)
function SimplePagination({ currentPage, totalPages, onPageChange, className = '' }) {
  if (totalPages <= 1) return null;

  return (
    <div className={`flex items-center justify-between ${className}`}>
      <button
        onClick={() => onPageChange(currentPage - 1)}
        disabled={currentPage === 1}
        className={`
          flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg
          ${currentPage === 1
            ? 'text-gray-300 cursor-not-allowed'
            : 'text-gray-600 hover:bg-gray-100'}
          transition-colors
        `}
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
        </svg>
        Précédent
      </button>

      <span className="text-sm text-gray-500">
        Page {currentPage} sur {totalPages}
      </span>

      <button
        onClick={() => onPageChange(currentPage + 1)}
        disabled={currentPage === totalPages}
        className={`
          flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg
          ${currentPage === totalPages
            ? 'text-gray-300 cursor-not-allowed'
            : 'text-gray-600 hover:bg-gray-100'}
          transition-colors
        `}
      >
        Suivant
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
        </svg>
      </button>
    </div>
  );
}

Pagination.Simple = SimplePagination;

export default Pagination;
