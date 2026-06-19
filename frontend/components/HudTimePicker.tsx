'use client';

import { useState, useRef, useEffect } from 'react';

interface HudTimePickerProps {
  value: string; // HH:MM
  onChange: (time: string) => void;
  name?: string;
  required?: boolean;
  label?: string; // "Start" or "End" for context
}

const HOURS = Array.from({ length: 24 }, (_, i) => String(i).padStart(2, '0'));
const MINUTES = ['00', '05', '10', '15', '20', '25', '30', '35', '40', '45', '50', '55'];

// Common NCC schedule times for quick access
const PRESETS = [
  { label: '06:00', desc: 'Early PT' },
  { label: '07:00', desc: 'Morning' },
  { label: '08:00', desc: 'Parade' },
  { label: '09:00', desc: 'Forenoon' },
  { label: '10:00', desc: 'Theory' },
  { label: '12:00', desc: 'Noon' },
  { label: '14:00', desc: 'Afternoon' },
  { label: '16:00', desc: 'Evening' },
  { label: '17:00', desc: 'Fall In' },
  { label: '18:00', desc: 'Retreat' },
];

export default function HudTimePicker({ value, onChange, name, required, label }: HudTimePickerProps) {
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<'presets' | 'custom'>('presets');
  const [selHour, setSelHour] = useState(value ? value.split(':')[0] : '');
  const [selMinute, setSelMinute] = useState(value ? value.split(':')[1] : '');
  const ref = useRef<HTMLDivElement>(null);
  const hourRef = useRef<HTMLDivElement>(null);

  // Sync internal state with external value
  useEffect(() => {
    if (value) {
      const [h, m] = value.split(':');
      setSelHour(h);
      setSelMinute(m);
    }
  }, [value]);

  // Close on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  // Auto-scroll to selected hour when custom mode opens
  useEffect(() => {
    if (mode === 'custom' && hourRef.current && selHour) {
      const el = hourRef.current.querySelector(`[data-hour="${selHour}"]`);
      if (el) el.scrollIntoView({ block: 'center', behavior: 'smooth' });
    }
  }, [mode, selHour]);

  const selectPreset = (time: string) => {
    onChange(time);
    setOpen(false);
  };

  const selectHour = (h: string) => {
    setSelHour(h);
    const min = selMinute || '00';
    onChange(`${h}:${min}`);
  };

  const selectMinute = (m: string) => {
    setSelMinute(m);
    if (selHour) {
      onChange(`${selHour}:${m}`);
      setOpen(false);
    }
  };

  // Format display
  const displayValue = value
    ? (() => {
        const [h, m] = value.split(':');
        const hour = parseInt(h);
        const ampm = hour >= 12 ? 'PM' : 'AM';
        const h12 = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
        return `${h12}:${m} ${ampm}`;
      })()
    : '';

  return (
    <div ref={ref} className="relative">
      {name && <input type="hidden" name={name} value={value} />}

      {/* Trigger */}
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className={`hud-input text-left flex items-center justify-between gap-2 cursor-pointer ${!value ? 'text-white/30' : ''}`}
      >
        <span>{displayValue || 'Select time...'}</span>
        <i className={`fas fa-clock text-xs ${value ? 'text-ncc-gold/70' : 'text-ncc-olive/40'}`}></i>
      </button>

      {/* Dropdown */}
      {open && (
        <div className="absolute z-50 top-full mt-2 left-0 w-[280px] bg-[#0a0e08]/98 border border-ncc-olive/30 rounded-md shadow-2xl shadow-black/60 backdrop-blur-sm animate-fade-in overflow-hidden">
          {/* Mode Tabs */}
          <div className="flex border-b border-ncc-olive/15">
            <button
              type="button"
              onClick={() => setMode('presets')}
              className={`flex-1 py-2.5 text-[10px] font-sans font-bold uppercase tracking-widest transition-colors ${
                mode === 'presets'
                  ? 'text-ncc-gold border-b-2 border-ncc-gold bg-ncc-gold/5'
                  : 'text-ncc-olive/50 hover:text-gray-300'
              }`}
            >
              Quick Select
            </button>
            <button
              type="button"
              onClick={() => setMode('custom')}
              className={`flex-1 py-2.5 text-[10px] font-sans font-bold uppercase tracking-widest transition-colors ${
                mode === 'custom'
                  ? 'text-ncc-sky border-b-2 border-ncc-sky bg-ncc-sky/5'
                  : 'text-ncc-olive/50 hover:text-gray-300'
              }`}
            >
              Hour : Minute
            </button>
          </div>

          {mode === 'presets' ? (
            /* Preset Grid */
            <div className="grid grid-cols-2 gap-1.5 p-3">
              {PRESETS.map(p => {
                const isActive = value === p.label;
                return (
                  <button
                    key={p.label}
                    type="button"
                    onClick={() => selectPreset(p.label)}
                    className={`py-2.5 px-3 rounded-sm text-left transition-all border ${
                      isActive
                        ? 'bg-ncc-sky/15 border-ncc-sky/40 text-ncc-sky'
                        : 'bg-black/30 border-ncc-olive/15 text-gray-400 hover:border-ncc-gold/30 hover:text-ncc-gold hover:bg-ncc-gold/5'
                    }`}
                  >
                    <span className="block text-sm font-mono font-bold">{p.label}</span>
                    <span className="block text-[9px] font-sans text-ncc-olive/50 uppercase tracking-wider mt-0.5">{p.desc}</span>
                  </button>
                );
              })}
            </div>
          ) : (
            /* Custom Hour:Minute Columns */
            <div className="flex gap-0 h-[220px]">
              {/* Hour Column */}
              <div className="flex-1 border-r border-ncc-olive/15">
                <div className="text-center text-[9px] font-sans font-bold text-ncc-olive/40 uppercase tracking-widest py-1.5 border-b border-ncc-olive/10 bg-black/20">Hour</div>
                <div ref={hourRef} className="overflow-y-auto h-[calc(100%-28px)] scrollbar-thin">
                  {HOURS.map(h => {
                    const isActive = selHour === h;
                    const hour = parseInt(h);
                    const ampm = hour >= 12 ? 'p' : 'a';
                    return (
                      <button
                        key={h}
                        type="button"
                        data-hour={h}
                        onClick={() => selectHour(h)}
                        className={`w-full py-1.5 px-3 text-left text-xs font-mono transition-colors flex justify-between items-center ${
                          isActive
                            ? 'bg-ncc-sky/15 text-ncc-sky font-bold'
                            : 'text-gray-400 hover:bg-ncc-gold/5 hover:text-ncc-gold'
                        }`}
                      >
                        <span>{h}</span>
                        <span className="text-[9px] text-ncc-olive/40 uppercase">{ampm}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Minute Column */}
              <div className="flex-1">
                <div className="text-center text-[9px] font-sans font-bold text-ncc-olive/40 uppercase tracking-widest py-1.5 border-b border-ncc-olive/10 bg-black/20">Min</div>
                <div className="overflow-y-auto h-[calc(100%-28px)]">
                  {MINUTES.map(m => {
                    const isActive = selMinute === m;
                    return (
                      <button
                        key={m}
                        type="button"
                        onClick={() => selectMinute(m)}
                        className={`w-full py-1.5 px-3 text-left text-xs font-mono transition-colors ${
                          isActive
                            ? 'bg-ncc-sky/15 text-ncc-sky font-bold'
                            : 'text-gray-400 hover:bg-ncc-gold/5 hover:text-ncc-gold'
                        }`}
                      >
                        :{m}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* Current Selection Footer */}
          {value && (
            <div className="flex items-center justify-between px-3 py-2 border-t border-ncc-olive/15 bg-black/20">
              <span className="text-[10px] font-sans text-ncc-olive/50 uppercase tracking-widest">Selected</span>
              <span className="text-sm font-mono font-bold text-ncc-gold">{displayValue}</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
