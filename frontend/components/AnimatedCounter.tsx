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
        <div ref={ref} className="text-center group">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-white/10 flex items-center justify-center text-2xl text-ncc-gold group-hover:scale-110 transition-transform">
                <i className={icon}></i>
            </div>
            <div className="font-heading text-4xl md:text-5xl font-bold text-white mb-2">
                {prefix}{count}{suffix}
            </div>
            <div className="text-ncc-sky text-sm uppercase tracking-[0.2em] font-bold">
                {label}
            </div>
        </div>
    );
}
