import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown, Check, Search, Users, BookOpen } from 'lucide-react';

/**
 * Custom Dropdown Component for selecting training courses with full text wrapping,
 * instructor names, category badges, and search filtering.
 * Prevents horizontal overflow off the viewport and replaces native HTML <select>.
 */
export const CourseSelectDropdown = ({
  trainings = [],
  value = '',
  onChange,
  placeholder = 'Choose Published Course',
  required = false,
  accentColor = 'indigo' // 'indigo' | 'emerald'
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const dropdownRef = useRef(null);
  const searchInputRef = useRef(null);

  // Close dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('touchstart', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
    };
  }, [isOpen]);

  // Focus search input when dropdown opens
  useEffect(() => {
    if (isOpen && searchInputRef.current) {
      searchInputRef.current.focus();
    }
  }, [isOpen]);

  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && isOpen) {
        setIsOpen(false);
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen]);

  // Find currently selected training
  const selectedCourse = trainings.find((t) => String(t._id || t.id) === String(value));

  // Filter trainings based on search query
  const filteredTrainings = trainings.filter((t) => {
    if (!searchTerm.trim()) return true;
    const term = searchTerm.toLowerCase();
    const titleMatch = (t.title || '').toLowerCase().includes(term);
    const categoryMatch = (t.category?.name || '').toLowerCase().includes(term);
    const instructorMatch = (t.instructor?.name || '').toLowerCase().includes(term);
    return titleMatch || categoryMatch || instructorMatch;
  });

  const isEmerald = accentColor === 'emerald';
  const activeRingClass = isEmerald
    ? 'border-emerald-600 ring-2 ring-emerald-500/20'
    : 'border-indigo-600 ring-2 ring-indigo-500/20';

  return (
    <div className="relative w-full max-w-full" ref={dropdownRef}>
      {/* Hidden input for HTML5 form required validation */}
      <input
        type="text"
        className="sr-only"
        required={required}
        value={value || ''}
        onChange={() => {}}
        tabIndex={-1}
        aria-hidden="true"
      />

      {/* Dropdown Trigger Button */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={`w-full max-w-full text-left px-4 py-2.5 rounded-xl border bg-white text-sm text-slate-900 outline-none transition-all cursor-pointer flex items-center justify-between gap-2 shadow-xs ${
          isOpen ? activeRingClass : 'border-slate-300 hover:border-slate-400'
        }`}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
      >
        {selectedCourse ? (
          <div className="min-w-0 flex-1 flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2">
            <span
              className="font-bold text-slate-900 break-words [overflow-wrap:anywhere] line-clamp-1"
              title={selectedCourse.title}
            >
              {selectedCourse.title}
            </span>
            <div className="flex items-center gap-1.5 shrink-0 flex-wrap">
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-teal-50 text-teal-700 border border-teal-100 shrink-0">
                {selectedCourse.category?.name || 'General'}
              </span>
              {selectedCourse.instructor?.name && (
                <span className="text-[11px] text-slate-500 shrink-0 truncate max-w-[150px]">
                  · By {selectedCourse.instructor.name}
                </span>
              )}
            </div>
          </div>
        ) : (
          <span className="text-slate-400 font-normal truncate">{placeholder}</span>
        )}

        <ChevronDown
          className={`w-4 h-4 text-slate-400 shrink-0 transition-transform duration-200 ${
            isOpen ? 'rotate-180 text-slate-600' : ''
          }`}
        />
      </button>

      {/* Dropdown Menu Container */}
      {isOpen && (
        <div
          className="absolute z-50 left-0 right-0 mt-1.5 w-full max-w-full bg-white rounded-2xl border border-slate-200 shadow-xl overflow-hidden animate-fade-in"
          style={{ width: '100%' }}
        >
          {/* Search bar inside dropdown (shown if >= 3 courses) */}
          {trainings.length >= 3 && (
            <div className="p-2.5 border-b border-slate-100 bg-slate-50/80">
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
                <input
                  ref={searchInputRef}
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Filter courses by title, category, or instructor..."
                  className="w-full pl-8 pr-3 py-1.5 rounded-lg border border-slate-200 bg-white text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-indigo-500"
                />
              </div>
            </div>
          )}

          {/* Scrollable list with multi-line text wrapping and overflow-x handling */}
          <div className="max-h-64 overflow-y-auto overflow-x-auto divide-y divide-slate-100">
            {filteredTrainings.length === 0 ? (
              <div className="p-5 text-center text-xs text-slate-400 italic">
                {trainings.length === 0
                  ? 'No published training courses available'
                  : `No published courses match "${searchTerm}"`}
              </div>
            ) : (
              filteredTrainings.map((t) => {
                const courseId = t._id || t.id;
                const isSelected = String(courseId) === String(value);

                return (
                  <button
                    type="button"
                    key={courseId}
                    onClick={() => {
                      onChange(courseId);
                      setIsOpen(false);
                      setSearchTerm('');
                    }}
                    className={`w-full text-left p-3.5 hover:bg-slate-50 transition-colors cursor-pointer flex items-start justify-between gap-3 min-w-0 ${
                      isSelected
                        ? isEmerald
                          ? 'bg-emerald-50/60 font-medium'
                          : 'bg-indigo-50/60 font-medium'
                        : ''
                    }`}
                  >
                    <div className="min-w-0 flex-1 space-y-1.5">
                      <p
                        className="text-xs sm:text-sm font-bold text-slate-900 leading-snug whitespace-normal break-words [overflow-wrap:anywhere]"
                        title={t.title}
                      >
                        {t.title}
                      </p>
                      <div className="flex flex-wrap items-center gap-2 text-[11px] text-slate-500">
                        <span className="px-2 py-0.5 rounded-md bg-teal-50 text-teal-700 border border-teal-100 font-semibold text-[10px] shrink-0">
                          {t.category?.name || 'General'}
                        </span>
                        {t.instructor?.name && (
                          <span className="flex items-center text-slate-600 font-medium whitespace-normal break-words [overflow-wrap:anywhere]">
                            <Users className="w-3 h-3 mr-1 text-slate-400 shrink-0" />
                            Instructor: <strong className="ml-1 text-slate-800 font-semibold">{t.instructor.name}</strong>
                          </span>
                        )}
                        {t.durationDays && (
                          <span className="text-slate-400 shrink-0">· {t.durationDays} days window</span>
                        )}
                      </div>
                    </div>

                    {isSelected && (
                      <Check
                        className={`w-4 h-4 shrink-0 mt-0.5 ${
                          isEmerald ? 'text-emerald-600' : 'text-indigo-600'
                        }`}
                      />
                    )}
                  </button>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
};

