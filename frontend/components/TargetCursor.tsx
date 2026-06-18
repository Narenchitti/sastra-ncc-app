'use client';

import React, { useEffect, useState } from 'react';

export default function TargetCursor() {
    const [position, setPosition] = useState({ x: -200, y: -200 });
    const [isVisible, setIsVisible] = useState(false);
    const [isPointer, setIsPointer] = useState(false);
    const [isClicking, setIsClicking] = useState(false);

    useEffect(() => {
        if (typeof window === 'undefined') return;
        const mediaQuery = window.matchMedia('(pointer: fine)');
        if (!mediaQuery.matches) return;

        setIsVisible(true);
        document.documentElement.classList.add('target-cursor-active');

        const handleMouseMove = (e: MouseEvent) => {
            setPosition({ x: e.clientX, y: e.clientY });
            const target = e.target as HTMLElement;
            setIsPointer(!!(
                target.tagName === 'BUTTON' ||
                target.tagName === 'A' ||
                target.onclick ||
                target.closest('button') ||
                target.closest('a') ||
                target.getAttribute('role') === 'button' ||
                target.classList.contains('cursor-pointer')
            ));
        };

        const handleMouseDown = () => setIsClicking(true);
        const handleMouseUp = () => setIsClicking(false);
        const handleMouseLeave = () => setIsVisible(false);
        const handleMouseEnter = () => setIsVisible(true);

        window.addEventListener('mousemove', handleMouseMove);
        window.addEventListener('mousedown', handleMouseDown);
        window.addEventListener('mouseup', handleMouseUp);
        document.body.addEventListener('mouseleave', handleMouseLeave);
        document.body.addEventListener('mouseenter', handleMouseEnter);

        return () => {
            document.documentElement.classList.remove('target-cursor-active');
            window.removeEventListener('mousemove', handleMouseMove);
            window.removeEventListener('mousedown', handleMouseDown);
            window.removeEventListener('mouseup', handleMouseUp);
            document.body.removeEventListener('mouseleave', handleMouseLeave);
            document.body.removeEventListener('mouseenter', handleMouseEnter);
        };
    }, []);

    if (!isVisible) return null;

    return (
        <div
            className="fixed top-0 left-0 pointer-events-none z-[9999] -translate-x-1/2 -translate-y-1/2 hidden md:block"
            style={{
                left: `${position.x}px`,
                top: `${position.y}px`,
                transition: 'left 40ms linear, top 40ms linear',
            }}
        >
            <div className={`relative flex items-center justify-center transition-all duration-150 ${
                isClicking ? 'scale-75' : isPointer ? 'scale-125' : 'scale-100'
            }`}>

                {/* ── Center Aiming Dot ── */}
                <div className={`w-2 h-2 rounded-full transition-all duration-150 ${
                    isClicking ? 'bg-ncc-red scale-150 shadow-[0_0_8px_rgba(210,16,52,0.9)]' :
                    isPointer  ? 'bg-ncc-gold scale-125 shadow-[0_0_8px_rgba(212,175,55,0.9)]' :
                                 'bg-ncc-olive shadow-[0_0_5px_rgba(74,93,35,0.8)]'
                }`} />

                {/* ── Outer Rotating Ring (Gold, prominent) ── */}
                <div className={`absolute rounded-full border-2 border-dashed transition-all duration-200 ${
                    isClicking ? 'w-9 h-9 border-ncc-red shadow-[0_0_12px_rgba(210,16,52,0.5)] animate-spin' :
                    isPointer  ? 'w-14 h-14 border-ncc-gold shadow-[0_0_16px_rgba(212,175,55,0.45)] animate-[spin_6s_linear_infinite]' :
                                 'w-10 h-10 border-ncc-olive/90 shadow-[0_0_8px_rgba(74,93,35,0.35)] animate-[spin_20s_linear_infinite]'
                }`} />

                {/* ── Inner Static Ring ── */}
                <div className={`absolute rounded-full border transition-all duration-200 ${
                    isPointer ? 'w-7 h-7 border-ncc-gold/50' : 'w-6 h-6 border-ncc-olive/40'
                }`} />

                {/* ── Crosshair Lines (Longer & Brighter) ── */}
                <div className={`absolute h-[1.5px] transition-all duration-150 ${
                    isPointer ? 'w-16 bg-ncc-gold/75 shadow-[0_0_4px_rgba(212,175,55,0.5)]' : 'w-12 bg-ncc-olive/70'
                }`} />
                <div className={`absolute w-[1.5px] transition-all duration-150 ${
                    isPointer ? 'h-16 bg-ncc-gold/75 shadow-[0_0_4px_rgba(212,175,55,0.5)]' : 'h-12 bg-ncc-olive/70'
                }`} />

                {/* ── Corner Brackets (on hover/pointer) ── */}
                {isPointer && (
                    <>
                        {/* Top-left */}
                        <span className="absolute top-[-14px] left-[-14px] w-4 h-4 border-l-2 border-t-2 border-ncc-gold/80" />
                        {/* Top-right */}
                        <span className="absolute top-[-14px] right-[-14px] w-4 h-4 border-r-2 border-t-2 border-ncc-gold/80" />
                        {/* Bottom-left */}
                        <span className="absolute bottom-[-14px] left-[-14px] w-4 h-4 border-l-2 border-b-2 border-ncc-gold/80" />
                        {/* Bottom-right */}
                        <span className="absolute bottom-[-14px] right-[-14px] w-4 h-4 border-r-2 border-b-2 border-ncc-gold/80" />
                    </>
                )}

                {/* ── HUD Coordinates ── */}
                <div className="absolute top-8 left-8 font-mono text-[7px] font-bold tracking-widest text-ncc-olive bg-black/60 px-1.5 py-1 rounded border border-ncc-olive/30 pointer-events-none select-none flex flex-col gap-0.5 whitespace-nowrap shadow-lg">
                    <span>X: {position.x.toFixed(0)}</span>
                    <span>Y: {position.y.toFixed(0)}</span>
                </div>
            </div>
        </div>
    );
}
