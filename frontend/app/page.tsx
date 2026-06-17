'use client';

import { useEffect, useState, useRef } from 'react';
import Link from 'next/link';
import TacticalBattleMap from '@/components/TacticalBattleMap';
import TargetCursor from '@/components/TargetCursor';

export default function Home() {
    const [scrolled, setScrolled] = useState(false);
    const [soundMuted, setSoundMuted] = useState(true);
    const [activeSector, setActiveSector] = useState<'alpha' | 'bravo' | 'charlie' | 'delta' | 'epsilon' | 'zeta'>('alpha');
    const [lightboxImage, setLightboxImage] = useState<string | null>(null);

    // Recruitment Configuration
    const [recruitmentOpen, setRecruitmentOpen] = useState(false);

    // Terminal/Enlistment Form States
    const [name, setName] = useState('');
    const [regNo, setRegNo] = useState('');
    const [email, setEmail] = useState('');
    const [dept, setDept] = useState('');
    const [reason, setReason] = useState('');
    const [terminalLogs, setTerminalLogs] = useState<string[]>([]);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [submitSuccess, setSubmitSuccess] = useState(false);
    const [headerVisible, setHeaderVisible] = useState(true);
    const lastScrollY = useRef(0);

    const logsEndRef = useRef<HTMLDivElement | null>(null);

    // Initial check for sound preference
    useEffect(() => {
        if (typeof window !== 'undefined') {
            const mutedSetting = localStorage.getItem('ncc_sound_muted');
            if (mutedSetting === null) {
                localStorage.setItem('ncc_sound_muted', 'true');
                setSoundMuted(true);
            } else {
                setSoundMuted(mutedSetting === 'true');
            }
        }
    }, []);

    // Toggle sound helper
    const toggleSound = () => {
        const nextState = !soundMuted;
        setSoundMuted(nextState);
        localStorage.setItem('ncc_sound_muted', nextState ? 'true' : 'false');
        
        if (!nextState) {
            try {
                const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
                const osc = audioCtx.createOscillator();
                const gain = audioCtx.createGain();
                osc.connect(gain);
                gain.connect(audioCtx.destination);
                osc.type = 'sine';
                osc.frequency.setValueAtTime(880, audioCtx.currentTime);
                gain.gain.setValueAtTime(0.03, audioCtx.currentTime);
                gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.15);
                osc.start();
                osc.stop(audioCtx.currentTime + 0.15);
            } catch (e) {}
        }
    };

    // Scroll listener for smart show/hide header navigation
    useEffect(() => {
        if (typeof window === 'undefined') return;

        const handleScroll = () => {
            const currentScrollY = window.scrollY;

            // Apply glassmorphism styling if scrolled past 40px
            setScrolled(currentScrollY > 40);

            // Hide/show logic based on scroll direction
            if (currentScrollY < 80) {
                setHeaderVisible(true);
            } else if (currentScrollY > lastScrollY.current) {
                setHeaderVisible(false); // Scrolling down -> Hide header
            } else if (currentScrollY < lastScrollY.current) {
                setHeaderVisible(true); // Scrolling up -> Show header
            }

            lastScrollY.current = currentScrollY;
        };

        window.addEventListener('scroll', handleScroll, { passive: true });
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    // Terminal console feedback sequences
    const addLog = (msg: string) => {
        setTerminalLogs(prev => [...prev, `[${new Date().toLocaleTimeString()}] ${msg}`]);
    };

    useEffect(() => {
        setTerminalLogs([
            `[${new Date().toLocaleTimeString()}] SYS: INITIALIZING SASTRA_NCC_SECURE_LINK...`,
            `[${new Date().toLocaleTimeString()}] SYS: CONTINGENT: 06/34 (TN) INDEP COY, NCC (ARMY)`,
            `[${new Date().toLocaleTimeString()}] SYS: TERMINAL READY. CURRENT STATE: ${recruitmentOpen ? 'RECRUITMENT_ACTIVE' : 'RECRUITMENT_CLOSED'}`
        ]);
    }, [recruitmentOpen]);

    // Scroll to bottom of terminal logs
    useEffect(() => {
        logsEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [terminalLogs]);

    const handleTerminalSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        
        if (recruitmentOpen) {
            if (!name || !regNo || !email || !dept) {
                addLog("ALERT: INCOMPLETE TRANSMISSION DATA PACKET. REJECTED.");
                return;
            }

            setIsSubmitting(true);
            addLog(`SYS: PROCESSING ENLISTMENT APPLICATION FOR CADET ${name.toUpperCase()}...`);
            setTimeout(() => {
                addLog("SYS: ROUTING CADET PACKET TO 34 (TN) COY BATTALION COMMAND...");
                setTimeout(() => {
                    addLog("SYS: ENLISTMENT TRANSMISSION COMPLETED. GATEWAY STATUS: OK.");
                    setIsSubmitting(false);
                    setSubmitSuccess(true);
                    setName('');
                    setRegNo('');
                    setEmail('');
                    setDept('');
                    setReason('');
                }, 1000);
            }, 1000);
        } else {
            if (!name || !email) {
                addLog("ALERT: INCOMPLETE TRANSMISSION. NAME & EMAIL REQUIRED.");
                return;
            }

            setIsSubmitting(true);
            addLog(`SYS: PROCESSING RECRUITMENT ALERT REQUEST FOR ${name.toUpperCase()}...`);
            setTimeout(() => {
                addLog(`SYS: REGISTERING ${email.toUpperCase()} FOR NOTIFICATIONS...`);
                setTimeout(() => {
                    addLog("SYS: INQUIRY PACKET STORED. ALERTS REGISTERED. STATUS: OK.");
                    setIsSubmitting(false);
                    setSubmitSuccess(true);
                    setName('');
                    setEmail('');
                    setReason('');
                }, 1000);
            }, 1000);
        }
    };

    return (
        <main className="min-h-screen bg-[#080b06] text-gray-300 font-mono relative overflow-x-hidden selection:bg-ncc-gold selection:text-black">
            {/* Custom target crosshair reticle cursor */}
            <TargetCursor />

            {/* Tactical Grid Background & animated topographic Canvas */}
            <div className="fixed inset-0 z-0 pointer-events-none opacity-85 md:opacity-95">
                <div className="absolute inset-0 bg-[#080b06] z-[-2]"></div>
                <TacticalBattleMap />
                {/* Visual grid overlay details */}
                <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(74,93,35,0.025)_1px,transparent_1px),linear-gradient(to_bottom,rgba(74,93,35,0.025)_1px,transparent_1px)] bg-[size:4rem_4rem]"></div>
            </div>

            {/* Animated full screen scanner overlay */}
            <div className="hud-scanner z-30"></div>

            {/* ── HEADER NAVIGATION BAR (COMM-LINK STATUS BAR) ── */}
            <header className={`fixed top-0 w-full z-50 transition-all duration-300 ease-in-out border-b ${
                headerVisible ? 'translate-y-0' : '-translate-y-full'
            } ${
                scrolled 
                    ? 'bg-[#0b0e07]/90 border-ncc-olive/35 backdrop-blur-md py-3.5 shadow-xl shadow-black/35'
                    : 'bg-transparent border-ncc-olive/0 py-6'
            }`}>
                <div className="max-w-7xl mx-auto px-6 flex justify-between items-center">
                    {/* Brand Identifier */}
                    <Link href="/" className="flex items-center gap-3 group">
                        <img src="/assets/images/ncc_logo.png" alt="NCC Logo" className="h-10 transition-transform group-hover:scale-105 group-hover:rotate-3 duration-300" />
                        <div className="flex flex-col">
                            <span className="font-sans font-extrabold text-sm sm:text-base text-white leading-none tracking-wider uppercase">
                                SASTRA <span className="text-ncc-red">NCC</span>
                            </span>
                            <span className="text-[8.5px] font-bold tracking-[0.25em] text-ncc-gold uppercase mt-1">
                                06/34 (TN) INDEP COY
                            </span>
                        </div>
                    </Link>

                    {/* Nav Links (Desktop) */}
                    <nav className="hidden lg:flex items-center gap-7 text-[11px] font-bold tracking-widest text-ncc-olive/80">
                        <a href="#sector-brief" className="hover:text-ncc-gold transition-colors duration-200 uppercase flex items-center gap-1.5">
                            <span className="text-[8px] text-ncc-gold/60">01.</span> PROFILE
                        </a>
                        <a href="#sector-training" className="hover:text-ncc-gold transition-colors duration-200 uppercase flex items-center gap-1.5">
                            <span className="text-[8px] text-ncc-gold/60">02.</span> TRAINING
                        </a>
                        <a href="#sector-benefits" className="hover:text-ncc-gold transition-colors duration-200 uppercase flex items-center gap-1.5">
                            <span className="text-[8px] text-ncc-gold/60">03.</span> BENEFITS
                        </a>
                        <a href="#sector-roll" className="hover:text-ncc-gold transition-colors duration-200 uppercase flex items-center gap-1.5">
                            <span className="text-[8px] text-ncc-gold/60">04.</span> CADRE
                        </a>
                        <a href="#sector-recon" className="hover:text-ncc-gold transition-colors duration-200 uppercase flex items-center gap-1.5">
                            <span className="text-[8px] text-ncc-gold/60">05.</span> GALLERY
                        </a>
                        <a href="#sector-terminal" className="hover:text-ncc-gold transition-colors duration-200 uppercase flex items-center gap-1.5">
                            <span className="text-[8px] text-ncc-gold/60">06.</span> ENLIST
                        </a>
                    </nav>

                    {/* Right side: Audio control & Portal access */}
                    <div className="flex items-center gap-4">
                        {/* Audio status controller */}
                        <button 
                            onClick={toggleSound}
                            className={`flex items-center justify-center w-8 h-8 rounded border transition-all duration-300 ${
                                soundMuted 
                                    ? 'border-ncc-red/30 bg-ncc-red/5 text-ncc-red hover:bg-ncc-red/10'
                                    : 'border-ncc-gold/30 bg-ncc-gold/5 text-ncc-gold hover:bg-ncc-gold/10'
                            }`}
                            title={soundMuted ? "Unmute Tactical Sound Effects" : "Mute Sound Effects"}
                        >
                            <i className={`fa-solid ${soundMuted ? 'fa-volume-xmark' : 'fa-volume-high'}`}></i>
                        </button>

                        <Link 
                            href="/login" 
                            className="px-4 py-2 border border-ncc-gold/45 bg-ncc-gold/10 text-ncc-gold rounded text-[10px] font-bold uppercase tracking-widest hover:bg-ncc-gold hover:text-black transition-all duration-300 shadow-md shadow-ncc-gold/5 whitespace-nowrap"
                        >
                            Portal Login
                        </Link>
                    </div>
                </div>
            </header>

            {/* ── SECTOR 01: HERO SECTION (TACTICAL ENTRY) ── */}
            <section className="min-h-screen flex items-center pt-28 pb-16 px-6 relative z-10">
                <div className="max-w-7xl mx-auto w-full grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
                    
                    {/* Left side HUD statistics */}
                    <div className="col-span-1 lg:col-span-3 order-2 lg:order-1 flex flex-row lg:flex-col gap-4 overflow-x-auto lg:overflow-visible pb-4 lg:pb-0">
                        <div className="border border-ncc-olive/25 bg-[#0e130a]/50 backdrop-blur-md p-4 rounded-lg flex-1 min-w-[200px] relative">
                            <div className="absolute top-0 left-0 w-2 h-2 border-t border-l border-ncc-gold"></div>
                            <div className="text-[8.5px] text-ncc-olive font-bold uppercase tracking-wider mb-1">Telemetry Status</div>
                            <div className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping"></span>
                                COMM-LINK ONLINE
                            </div>
                            <div className="text-[8.5px] text-gray-500 mt-2 font-mono flex flex-col gap-0.5">
                                <span>INDEP COY: ACTIVE</span>
                                <span>SYS LINK: SASTRA_NET</span>
                            </div>
                        </div>

                        <div className="border border-ncc-olive/25 bg-[#0e130a]/50 backdrop-blur-md p-4 rounded-lg flex-1 min-w-[200px] relative">
                            <div className="absolute top-0 left-0 w-2 h-2 border-t border-l border-ncc-gold"></div>
                            <div className="text-[8.5px] text-ncc-olive font-bold uppercase tracking-wider mb-1">Coordinates Grid</div>
                            <div className="text-[11px] font-bold text-ncc-gold font-mono uppercase tracking-wider">
                                LAT 10.7725° N <br /> LNG 79.0161° E
                            </div>
                            <div className="text-[8px] text-gray-500 mt-1 uppercase font-mono">SASTRA CAMPUS, THANJAVUR</div>
                        </div>

                        <div className="border border-ncc-olive/25 bg-[#0e130a]/50 backdrop-blur-md p-4 rounded-lg flex-1 min-w-[200px] relative">
                            <div className="absolute top-0 left-0 w-2 h-2 border-t border-l border-ncc-gold"></div>
                            <div className="text-[8.5px] text-ncc-olive font-bold uppercase tracking-wider mb-1">Platoon Strength</div>
                            <div className="text-xl font-black text-white tracking-widest font-heading">
                                110 <span className="text-xs text-ncc-gold font-mono font-bold">/ 110 CADETS</span>
                            </div>
                            <div className="w-full bg-ncc-olive/20 h-1.5 rounded mt-2 overflow-hidden">
                                <div className="bg-ncc-gold h-full rounded w-full"></div>
                            </div>
                        </div>
                    </div>

                    {/* Central Brand Slate */}
                    <div className="col-span-1 lg:col-span-6 order-1 lg:order-2 text-center py-8 relative">
                        {/* Frame borders */}
                        <div className="absolute top-0 left-0 w-6 h-6 border-t-2 border-l-2 border-ncc-gold rounded-tl-lg"></div>
                        <div className="absolute top-0 right-0 w-6 h-6 border-t-2 border-r-2 border-ncc-gold rounded-tr-lg"></div>
                        <div className="absolute bottom-0 left-0 w-6 h-6 border-b-2 border-l-2 border-ncc-gold rounded-bl-lg"></div>
                        <div className="absolute bottom-0 right-0 w-6 h-6 border-b-2 border-r-2 border-ncc-gold rounded-br-lg"></div>

                        <div className="p-6 md:p-10 bg-[#0c1008]/45 border border-ncc-olive/20 backdrop-blur-md rounded-xl">
                            {/* Grid alignment tag */}
                            <div className="inline-flex items-center gap-2 px-3 py-1 rounded bg-ncc-olive/20 border border-ncc-olive/35 text-ncc-gold text-[9px] font-bold tracking-[0.2em] uppercase mb-6">
                                <i className="fa-solid fa-satellite animate-pulse"></i> 06/34 (TN) INDEP COY NCC (ARMY)
                            </div>

                            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black font-heading text-white tracking-tight uppercase leading-none mb-4">
                                SASTRA <span className="text-ncc-red">NCC</span> <br />
                                <span className="text-ncc-gold">ARMY PLATOON</span>
                            </h1>

                            <p className="text-gray-400 text-xs sm:text-sm leading-relaxed mb-8 max-w-lg mx-auto font-sans">
                                Welcome to the official portal of the senior division boys contingent at SASTRA Deemed University. Grooming university youth into disciplined leaders, responsible citizens, and potential military officers.
                            </p>

                            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
                                <a 
                                    href="#sector-terminal" 
                                    className="w-full sm:w-auto px-7 py-3.5 border border-ncc-gold bg-ncc-gold text-black rounded text-[11px] font-bold tracking-widest uppercase hover:bg-transparent hover:text-ncc-gold transition-all duration-300 shadow-lg shadow-ncc-gold/15"
                                >
                                    Join Contingent
                                </a>
                                <a 
                                    href="#sector-brief" 
                                    className="w-full sm:w-auto px-7 py-3.5 border border-ncc-olive/40 bg-ncc-olive/5 text-ncc-olive hover:text-white hover:border-white rounded text-[11px] font-bold tracking-widest uppercase transition-all duration-300"
                                >
                                    Explore Sectors
                                </a>
                            </div>
                        </div>
                    </div>

                    {/* Right side HUD status and system feeds */}
                    <div className="col-span-1 lg:col-span-3 order-3 flex flex-row lg:flex-col gap-4 overflow-x-auto lg:overflow-visible pb-4 lg:pb-0">
                        <div className="border border-ncc-olive/25 bg-[#0e130a]/50 backdrop-blur-md p-4 rounded-lg flex-1 min-w-[200px] relative">
                            <div className="absolute top-0 right-0 w-2 h-2 border-t border-r border-ncc-gold"></div>
                            <div className="text-[8.5px] text-ncc-olive font-bold uppercase tracking-wider mb-1">BATTALION ID</div>
                            <div className="text-[12px] font-bold text-white uppercase tracking-wider">34 (TN) NCC (ARMY)</div>
                            <div className="text-[8px] text-ncc-khaki mt-1 font-mono uppercase">TRICHY GROUP // TN, P & AN DIR</div>
                        </div>

                        <div className="border border-ncc-olive/25 bg-[#0e130a]/50 backdrop-blur-md p-4 rounded-lg flex-1 min-w-[200px] relative">
                            <div className="absolute top-0 right-0 w-2 h-2 border-t border-r border-ncc-gold"></div>
                            <div className="text-[8.5px] text-ncc-olive font-bold uppercase tracking-wider mb-1">Motto of NCC</div>
                            <div className="text-[12px] font-black text-ncc-red uppercase tracking-widest font-heading">
                                UNITY & DISCIPLINE
                            </div>
                            <div className="text-[8px] text-gray-500 mt-1 uppercase font-mono">Ekta aur Anushasan</div>
                        </div>

                        <div className="border border-ncc-olive/25 bg-[#0e130a]/50 backdrop-blur-md p-4 rounded-lg flex-1 min-w-[200px] relative">
                            <div className="absolute top-0 right-0 w-2 h-2 border-t border-r border-ncc-gold"></div>
                            <div className="text-[8.5px] text-ncc-olive font-bold uppercase tracking-wider mb-1">UNIT COMMANDER</div>
                            <div className="text-[11px] font-bold text-white uppercase tracking-wider">COL. KAPIL TULI</div>
                            <div className="text-[8px] text-ncc-gold font-bold uppercase tracking-wider">COMMANDING OFFICER</div>
                        </div>
                    </div>

                </div>
            </section>

            {/* ── SECTOR 02: COMPANY BRIEF (ABOUT & HISTORY) ── */}
            <section id="sector-brief" className="py-24 px-6 relative z-10 border-t border-ncc-olive/15 bg-transparent">
                <div className="max-w-4xl mx-auto">
                    
                    {/* Header */}
                    <div className="text-center mb-12">
                        <div className="text-[10px] text-ncc-gold font-bold tracking-[0.25em] uppercase mb-1">SECTOR // 01</div>
                        <h2 className="text-2xl sm:text-3xl font-black font-heading text-white tracking-wider uppercase">Contingent Profile & Mission</h2>
                        <div className="w-12 h-1 bg-ncc-gold mx-auto mt-3 rounded"></div>
                    </div>

                    {/* About Content Slate */}
                    <div className="relative border border-ncc-olive/30 bg-[#0c1008]/50 backdrop-blur-lg p-8 sm:p-10 rounded-2xl shadow-xl">
                        {/* Brackets */}
                        <div className="absolute top-0 left-0 w-4 h-4 border-t-2 border-l-2 border-ncc-gold rounded-tl-md"></div>
                        <div className="absolute top-0 right-0 w-4 h-4 border-t-2 border-r-2 border-ncc-gold rounded-tr-md"></div>
                        <div className="absolute bottom-0 left-0 w-4 h-4 border-b-2 border-l-2 border-ncc-gold rounded-bl-md"></div>
                        <div className="absolute bottom-0 right-0 w-4 h-4 border-b-2 border-r-2 border-ncc-gold rounded-br-md"></div>

                        <div className="grid grid-cols-1 md:grid-cols-12 gap-8 items-center">
                            
                            <div className="md:col-span-8 flex flex-col gap-4 font-sans text-sm text-gray-300 leading-relaxed">
                                <p>
                                    The **National Cadet Corps (NCC)** Boys Wing at **SASTRA Deemed University** is a highly disciplined senior division platoon. Formally designated as the **06/34 (TN) INDEP COY, NCC (ARMY), THANJAVUR**, our contingent is part of the **34 (TN), NCC (ARMY), THANJAVUR Unit**, which is under the **TRICHY Group** within the **TN, P & AN (Tamil Nadu, Puducherry, and Andaman & Nicobar) Directorate** of the 17 directorates of NCC in India. We train volunteer youth to become potential leaders and responsible citizens.
                                </p>
                                <p>
                                    Our ANO (Associate NCC Officer), **Lt. Dr. G Jegadeesan**, commands and coordinates all contingent actions inside the campus. The NCC Command Office is situated on the **First Floor, Gnanavihar Block (opposite Gurunath Stores)**.
                                </p>
                                <div className="border-l-2 border-ncc-gold pl-4 text-xs text-ncc-khaki/90 bg-ncc-gold/5 py-3.5 rounded-r font-mono flex flex-col gap-2">
                                    <div className="font-bold text-white uppercase tracking-wider text-[9px]">// OFFICIAL AIMS OF NCC:</div>
                                    <ul className="list-disc pl-4 space-y-1 text-gray-300">
                                        <li>To develop character, comradeship, discipline, a secular outlook, the spirit of adventure, and the ideals of selfless service among young citizens.</li>
                                        <li>To create a pool of organized, trained, and motivated youth with leadership qualities in all walks of life, who will serve the nation regardless of the career they choose.</li>
                                        <li>To provide an environment that motivates youth to pursue careers in the Armed Forces.</li>
                                    </ul>
                                </div>
                            </div>

                            <div className="md:col-span-4 flex flex-col justify-center items-center bg-[#070b04]/70 border border-ncc-olive/20 p-6 rounded-xl relative shadow-inner">
                                <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 bg-[#0c1008] border border-ncc-olive/20 rounded-full text-[8.5px] font-bold text-ncc-gold uppercase tracking-widest whitespace-nowrap">COMMAND CRESTS</div>
                                <div className="flex gap-4 items-center justify-center mb-2">
                                    <img src="/assets/images/sastra_logo.png" alt="SASTRA Crest" className="h-20 object-contain opacity-85 hover:opacity-100 transition-opacity duration-300" />
                                    <img src="/assets/images/40_years_logo.png" alt="SASTRA 40 Years" className="h-20 object-contain opacity-85 hover:opacity-100 transition-opacity duration-300" />
                                </div>
                                <span className="text-[10px] font-bold text-white uppercase tracking-wider text-center mt-2 font-heading">SASTRA Deemed University</span>
                                <span className="text-[8px] text-ncc-olive font-bold mt-1 font-mono uppercase tracking-wider">40 YEARS OF EXCELLENCE</span>
                            </div>

                        </div>
                    </div>

                </div>
            </section>

            {/* ── SECTOR 03: TRAINING FIELDS (INTERACTIVE DETAILS) ── */}
            <section id="sector-training" className="py-24 px-6 relative z-10 border-t border-ncc-olive/15 bg-transparent">
                <div className="max-w-6xl mx-auto">
                    
                    {/* Header */}
                    <div className="text-center mb-12">
                        <div className="text-[10px] text-ncc-gold font-bold tracking-[0.25em] uppercase mb-1">SECTOR // 02</div>
                        <h2 className="text-2xl sm:text-3xl font-black font-heading text-white tracking-wider uppercase">Training Curriculum</h2>
                        <div className="w-12 h-1 bg-ncc-gold mx-auto mt-3 rounded"></div>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-stretch">
                        
                        {/* Selector Tabs (HUD Panel style) */}
                        <div className="lg:col-span-4 flex flex-col gap-3">
                            <button 
                                onClick={() => setActiveSector('alpha')}
                                className={`w-full p-4 border rounded-xl text-left transition-all duration-300 relative ${
                                    activeSector === 'alpha' 
                                        ? 'border-ncc-gold bg-ncc-gold/10 text-white shadow-md shadow-ncc-gold/5' 
                                        : 'border-ncc-olive/20 bg-[#0c1008]/50 backdrop-blur-sm hover:border-ncc-olive/50 text-gray-400'
                                }`}
                            >
                                <div className="absolute top-3 right-4 font-mono text-[9px] font-bold text-ncc-gold">COORD-A</div>
                                <div className="text-[10px] text-ncc-gold/75 font-bold tracking-widest uppercase mb-1">Sector Alpha</div>
                                <div className="text-sm font-black font-heading tracking-wide uppercase">Drill & Ceremony</div>
                            </button>

                            <button 
                                onClick={() => setActiveSector('bravo')}
                                className={`w-full p-4 border rounded-xl text-left transition-all duration-300 relative ${
                                    activeSector === 'bravo' 
                                        ? 'border-ncc-gold bg-ncc-gold/10 text-white shadow-md shadow-ncc-gold/5' 
                                        : 'border-ncc-olive/20 bg-[#0c1008]/50 backdrop-blur-sm hover:border-ncc-olive/50 text-gray-400'
                                }`}
                            >
                                <div className="absolute top-3 right-4 font-mono text-[9px] font-bold text-ncc-gold">COORD-B</div>
                                <div className="text-[10px] text-ncc-gold/75 font-bold tracking-widest uppercase mb-1">Sector Bravo</div>
                                <div className="text-sm font-black font-heading tracking-wide uppercase">Physical Training</div>
                            </button>

                            <button 
                                onClick={() => setActiveSector('charlie')}
                                className={`w-full p-4 border rounded-xl text-left transition-all duration-300 relative ${
                                    activeSector === 'charlie' 
                                        ? 'border-ncc-gold bg-ncc-gold/10 text-white shadow-md shadow-ncc-gold/5' 
                                        : 'border-ncc-olive/20 bg-[#0c1008]/50 backdrop-blur-sm hover:border-ncc-olive/50 text-gray-400'
                                }`}
                            >
                                <div className="absolute top-3 right-4 font-mono text-[9px] font-bold text-ncc-gold">COORD-C</div>
                                <div className="text-[10px] text-ncc-gold/75 font-bold tracking-widest uppercase mb-1">Sector Charlie</div>
                                <div className="text-sm font-black font-heading tracking-wide uppercase">Weaponry & Firing</div>
                            </button>

                            <button 
                                onClick={() => setActiveSector('delta')}
                                className={`w-full p-4 border rounded-xl text-left transition-all duration-300 relative ${
                                    activeSector === 'delta' 
                                        ? 'border-ncc-gold bg-ncc-gold/10 text-white shadow-md shadow-ncc-gold/5' 
                                        : 'border-ncc-olive/20 bg-[#0c1008]/50 backdrop-blur-sm hover:border-ncc-olive/50 text-gray-400'
                                }`}
                            >
                                <div className="absolute top-3 right-4 font-mono text-[9px] font-bold text-ncc-gold">COORD-D</div>
                                <div className="text-[10px] text-ncc-gold/75 font-bold tracking-widest uppercase mb-1">Sector Delta</div>
                                <div className="text-sm font-black font-heading tracking-wide uppercase">Tactical Camps</div>
                            </button>

                            <button 
                                onClick={() => setActiveSector('epsilon')}
                                className={`w-full p-4 border rounded-xl text-left transition-all duration-300 relative ${
                                    activeSector === 'epsilon' 
                                        ? 'border-ncc-gold bg-ncc-gold/10 text-white shadow-md shadow-ncc-gold/5' 
                                        : 'border-ncc-olive/20 bg-[#0c1008]/50 backdrop-blur-sm hover:border-ncc-olive/50 text-gray-400'
                                }`}
                            >
                                <div className="absolute top-3 right-4 font-mono text-[9px] font-bold text-ncc-gold">COORD-E</div>
                                <div className="text-[10px] text-ncc-gold/75 font-bold tracking-widest uppercase mb-1">Sector Epsilon</div>
                                <div className="text-sm font-black font-heading tracking-wide uppercase">Technical Subjects</div>
                            </button>

                            <button 
                                onClick={() => setActiveSector('zeta')}
                                className={`w-full p-4 border rounded-xl text-left transition-all duration-300 relative ${
                                    activeSector === 'zeta' 
                                        ? 'border-ncc-gold bg-ncc-gold/10 text-white shadow-md shadow-ncc-gold/5' 
                                        : 'border-ncc-olive/20 bg-[#0c1008]/50 backdrop-blur-sm hover:border-ncc-olive/50 text-gray-400'
                                }`}
                            >
                                <div className="absolute top-3 right-4 font-mono text-[9px] font-bold text-ncc-gold">COORD-Z</div>
                                <div className="text-[10px] text-ncc-gold/75 font-bold tracking-widest uppercase mb-1">Sector Zeta</div>
                                <div className="text-sm font-black font-heading tracking-wide uppercase">Social Activities</div>
                            </button>
                        </div>

                        {/* Interactive Viewer Screen (Holographic HUD Panel) */}
                        <div className="lg:col-span-8 border border-ncc-olive/30 bg-[#0c1008]/40 backdrop-blur-lg rounded-2xl p-6 relative flex flex-col justify-between shadow-2xl">
                            {/* Tech Details Corner Brackets */}
                            <div className="absolute top-0 left-0 w-3 h-3 border-t border-l border-ncc-gold"></div>
                            <div className="absolute top-0 right-0 w-3 h-3 border-t border-r border-ncc-gold"></div>
                            <div className="absolute bottom-0 left-0 w-3 h-3 border-b border-l border-ncc-gold"></div>
                            <div className="absolute bottom-0 right-0 w-3 h-3 border-b border-r border-ncc-gold"></div>

                            {/* Viewport Status Header */}
                            <div className="flex justify-between items-center border-b border-ncc-olive/15 pb-4 mb-4">
                                <div className="flex items-center gap-2">
                                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                                    <span className="text-[9.5px] font-bold tracking-widest uppercase text-ncc-gold font-mono">FEED_SOURCE: SECTOR_{activeSector.toUpperCase()}</span>
                                </div>
                                <span className="text-[8.5px] text-ncc-olive font-bold font-mono">AUTO_TRACK: ACTIVE</span>
                            </div>

                            {/* Dynamic Content Panels based on Active Sector */}
                            <div className="flex-grow">
                                {activeSector === 'alpha' && (
                                    <div className="flex flex-col gap-4 animate-fade-in font-sans">
                                        <h3 className="text-xl font-bold font-heading text-white tracking-wide uppercase">Foot & Weapons Parade</h3>
                                        <p className="text-xs sm:text-sm text-gray-300 leading-relaxed">
                                            Regular morning parades on drill are conducted inside the university campus. Cadets learn ceremonial foot marching and advanced weapons drill maneuvers, including standard **Guard of Honour** procedures. Outstanding cadets are sent to district parade grounds for training and get selection opportunities for the **Republic Day Parade (RDP)**.
                                        </p>
                                        
                                        {/* Drill Video Player frame */}
                                        <div className="border border-ncc-olive/25 bg-black/60 rounded-lg overflow-hidden relative group max-w-2xl mx-auto w-full aspect-video mt-2">
                                            <video 
                                                src="/assets/videos/drill.mp4" 
                                                controls 
                                                className="w-full h-full object-cover"
                                                poster="/assets/images/ncc_drill_parade.png"
                                            ></video>
                                        </div>
                                    </div>
                                )}

                                {activeSector === 'bravo' && (
                                    <div className="flex flex-col gap-4 animate-fade-in font-sans">
                                        <h3 className="text-xl font-bold font-heading text-white tracking-wide uppercase">Physical & Tactical Fitness</h3>
                                        <p className="text-xs sm:text-sm text-gray-300 leading-relaxed">
                                            PT sessions are a core part of regular training schedules. Workouts focus on endurance, military conditioning, strength circuits, and running drills to prepare cadets for state and national competitive camp physicals.
                                        </p>
                                        <div className="border border-ncc-olive/25 bg-[#0e130a]/50 p-4 rounded-lg flex gap-4 items-center mt-3 max-w-lg font-mono">
                                            <i className="fa-solid fa-heart-pulse text-ncc-gold text-2xl animate-pulse"></i>
                                            <div className="text-xs flex flex-col gap-1">
                                                <span className="text-white font-bold">PT Focus: Strength & Endurance</span>
                                                <span className="text-gray-500">Activities: Circuits, Runs, Obstacle Preps</span>
                                                <span className="text-ncc-gold">Requirement: High stamina maintenance</span>
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {activeSector === 'charlie' && (
                                    <div className="flex flex-col gap-4 animate-fade-in font-sans">
                                        <h3 className="text-xl font-bold font-heading text-white tracking-wide uppercase">Marksmanship & SLR Assembly</h3>
                                        <p className="text-xs sm:text-sm text-gray-300 leading-relaxed">
                                            Weapon training teaches the handling of standard issue NCC rifles. Cadets are trained in the use of the **.22 Deluxe Rifle** (the authorized firing training weapon) and practice dry firing postures. Cadets also learn the disassembly and assembly (**Kholna Jorna**) of the **7.62mm SLR (Self-Loading Rifle)**.
                                        </p>
                                        <div className="border border-ncc-olive/25 bg-[#0e130a]/50 p-4 rounded-lg flex gap-4 items-center mt-3 max-w-lg font-mono">
                                            <i className="fa-solid fa-crosshairs text-ncc-red text-2xl animate-pulse"></i>
                                            <div className="text-xs flex flex-col gap-1">
                                                <span className="text-white font-bold">Standard Firearm: .22 Deluxe Rifle</span>
                                                <span className="text-gray-500">Dry Training: 7.62mm SLR Kholna Jorna</span>
                                                <span className="text-ncc-gold">Objectives: Target focus, safety, grouping shots</span>
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {activeSector === 'delta' && (
                                    <div className="flex flex-col gap-4 animate-fade-in font-sans">
                                        <h3 className="text-xl font-bold font-heading text-white tracking-wide uppercase">Military Camps</h3>
                                        <p className="text-xs sm:text-sm text-gray-300 leading-relaxed">
                                            Camps range from local Annual Training Camps (ATC) and Combined ATC (CATC) to national competitive camps. Selected cadets attend based on rigorous unit screenings and individual capabilities:
                                        </p>
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-1 font-mono">
                                            <div className="bg-[#0e130a]/60 border border-ncc-olive/15 p-3 rounded">
                                                <div className="text-[10px] text-ncc-gold font-bold">TSC (Thal Sainik Camp)</div>
                                                <div className="text-[8px] text-gray-500 mt-1 uppercase">Obstacles, Firing, Map Reading & Field Craft</div>
                                            </div>
                                            <div className="bg-[#0e130a]/60 border border-ncc-olive/15 p-3 rounded">
                                                <div className="text-[10px] text-ncc-gold font-bold">RDC (Republic Day Camp)</div>
                                                <div className="text-[8px] text-gray-500 mt-1 uppercase">Delhi Rajpath Ceremonial Marching Selection</div>
                                            </div>
                                            <div className="bg-[#0e130a]/60 border border-ncc-olive/15 p-3 rounded">
                                                <div className="text-[10px] text-ncc-gold font-bold">Shooting Mavalankar (AIMSCA)</div>
                                                <div className="text-[8px] text-gray-500 mt-1 uppercase">All India National Level Rifle Championship</div>
                                            </div>
                                            <div className="bg-[#0e130a]/60 border border-ncc-olive/15 p-3 rounded">
                                                <div className="text-[10px] text-ncc-gold font-bold">AAC & Adventure Camps</div>
                                                <div className="text-[8px] text-gray-500 mt-1 uppercase">Army Attachment, Trekking, Rock Climbing</div>
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {activeSector === 'epsilon' && (
                                    <div className="flex flex-col gap-4 animate-fade-in font-sans">
                                        <h3 className="text-xl font-bold font-heading text-white tracking-wide uppercase">Technical Field Subjects</h3>
                                        <p className="text-xs sm:text-sm text-gray-300 leading-relaxed">
                                            Cadets learn military field skills including **Map Reading (MR)** (prismatic compass, service protractor usage), **Field Craft & Battle Craft (FCBC)** (judging distance, section formations), Health & Hygiene, **Tent Pitching**, and obstacle training. Practical sessions are held inside the college campus (and occasionally externally) to provide hands-on experience. Cadets study the authorized NCC syllabus to take up the **B and C Certificate examinations** at the end of their 3-year Senior Division course.
                                        </p>
                                    </div>
                                )}

                                {activeSector === 'zeta' && (
                                    <div className="flex flex-col gap-4 animate-fade-in font-sans">
                                        <h3 className="text-xl font-bold font-heading text-white tracking-wide uppercase">Social & Awareness Campaigns</h3>
                                        <p className="text-xs sm:text-sm text-gray-300 leading-relaxed">
                                            Social service forms the core of our community duties. Cadets are regularly involved in tree plantation drives, awareness rallies, programs, and conducting events like fire safety demonstrations and workshops. Cadets also participate in **SSCD (Social Service and Community Development)** activities, including organizing special educational and engagement events for kids in juvenile homes.
                                        </p>
                                    </div>
                                )}
                            </div>

                            {/* HUD Bottom telemetry stats */}
                            <div className="border-t border-ncc-olive/15 pt-4 mt-6 flex flex-wrap justify-between gap-4">
                                <div className="flex gap-2 items-center text-[9px] text-gray-500 font-mono">
                                    <span>PLATOON_GATEWAY:</span>
                                    <span className="text-emerald-500 font-bold">READY</span>
                                </div>
                                <div className="text-[9px] text-ncc-gold/70 font-mono font-bold tracking-widest uppercase">
                                    // BATTALION COMMAND AUTHORIZED TRAINING
                                </div>
                            </div>
                        </div>

                    </div>

                </div>
            </section>

            {/* ── SECTOR 04: ENLISTMENT BENEFITS (WHY JOIN?) ── */}
            <section id="sector-benefits" className="py-24 px-6 relative z-10 border-t border-ncc-olive/15 bg-transparent">
                <div className="max-w-6xl mx-auto">
                    
                    {/* Header */}
                    <div className="text-center mb-16">
                        <div className="text-[10px] text-ncc-gold font-bold tracking-[0.25em] uppercase mb-1">SECTOR // 03</div>
                        <h2 className="text-2xl sm:text-3xl font-black font-heading text-white tracking-wider uppercase">Cadet Enlistment Benefits</h2>
                        <div className="w-12 h-1 bg-ncc-gold mx-auto mt-3 rounded"></div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                        
                        {/* Benefit Card 1 */}
                        <div className="border border-ncc-olive/25 bg-[#0e130a]/50 backdrop-blur-sm p-6 rounded-xl relative hover:border-ncc-gold transition-all duration-300 flex flex-col justify-between group">
                            <div className="absolute top-0 left-0 w-2 h-2 border-t border-l border-ncc-gold"></div>
                            <div>
                                <div className="w-10 h-10 rounded bg-ncc-gold/10 border border-ncc-gold/20 flex items-center justify-center text-ncc-gold mb-4 group-hover:scale-110 transition-transform">
                                    <i className="fa-solid fa-shield-halved"></i>
                                </div>
                                <h3 className="text-base font-bold font-heading text-white uppercase tracking-wider mb-2">Direct SSB Entry</h3>
                                <p className="text-xs text-gray-400 font-sans leading-relaxed">
                                    Cadets holding a C-Certificate are eligible for the NCC Special Entry scheme, bypassing written CDS examinations to go directly to the SSB interview.
                                </p>
                            </div>
                            <span className="text-[9px] font-mono text-ncc-olive font-bold mt-4 tracking-widest">// SSB SPECIAL ENTRY</span>
                        </div>

                        {/* Benefit Card 2 */}
                        <div className="border border-ncc-olive/25 bg-[#0e130a]/50 backdrop-blur-sm p-6 rounded-xl relative hover:border-ncc-gold transition-all duration-300 flex flex-col justify-between group">
                            <div className="absolute top-0 left-0 w-2 h-2 border-t border-l border-ncc-gold"></div>
                            <div>
                                <div className="w-10 h-10 rounded bg-ncc-gold/10 border border-ncc-gold/20 flex items-center justify-center text-ncc-gold mb-4 group-hover:scale-110 transition-transform">
                                    <i className="fa-solid fa-briefcase"></i>
                                </div>
                                <h3 className="text-base font-bold font-heading text-white uppercase tracking-wider mb-2">Corporate Placement</h3>
                                <p className="text-xs text-gray-400 font-sans leading-relaxed">
                                    *Please note: SASTRA does not offer grace marks or special academic weightage.* However, corporate recruiters look highly upon the leadership, resilience, and unique exposure gained from NCC.
                                </p>
                            </div>
                            <span className="text-[9px] font-mono text-ncc-olive font-bold mt-4 tracking-widest">// CORPORATE EXPOSURE</span>
                        </div>

                        {/* Benefit Card 3 */}
                        <div className="border border-ncc-olive/25 bg-[#0e130a]/50 backdrop-blur-sm p-6 rounded-xl relative hover:border-ncc-gold transition-all duration-300 flex flex-col justify-between group">
                            <div className="absolute top-0 left-0 w-2 h-2 border-t border-l border-ncc-gold"></div>
                            <div>
                                <div className="w-10 h-10 rounded bg-ncc-gold/10 border border-ncc-gold/20 flex items-center justify-center text-ncc-gold mb-4 group-hover:scale-110 transition-transform">
                                    <i className="fa-solid fa-compass"></i>
                                </div>
                                <h3 className="text-base font-bold font-heading text-white uppercase tracking-wider mb-2">Character & Goals</h3>
                                <p className="text-xs text-gray-400 font-sans leading-relaxed">
                                    Build long-lasting discipline, resilience, and habits that will help you achieve career goals while staying helpful to others.
                                </p>
                            </div>
                            <span className="text-[9px] font-mono text-ncc-olive font-bold mt-4 tracking-widest">// CHARACTER BUILDING</span>
                        </div>

                        {/* Benefit Card 4 */}
                        <div className="border border-ncc-olive/25 bg-[#0e130a]/50 backdrop-blur-sm p-6 rounded-xl relative hover:border-ncc-gold transition-all duration-300 flex flex-col justify-between group">
                            <div className="absolute top-0 left-0 w-2 h-2 border-t border-l border-ncc-gold"></div>
                            <div>
                                <div className="w-10 h-10 rounded bg-ncc-gold/10 border border-ncc-gold/20 flex items-center justify-center text-ncc-gold mb-4 group-hover:scale-110 transition-transform">
                                    <i className="fa-solid fa-building-user"></i>
                                </div>
                                <h3 className="text-base font-bold font-heading text-white uppercase tracking-wider mb-2">Government Weight</h3>
                                <p className="text-xs text-gray-400 font-sans leading-relaxed">
                                    Various central and state government organizations, paramilitary forces, and police recruitment boards give preference marks to C-Certificate holders.
                                </p>
                            </div>
                            <span className="text-[9px] font-mono text-ncc-olive font-bold mt-4 tracking-widest">// GOVERNMENT CAREERS</span>
                        </div>

                    </div>

                </div>
            </section>

            {/* ── SECTOR 05: PERSONNEL ROLL (CHAIN OF COMMAND) ── */}
            <section id="sector-roll" className="py-24 px-6 relative z-10 border-t border-ncc-olive/15 bg-transparent">
                <div className="max-w-6xl mx-auto">
                    
                    {/* Header */}
                    <div className="text-center mb-16">
                        <div className="text-[10px] text-ncc-gold font-bold tracking-[0.25em] uppercase mb-1">SECTOR // 04</div>
                        <h2 className="text-2xl sm:text-3xl font-black font-heading text-white tracking-wider uppercase">Chain of Command</h2>
                        <div className="w-12 h-1 bg-ncc-gold mx-auto mt-3 rounded"></div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                        
                        {/* Personnel ANO */}
                        <div className="border border-ncc-olive/20 bg-[#0c1008]/55 backdrop-blur-sm p-5 rounded-xl text-center relative flex flex-col items-center">
                            <div className="absolute top-0 left-1/2 -translate-x-1/2 px-2.5 py-0.5 bg-ncc-gold text-black text-[8px] font-black uppercase tracking-widest rounded-b font-mono">
                                CONTINGENT COMMAND
                            </div>
                            <div className="w-20 h-20 bg-ncc-olive/20 border border-ncc-olive/30 rounded-full flex items-center justify-center text-ncc-gold text-2xl mb-4 font-bold font-mono">
                                ANO
                            </div>
                            <h3 className="text-base font-bold font-heading text-white uppercase tracking-wide">Lt. Dr. G Jegadeesan</h3>
                            <span className="text-[9px] text-ncc-gold font-bold font-mono tracking-widest uppercase mt-1">Associate NCC Officer</span>
                            <p className="text-[10px] text-gray-500 font-sans mt-3 leading-relaxed">
                                Associate NCC Officer in charge of the boys contingent inside SASTRA University.
                            </p>
                        </div>

                        {/* Personnel SUO */}
                        <div className="border border-ncc-olive/20 bg-[#0c1008]/55 backdrop-blur-sm p-5 rounded-xl text-center relative flex flex-col items-center">
                            <div className="absolute top-0 left-1/2 -translate-x-1/2 px-2.5 py-0.5 bg-ncc-red text-white text-[8px] font-black uppercase tracking-widest rounded-b font-mono">
                                CADRE HQ
                            </div>
                            <div className="w-20 h-20 bg-ncc-olive/20 border border-ncc-olive/30 rounded-full flex items-center justify-center text-ncc-gold text-2xl mb-4 font-bold font-mono">
                                SUO
                            </div>
                            <h3 className="text-base font-bold font-heading text-white uppercase tracking-wide">Awaiting Selection</h3>
                            <span className="text-[9px] text-ncc-gold font-bold font-mono tracking-widest uppercase mt-1">Senior Under Officer</span>
                            <p className="text-[10px] text-gray-500 font-sans mt-3 leading-relaxed">
                                Chief cadet appointment. In charge of the Platoon drill, parades, and squad coordination.
                            </p>
                        </div>

                        {/* Personnel CUO */}
                        <div className="border border-ncc-olive/20 bg-[#0c1008]/55 backdrop-blur-sm p-5 rounded-xl text-center relative flex flex-col items-center">
                            <div className="w-20 h-20 bg-ncc-olive/20 border border-ncc-olive/30 rounded-full flex items-center justify-center text-ncc-gold text-2xl mb-4 font-bold font-mono">
                                CUO
                            </div>
                            <h3 className="text-base font-bold font-heading text-white uppercase tracking-wide">Awaiting Selection</h3>
                            <span className="text-[9px] text-ncc-gold font-bold font-mono tracking-widest uppercase mt-1">Company Under Officer</span>
                            <p className="text-[10px] text-gray-500 font-sans mt-3 leading-relaxed">
                                Cadet appointment coordinating squads, camp deployments, and logistics link.
                            </p>
                        </div>

                        {/* Personnel CSM */}
                        <div className="border border-ncc-olive/20 bg-[#0c1008]/55 backdrop-blur-sm p-5 rounded-xl text-center relative flex flex-col items-center">
                            <div className="w-20 h-20 bg-ncc-olive/20 border border-ncc-olive/30 rounded-full flex items-center justify-center text-ncc-gold text-2xl mb-4 font-bold font-mono">
                                CSM
                            </div>
                            <h3 className="text-base font-bold font-heading text-white uppercase tracking-wide">Awaiting Selection</h3>
                            <span className="text-[9px] text-ncc-gold font-bold font-mono tracking-widest uppercase mt-1">Company Sergeant Major</span>
                            <p className="text-[10px] text-gray-500 font-sans mt-3 leading-relaxed">
                                Cadet appointment managing daily parade attendance, reports, and discipline rosters.
                            </p>
                        </div>

                    </div>

                </div>
            </section>

            {/* ── SECTOR 06: RECONNAISSANCE GALLERY (OPERATIONAL GALLERY) ── */}
            <section id="sector-recon" className="py-24 px-6 relative z-10 border-t border-ncc-olive/15 bg-transparent">
                <div className="max-w-6xl mx-auto">
                    
                    {/* Header */}
                    <div className="text-center mb-16">
                        <div className="text-[10px] text-ncc-gold font-bold tracking-[0.25em] uppercase mb-1">SECTOR // 05</div>
                        <h2 className="text-2xl sm:text-3xl font-black font-heading text-white tracking-wider uppercase">Contingent Gallery</h2>
                        <div className="w-12 h-1 bg-ncc-gold mx-auto mt-3 rounded"></div>
                    </div>

                    {/* Gallery Grid */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-6">
                        
                        {/* Image 1 */}
                        <button 
                            onClick={() => setLightboxImage('/assets/images/ncc_camp_training.png')}
                            className="border border-ncc-olive/25 bg-[#0e130a]/50 backdrop-blur-sm p-2.5 rounded-xl overflow-hidden group text-left relative flex flex-col justify-between"
                        >
                            <div className="absolute top-4 right-4 bg-black/75 border border-ncc-olive/20 text-ncc-gold text-[7px] font-mono px-1.5 py-0.5 rounded z-10">
                                CAMPS // CATC // COC
                            </div>
                            <div className="aspect-video w-full overflow-hidden rounded-lg bg-black relative">
                                <img src="/assets/images/ncc_camp_training.png" alt="Camps" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                            </div>
                            <div className="mt-3 px-1.5">
                                <span className="text-[10px] font-bold text-white uppercase tracking-wider block font-heading">Tactical Field Camps</span>
                                <span className="text-[8px] text-gray-500 mt-1 block font-mono">COMBINED & NATIONAL DEPLOYMENTS</span>
                            </div>
                        </button>

                        {/* Image 2 */}
                        <button 
                            onClick={() => setLightboxImage('/assets/images/ncc_social_service.png')}
                            className="border border-ncc-olive/25 bg-[#0e130a]/50 backdrop-blur-sm p-2.5 rounded-xl overflow-hidden group text-left relative flex flex-col justify-between"
                        >
                            <div className="absolute top-4 right-4 bg-black/75 border border-ncc-olive/20 text-ncc-gold text-[7px] font-mono px-1.5 py-0.5 rounded z-10">
                                SOCIAL SERVICES // SSCD
                            </div>
                            <div className="aspect-video w-full overflow-hidden rounded-lg bg-black relative">
                                <img src="/assets/images/ncc_social_service.png" alt="Social activities" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                            </div>
                            <div className="mt-3 px-1.5">
                                <span className="text-[10px] font-bold text-white uppercase tracking-wider block font-heading">Social Service & SSCD</span>
                                <span className="text-[8px] text-gray-500 mt-1 block font-mono">AWARENESS & OUTREACH DRIVES</span>
                            </div>
                        </button>

                        {/* Image 3 */}
                        <button 
                            onClick={() => setLightboxImage('/assets/images/ncc_drill_parade.png')}
                            className="border border-ncc-olive/25 bg-[#0e130a]/50 backdrop-blur-sm p-2.5 rounded-xl overflow-hidden group text-left relative flex flex-col justify-between"
                        >
                            <div className="absolute top-4 right-4 bg-black/75 border border-ncc-olive/20 text-ncc-gold text-[7px] font-mono px-1.5 py-0.5 rounded z-10">
                                FOOT DRILL // PARADES
                            </div>
                            <div className="aspect-video w-full overflow-hidden rounded-lg bg-black relative">
                                <img src="/assets/images/ncc_drill_parade.png" alt="Foot Drill" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                            </div>
                            <div className="mt-3 px-1.5">
                                <span className="text-[10px] font-bold text-white uppercase tracking-wider block font-heading">Contingent Parades</span>
                                <span className="text-[8px] text-gray-500 mt-1 block font-mono">FOOT & WEAPONS DRILLS</span>
                            </div>
                        </button>

                        {/* Image 4 */}
                        <button 
                            onClick={() => setLightboxImage('/assets/images/ncc_guard_honour.png')}
                            className="border border-ncc-olive/25 bg-[#0e130a]/50 backdrop-blur-sm p-2.5 rounded-xl overflow-hidden group text-left relative flex flex-col justify-between"
                        >
                            <div className="absolute top-4 right-4 bg-black/75 border border-ncc-olive/20 text-ncc-gold text-[7px] font-mono px-1.5 py-0.5 rounded z-10">
                                GUARD OF HONOUR
                            </div>
                            <div className="aspect-video w-full overflow-hidden rounded-lg bg-black relative">
                                <img src="/assets/images/ncc_guard_honour.png" alt="Guard of Honour" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                            </div>
                            <div className="mt-3 px-1.5">
                                <span className="text-[10px] font-bold text-white uppercase tracking-wider block font-heading">Guard of Honour</span>
                                <span className="text-[8px] text-gray-500 mt-1 block font-mono">DIGNITARY CEREMONIAL REVIEWS</span>
                            </div>
                        </button>

                        {/* Image 5 */}
                        <button 
                            onClick={() => setLightboxImage('/assets/images/ncc_external_achievements.png')}
                            className="border border-ncc-olive/25 bg-[#0e130a]/50 backdrop-blur-sm p-2.5 rounded-xl overflow-hidden group text-left relative flex flex-col justify-between"
                        >
                            <div className="absolute top-4 right-4 bg-black/75 border border-ncc-olive/20 text-ncc-gold text-[7px] font-mono px-1.5 py-0.5 rounded z-10">
                                EXTERNAL ACHIEVEMENTS
                            </div>
                            <div className="aspect-video w-full overflow-hidden rounded-lg bg-black relative">
                                <img src="/assets/images/ncc_external_achievements.png" alt="External Achievements" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                            </div>
                            <div className="mt-3 px-1.5">
                                <span className="text-[10px] font-bold text-white uppercase tracking-wider block font-heading">Cadet Achievements</span>
                                <span className="text-[8px] text-gray-500 mt-1 block font-mono">NATIONAL & BATTALION HONOURS</span>
                            </div>
                        </button>

                    </div>

                </div>
            </section>

            {/* ── SECTOR 07: COMMAND TERMINAL (REGISTRATION & CONTACT) ── */}
            <section id="sector-terminal" className="py-24 px-6 relative z-10 border-t border-ncc-olive/15 bg-transparent">
                <div className="max-w-5xl mx-auto">
                    
                    {/* Header */}
                    <div className="text-center mb-12">
                        <div className="text-[10px] text-ncc-gold font-bold tracking-[0.25em] uppercase mb-1">SECTOR // 06</div>
                        <h2 className="text-2xl sm:text-3xl font-black font-heading text-white tracking-wider uppercase">Direct Enlistment Terminal</h2>
                        <div className="w-12 h-1 bg-ncc-gold mx-auto mt-3 rounded"></div>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-stretch">
                        
                        {/* Terminal input console Form */}
                        <div className="lg:col-span-7 border border-ncc-olive/30 bg-[#0c1008]/45 backdrop-blur-md p-6 rounded-2xl relative shadow-2xl">
                            {/* Brackets */}
                            <div className="absolute top-0 left-0 w-3 h-3 border-t border-l border-ncc-gold"></div>
                            <div className="absolute top-0 right-0 w-3 h-3 border-t border-r border-ncc-gold"></div>
                            <div className="absolute bottom-0 left-0 w-3 h-3 border-b border-l border-ncc-gold"></div>
                            <div className="absolute bottom-0 right-0 w-3 h-3 border-b border-r border-ncc-gold"></div>

                            {/* Dev Recruitment Window toggle command */}
                            <div className="absolute top-3 right-4 flex items-center gap-2 z-10 bg-black/60 px-2 py-1 rounded border border-ncc-olive/30">
                                <span className="text-[7.5px] text-ncc-khaki uppercase tracking-widest font-mono">System Window:</span>
                                <button 
                                    onClick={() => setRecruitmentOpen(!recruitmentOpen)}
                                    className={`px-1.5 py-0.5 rounded text-[8px] font-bold uppercase transition-all ${
                                        recruitmentOpen 
                                            ? 'bg-emerald-500/25 border border-emerald-500 text-emerald-400' 
                                            : 'bg-ncc-red/25 border border-ncc-red text-ncc-red'
                                    }`}
                                >
                                    {recruitmentOpen ? 'OPEN' : 'CLOSED'}
                                </button>
                            </div>

                            <form onSubmit={handleTerminalSubmit} className="flex flex-col gap-4 font-sans text-xs">
                                <div className="text-[9.5px] text-ncc-gold font-mono font-bold tracking-widest uppercase border-b border-ncc-olive/15 pb-2 mb-2">
                                    {recruitmentOpen ? '// CADET IDENTITY ENLISTMENT DATA' : '// ENLISTMENT INQUIRY & ALERTS'}
                                </div>

                                {/* Dynamic message explaining closed status */}
                                {!recruitmentOpen && (
                                    <div className="bg-ncc-red/5 border border-ncc-red/20 text-ncc-khaki p-3 rounded font-mono text-[10px] leading-relaxed">
                                        <span className="text-ncc-red font-bold">RECRUITMENT CLOSED</span>: The official enlistment cycle is currently closed. Submit your name and email below to register for notifications when the next recruitment drive begins, or send an inquiry.
                                    </div>
                                )}
                                {recruitmentOpen && (
                                    <div className="bg-emerald-500/5 border border-emerald-500/20 text-ncc-khaki p-3 rounded font-mono text-[10px] leading-relaxed">
                                        <span className="text-emerald-500 font-bold">RECRUITMENT ACTIVE</span>: The official enlistment cycle is now open for the senior division boys contingent. Transmit your cadet application packet below.
                                    </div>
                                )}

                                {recruitmentOpen ? (
                                    <>
                                        <div className="grid grid-cols-2 gap-4">
                                            <div className="flex flex-col gap-1.5">
                                                <label className="text-ncc-olive uppercase tracking-wider font-bold">Cadet Full Name</label>
                                                <input 
                                                    type="text" 
                                                    value={name} 
                                                    onChange={e => setName(e.target.value)} 
                                                    className="bg-black/60 border border-ncc-olive/30 rounded p-2.5 text-white font-mono outline-none focus:border-ncc-gold transition-all"
                                                    placeholder="John Doe"
                                                    required
                                                />
                                            </div>
                                            <div className="flex flex-col gap-1.5">
                                                <label className="text-ncc-olive uppercase tracking-wider font-bold">Register Number</label>
                                                <input 
                                                    type="text" 
                                                    value={regNo} 
                                                    onChange={e => setRegNo(e.target.value)} 
                                                    className="bg-black/60 border border-ncc-olive/30 rounded p-2.5 text-white font-mono outline-none focus:border-ncc-gold transition-all"
                                                    placeholder="123456789"
                                                    required
                                                />
                                            </div>
                                        </div>

                                        <div className="grid grid-cols-2 gap-4">
                                            <div className="flex flex-col gap-1.5">
                                                <label className="text-ncc-olive uppercase tracking-wider font-bold">SASTRA Email Address</label>
                                                <input 
                                                    type="email" 
                                                    value={email} 
                                                    onChange={e => setEmail(e.target.value)} 
                                                    className="bg-black/60 border border-ncc-olive/30 rounded p-2.5 text-white font-mono outline-none focus:border-ncc-gold transition-all"
                                                    placeholder="doe@sastra.edu"
                                                    required
                                                />
                                            </div>
                                            <div className="flex flex-col gap-1.5">
                                                <label className="text-ncc-olive uppercase tracking-wider font-bold">Department & Year</label>
                                                <input 
                                                    type="text" 
                                                    value={dept} 
                                                    onChange={e => setDept(e.target.value)} 
                                                    className="bg-black/60 border border-ncc-olive/30 rounded p-2.5 text-white font-mono outline-none focus:border-ncc-gold transition-all"
                                                    placeholder="B.Tech CSE / II Year"
                                                    required
                                                />
                                            </div>
                                        </div>

                                        <div className="flex flex-col gap-1.5">
                                            <label className="text-ncc-olive uppercase tracking-wider font-bold">Reason for Enlistment / Inquiries</label>
                                            <textarea 
                                                rows={3}
                                                value={reason} 
                                                onChange={e => setReason(e.target.value)} 
                                                className="bg-black/60 border border-ncc-olive/30 rounded p-2.5 text-white font-mono outline-none focus:border-ncc-gold transition-all resize-none"
                                                placeholder="Describe your motivation to join SASTRA NCC..."
                                            ></textarea>
                                        </div>
                                    </>
                                ) : (
                                    <>
                                        <div className="grid grid-cols-2 gap-4">
                                            <div className="flex flex-col gap-1.5">
                                                <label className="text-ncc-olive uppercase tracking-wider font-bold">Your Name</label>
                                                <input 
                                                    type="text" 
                                                    value={name} 
                                                    onChange={e => setName(e.target.value)} 
                                                    className="bg-black/60 border border-ncc-olive/30 rounded p-2.5 text-white font-mono outline-none focus:border-ncc-gold transition-all"
                                                    placeholder="John Doe"
                                                    required
                                                />
                                            </div>
                                            <div className="flex flex-col gap-1.5">
                                                <label className="text-ncc-olive uppercase tracking-wider font-bold">SASTRA Email Address</label>
                                                <input 
                                                    type="email" 
                                                    value={email} 
                                                    onChange={e => setEmail(e.target.value)} 
                                                    className="bg-black/60 border border-ncc-olive/30 rounded p-2.5 text-white font-mono outline-none focus:border-ncc-gold transition-all"
                                                    placeholder="doe@sastra.edu"
                                                    required
                                                />
                                            </div>
                                        </div>

                                        <div className="flex flex-col gap-1.5">
                                            <label className="text-ncc-olive uppercase tracking-wider font-bold">Inquiry / Message</label>
                                            <textarea 
                                                rows={4}
                                                value={reason} 
                                                onChange={e => setReason(e.target.value)} 
                                                className="bg-[#0c1008]/20 border border-ncc-olive/30 rounded p-2.5 text-white font-mono outline-none focus:border-ncc-gold transition-all resize-none"
                                                placeholder="Type your message or inquiry regarding the upcoming boys contingent recruitment..."
                                            ></textarea>
                                        </div>
                                    </>
                                )}

                                <button 
                                    type="submit"
                                    disabled={isSubmitting}
                                    className={`w-full py-3 border font-bold text-center tracking-widest uppercase transition-all duration-300 ${
                                        isSubmitting 
                                            ? 'border-ncc-olive/40 bg-ncc-olive/5 text-gray-500 cursor-not-allowed'
                                            : 'border-ncc-gold bg-ncc-gold text-black hover:bg-transparent hover:text-ncc-gold'
                                    }`}
                                >
                                    {isSubmitting ? "TRANSMITTING DATA..." : recruitmentOpen ? "TRANSMIT ENLISTMENT PACKET" : "REGISTER FOR RECRUITMENT ALERTS"}
                                </button>
                            </form>
                        </div>

                        {/* Terminal telemetry output log box */}
                        <div className="lg:col-span-5 border border-ncc-olive/30 bg-[#060904]/70 backdrop-blur-sm p-5 rounded-2xl flex flex-col justify-between shadow-inner relative font-mono text-[10px]">
                            {/* Terminal Top bars */}
                            <div className="flex justify-between items-center border-b border-ncc-olive/15 pb-2 mb-3">
                                <span className="text-ncc-gold font-bold tracking-widest uppercase">// SECURE_LOG_STREAM</span>
                                <div className="flex gap-1">
                                    <span className="w-1.5 h-1.5 rounded-full bg-ncc-red"></span>
                                    <span className="w-1.5 h-1.5 rounded-full bg-ncc-gold"></span>
                                    <span className="w-1.5 h-1.5 rounded-full bg-ncc-olive"></span>
                                </div>
                            </div>

                            {/* Logs list */}
                            <div className="flex-grow overflow-y-auto max-h-[220px] flex flex-col gap-2 font-mono text-ncc-khaki pr-1">
                                {terminalLogs.map((log, idx) => (
                                    <div key={idx} className="leading-relaxed whitespace-pre-wrap break-all">
                                        {log}
                                    </div>
                                ))}
                                <div ref={logsEndRef}></div>
                            </div>

                            {/* Status indicator display */}
                            <div className="border-t border-ncc-olive/15 pt-3 mt-3 flex justify-between items-center text-[8.5px]">
                                <div className="flex gap-2 items-center">
                                    <span className={`w-1.5 h-1.5 rounded-full ${submitSuccess ? 'bg-emerald-500' : 'bg-amber-500 animate-pulse'}`}></span>
                                    <span className="text-gray-500 uppercase">{submitSuccess ? 'TRANSMITTED' : 'AWAITING_PACKETS'}</span>
                                </div>
                                <span className="text-ncc-olive font-bold uppercase tracking-wider">SYSTEM v1.0.9</span>
                            </div>
                        </div>

                    </div>

                </div>
            </section>

            {/* ── FOOTER ── */}
            <footer className="py-10 border-t border-ncc-olive/15 bg-[#060805] text-[9.5px] text-gray-500 uppercase tracking-widest text-center relative z-10 select-none font-mono">
                <div className="max-w-7xl mx-auto px-6 flex flex-col sm:flex-row justify-between items-center gap-4">
                    <span>© {new Date().getFullYear()} SASTRA University NCC Army Wing Platoon</span>
                    <span className="text-ncc-gold/70">Unity and Discipline • Commands Online</span>
                </div>
            </footer>

            {/* ── LIGHTBOX VIEWER MODAL ── */}
            {lightboxImage && (
                <div 
                    className="fixed inset-0 bg-black/90 backdrop-blur-sm z-[9999] flex items-center justify-center p-6 animate-fade-in"
                    onClick={() => setLightboxImage(null)}
                >
                    <button 
                        onClick={() => setLightboxImage(null)}
                        className="absolute top-6 right-6 text-white text-2xl hover:text-ncc-gold transition-colors"
                    >
                        <i className="fa-solid fa-xmark"></i>
                    </button>
                    <div 
                        className="max-w-4xl w-full border border-ncc-gold/30 bg-black/80 p-3 rounded-2xl relative shadow-2xl"
                        onClick={e => e.stopPropagation()}
                    >
                        <div className="absolute top-1 left-4 font-mono text-[8px] text-ncc-gold/60 uppercase">Operational Imagery Reconnaissance</div>
                        <img src={lightboxImage} alt="Reconnaissance View" className="w-full max-h-[70vh] object-contain rounded-lg border border-ncc-olive/20" />
                        <div className="flex justify-between items-center text-[9px] text-gray-400 font-mono mt-3 px-2">
                            <span>GRID_RECON_SUCCESS</span>
                            <span>SASTRA UNIVERSITY CONTINGENT</span>
                        </div>
                    </div>
                </div>
            )}
        </main>
    );
}
