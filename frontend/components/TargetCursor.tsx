'use client';

import React, { useEffect, useState } from 'react';

export default function TargetCursor() {
    const [position, setPosition] = useState({ x: -100, y: -100 });
    const [isVisible, setIsVisible] = useState(false);
    const [isPointer, setIsPointer] = useState(false);
    const [isClicking, setIsClicking] = useState(false);

    useEffect(() => {
        // Only run on desktop/devices with a real pointer
        if (typeof window === 'undefined') return;
        const mediaQuery = window.matchMedia('(pointer: fine)');
        if (!mediaQuery.matches) return;

        setIsVisible(true);
        document.documentElement.classList.add('target-cursor-active');

        const handleMouseMove = (e: MouseEvent) => {
            setPosition({ x: e.clientX, y: e.clientY });

            // Check if hovering over a clickable element
            const target = e.target as HTMLElement;
            if (
                target && 
                (target.tagName === 'BUTTON' || 
                 target.tagName === 'A' || 
                 target.onclick || 
                 target.closest('button') || 
                 target.closest('a') ||
                 target.getAttribute('role') === 'button' ||
                 target.classList.contains('cursor-pointer'))
            ) {
                setIsPointer(true);
            } else {
                setIsPointer(false);
            }
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
            className="fixed top-0 left-0 pointer-events-none z-[9999] transition-transform duration-[60ms] ease-out -translate-x-1/2 -translate-y-1/2 hidden md:block"
            style={{
                left: `${position.x}px`,
                top: `${position.y}px`,
            }}
        >
            {/* Custom Crosshair HUD */}
            <div className={`relative flex items-center justify-center transition-all duration-200 ${
                isClicking ? 'scale-75 text-ncc-red' : isPointer ? 'scale-110 text-ncc-gold' : 'text-ncc-olive'
            }`}>
                {/* Center dot */}
                <div className={`w-1 h-1 rounded-full bg-current transition-all ${isPointer ? 'scale-150' : ''}`}></div>

                {/* Outer rotating ring */}
                <div className={`absolute w-7 h-7 border border-dashed border-current rounded-full transition-transform duration-1000 ${
                    isClicking ? 'animate-spin' : 'animate-[spin_20s_linear_infinite]'
                }`}></div>

                {/* Crosshair lines */}
                <div className="absolute w-9 h-[1px] bg-current opacity-60"></div>
                <div className="absolute h-9 w-[1px] bg-current opacity-60"></div>

                {/* Corner brackets */}
                {isPointer && (
                    <div className="absolute w-10 h-10 border border-current opacity-40 scale-110"></div>
                )}

                {/* HUD Coordinates Display */}
                <div className="absolute top-6 left-6 font-mono text-[7px] font-bold tracking-widest text-ncc-olive/80 bg-black/45 px-1 py-0.5 rounded border border-ncc-olive/20 pointer-events-none select-none flex flex-col gap-0.5 whitespace-nowrap">
                    <span>X: {position.x.toFixed(0)}</span>
                    <span>Y: {position.y.toFixed(0)}</span>
                </div>
            </div>
        </div>
    );
}
