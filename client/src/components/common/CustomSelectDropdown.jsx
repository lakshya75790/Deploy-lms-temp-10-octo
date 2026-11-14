import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown, Check, Search, X } from 'lucide-react';

/**
 * Accessible Custom Select Dropdown Component
 * Prevents horizontal overflow, wraps long text safely with [overflow-wrap:anywhere],
 * supports keyboard navigation, search filtering, and contained responsive layouts.
 */
export const CustomSelectDropdown = ({
  options = [],
  value = '',
  onChange,
  placeholder = 'Select an option',
  disabled = false,
  disabledPlaceholder = 'Select previous field first',
  required = false,
  accentColor = 'emerald', // 'emerald' | 'indigo'
  searchThreshold = 5,
  id
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [highlightedIndex, setHighlightedIndex] = useState(-1);

  const containerRef = useRef(null);
  const triggerRef = useRef(null);
  const searchInputRef = useRef(null);
  const listRef = useRef(null);

  // Normalize options to [{ value, label, subtext }]
  const normalizedOptions = options.map((opt) => {
    if (typeof opt === 'object' && opt !== null) {
      return {
        value: String(opt.value !== undefined ? opt.value : opt._id || opt.id || ''),
        label: String(opt.label !== undefined ? opt.label : opt.name || opt.title || opt.value || ''),
        subtext: opt.subtext ? String(opt.subtext) : ''
      };
    }
    return {
      value: String(opt),
      label: String(opt),
      subtext: ''
    };
  });

  // Find currently selected option
  const selectedOption = normalizedOptions.find((opt) => opt.value === String(value));

  // Filter options based on search query
  const filteredOptions = normalizedOptions.filter((opt) => {
    if (!searchTerm.trim()) return true;
    const term = searchTerm.toLowerCase();
    return (
      opt.label.toLowerCase().includes(term) ||
      (opt.subtext && opt.subtext.toLowerCase().includes(term))
    );
  });

  // Close dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (containerRef.current && !containerRef.current.contains(event.target)) {
        setIsOpen(false);
        setSearchTerm('');
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
    if (isOpen) {
      setHighlightedIndex(-1);
      if (searchInputRef.current && normalizedOptions.length >= searchThreshold) {
        searchInputRef.current.focus();
      }
    } else {
      setSearchTerm('');
    }
  }, [isOpen, normalizedOptions.length, searchThreshold]);

  // Scroll highlighted option into view
  useEffect(() => {
    if (isOpen && highlightedIndex >= 0 && listRef.current) {
      const optionElement = listRef.current.children[highlightedIndex];
      if (optionElement && typeof optionElement.scrollIntoView === 'function') {
        optionElement.scrollIntoView({ block: 'nearest' });
      }
    }
  }, [highlightedIndex, isOpen]);

  // Keyboard navigation
  const handleKeyDown = (e) => {
    if (disabled) return;

    if (!isOpen) {
      if (e.key === 'ArrowDown' || e.key === 'ArrowUp' || e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        setIsOpen(true);
      }
      return;
    }

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setHighlightedIndex((prev) =>
          prev < filteredOptions.length - 1 ? prev + 1 : 0
        );
        break;
      case 'ArrowUp':
        e.preventDefault();
        setHighlightedIndex((prev) =>
          prev > 0 ? prev - 1 : filteredOptions.length - 1
        );
        break;
      case 'Enter':
        e.preventDefault();
        if (highlightedIndex >= 0 && highlightedIndex < filteredOptions.length) {
          handleSelect(filteredOptions[highlightedIndex].value);
        }
        break;
      case 'Escape':
        e.preventDefault();
        setIsOpen(false);
        setSearchTerm('');
        if (triggerRef.current) triggerRef.current.focus();
        break;
      case 'Tab':
        setIsOpen(false);
        setSearchTerm('');
        break;
      default:
        break;
    }
  };

  const handleSelect = (optionValue) => {
    if (onChange) {
      onChange(optionValue);
    }
    setIsOpen(false);
    setSearchTerm('');
    if (triggerRef.current) {
      triggerRef.current.focus();
    }
  };

  const isTeal = accentColor === 'teal';
  const isEmerald = accentColor === 'emerald';
  const activeRingClass = isTeal
    ? 'border-teal-600 ring-2 ring-teal-500/20'
    : isEmerald
    ? 'border-emerald-600 ring-2 ring-emerald-500/20'
    : 'border-indigo-600 ring-2 ring-indigo-500/20';

  const selectedBgClass = isTeal
    ? 'bg-teal-50 text-teal-900 font-bold'
    : isEmerald
    ? 'bg-emerald-50 text-emerald-900 font-bold'
    : 'bg-indigo-50 text-indigo-900 font-bold';

  const checkColorClass = isTeal ? 'text-teal-600' : isEmerald ? 'text-emerald-600' : 'text-indigo-600';
  const searchFocusClass = isTeal
    ? 'focus:border-teal-500 focus:ring-teal-500/20'
    : 'focus:border-emerald-500 focus:ring-emerald-500/20';

  const displayText = disabled
    ? disabledPlaceholder
    : selectedOption
    ? selectedOption.label
    : placeholder;

  return (
    <div
      ref={containerRef}
      className="relative w-full min-w-0 max-w-full"
      onKeyDown={handleKeyDown}
    >
      {/* Hidden input for HTML5 form validation */}
      <input
        type="text"
        id={id}
        className="sr-only"
        required={required}
        value={value || ''}
        onChange={() => {}}
        tabIndex={-1}
        aria-hidden="true"
      />

      {/* Trigger Button */}
      <button
        ref={triggerRef}
        type="button"
        disabled={disabled}
        onClick={() => !disabled && setIsOpen((prev) => !prev)}
        className={`w-full min-w-0 max-w-full text-left px-4 py-2.5 rounded-xl border text-sm transition-all flex items-center justify-between gap-2 shadow-xs outline-none ${
          disabled
            ? 'bg-slate-100/80 border-slate-200 text-slate-400 cursor-not-allowed opacity-75'
            : isOpen
            ? `bg-white ${activeRingClass} cursor-pointer`
            : 'bg-white border-slate-300 hover:border-slate-400 text-slate-900 cursor-pointer'
        }`}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        aria-disabled={disabled}
      >
        <span
          className={`min-w-0 flex-1 truncate ${
            !selectedOption && !disabled ? 'text-slate-400 font-normal' : ''
          }`}
          title={displayText}
        >
          {displayText}
        </span>

        <ChevronDown
          className={`w-4 h-4 shrink-0 transition-transform duration-200 ${
            disabled
              ? 'text-slate-300'
              : isOpen
              ? `rotate-180 ${checkColorClass}`
              : 'text-slate-400'
          }`}
        />
      </button>

      {/* Dropdown Menu Container */}
      {isOpen && !disabled && (
        <div
          className="absolute z-50 left-0 right-0 mt-1.5 w-full min-w-0 max-w-full bg-white rounded-2xl border border-slate-200 shadow-xl overflow-hidden animate-fade-in"
          style={{ width: '100%' }}
        >
          {/* Search bar inside dropdown if options exceed threshold */}
          {normalizedOptions.length >= searchThreshold && (
            <div className="p-2 border-b border-slate-100 bg-slate-50/90">
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
                <input
                  ref={searchInputRef}
                  type="text"
                  value={searchTerm}
                  onChange={(e) => {
                    setSearchTerm(e.target.value);
                    setHighlightedIndex(0);
                  }}
                  placeholder="Search options..."
                  className={`w-full pl-8 pr-7 py-1.5 rounded-lg border border-slate-200 bg-white text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-1 ${searchFocusClass}`}
                />
                {searchTerm && (
                  <button
                    type="button"
                    onClick={() => {
                      setSearchTerm('');
                      if (searchInputRef.current) searchInputRef.current.focus();
                    }}
                    className="absolute right-2 top-2 text-slate-400 hover:text-slate-600"
                  >
                    <X className="w-3 h-3" />
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Option List with text wrapping */}
          <div
            ref={listRef}
            role="listbox"
            className="max-h-60 overflow-y-auto overflow-x-hidden divide-y divide-slate-100"
          >
            {filteredOptions.length === 0 ? (
              <div className="p-4 text-center text-xs text-slate-400 italic">
                {normalizedOptions.length === 0
                  ? 'No options available'
                  : `No matches found for "${searchTerm}"`}
              </div>
            ) : (
              filteredOptions.map((opt, index) => {
                const isSelected = String(value) === opt.value;
                const isHighlighted = highlightedIndex === index;

                return (
                  <div
                    key={opt.value}
                    role="option"
                    aria-selected={isSelected}
                    onClick={() => handleSelect(opt.value)}
                    onMouseEnter={() => setHighlightedIndex(index)}
                    className={`px-4 py-2.5 text-xs sm:text-sm text-left transition-colors cursor-pointer flex items-center justify-between gap-3 ${
                      isSelected
                        ? selectedBgClass
                        : isHighlighted
                        ? 'bg-slate-50 text-slate-900'
                        : 'text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    <div className="min-w-0 flex-1">
                      <p className="break-words [overflow-wrap:anywhere] leading-snug font-medium">
                        {opt.label}
                      </p>
                      {opt.subtext && (
                        <p className="text-[11px] text-slate-400 mt-0.5 break-words [overflow-wrap:anywhere]">
                          {opt.subtext}
                        </p>
                      )}
                    </div>

                    {isSelected && (
                      <Check className={`w-4 h-4 shrink-0 ${checkColorClass}`} />
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
};

