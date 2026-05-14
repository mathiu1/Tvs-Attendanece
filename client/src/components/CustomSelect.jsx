import { useState, useRef, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { HiOutlineChevronDown, HiOutlineCheck } from 'react-icons/hi';
import './CustomSelect.css';

const CustomSelect = ({
  options = [],
  value,
  onChange,
  placeholder = 'Select...',
  className = '',
  size = 'default', // 'default' | 'small' | 'compact'
  disabled = false,
  required = false,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [highlightIndex, setHighlightIndex] = useState(-1);
  const [dropdownStyle, setDropdownStyle] = useState({});
  const wrapperRef = useRef(null);
  const listRef = useRef(null);

  const selectedOption = options.find(o => String(o.value) === String(value));

  // Calculate dropdown position relative to viewport
  const updatePosition = useCallback(() => {
    if (!wrapperRef.current) return;
    const rect = wrapperRef.current.getBoundingClientRect();
    const spaceBelow = window.innerHeight - rect.bottom;
    const dropdownHeight = Math.min(options.length * 38 + 10, 250);
    const openAbove = spaceBelow < dropdownHeight && rect.top > dropdownHeight;

    setDropdownStyle({
      position: 'fixed',
      left: rect.left,
      width: Math.max(rect.width, 180),
      zIndex: 9999,
      ...(openAbove
        ? { bottom: window.innerHeight - rect.top + 4 }
        : { top: rect.bottom + 4 }),
    });
  }, [options.length]);

  // Close on click outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target)) {
        // Also check if clicking inside the portal dropdown
        const dropdown = document.querySelector('.cs-dropdown-portal');
        if (dropdown && dropdown.contains(e.target)) return;
        setIsOpen(false);
      }
    };
    const handleScroll = () => {
      if (isOpen) updatePosition();
    };
    document.addEventListener('mousedown', handleClickOutside);
    window.addEventListener('scroll', handleScroll, true);
    window.addEventListener('resize', handleScroll);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      window.removeEventListener('scroll', handleScroll, true);
      window.removeEventListener('resize', handleScroll);
    };
  }, [isOpen, updatePosition]);

  // Scroll highlighted item into view
  useEffect(() => {
    if (isOpen && listRef.current && highlightIndex >= 0) {
      const item = listRef.current.children[highlightIndex];
      if (item) item.scrollIntoView({ block: 'nearest' });
    }
  }, [highlightIndex, isOpen]);

  // Reset highlight and calc position when opening
  useEffect(() => {
    if (isOpen) {
      const idx = options.findIndex(o => String(o.value) === String(value));
      setHighlightIndex(idx >= 0 ? idx : 0);
      updatePosition();
    }
  }, [isOpen]);

  const handleSelect = useCallback((optionValue) => {
    onChange({ target: { value: optionValue } });
    setIsOpen(false);
  }, [onChange]);

  const handleKeyDown = useCallback((e) => {
    if (!isOpen) {
      if (e.key === 'Enter' || e.key === ' ' || e.key === 'ArrowDown') {
        e.preventDefault();
        setIsOpen(true);
      }
      return;
    }

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setHighlightIndex(prev => Math.min(prev + 1, options.length - 1));
        break;
      case 'ArrowUp':
        e.preventDefault();
        setHighlightIndex(prev => Math.max(prev - 1, 0));
        break;
      case 'Enter':
        e.preventDefault();
        if (highlightIndex >= 0 && highlightIndex < options.length) {
          handleSelect(options[highlightIndex].value);
        }
        break;
      case 'Escape':
        e.preventDefault();
        setIsOpen(false);
        break;
    }
  }, [isOpen, highlightIndex, options, handleSelect]);

  const sizeClass = size === 'small' ? 'cs-small' : size === 'compact' ? 'cs-compact' : '';

  const dropdownPanel = isOpen ? createPortal(
    <div
      className={`cs-dropdown-portal ${sizeClass}`}
      style={dropdownStyle}
      onMouseDown={(e) => e.preventDefault()}
    >
      <div className="cs-dropdown">
        <div className="cs-dropdown-inner" ref={listRef}>
          {options.map((option, index) => {
            const isSelected = String(option.value) === String(value);
            const isHighlighted = index === highlightIndex;
            return (
              <div
                key={`${option.value}-${index}`}
                className={`cs-option ${isSelected ? 'cs-selected' : ''} ${isHighlighted ? 'cs-highlighted' : ''}`}
                onClick={() => handleSelect(option.value)}
                onMouseEnter={() => setHighlightIndex(index)}
              >
                <span className="cs-option-label">{option.label}</span>
                {isSelected && <HiOutlineCheck className="cs-option-check" />}
              </div>
            );
          })}
        </div>
      </div>
    </div>,
    document.body
  ) : null;

  return (
    <div
      ref={wrapperRef}
      className={`cs-wrapper ${sizeClass} ${className} ${isOpen ? 'cs-open' : ''} ${disabled ? 'cs-disabled' : ''}`}
      onKeyDown={handleKeyDown}
      tabIndex={disabled ? -1 : 0}
      role="combobox"
      aria-expanded={isOpen}
      aria-required={required}
    >
      {/* Trigger */}
      <div
        className={`cs-trigger ${isOpen ? 'cs-active' : ''} ${!selectedOption ? 'cs-placeholder' : ''}`}
        onClick={() => !disabled && setIsOpen(!isOpen)}
      >
        <span className="cs-value">
          {selectedOption ? selectedOption.label : placeholder}
        </span>
        <HiOutlineChevronDown className={`cs-chevron ${isOpen ? 'cs-chevron-flip' : ''}`} />
      </div>

      {/* Dropdown rendered via portal */}
      {dropdownPanel}
    </div>
  );
};

export default CustomSelect;
