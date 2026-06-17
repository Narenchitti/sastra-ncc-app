'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { getPublicEvents } from '@/app/actions';

export default function Home() {
    const [scrolled, setScrolled] = useState(false);
    const [events, setEvents] = useState<any[]>([]);
    const [loadingEvents, setLoadingEvents] = useState(true);

    // Fetch public events from database to verify actions remain operational
    useEffect(() => {
        async function fetchEvents() {
            try {
                const data = await getPublicEvents();
                if (Array.isArray(data)) {
                    setEvents(data);
                }
            } catch (err) {
                console.error("Failed to fetch public events:", err);
            } finally {
                setLoadingEvents(false);
            }
        }
        fetchEvents();
    }, []);

    // Scroll detection for header navbar styles
    useEffect(() => {
        const handleScroll = () => setScrolled(window.scrollY > 50);
        window.addEventListener('scroll', handleScroll);
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    return (
        <main className="min-h-screen bg-[#080b06] text-gray-300 font-mono relative overflow-x-hidden flex flex-col justify-between">
            {/* Background grid details */}
            <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(74,93,35,0.04)_1px,transparent_1px),linear-gradient(to_bottom,rgba(74,93,35,0.04)_1px,transparent_1px)] bg-[size:3rem_3rem] pointer-events-none z-0"></div>

            {/* ── HEADER NAVIGATION BAR ── */}
            <header
                className={`fixed top-0 w-full z-50 transition-all duration-300 ${
                    scrolled
                        ? 'bg-[#0e130a]/90 border-b border-ncc-olive/20 backdrop-blur-md py-3 shadow-lg'
                        : 'bg-transparent py-6'
                }`}
            >
                <div className="max-w-7xl mx-auto px-6 flex justify-between items-center">
                    {/* Branding */}
                    <Link href="/" className="flex items-center gap-3 group">
                        <img src="/assets/images/ncc-logo.png" alt="NCC" className="h-10 transition-transform group-hover:scale-105" />
                        <div className="flex flex-col">
                            <span className="font-sans font-extrabold text-lg text-white leading-none tracking-tight">
                                SASTRA <span className="text-ncc-red">NCC</span>
                            </span>
                            <span className="text-[9px] font-bold tracking-[0.2em] text-ncc-gold uppercase mt-0.5">
                                Army Wing
                            </span>
                        </div>
                    </Link>

                    {/* Action button to portal */}
                    <Link
                        href="/login"
                        className="px-5 py-2 border border-ncc-gold/45 bg-ncc-gold/10 text-ncc-gold rounded-lg text-xs font-bold uppercase tracking-wider hover:bg-ncc-gold hover:text-black transition-all duration-300 shadow-md shadow-ncc-gold/5"
                    >
                        Portal Login
                    </Link>
                </div>
            </header>

            {/* ── MAIN CONTENT SLATE ── */}
            <section className="flex-grow flex items-center justify-center pt-32 pb-16 px-6 relative z-10">
                <div className="relative border border-ncc-olive/30 bg-[#0c1008]/85 backdrop-blur-sm p-8 sm:p-12 md:p-16 rounded-2xl max-w-2xl w-full text-center shadow-2xl">
                    {/* Gold corner brackets */}
                    <div className="absolute top-0 left-0 w-4 h-4 border-t-2 border-l-2 border-ncc-gold rounded-tl-md"></div>
                    <div className="absolute top-0 right-0 w-4 h-4 border-t-2 border-r-2 border-ncc-gold rounded-tr-md"></div>
                    <div className="absolute bottom-0 left-0 w-4 h-4 border-b-2 border-l-2 border-ncc-gold rounded-bl-md"></div>
                    <div className="absolute bottom-0 right-0 w-4 h-4 border-b-2 border-r-2 border-ncc-gold rounded-br-md"></div>

                    {/* HUD active light indicator */}
                    <div className="inline-flex items-center gap-2 px-3 py-1 rounded bg-[#4A5D23]/25 border border-[#4A5D23]/40 text-ncc-gold text-[10px] font-bold tracking-widest uppercase mb-6">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping"></span>
                        <span>GRID INITIALIZATION SUCCESSFUL</span>
                    </div>

                    <h1 className="text-3xl sm:text-4xl font-extrabold text-white mb-4 tracking-tight uppercase">
                        Command Center Slate
                    </h1>
                    <p className="text-gray-400 text-xs sm:text-sm leading-relaxed mb-8 max-w-md mx-auto">
                        Landing page cleared and reset to clean slate. Ready to construct new visuals and layouts from scratch.
                    </p>

                    {/* Database connection verification display */}
                    <div className="border-t border-ncc-olive/20 pt-6 text-left">
                        <div className="text-[10px] text-gray-500 font-bold uppercase tracking-wider mb-2">
                            Database Integration Check:
                        </div>
                        <div className="bg-black/45 border border-ncc-olive/15 p-3 rounded-lg text-[10px] text-ncc-gold/80 flex items-center justify-between">
                            <span>Dynamic Event Feed API:</span>
                            {loadingEvents ? (
                                <span className="text-gray-500">PENDING...</span>
                            ) : events.length > 0 ? (
                                <span className="text-emerald-500 font-bold">ONLINE ({events.length} ACTIVE EVENTS)</span>
                            ) : (
                                <span className="text-amber-500 font-bold">CONNECTED (NO CURRENT EVENTS)</span>
                            )}
                        </div>
                    </div>
                </div>
            </section>

            {/* ── MINIMAL FOOTER ── */}
            <footer className="py-6 border-t border-ncc-olive/10 bg-[#060805] text-[10px] text-gray-500 uppercase tracking-widest text-center relative z-10 select-none">
                © {new Date().getFullYear()} SASTRA NCC Army Wing • Grid System Online
            </footer>
        </main>
    );
}
