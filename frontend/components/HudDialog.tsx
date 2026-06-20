'use client';

import React, { useEffect } from 'react';
import CornerBrackets from './CornerBrackets';

interface HudDialogProps {
  isOpen: boolean;
  type: 'info' | 'confirm';
  title: string;
  message: string;
  onConfirm: () => void;
  onCancel: () => void;
  confirmText?: string;
  cancelText?: string;
}

/** Plays a synthesizer sound for confirmation actions */
function playTone(type: 'confirm' | 'cancel' | 'warn' = 'confirm') {
  if (typeof window === 'undefined') return;
  const isMuted = localStorage.getItem('ncc_sound_muted') === 'true';
  if (isMuted) return;

  try {
    const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    const osc = ctx.createOscillator();
    const osc2 = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.connect(gain);
    osc2.connect(gain);
    gain.connect(ctx.destination);

    if (type === 'confirm') {
      osc.type = 'sine';
      osc.frequency.setValueAtTime(520, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(1040, ctx.currentTime + 0.15);
      gain.gain.setValueAtTime(0.02, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.18);
      osc.start(); osc.stop(ctx.currentTime + 0.18);
    } else if (type === 'warn') {
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(180, ctx.currentTime);
      gain.gain.setValueAtTime(0.03, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.35);
      osc.start(); osc.stop(ctx.currentTime + 0.35);
    } else {
      osc.type = 'sine';
      osc.frequency.setValueAtTime(330, ctx.currentTime);
      gain.gain.setValueAtTime(0.02, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.12);
      osc.start(); osc.stop(ctx.currentTime + 0.12);
    }
  } catch (_) {}
}

export default function HudDialog({
  isOpen,
  type,
  title,
  message,
  onConfirm,
  onCancel,
  confirmText = 'Acknowledge',
  cancelText = 'Cancel',
}: HudDialogProps) {
  // Listen for Escape key to close dialog
  useEffect(() => {
    if (!isOpen) return;

    // Play warning alarm sound on dialog open for confirmations
    if (type === 'confirm') {
      playTone('warn');
    } else {
      playTone('confirm');
    }

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        playTone('cancel');
        onCancel();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, type, onCancel]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/85 backdrop-blur-sm animate-fade-in">
      {/* Modal Dialog Card */}
      <div 
        className="w-full max-w-md bg-[#0a0e08]/95 border border-ncc-olive/45 shadow-[0_0_40px_rgba(74,93,35,0.4)] rounded-sm p-6 relative overflow-hidden animate-scale-in"
        role="dialog"
        aria-modal="true"
      >
        <CornerBrackets />

        {/* Scan line effect overlay */}
        <div className="absolute inset-0 bg-scanlines pointer-events-none opacity-20" />

        {/* Header Icon + Title */}
        <div className="flex items-center gap-3.5 mb-4 border-b border-ncc-olive/20 pb-3">
          <div className={`w-8 h-8 rounded-sm flex items-center justify-center border font-bold text-base ${
            type === 'confirm'
              ? 'bg-ncc-red/10 border-ncc-red/30 text-ncc-red animate-pulse'
              : 'bg-ncc-sky/10 border-ncc-sky/30 text-ncc-sky'
          }`}>
            <i className={type === 'confirm' ? 'fas fa-exclamation-triangle text-xs' : 'fas fa-info-circle text-xs'}></i>
          </div>
          <div>
            <h3 className={`font-heading font-bold text-sm tracking-widest uppercase ${
              type === 'confirm' ? 'text-ncc-red' : 'text-ncc-sky'
            }`}>
              {title}
            </h3>
            <span className="text-[9px] text-ncc-olive/50 font-mono tracking-widest uppercase mt-0.5 block">
              // SYS.UPLINK.COMMUNICATION
            </span>
          </div>
        </div>

        {/* Message body */}
        <div className="font-sans text-xs text-gray-300 leading-relaxed tracking-wide mb-6 bg-black/20 border border-ncc-olive/15 p-4 rounded-sm">
          {message}
        </div>

        {/* Footer Actions */}
        <div className="flex justify-end gap-2.5">
          {type === 'confirm' ? (
            <>
              <button
                type="button"
                onClick={() => {
                  playTone('cancel');
                  onCancel();
                }}
                className="px-4 py-2 border border-ncc-olive/35 hover:border-ncc-red/60 text-ncc-olive/70 hover:text-ncc-red font-sans font-bold text-xs uppercase tracking-widest rounded-sm transition-all duration-300 hover:bg-ncc-red/5 cursor-pointer"
              >
                {cancelText}
              </button>
              <button
                type="button"
                onClick={() => {
                  playTone('confirm');
                  onConfirm();
                }}
                className="px-5 py-2 bg-ncc-gold/15 border border-ncc-gold/50 hover:bg-ncc-gold/25 text-ncc-gold font-sans font-bold text-xs uppercase tracking-widest rounded-sm transition-all duration-300 shadow-[0_0_15px_rgba(212,175,55,0.1)] hover:shadow-[0_0_20px_rgba(212,175,55,0.25)] cursor-pointer"
              >
                {confirmText === 'Acknowledge' ? 'Proceed' : confirmText}
              </button>
            </>
          ) : (
            <button
              type="button"
              onClick={() => {
                playTone('confirm');
                onConfirm();
              }}
              className="w-full py-2 bg-ncc-sky/15 border border-ncc-sky/50 hover:bg-ncc-sky/25 text-ncc-sky font-sans font-bold text-xs uppercase tracking-widest rounded-sm transition-all duration-300 shadow-[0_0_15px_rgba(75,156,211,0.1)] text-center cursor-pointer"
            >
              {confirmText}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
