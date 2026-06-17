'use client';

import { useEffect, useRef, useState } from 'react';

interface AnimatedCounterProps {
    end: number;
    duration?: number;
    suffix?: string;
    prefix?: string;
    label: string;
    icon: string;
}

export default function AnimatedCounter({
    end,
    duration = 2000,
    suffix = '',
    prefix = '',
    label,
    icon,
}: AnimatedCounterProps) {
    const [count, setCount] = useState(0);
    const [started, setStarted] = useState(false);
    const ref = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const observer = new IntersectionObserver(
            ([entry]) => {
                if (entry.isIntersecting && !started) {
                    setStarted(true);
                }
            },
            { threshold: 0.5 }
        );

        if (ref.current) observer.observe(ref.current);
        return () => observer.disconnect();
    }, [started]);

    useEffect(() => {
        if (!started) return;

        let startTime: number | null = null;
        const step = (timestamp: number) => {
            if (!startTime) startTime = timestamp;
            const progress = Math.min((timestamp - startTime) / duration, 1);
            // Ease-out cubic
            const eased = 1 - Math.pow(1 - progress, 3);
            setCount(Math.floor(eased * end));
            if (progress < 1) {
                requestAnimationFrame(step);
            }
        };
        requestAnimationFrame(step);
    }, [started, end, duration]);

    return (
        <div ref={ref} className="text-center group p-6 relative bg-[#131b0f]/30 border border-ncc-olive/20 rounded-2xl backdrop-blur-sm shadow-inner overflow-hidden">
            {/* L-shaped corner indicators */}
            <div className="absolute top-0 left-0 w-2.5 h-2.5 border-t-2 border-l-2 border-ncc-gold/50" />
            <div className="absolute top-0 right-0 w-2.5 h-2.5 border-t-2 border-r-2 border-ncc-gold/50" />
            <div className="absolute bottom-0 left-0 w-2.5 h-2.5 border-b-2 border-l-2 border-ncc-gold/50" />
            <div className="absolute bottom-0 right-0 w-2.5 h-2.5 border-b-2 border-r-2 border-ncc-gold/50" />
            
            <span className="absolute top-2 right-2 text-[7px] text-ncc-gold/30 font-mono tracking-widest uppercase select-none">
                [Telemetry.Active]
            </span>

            <div className="w-14 h-14 mx-auto mb-4 rounded-xl bg-ncc-olive/10 border border-ncc-olive/30 flex items-center justify-center text-xl text-ncc-gold group-hover:scale-110 transition-transform shadow-[0_0_10px_rgba(74,93,35,0.15)]">
                <i className={icon}></i>
            </div>
            <div className="font-heading text-4xl md:text-5xl font-extrabold text-white mb-2 tracking-tight group-hover:text-ncc-gold transition-colors duration-300">
                {prefix}{count}{suffix}
            </div>
            <div className="text-gray-400 text-[10px] md:text-xs uppercase tracking-[0.2em] font-extrabold">
                {label}
            </div>
        </div>
    );
}
