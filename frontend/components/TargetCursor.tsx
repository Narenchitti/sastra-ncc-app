'use client';

import React, { useEffect, useRef } from 'react';

export default function TargetCursor() {
    const cursorRef = useRef<HTMLDivElement | null>(null);
    const coordsRef = useRef<{ x: number; y: number }>({ x: -200, y: -200 });
    const lastCoordsRef = useRef<{ x: number; y: number }>({ x: -200, y: -200 });
    const xSpanRef = useRef<HTMLSpanElement | null>(null);
    const ySpanRef = useRef<HTMLSpanElement | null>(null);

    useEffect(() => {
        if (typeof window === 'undefined') return;
        
        // Only activate cursor if the device has a mouse (pointer: fine)
        const mediaQuery = window.matchMedia('(pointer: fine)');
        if (!mediaQuery.matches) return;

        const cursor = cursorRef.current;
        if (!cursor) return;

        // Add active class to root element to hide default cursor
        document.documentElement.classList.add('target-cursor-active');
        cursor.style.display = 'block';

        let animationFrameId: number;
        let isPointer = false;
        let isClicking = false;

        // Perform animation frame based positioning (GPU accelerated)
        const updateCursorPosition = () => {
            const cx = coordsRef.current.x;
            const cy = coordsRef.current.y;
            
            if (cx !== lastCoordsRef.current.x || cy !== lastCoordsRef.current.y) {
                cursor.style.transform = `translate3d(${cx}px, ${cy}px, 0) translate(-50%, -50%)`;
                
                if (xSpanRef.current) {
                    xSpanRef.current.textContent = `X: ${cx.toFixed(0)}`;
                }
                if (ySpanRef.current) {
                    ySpanRef.current.textContent = `Y: ${cy.toFixed(0)}`;
                }
                
                lastCoordsRef.current.x = cx;
                lastCoordsRef.current.y = cy;
            }
            animationFrameId = requestAnimationFrame(updateCursorPosition);
        };

        const handleMouseMove = (e: MouseEvent) => {
            coordsRef.current.x = e.clientX;
            coordsRef.current.y = e.clientY;

            // Direct check of target elements to adjust cursor type (pointer vs regular)
            const target = e.target as HTMLElement;
            if (target) {
                const isClickable = !!(
                    target.tagName === 'BUTTON' ||
                    target.tagName === 'A' ||
                    target.onclick ||
                    target.closest('button') ||
                    target.closest('a') ||
                    target.getAttribute('role') === 'button' ||
                    target.classList.contains('cursor-pointer')
                );
                
                if (isClickable !== isPointer) {
                    isPointer = isClickable;
                    if (isPointer) {
                        cursor.classList.add('is-pointer');
                    } else {
                        cursor.classList.remove('is-pointer');
                    }
                }
            }
        };

        const handleMouseDown = () => {
            if (!isClicking) {
                isClicking = true;
                cursor.classList.add('is-clicking');
            }
        };

        const handleMouseUp = () => {
            if (isClicking) {
                isClicking = false;
                cursor.classList.remove('is-clicking');
            }
        };

        const handleMouseLeave = () => {
            cursor.style.opacity = '0';
        };

        const handleMouseEnter = () => {
            cursor.style.opacity = '1';
        };

        window.addEventListener('mousemove', handleMouseMove, { passive: true });
        window.addEventListener('mousedown', handleMouseDown, { passive: true });
        window.addEventListener('mouseup', handleMouseUp, { passive: true });
        document.body.addEventListener('mouseleave', handleMouseLeave, { passive: true });
        document.body.addEventListener('mouseenter', handleMouseEnter, { passive: true });

        animationFrameId = requestAnimationFrame(updateCursorPosition);

        return () => {
            document.documentElement.classList.remove('target-cursor-active');
            window.removeEventListener('mousemove', handleMouseMove);
            window.removeEventListener('mousedown', handleMouseDown);
            window.removeEventListener('mouseup', handleMouseUp);
            document.body.removeEventListener('mouseleave', handleMouseLeave);
            document.body.removeEventListener('mouseenter', handleMouseEnter);
            cancelAnimationFrame(animationFrameId);
        };
    }, []);

    return (
        <div
            ref={cursorRef}
            className="fixed top-0 left-0 pointer-events-none z-[9999] hidden md:block will-change-transform group"
            style={{
                transition: 'opacity 0.15s ease',
                display: 'none',
                opacity: 1,
            }}
        >
            <div className="relative flex items-center justify-center transition-all duration-150 group-[.is-clicking]:scale-75 group-[.is-pointer]:scale-125 scale-100">

                {/* ── Center Aiming Dot ── */}
                <div className="w-2 h-2 rounded-full transition-all duration-150 bg-ncc-olive shadow-[0_0_5px_rgba(74,93,35,0.8)] group-[.is-clicking]:bg-ncc-red group-[.is-clicking]:scale-150 group-[.is-clicking]:shadow-[0_0_8px_rgba(210,16,52,0.9)] group-[.is-pointer]:bg-ncc-gold group-[.is-pointer]:scale-125 group-[.is-pointer]:shadow-[0_0_8px_rgba(212,175,55,0.9)]" />

                {/* ── Outer Rotating Ring ── */}
                <div className="absolute rounded-full border-2 border-dashed transition-all duration-200 w-10 h-10 border-ncc-olive/90 shadow-[0_0_8px_rgba(74,93,35,0.35)] animate-[spin_20s_linear_infinite] group-[.is-clicking]:w-9 group-[.is-clicking]:h-9 group-[.is-clicking]:border-ncc-red group-[.is-clicking]:shadow-[0_0_12px_rgba(210,16,52,0.5)] group-[.is-clicking]:animate-spin group-[.is-pointer]:w-14 group-[.is-pointer]:h-14 group-[.is-pointer]:border-ncc-gold group-[.is-pointer]:shadow-[0_0_16px_rgba(212,175,55,0.45)] group-[.is-pointer]:animate-[spin_6s_linear_infinite]" />

                {/* ── Inner Static Ring ── */}
                <div className="absolute rounded-full border transition-all duration-200 w-6 h-6 border-ncc-olive/40 group-[.is-pointer]:w-7 group-[.is-pointer]:h-7 group-[.is-pointer]:border-ncc-gold/50" />

                {/* ── Crosshair Lines ── */}
                <div className="absolute h-[1.5px] transition-all duration-150 w-12 bg-ncc-olive/70 group-[.is-pointer]:w-16 group-[.is-pointer]:bg-ncc-gold/75 group-[.is-pointer]:shadow-[0_0_4px_rgba(212,175,55,0.5)]" />
                <div className="absolute w-[1.5px] transition-all duration-150 h-12 bg-ncc-olive/70 group-[.is-pointer]:h-16 group-[.is-pointer]:bg-ncc-gold/75 group-[.is-pointer]:shadow-[0_0_4px_rgba(212,175,55,0.5)]" />

                {/* ── Corner Brackets ── */}
                {/* Top-left */}
                <span className="absolute top-[-14px] left-[-14px] w-4 h-4 border-l-2 border-t-2 border-ncc-gold/80 transition-all duration-150 opacity-0 group-[.is-pointer]:opacity-100" />
                {/* Top-right */}
                <span className="absolute top-[-14px] right-[-14px] w-4 h-4 border-r-2 border-t-2 border-ncc-gold/80 transition-all duration-150 opacity-0 group-[.is-pointer]:opacity-100" />
                {/* Bottom-left */}
                <span className="absolute bottom-[-14px] left-[-14px] w-4 h-4 border-l-2 border-b-2 border-ncc-gold/80 transition-all duration-150 opacity-0 group-[.is-pointer]:opacity-100" />
                {/* Bottom-right */}
                <span className="absolute bottom-[-14px] right-[-14px] w-4 h-4 border-r-2 border-b-2 border-ncc-gold/80 transition-all duration-150 opacity-0 group-[.is-pointer]:opacity-100" />

                {/* ── HUD Coordinates ── */}
                <div className="absolute top-8 left-8 font-mono text-[7px] font-bold tracking-widest text-ncc-olive bg-black/60 px-1.5 py-1 rounded border border-ncc-olive/30 pointer-events-none select-none flex flex-col gap-0.5 whitespace-nowrap shadow-lg">
                    <span ref={xSpanRef}>X: 0</span>
                    <span ref={ySpanRef}>Y: 0</span>
                </div>
            </div>
        </div>
    );
}

