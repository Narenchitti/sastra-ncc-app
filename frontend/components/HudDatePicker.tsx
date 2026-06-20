'use client';

import { useState, useRef, useEffect } from 'react';

interface HudDatePickerProps {
  value: string; // YYYY-MM-DD
  onChange: (date: string) => void;
  name?: string;
  required?: boolean;
}

function toLocalDateStr(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

const MONTH_NAMES = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const DAY_LABELS = ['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su'];

export default function HudDatePicker({ value, onChange, name, required }: HudDatePickerProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  // Parse value or default to today
  const selected = value ? new Date(value + 'T00:00:00') : null;
  const todayStr = toLocalDateStr(new Date());
  const currentYear = new Date().getFullYear();
  const YEARS_RANGE = Array.from({ length: 91 }, (_, i) => currentYear - 80 + i);

  // Calendar view state
  const [viewYear, setViewYear] = useState(selected?.getFullYear() ?? new Date().getFullYear());
  const [viewMonth, setViewMonth] = useState(selected?.getMonth() ?? new Date().getMonth());

  // Sync view when value changes externally
  useEffect(() => {
    if (value) {
      const d = new Date(value + 'T00:00:00');
      setViewYear(d.getFullYear());
      setViewMonth(d.getMonth());
    }
  }, [value]);

  // Close on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        const target = e.target as Element;
        if (target && (target.tagName === 'SELECT' || target.tagName === 'OPTION' || target.closest('select'))) {
          return;
        }
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  // Build calendar grid
  const firstDay = new Date(viewYear, viewMonth, 1);
  let startDay = firstDay.getDay(); // 0=Sun
  startDay = startDay === 0 ? 6 : startDay - 1; // Convert to Mon=0

  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
  const prevMonthDays = new Date(viewYear, viewMonth, 0).getDate();

  const cells: { day: number; month: number; year: number; isCurrentMonth: boolean }[] = [];

  // Previous month trailing days
  for (let i = startDay - 1; i >= 0; i--) {
    const pm = viewMonth === 0 ? 11 : viewMonth - 1;
    const py = viewMonth === 0 ? viewYear - 1 : viewYear;
    cells.push({ day: prevMonthDays - i, month: pm, year: py, isCurrentMonth: false });
  }
  // Current month
  for (let d = 1; d <= daysInMonth; d++) {
    cells.push({ day: d, month: viewMonth, year: viewYear, isCurrentMonth: true });
  }
  // Next month leading days
  const remaining = 42 - cells.length; // 6 rows
  for (let d = 1; d <= remaining; d++) {
    const nm = viewMonth === 11 ? 0 : viewMonth + 1;
    const ny = viewMonth === 11 ? viewYear + 1 : viewYear;
    cells.push({ day: d, month: nm, year: ny, isCurrentMonth: false });
  }

  const navigate = (dir: -1 | 1) => {
    let m = viewMonth + dir;
    let y = viewYear;
    if (m < 0) { m = 11; y--; }
    if (m > 11) { m = 0; y++; }
    setViewMonth(m);
    setViewYear(y);
  };

  const selectDate = (cell: typeof cells[0]) => {
    const dateStr = `${cell.year}-${String(cell.month + 1).padStart(2, '0')}-${String(cell.day).padStart(2, '0')}`;
    onChange(dateStr);
    setOpen(false);
  };

  const displayValue = selected
    ? `${selected.getDate()} ${MONTH_NAMES[selected.getMonth()].slice(0, 3)} ${selected.getFullYear()}`
    : '';

  return (
    <div ref={ref} className="relative">
      {/* Hidden input for form submission */}
      {name && <input type="hidden" name={name} value={value} />}

      {/* Trigger Button */}
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className={`hud-input text-left flex items-center justify-between gap-2 cursor-pointer ${!value ? 'text-white/30' : ''}`}
      >
        <span>{displayValue || 'Select date...'}</span>
        <i className={`fas fa-calendar-alt text-xs ${value ? 'text-ncc-gold/70' : 'text-ncc-olive/40'}`}></i>
      </button>

      {/* Calendar Popup */}
      {open && (
        <div className="absolute z-50 bottom-full mb-2 left-0 w-[300px] bg-[#0d120a] border-2 border-ncc-olive/60 rounded-md shadow-[0_0_20px_rgba(74,93,35,0.35)] animate-fade-in overflow-hidden">
          {/* Header — Month/Year + Nav */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-ncc-olive/20 bg-black/40">
            <button
              type="button"
              onClick={() => navigate(-1)}
              className="w-7 h-7 rounded flex items-center justify-center text-ncc-khaki hover:text-ncc-gold hover:bg-ncc-gold/20 transition-colors"
            >
              <i className="fas fa-chevron-left text-[10px]"></i>
            </button>
            <div className="flex gap-1.5">
              <select
                value={viewMonth}
                onChange={(e) => setViewMonth(parseInt(e.target.value, 10))}
                className="bg-[#12190f] border border-ncc-olive/45 text-[10px] font-sans font-bold text-gray-200 uppercase px-1 py-0.5 rounded outline-none focus:border-ncc-sky cursor-pointer"
              >
                {MONTH_NAMES.map((m, idx) => (
                  <option key={m} value={idx} className="bg-[#0d120a] text-white">
                    {m.slice(0, 3)}
                  </option>
                ))}
              </select>
              <select
                value={viewYear}
                onChange={(e) => setViewYear(parseInt(e.target.value, 10))}
                className="bg-[#12190f] border border-ncc-olive/45 text-[10px] font-sans font-bold text-gray-200 px-1 py-0.5 rounded outline-none focus:border-ncc-sky cursor-pointer"
              >
                {YEARS_RANGE.map((y) => (
                  <option key={y} value={y} className="bg-[#0d120a] text-white">
                    {y}
                  </option>
                ))}
              </select>
            </div>
            <button
              type="button"
              onClick={() => navigate(1)}
              className="w-7 h-7 rounded flex items-center justify-center text-ncc-khaki hover:text-ncc-gold hover:bg-ncc-gold/20 transition-colors"
            >
              <i className="fas fa-chevron-right text-[10px]"></i>
            </button>
          </div>

          {/* Day Labels */}
          <div className="grid grid-cols-7 gap-0 px-2 pt-2 pb-1">
            {DAY_LABELS.map(d => (
              <div key={d} className="text-center text-[9px] font-sans font-bold text-ncc-khaki uppercase tracking-widest py-1">{d}</div>
            ))}
          </div>

          {/* Day Grid */}
          <div className="grid grid-cols-7 gap-0 px-2 pb-3">
            {cells.map((cell, idx) => {
              const cellStr = `${cell.year}-${String(cell.month + 1).padStart(2, '0')}-${String(cell.day).padStart(2, '0')}`;
              const isSelected = cellStr === value;
              const isToday = cellStr === todayStr;

              return (
                <button
                  key={idx}
                  type="button"
                  onClick={() => selectDate(cell)}
                  className={`
                    h-8 rounded-sm text-xs font-mono font-semibold transition-all
                    ${!cell.isCurrentMonth ? 'text-gray-600 hover:text-gray-400' : ''}
                    ${cell.isCurrentMonth && !isSelected && !isToday ? 'text-white hover:bg-ncc-gold/20 hover:text-ncc-gold' : ''}
                    ${isToday && !isSelected ? 'text-ncc-gold border-2 border-ncc-gold/60 bg-ncc-gold/15' : ''}
                    ${isSelected ? 'bg-ncc-sky text-white border-2 border-ncc-sky-light shadow-[0_0_12px_rgba(56,189,248,0.3)] font-bold' : ''}
                  `}
                >
                  {cell.day}
                </button>
              );
            })}
          </div>

          {/* Quick Actions */}
          <div className="flex gap-1 px-3 pb-3">
            <button
              type="button"
              onClick={() => { onChange(todayStr); setOpen(false); }}
              className="flex-1 py-1.5 text-[10px] font-sans font-bold uppercase tracking-widest text-ncc-gold hover:bg-ncc-gold/20 border-2 border-ncc-gold/30 rounded-sm transition-colors"
            >
              Today
            </button>
            {value && (
              <button
                type="button"
                onClick={() => { onChange(''); setOpen(false); }}
                className="flex-1 py-1.5 text-[10px] font-sans font-bold uppercase tracking-widest text-ncc-red hover:bg-ncc-red/20 border-2 border-ncc-red/30 rounded-sm transition-colors"
              >
                Clear
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
