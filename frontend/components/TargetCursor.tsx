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
            <div className="relative flex items-center justify-center transition-all duration-150 group-[.is-clicking]:scale-75 group-[.is-pointer]:scale-110 scale-100">

                {/* ── Center Aiming Dot ── */}
                <div className="w-1.5 h-1.5 rounded-full transition-all duration-150 bg-red-500 shadow-[0_0_5px_rgba(239,68,68,0.85)] group-[.is-clicking]:bg-ncc-red group-[.is-clicking]:scale-150 group-[.is-clicking]:shadow-[0_0_8px_rgba(210,16,52,0.95)] group-[.is-pointer]:bg-red-500 group-[.is-pointer]:scale-125 group-[.is-pointer]:shadow-[0_0_8px_rgba(239,68,68,0.95)]" />

                {/* ── Outer Rotating Ring ── */}
                <div className="absolute rounded-full border-2 border-dashed transition-all duration-200 w-7 h-7 border-red-500/80 shadow-[0_0_6px_rgba(239,68,68,0.35)] animate-[spin_25s_linear_infinite] group-[.is-clicking]:w-6 group-[.is-clicking]:h-6 group-[.is-clicking]:border-ncc-red group-[.is-clicking]:shadow-[0_0_10px_rgba(210,16,52,0.5)] group-[.is-clicking]:animate-spin group-[.is-pointer]:w-10 group-[.is-pointer]:h-10 group-[.is-pointer]:border-red-500 group-[.is-pointer]:shadow-[0_0_12px_rgba(239,68,68,0.65)] group-[.is-pointer]:animate-[spin_8s_linear_infinite]" />

                {/* ── Inner Static Ring ── */}
                <div className="absolute rounded-full border transition-all duration-200 w-[18px] h-[18px] border-red-500/35 group-[.is-pointer]:w-[22px] group-[.is-pointer]:h-[22px] group-[.is-pointer]:border-red-500/65" />

                {/* ── Crosshair Lines ── */}
                <div className="absolute h-[1px] transition-all duration-150 w-9 bg-red-500/50 group-[.is-pointer]:w-12 group-[.is-pointer]:bg-red-500/80 group-[.is-pointer]:shadow-[0_0_3px_rgba(239,68,68,0.4)]" />
                <div className="absolute w-[1px] transition-all duration-150 h-9 bg-red-500/50 group-[.is-pointer]:h-12 group-[.is-pointer]:bg-red-500/80 group-[.is-pointer]:shadow-[0_0_3px_rgba(239,68,68,0.4)]" />

                {/* ── Corner Brackets ── */}
                {/* Top-left */}
                <span className="absolute top-[-10px] left-[-10px] w-3 h-3 border-l-2 border-t-2 border-red-500/90 transition-all duration-150 opacity-0 group-[.is-pointer]:opacity-100" />
                {/* Top-right */}
                <span className="absolute top-[-10px] right-[-10px] w-3 h-3 border-r-2 border-t-2 border-red-500/90 transition-all duration-150 opacity-0 group-[.is-pointer]:opacity-100" />
                {/* Bottom-left */}
                <span className="absolute bottom-[-10px] left-[-10px] w-3 h-3 border-l-2 border-b-2 border-red-500/90 transition-all duration-150 opacity-0 group-[.is-pointer]:opacity-100" />
                {/* Bottom-right */}
                <span className="absolute bottom-[-10px] right-[-10px] w-3 h-3 border-r-2 border-b-2 border-red-500/90 transition-all duration-150 opacity-0 group-[.is-pointer]:opacity-100" />

                {/* ── HUD Coordinates ── */}
                <div className="absolute top-6 left-6 font-mono text-[7px] font-bold tracking-widest text-red-400 bg-black/75 px-1.5 py-0.5 rounded border border-red-500/35 pointer-events-none select-none flex flex-col gap-0.5 whitespace-nowrap shadow-lg">
                    <span ref={xSpanRef}>X: 0</span>
                    <span ref={ySpanRef}>Y: 0</span>
                </div>
            </div>
        </div>
    );
}

