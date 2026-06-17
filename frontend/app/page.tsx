'use client';

import { useEffect, useState, useRef } from 'react';
import Link from 'next/link';
import TacticalBattleMap from '@/components/TacticalBattleMap';
import TargetCursor from '@/components/TargetCursor';

export default function Home() {
    const [scrolled, setScrolled] = useState(false);
    const [soundMuted, setSoundMuted] = useState(true);
    const [activeSector, setActiveSector] = useState<'alpha' | 'bravo' | 'charlie' | 'delta'>('alpha');
    const [lightboxImage, setLightboxImage] = useState<string | null>(null);

    // Terminal/Enlistment Form States
    const [name, setName] = useState('');
    const [regNo, setRegNo] = useState('');
    const [email, setEmail] = useState('');
    const [dept, setDept] = useState('');
    const [reason, setReason] = useState('');
    const [terminalLogs, setTerminalLogs] = useState<string[]>([]);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [submitSuccess, setSubmitSuccess] = useState(false);

    const logsEndRef = useRef<HTMLDivElement | null>(null);

    // Initial check for sound preference
    useEffect(() => {
        if (typeof window !== 'undefined') {
            const mutedSetting = localStorage.getItem('ncc_sound_muted');
            if (mutedSetting === null) {
                // Default to muted
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
        
        // Simple synthetic confirmation sound if unmuting
        if (!nextState) {
            try {
                const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
                const osc = audioCtx.createOscillator();
                const gain = audioCtx.createGain();
                osc.connect(gain);
                gain.connect(audioCtx.destination);
                osc.type = 'sine';
                osc.frequency.setValueAtTime(880, audioCtx.currentTime); // High pitched beep
                gain.gain.setValueAtTime(0.03, audioCtx.currentTime);
                gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.15);
                osc.start();
                osc.stop(audioCtx.currentTime + 0.15);
            } catch (e) {}
        }
    };

    // Scroll listener for sticky navigation styling
    useEffect(() => {
        const handleScroll = () => setScrolled(window.scrollY > 40);
        window.addEventListener('scroll', handleScroll);
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    // Terminal console feedback sequences
    const addLog = (msg: string) => {
        setTerminalLogs(prev => [...prev, `[${new Date().toLocaleTimeString()}] ${msg}`]);
    };

    useEffect(() => {
        // Init logs
        setTerminalLogs([
            `[${new Date().toLocaleTimeString()}] SYS: UPLINK ESTABLISHED OVER SASTRA_NET`,
            `[${new Date().toLocaleTimeString()}] SYS: READY FOR DIRECT ENLISTMENT INPUTS...`
        ]);
    }, []);

    // Scroll to bottom of terminal logs
    useEffect(() => {
        logsEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [terminalLogs]);

    const handleTerminalSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!name || !regNo || !email || !dept) {
            addLog("ALERT: INCOMPLETE PACKET DATA. CRITICAL FIELDS MISSING.");
            return;
        }

        setIsSubmitting(true);
        addLog(`SYS: PARSING TRANSMISSION FOR CADET ${name.toUpperCase()}...`);
        
        setTimeout(() => {
            addLog("SYS: ROUTING CADET PACKET TO 4 COY BATTALION COMMAND...");
            
            setTimeout(() => {
                addLog("SYS: RESOLVING DNS SECURE GATEWAY... OK");
                
                setTimeout(() => {
                    addLog("SYS: PACKET HANDSHAKE ACCEPTED (AES-256). TRANSMISSION OK.");
                    setIsSubmitting(false);
                    setSubmitSuccess(true);
                    setName('');
                    setRegNo('');
                    setEmail('');
                    setDept('');
                    setReason('');
                }, 1000);
            }, 8000000000 !== undefined ? 1000 : 0); // safe mock timeout
        }, 1000);
    };

    return (
        <main className="min-h-screen bg-[#080b06] text-gray-300 font-mono relative overflow-x-hidden selection:bg-ncc-gold selection:text-black">
            {/* Custom target crosshair reticle cursor */}
            <TargetCursor />

            {/* Tactical Grid Background & animated topographic Canvas */}
            <div className="fixed inset-0 z-0 pointer-events-none opacity-40 md:opacity-50">
                <div className="absolute inset-0 bg-[#080b06] z-[-2]"></div>
                <TacticalBattleMap />
                {/* Visual grid overlay details */}
                <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(74,93,35,0.025)_1px,transparent_1px),linear-gradient(to_bottom,rgba(74,93,35,0.025)_1px,transparent_1px)] bg-[size:4rem_4rem]"></div>
            </div>

            {/* Animated full screen scanner overlay */}
            <div className="hud-scanner z-30"></div>

            {/* ── HEADER NAVIGATION BAR (COMM-LINK STATUS BAR) ── */}
            <header className={`fixed top-0 w-full z-50 transition-all duration-300 ${
                scrolled 
                    ? 'bg-[#0b0e07]/90 border-b border-ncc-olive/35 backdrop-blur-md py-3.5 shadow-xl shadow-black/35'
                    : 'bg-transparent py-6'
            }`}>
                <div className="max-w-7xl mx-auto px-6 flex justify-between items-center">
                    {/* Brand Identifier */}
                    <Link href="/" className="flex items-center gap-3 group">
                        <img src="/assets/images/ncc-logo.png" alt="NCC Logo" className="h-10 transition-transform group-hover:scale-105 group-hover:rotate-3 duration-300" />
                        <div className="flex flex-col">
                            <span className="font-sans font-extrabold text-sm sm:text-base text-white leading-none tracking-wider uppercase">
                                SASTRA <span className="text-ncc-red">NCC</span>
                            </span>
                            <span className="text-[8.5px] font-bold tracking-[0.25em] text-ncc-gold uppercase mt-1">
                                Army Wing Contingent
                            </span>
                        </div>
                    </Link>

                    {/* Nav Links (Desktop) */}
                    <nav className="hidden lg:flex items-center gap-7 text-[11px] font-bold tracking-widest text-ncc-olive/80">
                        <a href="#sector-brief" className="hover:text-ncc-gold transition-colors duration-200 uppercase flex items-center gap-1.5">
                            <span className="text-[8px] text-ncc-gold/60">01.</span> BRIEF
                        </a>
                        <a href="#sector-training" className="hover:text-ncc-gold transition-colors duration-200 uppercase flex items-center gap-1.5">
                            <span className="text-[8px] text-ncc-gold/60">02.</span> TRAINING
                        </a>
                        <a href="#sector-benefits" className="hover:text-ncc-gold transition-colors duration-200 uppercase flex items-center gap-1.5">
                            <span className="text-[8px] text-ncc-gold/60">03.</span> BENEFITS
                        </a>
                        <a href="#sector-roll" className="hover:text-ncc-gold transition-colors duration-200 uppercase flex items-center gap-1.5">
                            <span className="text-[8px] text-ncc-gold/60">04.</span> LEADERSHIP
                        </a>
                        <a href="#sector-recon" className="hover:text-ncc-gold transition-colors duration-200 uppercase flex items-center gap-1.5">
                            <span className="text-[8px] text-ncc-gold/60">05.</span> RECON
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
                        <div className="border border-ncc-olive/25 bg-[#0e130a]/80 p-4 rounded-lg flex-1 min-w-[200px] relative">
                            <div className="absolute top-0 left-0 w-2 h-2 border-t border-l border-ncc-gold"></div>
                            <div className="text-[8.5px] text-ncc-olive font-bold uppercase tracking-wider mb-1">Telemetry Status</div>
                            <div className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping"></span>
                                COMM-LINK ONLINE
                            </div>
                            <div className="text-[8.5px] text-gray-500 mt-2 font-mono flex flex-col gap-0.5">
                                <span>ANT: SAT-ACTIVE</span>
                                <span>SECURE HOPPING: ENGAGED</span>
                            </div>
                        </div>

                        <div className="border border-ncc-olive/25 bg-[#0e130a]/80 p-4 rounded-lg flex-1 min-w-[200px] relative">
                            <div className="absolute top-0 left-0 w-2 h-2 border-t border-l border-ncc-gold"></div>
                            <div className="text-[8.5px] text-ncc-olive font-bold uppercase tracking-wider mb-1">Coordinates Grid</div>
                            <div className="text-[11px] font-bold text-ncc-gold font-mono uppercase tracking-wider">
                                LAT 10.7725° N <br /> LNG 79.0161° E
                            </div>
                            <div className="text-[8px] text-gray-500 mt-1 uppercase font-mono">SASTRA University, Thanjavur</div>
                        </div>

                        <div className="border border-ncc-olive/25 bg-[#0e130a]/80 p-4 rounded-lg flex-1 min-w-[200px] relative">
                            <div className="absolute top-0 left-0 w-2 h-2 border-t border-l border-ncc-gold"></div>
                            <div className="text-[8.5px] text-ncc-olive font-bold uppercase tracking-wider mb-1">Company Strength</div>
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

                        <div className="p-6 md:p-10 bg-[#0c1008]/75 backdrop-blur-sm rounded-xl">
                            {/* Grid alignment tag */}
                            <div className="inline-flex items-center gap-2 px-3 py-1 rounded bg-ncc-olive/20 border border-ncc-olive/35 text-ncc-gold text-[9px] font-bold tracking-[0.2em] uppercase mb-6">
                                <i className="fa-solid fa-satellite animate-pulse"></i> COMMAND INTERNET TERMINAL v1.0
                            </div>

                            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black font-heading text-white tracking-tight uppercase leading-none mb-4">
                                SASTRA <span className="text-ncc-red">NCC</span> <br />
                                <span className="text-ncc-gold">ARMY WING</span>
                            </h1>

                            <p className="text-gray-400 text-xs sm:text-sm leading-relaxed mb-8 max-w-lg mx-auto font-sans">
                                Official command portal of the senior division boys contingent. Affiliated with 4 Coy, 4 Tamil Nadu Battalion NCC, Tiruchirappalli Group. Molding university youth into leaders of discipline and courage.
                            </p>

                            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
                                <a 
                                    href="#sector-terminal" 
                                    className="w-full sm:w-auto px-7 py-3.5 border border-ncc-gold bg-ncc-gold text-black rounded text-[11px] font-bold tracking-widest uppercase hover:bg-transparent hover:text-ncc-gold transition-all duration-300 shadow-lg shadow-ncc-gold/15"
                                >
                                    Enlist Now
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
                        <div className="border border-ncc-olive/25 bg-[#0e130a]/80 p-4 rounded-lg flex-1 min-w-[200px] relative">
                            <div className="absolute top-0 right-0 w-2 h-2 border-t border-r border-ncc-gold"></div>
                            <div className="text-[8.5px] text-ncc-olive font-bold uppercase tracking-wider mb-1">BATTALION ID</div>
                            <div className="text-[12px] font-bold text-white uppercase tracking-wider">4 TN BN NCC, Trichy</div>
                            <div className="text-[8px] text-ncc-khaki mt-1 font-mono uppercase">TN, P & AN Directorate</div>
                        </div>

                        <div className="border border-ncc-olive/25 bg-[#0e130a]/80 p-4 rounded-lg flex-1 min-w-[200px] relative">
                            <div className="absolute top-0 right-0 w-2 h-2 border-t border-r border-ncc-gold"></div>
                            <div className="text-[8.5px] text-ncc-olive font-bold uppercase tracking-wider mb-1">Motto of NCC</div>
                            <div className="text-[12px] font-black text-ncc-red uppercase tracking-widest font-heading">
                                UNITY & DISCIPLINE
                            </div>
                            <div className="text-[8px] text-gray-500 mt-1 uppercase font-mono">Ekta aur Anushasan</div>
                        </div>

                        <div className="border border-ncc-olive/25 bg-[#0e130a]/80 p-4 rounded-lg flex-1 min-w-[200px] relative">
                            <div className="absolute top-0 right-0 w-2 h-2 border-t border-r border-ncc-gold"></div>
                            <div className="text-[8.5px] text-ncc-olive font-bold uppercase tracking-wider mb-1">OFFICER IN COMMAND</div>
                            <div className="text-[11px] font-bold text-white uppercase tracking-wider">Capt. Dr. R. Sridhar</div>
                            <div className="text-[8px] text-ncc-gold font-bold uppercase tracking-wider">Associate NCC Officer</div>
                        </div>
                    </div>

                </div>
            </section>

            {/* ── SECTOR 02: COMPANY BRIEF (ABOUT & HISTORY) ── */}
            <section id="sector-brief" className="py-24 px-6 relative z-10 border-t border-ncc-olive/15 bg-[#080c05]/90">
                <div className="max-w-4xl mx-auto">
                    
                    {/* Header */}
                    <div className="text-center mb-12">
                        <div className="text-[10px] text-ncc-gold font-bold tracking-[0.25em] uppercase mb-1">SECTOR // 01</div>
                        <h2 className="text-2xl sm:text-3xl font-black font-heading text-white tracking-wider uppercase">Contingent Profile & Mission</h2>
                        <div className="w-12 h-1 bg-ncc-gold mx-auto mt-3 rounded"></div>
                    </div>

                    {/* About Content Slate */}
                    <div className="relative border border-ncc-olive/30 bg-[#0c1008]/85 p-8 sm:p-10 rounded-2xl shadow-xl">
                        {/* Brackets */}
                        <div className="absolute top-0 left-0 w-4 h-4 border-t-2 border-l-2 border-ncc-gold rounded-tl-md"></div>
                        <div className="absolute top-0 right-0 w-4 h-4 border-t-2 border-r-2 border-ncc-gold rounded-tr-md"></div>
                        <div className="absolute bottom-0 left-0 w-4 h-4 border-b-2 border-l-2 border-ncc-gold rounded-bl-md"></div>
                        <div className="absolute bottom-0 right-0 w-4 h-4 border-b-2 border-r-2 border-ncc-gold rounded-br-md"></div>

                        <div className="grid grid-cols-1 md:grid-cols-12 gap-8 items-center">
                            
                            <div className="md:col-span-8 flex flex-col gap-4 font-sans text-sm text-gray-300 leading-relaxed">
                                <p>
                                    The **National Cadet Corps (NCC)** Boys Wing at **SASTRA Deemed University** is a premier youth leadership training ground dedicated to nurturing discipline, physical integrity, and civic commitment among our undergraduate boys.
                                </p>
                                <p>
                                    As part of the **4 Coy, 4 Tamil Nadu Battalion NCC**, our cadets undergo comprehensive military grooming designed to foster camaraderie, team-spirit, and a resolute character. We bridge the gap between academic brilliance and national defense readiness.
                                </p>
                                <p className="border-l-2 border-ncc-gold pl-4 text-xs italic text-ncc-khaki/90 bg-ncc-gold/5 py-3 rounded-r font-mono">
                                    "To develop character, comradeship, discipline, leadership, secular outlook, spirit of adventure, and ideals of selfless service amongst the youth of the country."
                                </p>
                            </div>

                            <div className="md:col-span-4 flex flex-col justify-center items-center bg-[#070b04] border border-ncc-olive/20 p-6 rounded-xl relative shadow-inner">
                                <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 bg-[#0c1008] border border-ncc-olive/20 rounded-full text-[8.5px] font-bold text-ncc-gold uppercase tracking-widest whitespace-nowrap">Official Insignia</div>
                                <img src="/assets/images/sastra-logo.png" alt="SASTRA Crest" className="h-24 object-contain opacity-85 hover:opacity-100 transition-opacity duration-300" />
                                <span className="text-[10px] font-bold text-white uppercase tracking-wider text-center mt-4 font-heading">SASTRA Deemed University</span>
                                <span className="text-[8px] text-ncc-olive font-bold mt-1 font-mono uppercase tracking-wider">AN ISO 9001 UNIT</span>
                            </div>

                        </div>
                    </div>

                </div>
            </section>

            {/* ── SECTOR 03: TRAINING FIELDS (INTERACTIVE COORDINATES) ── */}
            <section id="sector-training" className="py-24 px-6 relative z-10 border-t border-ncc-olive/15 bg-black/60">
                <div className="max-w-6xl mx-auto">
                    
                    {/* Header */}
                    <div className="text-center mb-12">
                        <div className="text-[10px] text-ncc-gold font-bold tracking-[0.25em] uppercase mb-1">SECTOR // 02</div>
                        <h2 className="text-2xl sm:text-3xl font-black font-heading text-white tracking-wider uppercase">Training Sectors & Operations</h2>
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
                                        : 'border-ncc-olive/20 bg-[#0c1008]/70 hover:border-ncc-olive/50 text-gray-400'
                                }`}
                            >
                                <div className="absolute top-3 right-4 font-mono text-[9px] font-bold text-ncc-gold">COORD-A</div>
                                <div className="text-[10px] text-ncc-gold/75 font-bold tracking-widest uppercase mb-1">Sector Alpha</div>
                                <div className="text-sm font-black font-heading tracking-wide uppercase">Drill & Ceremony</div>
                                <div className="text-[10px] text-gray-500 font-mono mt-1 uppercase">Physical coordination, foot drill, and parade excellence</div>
                            </button>

                            <button 
                                onClick={() => setActiveSector('bravo')}
                                className={`w-full p-4 border rounded-xl text-left transition-all duration-300 relative ${
                                    activeSector === 'bravo' 
                                        ? 'border-ncc-gold bg-ncc-gold/10 text-white shadow-md shadow-ncc-gold/5' 
                                        : 'border-ncc-olive/20 bg-[#0c1008]/70 hover:border-ncc-olive/50 text-gray-400'
                                }`}
                            >
                                <div className="absolute top-3 right-4 font-mono text-[9px] font-bold text-ncc-gold">COORD-B</div>
                                <div className="text-[10px] text-ncc-gold/75 font-bold tracking-widest uppercase mb-1">Sector Bravo</div>
                                <div className="text-sm font-black font-heading tracking-wide uppercase">Weapon Training & Firing</div>
                                <div className="text-[10px] text-gray-500 font-mono mt-1 uppercase">Rifle components, dry-firing practice, and live target camps</div>
                            </button>

                            <button 
                                onClick={() => setActiveSector('charlie')}
                                className={`w-full p-4 border rounded-xl text-left transition-all duration-300 relative ${
                                    activeSector === 'charlie' 
                                        ? 'border-ncc-gold bg-ncc-gold/10 text-white shadow-md shadow-ncc-gold/5' 
                                        : 'border-ncc-olive/20 bg-[#0c1008]/70 hover:border-ncc-olive/50 text-gray-400'
                                }`}
                            >
                                <div className="absolute top-3 right-4 font-mono text-[9px] font-bold text-ncc-gold">COORD-C</div>
                                <div className="text-[10px] text-ncc-gold/75 font-bold tracking-widest uppercase mb-1">Sector Charlie</div>
                                <div className="text-sm font-black font-heading tracking-wide uppercase">Camps & Expeditions</div>
                                <div className="text-[10px] text-gray-500 font-mono mt-1 uppercase">Republic Day (RDC), Thal Sainik (TSC), and National camps</div>
                            </button>

                            <button 
                                onClick={() => setActiveSector('delta')}
                                className={`w-full p-4 border rounded-xl text-left transition-all duration-300 relative ${
                                    activeSector === 'delta' 
                                        ? 'border-ncc-gold bg-ncc-gold/10 text-white shadow-md shadow-ncc-gold/5' 
                                        : 'border-ncc-olive/20 bg-[#0c1008]/70 hover:border-ncc-olive/50 text-gray-400'
                                }`}
                            >
                                <div className="absolute top-3 right-4 font-mono text-[9px] font-bold text-ncc-gold">COORD-D</div>
                                <div className="text-[10px] text-ncc-gold/75 font-bold tracking-widest uppercase mb-1">Sector Delta</div>
                                <div className="text-sm font-black font-heading tracking-wide uppercase">Social Service & Relief</div>
                                <div className="text-[10px] text-gray-500 font-mono mt-1 uppercase">Disaster management, blood donations, and local community service</div>
                            </button>
                        </div>

                        {/* Interactive Viewer Screen (Holographic HUD Panel) */}
                        <div className="lg:col-span-8 border border-ncc-olive/30 bg-[#0c1008]/85 rounded-2xl p-6 relative flex flex-col justify-between shadow-2xl">
                            {/* Tech Details Corner Brackets */}
                            <div className="absolute top-0 left-0 w-3 h-3 border-t border-l border-ncc-gold"></div>
                            <div className="absolute top-0 right-0 w-3 h-3 border-t border-r border-ncc-gold"></div>
                            <div className="absolute bottom-0 left-0 w-3 h-3 border-b border-l border-ncc-gold"></div>
                            <div className="absolute bottom-0 right-0 w-3 h-3 border-b border-r border-ncc-gold"></div>

                            {/* Viewport Status Header */}
                            <div className="flex justify-between items-center border-b border-ncc-olive/15 pb-4 mb-4">
                                <div className="flex items-center gap-2">
                                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                                    <span className="text-[9.5px] font-bold tracking-widest uppercase text-ncc-gold">FEED_SOURCE: SECTOR_{activeSector.toUpperCase()}</span>
                                </div>
                                <span className="text-[8.5px] text-ncc-olive font-bold font-mono">AUTO_TRACK: OK</span>
                            </div>

                            {/* Dynamic Content Panels based on Active Sector */}
                            <div className="flex-grow">
                                {activeSector === 'alpha' && (
                                    <div className="flex flex-col gap-4 animate-fade-in">
                                        <h3 className="text-xl font-bold font-heading text-white tracking-wide uppercase">Parade and Drill Mastery</h3>
                                        <p className="text-xs sm:text-sm text-gray-300 font-sans leading-relaxed">
                                            Cadets receive rigorous instruction in foot drill, ceremonial marching, and arm drill. This training builds sharp motor responses, commands attention, and embeds absolute self-discipline.
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
                                    <div className="flex flex-col gap-4 animate-fade-in">
                                        <h3 className="text-xl font-bold font-heading text-white tracking-wide uppercase">Marksmanship & Weapon Tactics</h3>
                                        <p className="text-xs sm:text-sm text-gray-300 font-sans leading-relaxed">
                                            Weapon training teaches cadets how to handle basic firearms (such as the .22 Deluxe Rifle & SLR) safely and responsibly. Course covers rifle strip-down assembly, aiming postures, sight alignment, and trigger control.
                                        </p>
                                        <div className="border border-ncc-olive/25 bg-[#0e130a] p-4 rounded-lg flex gap-4 items-center mt-3 max-w-lg">
                                            <i className="fa-solid fa-crosshairs text-ncc-red text-2xl animate-pulse"></i>
                                            <div className="font-mono text-xs flex flex-col gap-1">
                                                <span className="text-white font-bold">Standard Firearm: .22 Deluxe Rifle</span>
                                                <span className="text-gray-500">Practice ranges: 25 Yards Firing Lane</span>
                                                <span className="text-ncc-gold">Goal: Developing target concentration & bullet grouping</span>
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {activeSector === 'charlie' && (
                                    <div className="flex flex-col gap-4 animate-fade-in">
                                        <h3 className="text-xl font-bold font-heading text-white tracking-wide uppercase">National Level Training Camps</h3>
                                        <p className="text-xs sm:text-sm text-gray-300 font-sans leading-relaxed">
                                            Cadets get shortlisted for elite, highly-prestigious military training camps across India. These include the Republic Day Camp (RDC) in Delhi, Thal Sainik Camp (TSC) for infantry training, Ek Bharat Shreshtha Bharat (EBSB) for cultural integration, and various high-altitude trekking camps.
                                        </p>
                                        <div className="grid grid-cols-2 gap-3 mt-3">
                                            <div className="bg-[#0e130a]/70 border border-ncc-olive/15 p-3 rounded">
                                                <div className="text-[10px] text-ncc-gold font-bold">RDC (Republic Day Camp)</div>
                                                <div className="text-[8px] text-gray-500 mt-1 uppercase">March on Rajpath, Delhi</div>
                                            </div>
                                            <div className="bg-[#0e130a]/70 border border-ncc-olive/15 p-3 rounded">
                                                <div className="text-[10px] text-ncc-gold font-bold">TSC (Thal Sainik Camp)</div>
                                                <div className="text-[8px] text-gray-500 mt-1 uppercase">Obstacle course & shooting</div>
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {activeSector === 'delta' && (
                                    <div className="flex flex-col gap-4 animate-fade-in">
                                        <h3 className="text-xl font-bold font-heading text-white tracking-wide uppercase">Selfless Social Service</h3>
                                        <p className="text-xs sm:text-sm text-gray-300 font-sans leading-relaxed">
                                            Through blood donation camps, clean-up drives, tree plantation campaigns, and disaster relief work, SASTRA NCC cadets learn the core values of citizen duty, environmental responsibility, and public service.
                                        </p>
                                        <div className="border border-ncc-olive/25 bg-ncc-red/5 p-4 rounded-lg flex gap-4 items-center mt-3 max-w-lg">
                                            <i className="fa-solid fa-hand-holding-heart text-ncc-red text-2xl"></i>
                                            <div className="font-mono text-xs flex flex-col gap-1">
                                                <span className="text-white font-bold">Community Relief operations</span>
                                                <span className="text-gray-500">Disaster management mock exercises</span>
                                                <span className="text-ncc-gold">Objective: Selfless public engagement</span>
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* HUD Bottom telemetry stats */}
                            <div className="border-t border-ncc-olive/15 pt-4 mt-6 flex flex-wrap justify-between gap-4">
                                <div className="flex gap-2 items-center text-[9px] text-gray-500 font-mono">
                                    <span>SYSTEM_STATUS:</span>
                                    <span className="text-emerald-500 font-bold">ONLINE</span>
                                </div>
                                <div className="text-[9px] text-ncc-gold/70 font-mono font-bold tracking-widest uppercase">
                                    // BATTALION COMMAND APPROVED OPERATIONS
                                </div>
                            </div>
                        </div>

                    </div>

                </div>
            </section>

            {/* ── SECTOR 04: ENLISTMENT BENEFITS (WHY JOIN?) ── */}
            <section id="sector-benefits" className="py-24 px-6 relative z-10 border-t border-ncc-olive/15 bg-[#080c05]/95">
                <div className="max-w-6xl mx-auto">
                    
                    {/* Header */}
                    <div className="text-center mb-16">
                        <div className="text-[10px] text-ncc-gold font-bold tracking-[0.25em] uppercase mb-1">SECTOR // 03</div>
                        <h2 className="text-2xl sm:text-3xl font-black font-heading text-white tracking-wider uppercase">Cadet Enlistment Benefits</h2>
                        <div className="w-12 h-1 bg-ncc-gold mx-auto mt-3 rounded"></div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                        
                        {/* Benefit Card 1 */}
                        <div className="border border-ncc-olive/25 bg-[#0e130a]/80 p-6 rounded-xl relative hover:border-ncc-gold transition-all duration-300 flex flex-col justify-between group">
                            <div className="absolute top-0 left-0 w-2 h-2 border-t border-l border-ncc-gold"></div>
                            <div>
                                <div className="w-10 h-10 rounded bg-ncc-gold/10 border border-ncc-gold/20 flex items-center justify-center text-ncc-gold mb-4 group-hover:scale-110 transition-transform">
                                    <i className="fa-solid fa-shield-halved"></i>
                                </div>
                                <h3 className="text-base font-bold font-heading text-white uppercase tracking-wider mb-2">Direct Defence Entry</h3>
                                <p className="text-xs text-gray-400 font-sans leading-relaxed">
                                    C-Certificate holders get direct entry (no written exams) in SSB interviews for Army, Navy, and Air Force officer vacancies.
                                </p>
                            </div>
                            <span className="text-[9px] font-mono text-ncc-olive font-bold mt-4 tracking-widest">// DIRECT ENTRY SSB</span>
                        </div>

                        {/* Benefit Card 2 */}
                        <div className="border border-ncc-olive/25 bg-[#0e130a]/80 p-6 rounded-xl relative hover:border-ncc-gold transition-all duration-300 flex flex-col justify-between group">
                            <div className="absolute top-0 left-0 w-2 h-2 border-t border-l border-ncc-gold"></div>
                            <div>
                                <div className="w-10 h-10 rounded bg-ncc-gold/10 border border-ncc-gold/20 flex items-center justify-center text-ncc-gold mb-4 group-hover:scale-110 transition-transform">
                                    <i className="fa-solid fa-graduation-cap"></i>
                                </div>
                                <h3 className="text-base font-bold font-heading text-white uppercase tracking-wider mb-2">Academic Weightage</h3>
                                <p className="text-xs text-gray-400 font-sans leading-relaxed">
                                    SASTRA University and top universities award grace marks and preferred admission benefits for active NCC certificate holders.
                                </p>
                            </div>
                            <span className="text-[9px] font-mono text-ncc-olive font-bold mt-4 tracking-widest">// ACADEMIC BONUS</span>
                        </div>

                        {/* Benefit Card 3 */}
                        <div className="border border-ncc-olive/25 bg-[#0e130a]/80 p-6 rounded-xl relative hover:border-ncc-gold transition-all duration-300 flex flex-col justify-between group">
                            <div className="absolute top-0 left-0 w-2 h-2 border-t border-l border-ncc-gold"></div>
                            <div>
                                <div className="w-10 h-10 rounded bg-ncc-gold/10 border border-ncc-gold/20 flex items-center justify-center text-ncc-gold mb-4 group-hover:scale-110 transition-transform">
                                    <i className="fa-solid fa-compass"></i>
                                </div>
                                <h3 className="text-base font-bold font-heading text-white uppercase tracking-wider mb-2">Character Building</h3>
                                <p className="text-xs text-gray-400 font-sans leading-relaxed">
                                    Develop real-world leadership qualities, organizational capabilities, secular vision, courage, and self-reliance traits.
                                </p>
                            </div>
                            <span className="text-[9px] font-mono text-ncc-olive font-bold mt-4 tracking-widest">// CHARACTER BUILDING</span>
                        </div>

                        {/* Benefit Card 4 */}
                        <div className="border border-ncc-olive/25 bg-[#0e130a]/80 p-6 rounded-xl relative hover:border-ncc-gold transition-all duration-300 flex flex-col justify-between group">
                            <div className="absolute top-0 left-0 w-2 h-2 border-t border-l border-ncc-gold"></div>
                            <div>
                                <div className="w-10 h-10 rounded bg-ncc-gold/10 border border-ncc-gold/20 flex items-center justify-center text-ncc-gold mb-4 group-hover:scale-110 transition-transform">
                                    <i className="fa-solid fa-bullseye"></i>
                                </div>
                                <h3 className="text-base font-bold font-heading text-white uppercase tracking-wider mb-2">Government Prefs</h3>
                                <p className="text-xs text-gray-400 font-sans leading-relaxed">
                                    Special bonus points and reservations in Paramilitary Forces, Central Police, and State Police recruitments across India.
                                </p>
                            </div>
                            <span className="text-[9px] font-mono text-ncc-olive font-bold mt-4 tracking-widest">// RECRUITMENT BONUS</span>
                        </div>

                    </div>

                </div>
            </section>

            {/* ── SECTOR 05: PERSONNEL ROLL (CHAIN OF COMMAND) ── */}
            <section id="sector-roll" className="py-24 px-6 relative z-10 border-t border-ncc-olive/15 bg-black/60">
                <div className="max-w-6xl mx-auto">
                    
                    {/* Header */}
                    <div className="text-center mb-16">
                        <div className="text-[10px] text-ncc-gold font-bold tracking-[0.25em] uppercase mb-1">SECTOR // 04</div>
                        <h2 className="text-2xl sm:text-3xl font-black font-heading text-white tracking-wider uppercase">Chain of Command</h2>
                        <div className="w-12 h-1 bg-ncc-gold mx-auto mt-3 rounded"></div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                        
                        {/* Personnel ANO */}
                        <div className="border border-ncc-olive/20 bg-[#0c1008]/80 p-5 rounded-xl text-center relative flex flex-col items-center">
                            <div className="absolute top-0 left-1/2 -translate-x-1/2 px-2.5 py-0.5 bg-ncc-gold text-black text-[8px] font-black uppercase tracking-widest rounded-b font-mono">
                                COMMANDER
                            </div>
                            {/* Placeholder/Avatar box */}
                            <div className="w-20 h-20 bg-ncc-olive/20 border border-ncc-olive/30 rounded-full flex items-center justify-center text-ncc-gold text-2xl mb-4 font-bold font-mono">
                                ANO
                            </div>
                            <h3 className="text-base font-bold font-heading text-white uppercase tracking-wide">Capt. Dr. R. Sridhar</h3>
                            <span className="text-[9px] text-ncc-gold font-bold font-mono tracking-widest uppercase mt-1">Associate NCC Officer</span>
                            <p className="text-[10px] text-gray-500 font-sans mt-3 leading-relaxed">
                                Heading the SASTRA Boys Contingent. Guiding physical drills, structural protocols, and camp activities.
                            </p>
                        </div>

                        {/* Personnel SUO */}
                        <div className="border border-ncc-olive/20 bg-[#0c1008]/80 p-5 rounded-xl text-center relative flex flex-col items-center">
                            <div className="absolute top-0 left-1/2 -translate-x-1/2 px-2.5 py-0.5 bg-ncc-red text-white text-[8px] font-black uppercase tracking-widest rounded-b font-mono">
                                CADET HQ
                            </div>
                            <div className="w-20 h-20 bg-ncc-olive/20 border border-ncc-olive/30 rounded-full flex items-center justify-center text-ncc-gold text-2xl mb-4 font-bold font-mono">
                                SUO
                            </div>
                            <h3 className="text-base font-bold font-heading text-white uppercase tracking-wide">Cadet Rank Holder</h3>
                            <span className="text-[9px] text-ncc-gold font-bold font-mono tracking-widest uppercase mt-1">Senior Under Officer</span>
                            <p className="text-[10px] text-gray-500 font-sans mt-3 leading-relaxed">
                                Chief student coordinator of the platoon. Leads parade drills and platoon management coordinates.
                            </p>
                        </div>

                        {/* Personnel JUO 1 */}
                        <div className="border border-ncc-olive/20 bg-[#0c1008]/80 p-5 rounded-xl text-center relative flex flex-col items-center">
                            <div className="w-20 h-20 bg-ncc-olive/20 border border-ncc-olive/30 rounded-full flex items-center justify-center text-ncc-gold text-2xl mb-4 font-bold font-mono">
                                JUO
                            </div>
                            <h3 className="text-base font-bold font-heading text-white uppercase tracking-wide">Platoon Leader A</h3>
                            <span className="text-[9px] text-ncc-gold font-bold font-mono tracking-widest uppercase mt-1">Junior Under Officer</span>
                            <p className="text-[10px] text-gray-500 font-sans mt-3 leading-relaxed">
                                Oversees training, drills coordination, and discipline maintenance within sector Alpha squads.
                            </p>
                        </div>

                        {/* Personnel JUO 2 */}
                        <div className="border border-ncc-olive/20 bg-[#0c1008]/80 p-5 rounded-xl text-center relative flex flex-col items-center">
                            <div className="w-20 h-20 bg-ncc-olive/20 border border-ncc-olive/30 rounded-full flex items-center justify-center text-ncc-gold text-2xl mb-4 font-bold font-mono">
                                JUO
                            </div>
                            <h3 className="text-base font-bold font-heading text-white uppercase tracking-wide">Platoon Leader B</h3>
                            <span className="text-[9px] text-ncc-gold font-bold font-mono tracking-widest uppercase mt-1">Junior Under Officer</span>
                            <p className="text-[10px] text-gray-500 font-sans mt-3 leading-relaxed">
                                Coordinates camps management, logistics, weapon details, and weapon drills drills.
                            </p>
                        </div>

                    </div>

                </div>
            </section>

            {/* ── SECTOR 06: RECONNAISSANCE GALLERY (OPERATIONAL GALLERY) ── */}
            <section id="sector-recon" className="py-24 px-6 relative z-10 border-t border-ncc-olive/15 bg-[#080c05]/95">
                <div className="max-w-6xl mx-auto">
                    
                    {/* Header */}
                    <div className="text-center mb-16">
                        <div className="text-[10px] text-ncc-gold font-bold tracking-[0.25em] uppercase mb-1">SECTOR // 05</div>
                        <h2 className="text-2xl sm:text-3xl font-black font-heading text-white tracking-wider uppercase">Reconnaissance Gallery</h2>
                        <div className="w-12 h-1 bg-ncc-gold mx-auto mt-3 rounded"></div>
                    </div>

                    {/* Gallery Grid */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                        
                        {/* Image 1 */}
                        <button 
                            onClick={() => setLightboxImage('/assets/images/ncc_camp_training.png')}
                            className="border border-ncc-olive/25 bg-[#0e130a]/80 p-2.5 rounded-xl overflow-hidden group text-left relative"
                        >
                            <div className="absolute top-4 right-4 bg-black/75 border border-ncc-olive/20 text-ncc-gold text-[7.5px] font-mono px-1.5 py-0.5 rounded z-10">
                                LOC: CAMP_TRG
                            </div>
                            <div className="aspect-video w-full overflow-hidden rounded-lg bg-black relative">
                                <img src="/assets/images/ncc_camp_training.png" alt="Camp Training" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                            </div>
                            <div className="mt-3 px-1.5">
                                <span className="text-[10px] font-bold text-white uppercase tracking-wider block font-heading">Camp Tactics Training</span>
                                <span className="text-[8px] text-gray-500 mt-1 block font-mono">RECON DATE: 2026-03-05</span>
                            </div>
                        </button>

                        {/* Image 2 */}
                        <button 
                            onClick={() => setLightboxImage('/assets/images/ncc_drill_parade.png')}
                            className="border border-ncc-olive/25 bg-[#0e130a]/80 p-2.5 rounded-xl overflow-hidden group text-left relative"
                        >
                            <div className="absolute top-4 right-4 bg-black/75 border border-ncc-olive/20 text-ncc-gold text-[7.5px] font-mono px-1.5 py-0.5 rounded z-10">
                                LOC: PARADE_GRD
                            </div>
                            <div className="aspect-video w-full overflow-hidden rounded-lg bg-black relative">
                                <img src="/assets/images/ncc_drill_parade.png" alt="Parade Drill" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                            </div>
                            <div className="mt-3 px-1.5">
                                <span className="text-[10px] font-bold text-white uppercase tracking-wider block font-heading">Ceremonial Foot Drill</span>
                                <span className="text-[8px] text-gray-500 mt-1 block font-mono">RECON DATE: 2026-03-12</span>
                            </div>
                        </button>

                        {/* Image 3 */}
                        <button 
                            onClick={() => setLightboxImage('/assets/images/ncc_guard_honour.png')}
                            className="border border-ncc-olive/25 bg-[#0e130a]/80 p-2.5 rounded-xl overflow-hidden group text-left relative"
                        >
                            <div className="absolute top-4 right-4 bg-black/75 border border-ncc-olive/20 text-ncc-gold text-[7.5px] font-mono px-1.5 py-0.5 rounded z-10">
                                LOC: GD_HONOUR
                            </div>
                            <div className="aspect-video w-full overflow-hidden rounded-lg bg-black relative">
                                <img src="/assets/images/ncc_guard_honour.png" alt="Guard of Honour" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                            </div>
                            <div className="mt-3 px-1.5">
                                <span className="text-[10px] font-bold text-white uppercase tracking-wider block font-heading">Guard of Honour Inspection</span>
                                <span className="text-[8px] text-gray-500 mt-1 block font-mono">RECON DATE: 2026-04-18</span>
                            </div>
                        </button>

                        {/* Image 4 */}
                        <button 
                            onClick={() => setLightboxImage('/assets/images/ncc_social_service.png')}
                            className="border border-ncc-olive/25 bg-[#0e130a]/80 p-2.5 rounded-xl overflow-hidden group text-left relative"
                        >
                            <div className="absolute top-4 right-4 bg-black/75 border border-ncc-olive/20 text-ncc-gold text-[7.5px] font-mono px-1.5 py-0.5 rounded z-10">
                                LOC: DIS_MGT
                            </div>
                            <div className="aspect-video w-full overflow-hidden rounded-lg bg-black relative">
                                <img src="/assets/images/ncc_social_service.png" alt="Social Service" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                            </div>
                            <div className="mt-3 px-1.5">
                                <span className="text-[10px] font-bold text-white uppercase tracking-wider block font-heading">Community Relief Services</span>
                                <span className="text-[8px] text-gray-500 mt-1 block font-mono">RECON DATE: 2026-05-01</span>
                            </div>
                        </button>

                    </div>

                </div>
            </section>

            {/* ── SECTOR 07: COMMAND TERMINAL (REGISTRATION & CONTACT) ── */}
            <section id="sector-terminal" className="py-24 px-6 relative z-10 border-t border-ncc-olive/15 bg-black/70">
                <div className="max-w-5xl mx-auto">
                    
                    {/* Header */}
                    <div className="text-center mb-12">
                        <div className="text-[10px] text-ncc-gold font-bold tracking-[0.25em] uppercase mb-1">SECTOR // 06</div>
                        <h2 className="text-2xl sm:text-3xl font-black font-heading text-white tracking-wider uppercase">Direct Enlistment Terminal</h2>
                        <div className="w-12 h-1 bg-ncc-gold mx-auto mt-3 rounded"></div>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-stretch">
                        
                        {/* Terminal input console Form */}
                        <div className="lg:col-span-7 border border-ncc-olive/30 bg-[#0c1008]/85 p-6 rounded-2xl relative shadow-2xl">
                            {/* Brackets */}
                            <div className="absolute top-0 left-0 w-3 h-3 border-t border-l border-ncc-gold"></div>
                            <div className="absolute top-0 right-0 w-3 h-3 border-t border-r border-ncc-gold"></div>
                            <div className="absolute bottom-0 left-0 w-3 h-3 border-b border-l border-ncc-gold"></div>
                            <div className="absolute bottom-0 right-0 w-3 h-3 border-b border-r border-ncc-gold"></div>

                            <form onSubmit={handleTerminalSubmit} className="flex flex-col gap-4 font-sans text-xs">
                                <div className="text-[9.5px] text-ncc-gold font-mono font-bold tracking-widest uppercase border-b border-ncc-olive/15 pb-2 mb-2">
                                    // CADET IDENTITY ENLISTMENT DATA
                                </div>

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
                                    <label className="text-ncc-olive uppercase tracking-wider font-bold">Reason for Enlistment (Brief statement)</label>
                                    <textarea 
                                        rows={3}
                                        value={reason} 
                                        onChange={e => setReason(e.target.value)} 
                                        className="bg-black/60 border border-ncc-olive/30 rounded p-2.5 text-white font-mono outline-none focus:border-ncc-gold transition-all resize-none"
                                        placeholder="Describe your motivation..."
                                    ></textarea>
                                </div>

                                <button 
                                    type="submit"
                                    disabled={isSubmitting}
                                    className={`w-full py-3 border font-bold text-center tracking-widest uppercase transition-all duration-300 ${
                                        isSubmitting 
                                            ? 'border-ncc-olive/40 bg-ncc-olive/5 text-gray-500 cursor-not-allowed'
                                            : 'border-ncc-gold bg-ncc-gold text-black hover:bg-transparent hover:text-ncc-gold'
                                    }`}
                                >
                                    {isSubmitting ? "TRANSMITTING DATA..." : "TRANSMIT DATA PACKET"}
                                </button>
                            </form>
                        </div>

                        {/* Terminal telemetry output log box */}
                        <div className="lg:col-span-5 border border-ncc-olive/30 bg-[#060904]/90 p-5 rounded-2xl flex flex-col justify-between shadow-inner relative font-mono text-[10px]">
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
                            <div className="flex-grow overflow-y-auto max-h-[170px] flex flex-col gap-2 font-mono text-ncc-khaki pr-1">
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
