import React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

export const Pagination = ({
  currentPage = 1,
  totalItems = 0,
  pageSize = 10,
  onPageChange,
  itemLabel = 'records',
  className = '',
  alwaysShowCount = false
}) => {
  const totalPages = Math.ceil(totalItems / pageSize) || 1;

  if (totalItems === 0) {
    return null;
  }

  if (totalItems <= pageSize && !alwaysShowCount) {
    return null;
  }

  const startRecord = (currentPage - 1) * pageSize + 1;
  const endRecord = Math.min(currentPage * pageSize, totalItems);

  if (totalPages <= 1) {
    return (
      <div className={`p-4 sm:px-6 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/60 flex items-center justify-between text-xs select-none ${className}`}>
        <span className="text-slate-500 dark:text-slate-400">
          Showing <strong className="text-slate-900 dark:text-slate-100">{startRecord}</strong> to{' '}
          <strong className="text-slate-900 dark:text-slate-100">{endRecord}</strong> of{' '}
          <strong className="text-slate-900 dark:text-slate-100">{totalItems}</strong> {itemLabel}
        </span>
      </div>
    );
  }

  // Generate numbered page buttons (show up to 5 surrounding pages)
  const getPageNumbers = () => {
    const pages = [];
    if (totalPages <= 5) {
      for (let i = 1; i <= totalPages; i++) pages.push(i);
    } else {
      if (currentPage <= 3) {
        pages.push(1, 2, 3, 4, '...', totalPages);
      } else if (currentPage >= totalPages - 2) {
        pages.push(1, '...', totalPages - 3, totalPages - 2, totalPages - 1, totalPages);
      } else {
        pages.push(1, '...', currentPage - 1, currentPage, currentPage + 1, '...', totalPages);
      }
    }
    return pages;
  };

  return (
    <div className={`p-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/60 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs select-none ${className}`}>
      <span className="text-slate-500 dark:text-slate-400">
        Showing <strong className="text-slate-900 dark:text-slate-100">{startRecord}</strong> to{' '}
        <strong className="text-slate-900 dark:text-slate-100">{endRecord}</strong> of{' '}
        <strong className="text-slate-900 dark:text-slate-100">{totalItems}</strong> {itemLabel}
      </span>

      <div className="flex items-center space-x-1.5 flex-wrap justify-center">
        <button
          type="button"
          disabled={currentPage <= 1}
          onClick={() => onPageChange(Math.max(currentPage - 1, 1))}
          className="px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-100 dark:hover:bg-slate-700 cursor-pointer inline-flex items-center transition-colors font-medium shadow-2xs"
          aria-label="Previous Page"
        >
          <ChevronLeft className="w-3.5 h-3.5 mr-1 shrink-0" />
          <span>Previous</span>
        </button>

        <div className="hidden xs:flex items-center space-x-1">
          {getPageNumbers().map((p, idx) => {
            if (p === '...') {
              return (
                <span key={`ellipsis-${idx}`} className="px-2 py-1 text-slate-400 dark:text-slate-500">
                  …
                </span>
              );
            }
            const isActive = p === currentPage;
            return (
              <button
                key={p}
                type="button"
                onClick={() => onPageChange(p)}
                className={`min-w-[32px] h-8 px-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  isActive
                    ? 'bg-emerald-600 text-white shadow-xs'
                    : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700'
                }`}
                aria-label={`Page ${p}`}
                aria-current={isActive ? 'page' : undefined}
              >
                {p}
              </button>
            );
          })}
        </div>

        <span className="xs:hidden px-3 py-1.5 rounded-xl font-bold bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
          Page {currentPage} of {totalPages}
        </span>

        <button
          type="button"
          disabled={currentPage >= totalPages}
          onClick={() => onPageChange(Math.min(currentPage + 1, totalPages))}
          className="px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-100 dark:hover:bg-slate-700 cursor-pointer inline-flex items-center transition-colors font-medium shadow-2xs"
          aria-label="Next Page"
        >
          <span>Next</span>
          <ChevronRight className="w-3.5 h-3.5 ml-1 shrink-0" />
        </button>
      </div>
    </div>
  );
};

