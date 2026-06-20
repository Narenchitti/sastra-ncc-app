'use client';

import React, { useState, useEffect, useRef } from 'react';

interface SelectOption {
  label: string;
  value: string;
}

interface HudSelectProps {
  options: (string | SelectOption)[];
  value: string;
  onChange: (val: string) => void;
  placeholder?: string;
  name?: string;
  required?: boolean;
  searchable?: boolean;
  openUpward?: boolean;
  disabled?: boolean;
  onFocus?: () => void;
  onBlur?: () => void;
}

/** Plays a short synthesizer beep for tactical audio feedback */
function playClick(type: 'soft' | 'hover' = 'soft') {
  if (typeof window === 'undefined') return;
  const isMuted = localStorage.getItem('ncc_sound_muted') === 'true';
  if (isMuted) return;

  try {
    const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);

    if (type === 'hover') {
      osc.type = 'sine';
      osc.frequency.setValueAtTime(240, ctx.currentTime);
      gain.gain.setValueAtTime(0.012, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.04);
      osc.start(); osc.stop(ctx.currentTime + 0.04);
    } else {
      osc.type = 'sine';
      osc.frequency.setValueAtTime(200, ctx.currentTime);
      gain.gain.setValueAtTime(0.025, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.05);
      osc.start(); osc.stop(ctx.currentTime + 0.05);
    }
  } catch (_) {}
}

export default function HudSelect({
  options,
  value,
  onChange,
  placeholder = 'Select...',
  name,
  required = false,
  searchable = false,
  openUpward = false,
  disabled = false,
  onFocus,
  onBlur,
}: HudSelectProps) {
  const [open, setOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const ref = useRef<HTMLDivElement | null>(null);

  // Normalize options to { label, value } objects
  const normalizedOptions: SelectOption[] = options.map((opt) => {
    if (typeof opt === 'string') {
      return { label: opt, value: opt };
    }
    return opt;
  });

  // Filtered options based on search query
  const filteredOptions = normalizedOptions.filter((opt) =>
    opt.label.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Get display label for selected value
  const selectedOption = normalizedOptions.find((opt) => opt.value === value);
  const displayLabel = selectedOption ? selectedOption.label : '';

  // Close dropdown on click outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (ref.current && !ref.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Handle opening and closing state callbacks
  useEffect(() => {
    if (open) {
      if (onFocus) onFocus();
    } else {
      if (onBlur) onBlur();
      setSearchQuery(''); // reset search query on close
    }
  }, [open]);

  const selectOption = (optValue: string) => {
    playClick('soft');
    onChange(optValue);
    setOpen(false);
  };

  return (
    <div ref={ref} className="relative w-full">
      {/* Hidden input for HTML form actions */}
      {name && <input type="hidden" name={name} value={value} required={required} />}

      {/* Trigger Button */}
      <button
        type="button"
        disabled={disabled}
        onClick={() => {
          if (!disabled) {
            playClick('soft');
            setOpen(!open);
          }
        }}
        onMouseEnter={() => !disabled && playClick('hover')}
        className={`w-full px-7 py-2 bg-black/60 border border-ncc-sky/25 outline-none text-left flex items-center justify-between gap-3 text-sm font-sans transition-all duration-300 focus:border-ncc-sky/55 focus:ring-1 focus:ring-ncc-sky/25 focus:shadow-[0_0_12px_rgba(75,156,211,0.15)] cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed ${
          !value ? 'text-white/30' : 'text-gray-200'
        }`}
      >
        <span className="truncate">{displayLabel || placeholder}</span>
        <i className={`fas fa-chevron-down text-[10px] transition-transform duration-200 ${open ? 'rotate-180 text-ncc-sky' : 'text-ncc-olive/40'}`} />
      </button>

      {/* Dropdown Popup */}
      {open && (
        <div
          className={`absolute z-50 left-0 w-full bg-[#0d120a] border-2 border-ncc-olive/60 rounded-md shadow-[0_0_20px_rgba(74,93,35,0.35)] animate-fade-in overflow-hidden ${
            openUpward ? 'bottom-full mb-2' : 'top-full mt-2'
          }`}
        >
          {/* Search Field */}
          {searchable && (
            <div className="p-2 border-b border-ncc-olive/20 bg-black/40">
              <div className="relative">
                <input
                  type="text"
                  placeholder="Filter options..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-[#12190f] border border-ncc-olive/30 text-xs px-2.5 py-1.5 outline-none text-white focus:border-ncc-sky/60 focus:ring-1 focus:ring-ncc-sky/20 transition-all font-sans"
                  onClick={(e) => e.stopPropagation()} // stop click bubbling
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => setSearchQuery('')}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-500 hover:text-white text-[10px]"
                  >
                    <i className="fas fa-times" />
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Options List */}
          <div className="max-h-[180px] overflow-y-auto custom-scrollbar">
            {filteredOptions.length > 0 ? (
              filteredOptions.map((opt) => {
                const isActive = opt.value === value;
                return (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => selectOption(opt.value)}
                    className={`w-full text-left py-2 px-5 text-xs font-sans transition-colors border-b border-ncc-olive/10 block truncate ${
                      isActive
                        ? 'bg-ncc-sky/35 text-white font-bold'
                        : 'text-gray-200 hover:bg-ncc-gold/15 hover:text-ncc-gold'
                    }`}
                  >
                    {opt.label}
                  </button>
                );
              })
            ) : (
              <div className="text-center py-4 text-xs text-ncc-olive/50 font-mono">
                NO ENLISTMENT DATA
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
