'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import AnimatedCounter from '@/components/AnimatedCounter';
import GalleryLightbox from '@/components/GalleryLightbox';
import MobileNav from '@/components/MobileNav';
import { getPublicEvents } from '@/app/actions';

/* ═══════════════════════════════════════════════
   MEMBER AND GALLERY DATA
   ═══════════════════════════════════════════════ */

const GALLERY_IMAGES = [
    { src: '/assets/images/ncc_drill_parade.png', alt: 'NCC Cadets performing synchronized ceremonial parade on campus field.', category: 'Parades' },
    { src: '/assets/images/ncc_camp_training.png', alt: 'Outdoor training campsite with obstacle courses.', category: 'Camps' },
    { src: '/assets/images/ncc_guard_honour.png', alt: 'Ceremonial Guard of Honour formation with rifles at attention.', category: 'Parades' },
    { src: '/assets/images/ncc_social_service.png', alt: 'Cadets planting tree saplings for community green initiative.', category: 'Special Events' },
    { src: '/assets/images/ncc_camp_training.png', alt: 'Cadets during physical conditioning and fitness training.', category: 'Camps' },
    { src: '/assets/images/ncc_guard_honour.png', alt: 'National flag salute ceremony at SASTRA grounds.', category: 'Cultural' },
    { src: '/assets/images/ncc_social_service.png', alt: 'Cadets participating in a local blood donation drive.', category: 'Special Events' },
    { src: '/assets/images/ncc_drill_parade.png', alt: 'Platoon formations preparing for inspection.', category: 'Parades' },
    { src: '/assets/images/ncc_camp_training.png', alt: 'Cadets learning mapping and navigation in a camp session.', category: 'Training' },
];

const GALLERY_CATEGORIES = ['All', 'Camps', 'Parades', 'Cultural', 'Training', 'Special Events'];

const TIMELINE_DATA = [
    { year: '2019', batch: 'Batch 1', title: 'The Beginning', image: '/assets/images/ncc_drill_parade.png', description: 'SASTRA NCC Army Wing was established under 06/34 (TN) INDEP COY, Thanjavur. The first cadets enrolled, laying the foundation.' },
    { year: '2020', batch: 'Batch 2', title: 'Building Resilience', image: '/assets/images/ncc_camp_training.png', description: 'Despite COVID-19 challenges, the contingent continued with virtual training and adapted to new norms.' },
    { year: '2021', batch: 'Batch 3', title: 'Rising Strong', image: '/assets/images/ncc_guard_honour.png', description: 'First set of cadets completed B & C certificates. Representation in state-level camps increased.' },
    { year: '2022', batch: 'Batch 4', title: 'Growing Glory', image: '/assets/images/ncc_social_service.png', description: 'Cadets participated in Republic Day Camp selections and various national integration camps.' },
    { year: '2023', batch: 'Batch 5', title: 'Digital Leap', image: '/assets/images/ncc_camp_training.png', description: 'The batch that built this digital platform for the contingent. Multiple camp participations and increased visibility.' },
    { year: '2024', batch: 'Batch 6', title: 'Expanding Horizons', image: '/assets/images/ncc_drill_parade.png', description: 'Record number of camp participations. Cadets excelled in drill, shooting, and cultural competitions.' },
    { year: '2025–26', batch: 'Batch 7', title: 'The Current Legacy', image: '/assets/images/ncc_guard_honour.png', description: 'The current serving batch continues the tradition of excellence, discipline, and national service.' },
];

const NAV_ITEMS = [
    { label: 'Home', href: '#home' },
    { label: 'About', href: '#about' },
    { label: 'Legacy', href: '#legacy' },
    { label: 'Achievements', href: '#achievements' },
    { label: 'Gallery', href: '#gallery' },
    { label: 'Events', href: '#events' },
    { label: 'Contact', href: '#contact' },
];

export default function Home() {
    const [scrolled, setScrolled] = useState(false);
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
    const [galleryFilter, setGalleryFilter] = useState('All');
    const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
    const [activeBatchIndex, setActiveBatchIndex] = useState(TIMELINE_DATA.length - 1);
    const [events, setEvents] = useState<any[]>([]);
    const [loadingEvents, setLoadingEvents] = useState(true);

    // Fetch public events from backend
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

    // Scroll detection for navbar
    useEffect(() => {
        const handleScroll = () => setScrolled(window.scrollY > 80);
        window.addEventListener('scroll', handleScroll);
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    // Intersection Observer for reveal animations
    useEffect(() => {
        const observer = new IntersectionObserver(
            (entries) => {
                entries.forEach((entry) => {
                    if (entry.isIntersecting) {
                        entry.target.classList.add('visible');
                    }
                });
            },
            { threshold: 0.1, rootMargin: '0px 0px -50px 0px' }
        );

        document.querySelectorAll('.reveal, .reveal-left, .reveal-right').forEach((el) => {
            observer.observe(el);
        });

        return () => observer.disconnect();
    }, []);

    // Parallax effect for hero
    useEffect(() => {
        const handleParallax = () => {
            const hero = document.getElementById('hero-video');
            if (hero) {
                hero.style.transform = `translateY(${window.scrollY * 0.4}px)`;
            }
        };
        window.addEventListener('scroll', handleParallax);
        return () => window.removeEventListener('scroll', handleParallax);
    }, []);

    const filteredGallery =
        galleryFilter === 'All'
            ? GALLERY_IMAGES
            : GALLERY_IMAGES.filter((img) => img.category === galleryFilter);

    // Generate particles
    const particles = Array.from({ length: 25 }, (_, i) => ({
        id: i,
        left: Math.random() * 100,
        delay: Math.random() * 10,
        duration: 8 + Math.random() * 12,
        size: 2 + Math.random() * 3,
    }));

    return (
        <main className="min-h-screen bg-[#0c1008] text-gray-200 overflow-x-hidden font-body relative tacops-grid">
            <div className="hud-scanner"></div>

            {/* Ambient Aurora Spots */}
            <div className="absolute top-[8%] left-[5%] w-[450px] h-[450px] bg-ncc-red/8 rounded-full filter blur-[130px] pointer-events-none animate-aurora z-0"></div>
            <div className="absolute top-[32%] right-[5%] w-[550px] h-[550px] bg-ncc-navy/15 rounded-full filter blur-[160px] pointer-events-none animate-aurora delay-500 z-0"></div>
            <div className="absolute top-[58%] left-[8%] w-[500px] h-[500px] bg-ncc-sky/10 rounded-full filter blur-[140px] pointer-events-none animate-aurora delay-1000 z-0"></div>
            <div className="absolute bottom-[8%] right-[10%] w-[400px] h-[400px] bg-ncc-gold/5 rounded-full filter blur-[120px] pointer-events-none animate-aurora delay-1500 z-0"></div>

            {/* ── STICKY NAVBAR ── */}
            <nav
                className={`fixed w-full z-50 transition-all duration-500 ${
                    scrolled
                        ? 'bg-[#0e130a]/90 border-b border-ncc-olive/30 backdrop-blur-md shadow-xl py-2.5'
                        : 'bg-transparent shadow-none py-5'
                }`}
            >
                <div className="w-full px-4 md:px-8 flex justify-between items-center relative">
                    {/* Logos + Branding */}
                    <Link href="/" className="flex items-center gap-2 md:gap-3 group">
                        <img src="/assets/images/sastra-logo.png" alt="SASTRA" className="h-10 md:h-12 drop-shadow-sm group-hover:scale-105 transition-transform" />
                        <img src="/assets/images/sastra-40-logo.png" alt="SASTRA 40" className="h-10 md:h-12 drop-shadow-sm group-hover:scale-105 transition-transform" />
                        <img src="/assets/images/ncc-logo.png" alt="NCC" className="h-10 md:h-12 drop-shadow-sm group-hover:scale-105 transition-transform" />
                        <div className="flex flex-col ml-1">
                            <span className="font-heading font-extrabold text-lg md:text-xl leading-none text-white tracking-tight">
                                SASTRA <span className="text-ncc-red">NCC</span>
                            </span>
                            <span className="text-[8px] md:text-[9px] font-bold tracking-[0.25em] uppercase text-ncc-gold mt-1">
                                Army Wing
                            </span>
                        </div>
                    </Link>

                    {/* Desktop Nav */}
                    <div className="hidden lg:flex items-center gap-6 xl:gap-8">
                        {NAV_ITEMS.map((item) => (
                            <a
                                key={item.label}
                                href={item.href}
                                className="font-heading text-[11px] font-bold uppercase tracking-wider text-white/80 hover:text-ncc-gold relative py-2 transition-all duration-300 block after:content-[''] after:absolute after:bottom-0 after:left-1/2 after:w-0 after:h-[2px] after:bg-ncc-red after:transition-all hover:after:w-full hover:after:left-0"
                            >
                                {item.label}
                            </a>
                        ))}
                        <Link
                            href="/login"
                            className="px-6 py-2.5 border border-ncc-gold/40 bg-ncc-gold/10 text-ncc-gold rounded-xl font-heading font-extrabold uppercase tracking-wider text-[11px] transition-all hover:bg-ncc-gold hover:text-ncc-navy hover:scale-105 active:scale-95 shadow-md shadow-ncc-gold/10"
                        >
                            Portal Login
                        </Link>
                    </div>

                    {/* Mobile Hamburger */}
                    <button
                        onClick={() => setMobileMenuOpen(true)}
                        className="lg:hidden text-white hover:text-ncc-red text-2xl transition-colors"
                    >
                        <i className="fas fa-bars"></i>
                    </button>
                </div>
            </nav>

            <MobileNav isOpen={mobileMenuOpen} onClose={() => setMobileMenuOpen(false)} navItems={NAV_ITEMS} />

            {/* ── CINEMATIC HERO SECTION ── */}
            <section id="home" className="relative h-screen flex items-center justify-center overflow-hidden bg-[#090d06]">
                {/* Video Background with Parallax */}
                <div className="absolute inset-0 z-0">
                    <video
                        id="hero-video"
                        autoPlay
                        muted
                        loop
                        playsInline
                        className="absolute inset-0 w-full h-[120%] object-cover opacity-[0.35] mix-blend-luminosity"
                    >
                        <source src="/assets/videos/drill.mp4" type="video/mp4" />
                    </video>
                    {/* Immersive overlay gradients & patterns */}
                    <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-[#0e140a]/50 to-[#0c1008]"></div>
                    <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(74,93,35,0.03)_1px,transparent_1px),linear-gradient(to_bottom,rgba(74,93,35,0.03)_1px,transparent_1px)] bg-[size:4rem_4rem]"></div>
                </div>

                {/* Compass target reticle inside background */}
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-20 z-0 select-none">
                    <div className="w-[85vw] h-[85vw] max-w-[850px] max-h-[850px] border border-dashed border-ncc-olive/40 rounded-full animate-compass"></div>
                    <div className="absolute w-[65vw] h-[65vw] max-w-[650px] max-h-[650px] border border-double border-ncc-gold/25 rounded-full animate-compass [animation-direction:reverse] flex items-center justify-center">
                        {/* Crosshair indicator marks */}
                        <div className="absolute w-full h-[1px] bg-ncc-olive/20"></div>
                        <div className="absolute h-full w-[1px] bg-ncc-olive/20"></div>
                    </div>
                </div>

                {/* Particle Overlay */}
                <div className="absolute inset-0 z-[1] overflow-hidden pointer-events-none">
                    {particles.map((p) => (
                        <div
                            key={p.id}
                            className="particle"
                            style={{
                                left: `${p.left}%`,
                                bottom: '-10px',
                                width: `${p.size}px`,
                                height: `${p.size}px`,
                                animationDelay: `${p.delay}s`,
                                animationDuration: `${p.duration}s`,
                                background: 'rgba(212, 175, 55, 0.4)'
                            }}
                        />
                    ))}
                </div>

                {/* Hero Content */}
                <div className="relative z-10 text-center max-w-5xl px-4">
                    <div className="inline-flex items-center gap-2 glass-tactical px-6 md:px-8 py-3.5 rounded-full text-ncc-gold font-bold text-xs md:text-sm mb-6 animate-fade-up tracking-wider shadow-lg">
                        <i className="fas fa-star text-ncc-red animate-pulse"></i>
                        <span className="font-heading uppercase tracking-widest text-[10px] md:text-xs">06/34 (TN) INDEP COY, NCC (ARMY), THANJAVUR</span>
                        <i className="fas fa-star text-ncc-red animate-pulse"></i>
                    </div>

                    <h1 className="font-heading text-5xl sm:text-6xl md:text-8xl lg:text-9xl font-extrabold mb-6 tracking-tight leading-none animate-fade-up delay-100 uppercase">
                        <span className="text-transparent bg-clip-text bg-gradient-to-r from-ncc-olive via-ncc-khaki to-white">Unity and</span><br />
                        <span className="text-transparent bg-clip-text bg-gradient-to-r from-ncc-gold via-amber-500 to-yellow-200 animate-text-glow">Discipline</span>
                    </h1>

                    <p className="text-xs md:text-base text-gray-300 font-medium mb-10 tracking-widest uppercase animate-fade-up delay-300 max-w-2xl mx-auto">
                        Forging Leaders for Tomorrow at SASTRA Deemed University
                    </p>

                    <div className="flex flex-col sm:flex-row gap-4 justify-center animate-fade-up delay-400">
                        <a
                            href="#about"
                            className="bg-[#4A5D23] text-white border-2 border-[#4A5D23] px-10 py-4 rounded-xl font-heading font-bold uppercase tracking-wider hover:bg-transparent hover:text-[#4A5D23] shadow-lg shadow-[#4A5D23]/30 transition-all duration-300 transform hover:-translate-y-1 text-xs md:text-sm flex items-center justify-center gap-2"
                        >
                            <i className="fas fa-shield-halved"></i> Explore Our Legacy
                        </a>
                        <Link
                            href="/login"
                            className="bg-transparent text-white border-2 border-ncc-gold/40 px-10 py-4 rounded-xl font-heading font-bold uppercase tracking-wider hover:bg-ncc-gold hover:text-black hover:border-ncc-gold transition-all duration-300 transform hover:-translate-y-1 text-xs md:text-sm flex items-center justify-center gap-2"
                        >
                            <i className="fas fa-sign-in-alt"></i> Cadet Login
                        </Link>
                    </div>
                </div>

                {/* Scroll Indicator */}
                <div className="absolute bottom-8 left-1/2 -translate-x-1/2 z-10 animate-scroll-bounce">
                    <a href="#about" className="text-white/40 hover:text-white/80 transition-colors flex flex-col items-center gap-2">
                        <span className="text-[10px] uppercase tracking-[0.3em] font-bold">Scroll</span>
                        <i className="fas fa-chevron-down text-lg"></i>
                    </a>
                </div>
            </section>

            {/* ── STAT COUNTERS BAR ── */}
            <section className="bg-[#10160d]/80 border-t border-b border-ncc-olive/20 py-12 md:py-16 relative overflow-hidden z-20 backdrop-blur-sm">
                <div className="absolute inset-0 opacity-10">
                    <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(74,93,35,0.12)_1px,transparent_1px),linear-gradient(to_bottom,rgba(74,93,35,0.12)_1px,transparent_1px)] bg-[size:3rem_3rem]"></div>
                </div>
                <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-ncc-olive via-ncc-gold to-ncc-red"></div>
                <div className="max-w-6xl mx-auto px-6 relative z-10">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
                        <AnimatedCounter end={200} suffix="+" label="Cadets Trained" icon="fas fa-users" />
                        <AnimatedCounter end={15} suffix="+" label="Camps Attended" icon="fas fa-campground" />
                        <AnimatedCounter end={7} suffix="" label="Years of Excellence" icon="fas fa-award" />
                        <AnimatedCounter end={50} suffix="+" label="Achievements" icon="fas fa-medal" />
                    </div>
                </div>
            </section>

            {/* ── SECTION: ABOUT NCC ── */}
            <section id="about" className="py-24 md:py-32 relative z-20">
                <div className="max-w-7xl mx-auto px-6">
                    <div className="text-center mb-20 reveal">
                        <span className="block text-ncc-gold font-bold uppercase tracking-[0.2em] text-xs mb-2">Who We Are</span>
                        <h2 className="font-heading text-4xl md:text-5xl font-extrabold text-white uppercase">The National Cadet Corps</h2>
                        <div className="w-20 h-1 bg-ncc-gold mx-auto mt-4 rounded-full"></div>
                    </div>

                    {/* Core Values Cards Row */}
                    <div className="grid md:grid-cols-3 gap-8 mb-24">
                        {/* Aim Card */}
                        <div className="bg-[#131b0f]/45 backdrop-blur-md border border-ncc-olive/30 p-8 md:p-10 rounded-3xl shadow-xl hover:-translate-y-2.5 transition-all duration-500 flex flex-col items-center text-center relative overflow-hidden group reveal">
                            <div className="absolute top-0 left-0 right-0 h-1.5 bg-ncc-red"></div>
                            
                            {/* HUD Gold corners */}
                            <div className="absolute inset-0 pointer-events-none rounded-3xl">
                                <div className="absolute top-0 left-0 w-3 h-3 border-t-2 border-l-2 border-ncc-gold/40 rounded-tl-lg" />
                                <div className="absolute top-0 right-0 w-3 h-3 border-t-2 border-r-2 border-ncc-gold/40 rounded-tr-lg" />
                                <div className="absolute bottom-0 left-0 w-3 h-3 border-b-2 border-l-2 border-ncc-gold/40 rounded-bl-lg" />
                                <div className="absolute bottom-0 right-0 w-3 h-3 border-b-2 border-r-2 border-ncc-gold/40 rounded-br-lg" />
                            </div>

                            <div className="w-16 h-16 rounded-2xl bg-ncc-olive/20 text-ncc-gold border border-ncc-olive/40 flex items-center justify-center text-2xl mb-6 mx-auto group-hover:bg-[#4A5D23] group-hover:text-white transition-all duration-500 shadow-inner">
                                <i className="fas fa-bullseye"></i>
                            </div>
                            <h3 className="font-heading text-xl md:text-2xl font-bold text-ncc-gold mb-4 uppercase tracking-wide">The Aim</h3>
                            <p className="text-gray-300 leading-relaxed text-xs">
                                To develop character, comradeship, discipline, leadership, secular outlook, spirit of adventure, and ideals of selfless service amongst the youth of the country.
                            </p>
                        </div>

                        {/* Vision Card */}
                        <div className="bg-[#131b0f]/45 backdrop-blur-md border border-ncc-olive/30 p-8 md:p-10 rounded-3xl shadow-xl hover:-translate-y-2.5 transition-all duration-500 flex flex-col items-center text-center relative overflow-hidden group reveal delay-100">
                            <div className="absolute top-0 left-0 right-0 h-1.5 bg-ncc-sky"></div>
                            
                            {/* HUD Gold corners */}
                            <div className="absolute inset-0 pointer-events-none rounded-3xl">
                                <div className="absolute top-0 left-0 w-3 h-3 border-t-2 border-l-2 border-ncc-gold/40 rounded-tl-lg" />
                                <div className="absolute top-0 right-0 w-3 h-3 border-t-2 border-r-2 border-ncc-gold/40 rounded-tr-lg" />
                                <div className="absolute bottom-0 left-0 w-3 h-3 border-b-2 border-l-2 border-ncc-gold/40 rounded-bl-lg" />
                                <div className="absolute bottom-0 right-0 w-3 h-3 border-b-2 border-r-2 border-ncc-gold/40 rounded-br-lg" />
                            </div>

                            <div className="w-16 h-16 rounded-2xl bg-ncc-olive/20 text-ncc-gold border border-ncc-olive/40 flex items-center justify-center text-2xl mb-6 mx-auto group-hover:bg-[#4A5D23] group-hover:text-white transition-all duration-500 shadow-inner">
                                <i className="fas fa-eye"></i>
                            </div>
                            <h3 className="font-heading text-xl md:text-2xl font-bold text-ncc-gold mb-4 uppercase tracking-wide">The Vision</h3>
                            <p className="text-gray-300 leading-relaxed text-xs">
                                To create a human resource of organized, trained, and motivated youth to provide leadership in all walks of life and be always available for the service of the nation.
                            </p>
                        </div>

                        {/* Motto Card */}
                        <div className="bg-[#131b0f]/45 backdrop-blur-md border border-ncc-olive/30 p-8 md:p-10 rounded-3xl shadow-xl hover:-translate-y-2.5 transition-all duration-500 flex flex-col items-center text-center relative overflow-hidden group reveal delay-200">
                            <div className="absolute top-0 left-0 right-0 h-1.5 bg-ncc-gold"></div>
                            
                            {/* HUD Gold corners */}
                            <div className="absolute inset-0 pointer-events-none rounded-3xl">
                                <div className="absolute top-0 left-0 w-3 h-3 border-t-2 border-l-2 border-ncc-gold/40 rounded-tl-lg" />
                                <div className="absolute top-0 right-0 w-3 h-3 border-t-2 border-r-2 border-ncc-gold/40 rounded-tr-lg" />
                                <div className="absolute bottom-0 left-0 w-3 h-3 border-b-2 border-l-2 border-ncc-gold/40 rounded-bl-lg" />
                                <div className="absolute bottom-0 right-0 w-3 h-3 border-b-2 border-r-2 border-ncc-gold/40 rounded-br-lg" />
                            </div>

                            <div className="w-16 h-16 rounded-2xl bg-ncc-olive/20 text-ncc-gold border border-ncc-olive/40 flex items-center justify-center text-2xl mb-6 mx-auto group-hover:bg-[#4A5D23] group-hover:text-white transition-all duration-500 shadow-inner">
                                <i className="fas fa-flag"></i>
                            </div>
                            <h3 className="font-heading text-xl md:text-2xl font-bold text-ncc-gold mb-4 uppercase tracking-wide">The Motto</h3>
                            <p className="text-gray-300 leading-relaxed text-xs">
                                <strong className="text-ncc-gold">&quot;Unity and Discipline&quot;</strong> (एकता और अनुशासन) — adopted on 12th October 1980 during the 12th Central Advisory Committee meeting.
                            </p>
                        </div>
                    </div>

                    {/* About Detail */}
                    <div className="grid md:grid-cols-2 gap-16 items-center">
                        <div className="reveal-left">
                            <div className="relative rounded-3xl overflow-hidden shadow-2xl border border-ncc-olive/35 h-80 md:h-[400px] p-1.5 bg-[#131b0f]/20">
                                <div className="absolute inset-0 pointer-events-none rounded-3xl z-10">
                                    <div className="absolute top-0 left-0 w-4 h-4 border-t-2 border-l-2 border-ncc-gold/60 rounded-tl-lg" />
                                    <div className="absolute top-0 right-0 w-4 h-4 border-t-2 border-r-2 border-ncc-gold/60 rounded-tr-lg" />
                                    <div className="absolute bottom-0 left-0 w-4 h-4 border-b-2 border-l-2 border-ncc-gold/60 rounded-bl-lg" />
                                    <div className="absolute bottom-0 right-0 w-4 h-4 border-b-2 border-r-2 border-ncc-gold/60 rounded-br-lg" />
                                </div>
                                <img 
                                    src="/assets/images/ncc_drill_parade.png" 
                                    alt="NCC Cadets Parade" 
                                    className="w-full h-full object-cover transition-transform duration-700 hover:scale-105 rounded-2xl"
                                />
                                {/* Tricolor top border highlight */}
                                <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-ncc-red via-ncc-gold to-ncc-sky"></div>
                                {/* Subtle dark gradient overlay at the bottom */}
                                <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent"></div>
                            </div>
                        </div>
                        <div className="reveal-right">
                            <h3 className="font-heading text-3xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-white via-gray-200 to-ncc-khaki mb-6 uppercase tracking-wider">
                                Guarding the Legacy of Honour
                            </h3>
                            <p className="text-gray-300 leading-relaxed mb-4 text-xs md:text-sm">
                                The National Cadet Corps (NCC) is the premier youth organization of India, providing high-standard exposure to military drill, physical fitness, field craft, and adventure. 
                            </p>
                            <p className="text-gray-300 leading-relaxed mb-4 text-xs md:text-sm">
                                Formed through an Act of Parliament in 1948, the NCC has served as a primary pathway for building discipline and patriotic values among university graduates, training them to lead during national and community emergencies.
                            </p>
                            <p className="text-gray-300 leading-relaxed text-xs md:text-sm">
                                The NCC Army Wing at SASTRA Deemed University, working under the **06/34 (TN) INDEP COY, Thanjavur**, instills structural leadership training, organizing regular blood donations, environment camps, and Republic Day selections.
                            </p>
                        </div>
                    </div>
                </div>
            </section>

            {/* ── IMMERSIVE PLEDGE SECTION ── */}
            <section className="bg-transparent py-20 md:py-28 relative overflow-hidden border-t border-b border-ncc-olive/20 z-20">
                <div className="absolute inset-0 opacity-15">
                    <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(212,175,55,0.1)_0%,transparent_70%)]"></div>
                    <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(74,93,35,0.04)_1px,transparent_1px),linear-gradient(to_bottom,rgba(74,93,35,0.04)_1px,transparent_1px)] bg-[size:3rem_3rem]"></div>
                </div>
                <div className="max-w-4xl mx-auto px-6 text-center relative z-10 reveal">
                    <div className="w-16 h-16 rounded-2xl bg-ncc-olive/15 text-ncc-gold border border-ncc-olive/35 flex items-center justify-center text-3xl mb-8 mx-auto shadow-inner">
                        <i className="fas fa-hand-fist"></i>
                    </div>
                    <h2 className="font-heading text-3xl md:text-4xl font-extrabold text-white mb-8 tracking-wider uppercase">
                        The NCC Pledge
                    </h2>
                    <div className="relative p-8 md:p-12 bg-[#131b0f]/35 border border-ncc-olive/20 rounded-3xl backdrop-blur-md shadow-2xl">
                        {/* HUD Gold corners */}
                        <div className="absolute inset-0 pointer-events-none rounded-3xl">
                            <div className="absolute top-0 left-0 w-4 h-4 border-t-2 border-l-2 border-ncc-gold/40 rounded-tl-lg" />
                            <div className="absolute top-0 right-0 w-4 h-4 border-t-2 border-r-2 border-ncc-gold/40 rounded-tr-lg" />
                            <div className="absolute bottom-0 left-0 w-4 h-4 border-b-2 border-l-2 border-ncc-gold/40 rounded-bl-lg" />
                            <div className="absolute bottom-0 right-0 w-4 h-4 border-b-2 border-r-2 border-ncc-gold/40 rounded-br-lg" />
                        </div>
                        <div className="absolute -top-3 -left-3 text-ncc-gold/10 text-7xl font-serif">&ldquo;</div>
                        <div className="absolute -bottom-10 -right-3 text-ncc-gold/10 text-7xl font-serif">&rdquo;</div>
                        <blockquote className="text-gray-300 text-base md:text-xl leading-relaxed italic space-y-6 text-center">
                            <p>We the cadets of the National Cadet Corps, do solemnly pledge that we shall always uphold the unity of India.</p>
                            <p>We resolve to be disciplined and responsible citizens of our nation.</p>
                            <p>We shall undertake positive community service in the service of the nation.</p>
                            <p>We shall not participate in or encourage any activity that tends to create disharmony in our society.</p>
                            <p className="text-ncc-gold font-heading font-extrabold not-italic text-2xl tracking-widest mt-8 drop-shadow-[0_0_15px_rgba(212,175,55,0.3)]">
                                JAI HIND 🇮🇳
                            </p>
                        </blockquote>
                    </div>
                </div>
            </section>

            {/* ── LEGACY TIMELINE ── */}
            <section id="legacy" className="py-24 md:py-32 relative z-20">
                <div className="max-w-5xl mx-auto px-6">
                    <div className="text-center mb-16 reveal">
                        <span className="block text-ncc-gold font-bold uppercase tracking-[0.2em] text-xs mb-2">Our Journey</span>
                        <h2 className="font-heading text-4xl md:text-5xl font-extrabold text-white uppercase">Contingent Legacy</h2>
                        <p className="text-gray-400 text-xs mt-3 max-w-lg mx-auto">From the inaugural Batch 1 to our active serving Batch 7, maintaining a proud heritage of academic-military service.</p>
                        <div className="w-20 h-1 bg-ncc-gold mx-auto mt-4 rounded-full"></div>
                    </div>

                    {/* Step Track */}
                    <div className="relative max-w-3xl mx-auto mb-16 px-4">
                        {/* Background track line */}
                        <div className="absolute top-5 left-4 right-4 h-0.5 bg-[#2d4224]/30 z-0"></div>
                        {/* Progress line */}
                        <div 
                            className="absolute top-5 left-4 h-0.5 bg-gradient-to-r from-ncc-olive via-ncc-gold to-ncc-red z-0 transition-all duration-700 ease-out" 
                            style={{ width: `calc(${(activeBatchIndex / (TIMELINE_DATA.length - 1)) * 100}% - ${(activeBatchIndex / (TIMELINE_DATA.length - 1)) * 32}px)` }}
                        ></div>

                        {/* Interactive Step Buttons */}
                        <div className="flex justify-between items-center relative z-10 overflow-x-auto scrollbar-none gap-2">
                            {TIMELINE_DATA.map((item, idx) => {
                                const isActive = idx === activeBatchIndex;
                                const isPassed = idx < activeBatchIndex;
                                return (
                                    <button
                                        key={item.batch}
                                        onClick={() => setActiveBatchIndex(idx)}
                                        className="flex flex-col items-center group focus:outline-none flex-shrink-0"
                                    >
                                        <div className={`w-10 h-10 rounded-full flex items-center justify-center font-heading font-extrabold text-xs transition-all duration-300 border-2 ${
                                            isActive 
                                                ? 'bg-[#4A5D23] border-ncc-gold text-ncc-gold scale-110 shadow-[0_0_15px_rgba(212,175,55,0.35)]' 
                                                : isPassed 
                                                    ? 'bg-[#131b0f] border-ncc-olive text-[#88aa66]' 
                                                    : 'bg-[#0e130a]/50 border-ncc-olive/20 text-gray-500 group-hover:border-ncc-olive/40'
                                        }`}>
                                            {item.year.split('–')[0]}
                                        </div>
                                        <span className={`text-[9px] font-bold uppercase tracking-wider mt-2 transition-colors duration-300 ${
                                            isActive ? 'text-ncc-gold font-extrabold' : 'text-gray-500 group-hover:text-gray-300'
                                        }`}>
                                            {item.batch.split(' ')[1] ? `B${item.batch.split(' ')[1]}` : item.batch}
                                        </span>
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                    {/* Active Content Card */}
                    <div className="max-w-4xl mx-auto">
                        <div className="bg-[#131b0f]/35 backdrop-blur-md p-8 md:p-10 rounded-3xl border border-ncc-olive/20 shadow-2xl relative overflow-hidden transition-all duration-500 transform hover:scale-[1.005]">
                            {/* HUD Gold corners */}
                            <div className="absolute inset-0 pointer-events-none rounded-3xl">
                                <div className="absolute top-0 left-0 w-4 h-4 border-t-2 border-l-2 border-ncc-gold/40 rounded-tl-lg" />
                                <div className="absolute top-0 right-0 w-4 h-4 border-t-2 border-r-2 border-ncc-gold/40 rounded-tr-lg" />
                                <div className="absolute bottom-0 left-0 w-4 h-4 border-b-2 border-l-2 border-ncc-gold/40 rounded-bl-lg" />
                                <div className="absolute bottom-0 right-0 w-4 h-4 border-b-2 border-r-2 border-ncc-gold/40 rounded-br-lg" />
                            </div>
                            
                            {/* Accent stripe */}
                            <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-ncc-olive via-ncc-gold to-ncc-red"></div>
                            
                            <div className="flex flex-col md:flex-row gap-8 items-center">
                                {/* Left Side: Text Details */}
                                <div className="flex-grow">
                                    <div className="flex items-center gap-3 mb-4 flex-wrap">
                                        <span className="text-[10px] font-extrabold uppercase tracking-widest text-[#ff6b6b] bg-red-950/40 border border-[#b22222]/35 px-3.5 py-1 rounded-full">
                                            {TIMELINE_DATA[activeBatchIndex].batch}
                                        </span>
                                        <span className="text-[10px] font-extrabold uppercase tracking-widest text-ncc-gold bg-amber-950/40 border border-ncc-gold/30 px-3.5 py-1 rounded-full">
                                            {TIMELINE_DATA[activeBatchIndex].year}
                                        </span>
                                    </div>
                                    <h3 className="font-heading text-2xl md:text-3xl font-extrabold text-white mb-4 leading-tight">
                                        {TIMELINE_DATA[activeBatchIndex].title}
                                    </h3>
                                    <p className="text-gray-300 text-xs md:text-sm leading-relaxed transition-all duration-300">
                                        {TIMELINE_DATA[activeBatchIndex].description}
                                    </p>
                                </div>

                                {/* Right Side: Glowing Octagonal Image Preview */}
                                <div className="w-full md:w-64 flex-shrink-0 flex items-center justify-center">
                                    <div className="relative w-48 h-48 md:w-56 md:h-56 rounded-2xl overflow-hidden border-2 border-ncc-gold shadow-2xl group/legacy-img">
                                        <img 
                                            src={TIMELINE_DATA[activeBatchIndex].image} 
                                            alt={TIMELINE_DATA[activeBatchIndex].title} 
                                            className="w-full h-full object-cover transition-transform duration-700 hover:scale-105"
                                        />
                                        <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent"></div>
                                        <div className="absolute bottom-4 left-4 right-4 text-center">
                                            <span className="text-white font-heading font-black text-3xl md:text-4xl tracking-tighter select-none opacity-80">
                                                {TIMELINE_DATA[activeBatchIndex].year}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* ── ACHIEVEMENTS SECTION ── */}
            <section id="achievements" className="py-24 md:py-32 bg-[#10160d]/90 border-t border-b border-ncc-olive/20 relative overflow-hidden z-20 backdrop-blur-sm">
                <div className="absolute inset-0 opacity-10 pointer-events-none">
                    <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(74,93,35,0.12)_1px,transparent_1px),linear-gradient(to_bottom,rgba(74,93,35,0.12)_1px,transparent_1px)] bg-[size:3rem_3rem]"></div>
                </div>
                <div className="max-w-7xl mx-auto px-6 relative z-10">
                    <div className="text-center mb-20 reveal">
                        <span className="block text-ncc-gold font-bold uppercase tracking-[0.2em] text-xs mb-2">Our Glory</span>
                        <h2 className="font-heading text-4xl md:text-5xl font-extrabold text-white uppercase">Honours & Medals</h2>
                        <div className="w-20 h-1 bg-ncc-gold mx-auto mt-4 rounded-full"></div>
                    </div>

                    {/* Stats Highlights */}
                    <div className="bg-[#131b0f]/35 border border-ncc-olive/25 rounded-2xl p-6 md:p-8 mb-16 relative overflow-hidden reveal">
                        {/* HUD Gold corners */}
                        <div className="absolute inset-0 pointer-events-none rounded-2xl">
                            <div className="absolute top-0 left-0 w-3 h-3 border-t-2 border-l-2 border-ncc-gold/40 rounded-tl-lg" />
                            <div className="absolute top-0 right-0 w-3 h-3 border-t-2 border-r-2 border-ncc-gold/40 rounded-tr-lg" />
                            <div className="absolute bottom-0 left-0 w-3 h-3 border-b-2 border-l-2 border-ncc-gold/40 rounded-bl-lg" />
                            <div className="absolute bottom-0 right-0 w-3 h-3 border-b-2 border-r-2 border-ncc-gold/40 rounded-br-lg" />
                        </div>
                        
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
                            {[
                                { num: '15+', label: 'Camp Participations', icon: 'fas fa-campground' },
                                { num: '3', label: 'RDC Selections', icon: 'fas fa-trophy' },
                                { num: '200+', label: 'Cadets Trained', icon: 'fas fa-user-graduate' },
                                { num: '50+', label: 'Awards Won', icon: 'fas fa-medal' },
                            ].map((s) => (
                                <div key={s.label} className="group">
                                    <i className={`${s.icon} text-ncc-gold text-2xl mb-2 group-hover:scale-110 transition-transform`}></i>
                                    <div className="font-heading text-2xl md:text-3xl font-extrabold text-ncc-gold">{s.num}</div>
                                    <div className="text-gray-300 text-[9px] uppercase tracking-widest font-mono font-semibold mt-1">{s.label}</div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Achievement Cards */}
                    <div className="grid md:grid-cols-3 gap-6">
                        {[
                            { title: 'Best Cadet Award', cat: 'Individual', desc: 'Outstanding cadet recognized at state-level competitions for exemplary discipline and leadership.', icon: 'fas fa-star' },
                            { title: 'Annual Training Camps', cat: 'Camp', desc: 'Consistent participation in ATC and CATC with cadets earning B and C certificates.', icon: 'fas fa-campground' },
                            { title: 'Republic Day Parade', cat: 'National', desc: 'Cadets selected for RDC selections, representing Tamil Nadu directorate at national level.', icon: 'fas fa-flag' },
                            { title: 'Social Service', cat: 'Community', desc: 'Blood donation drives, tree plantation campaigns, and Swachh Bharat activities organized regularly.', icon: 'fas fa-hands-helping' },
                            { title: 'Shooting & Sports', cat: 'Sports', desc: 'Cadets excelled in firing practices and inter-unit sports competitions across multiple disciplines.', icon: 'fas fa-bullseye' },
                            { title: 'Cultural Competitions', cat: 'Cultural', desc: 'Winning entries in national integration, debate, and cultural events at group and directorate levels.', icon: 'fas fa-music' },
                        ].map((ach, i) => (
                            <div
                                key={ach.title}
                                className="bg-[#131b0f]/35 border border-ncc-olive/20 p-8 rounded-3xl hover:-translate-y-2.5 transition-all duration-300 hover:border-ncc-gold/40 hover:shadow-2xl group reveal relative overflow-hidden"
                                style={{ transitionDelay: `${i * 100}ms` }}
                            >
                                {/* HUD Gold corners */}
                                <div className="absolute inset-0 pointer-events-none rounded-3xl">
                                    <div className="absolute top-0 left-0 w-3 h-3 border-t-2 border-l-2 border-ncc-gold/40 rounded-tl-lg" />
                                    <div className="absolute top-0 right-0 w-3 h-3 border-t-2 border-r-2 border-ncc-gold/40 rounded-tr-lg" />
                                    <div className="absolute bottom-0 left-0 w-3 h-3 border-b-2 border-l-2 border-ncc-gold/40 rounded-bl-lg" />
                                    <div className="absolute bottom-0 right-0 w-3 h-3 border-b-2 border-r-2 border-ncc-gold/40 rounded-br-lg" />
                                </div>

                                <div className="w-14 h-14 rounded-2xl bg-ncc-olive/10 text-ncc-gold border border-ncc-olive/20 flex items-center justify-center text-2xl mb-6 group-hover:bg-[#4A5D23] group-hover:text-white transition-all duration-500 shadow-inner">
                                    <i className={ach.icon}></i>
                                </div>
                                <span className="text-ncc-gold text-[10px] font-bold uppercase tracking-[0.2em]">{ach.cat}</span>
                                <h3 className="font-heading text-xl font-extrabold text-white mt-2 mb-3 leading-snug">{ach.title}</h3>
                                <p className="text-gray-300 text-xs leading-relaxed">{ach.desc}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* ── GALLERY SECTION ── */}
            <section id="gallery" className="py-24 md:py-32 relative z-20">
                <div className="max-w-7xl mx-auto px-6">
                    <div className="text-center mb-16 reveal">
                        <span className="block text-ncc-gold font-bold uppercase tracking-[0.2em] text-xs mb-2">Memories</span>
                        <h2 className="font-heading text-4xl md:text-5xl font-extrabold text-white uppercase">Contingent Logs</h2>
                        <p className="text-gray-400 text-xs mt-3">Moments captured during camps, parades, and social service initiatives.</p>
                        <div className="w-20 h-1 bg-ncc-gold mx-auto mt-4 rounded-full"></div>
                    </div>

                    {/* Category Tabs */}
                    <div className="flex flex-wrap justify-center gap-2 md:gap-3 mb-12 reveal">
                        {GALLERY_CATEGORIES.map((cat) => (
                            <button
                                key={cat}
                                onClick={() => setGalleryFilter(cat)}
                                className={`px-5 py-2 rounded-full text-xs font-bold uppercase tracking-wider transition-all border ${
                                    galleryFilter === cat
                                        ? 'bg-[#4A5D23] border-[#4A5D23] text-white shadow-lg shadow-[#4A5D23]/30'
                                        : 'bg-[#131b0f]/40 border-ncc-olive/35 text-gray-400 hover:bg-[#131b0f] hover:text-white'
                                }`}
                            >
                                {cat}
                            </button>
                        ))}
                    </div>

                    {/* Masonry Grid */}
                    <div className="masonry-grid">
                        {filteredGallery.map((img, i) => (
                            <div
                                key={`${img.alt}-${i}`}
                                onClick={() => setLightboxIndex(i)}
                                className="relative group cursor-pointer rounded-3xl overflow-hidden shadow-md hover:shadow-2xl hover:scale-[1.03] transition-all duration-500 reveal border border-ncc-olive/25 bg-[#131b0f]/20 p-1.5"
                            >
                                <div className="absolute inset-0 pointer-events-none rounded-3xl z-10">
                                    <div className="absolute top-1 left-1 w-3 h-3 border-t border-l border-ncc-gold/50 rounded-tl-lg" />
                                    <div className="absolute top-1 right-1 w-3 h-3 border-t border-r border-ncc-gold/50 rounded-tr-lg" />
                                    <div className="absolute bottom-1 left-1 w-3 h-3 border-b border-l border-ncc-gold/50 rounded-bl-lg" />
                                    <div className="absolute bottom-1 right-1 w-3 h-3 border-b border-r border-ncc-gold/50 rounded-br-lg" />
                                </div>
                                <div className={`relative overflow-hidden w-full rounded-2xl ${
                                    i % 3 === 0 ? 'h-72' : i % 3 === 1 ? 'h-52' : 'h-64'
                                }`}>
                                    <img
                                        src={img.src}
                                        alt={img.alt}
                                        className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                                    />
                                    {/* Gradient overlay */}
                                    <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/35 to-transparent opacity-75 group-hover:opacity-90 transition-opacity duration-300"></div>
                                    
                                    {/* Magnifying search glass on hover */}
                                    <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-300 transform scale-95 group-hover:scale-100">
                                        <div className="w-12 h-12 rounded-full bg-[#4A5D23] text-white flex items-center justify-center text-lg shadow-xl shadow-[#4A5D23]/30">
                                            <i className="fas fa-search-plus"></i>
                                        </div>
                                    </div>
                                </div>
                                <div className="absolute bottom-0 left-0 right-0 p-6 z-10 pointer-events-none transform translate-y-2 group-hover:translate-y-0 transition-transform duration-300">
                                    <span className="text-ncc-gold font-heading text-[10px] font-bold tracking-widest uppercase bg-[#0e130a]/80 px-2.5 py-1 rounded-md backdrop-blur-sm border border-ncc-olive/20">{img.category}</span>
                                    <p className="text-white font-heading font-bold text-sm mt-3 leading-tight drop-shadow-md">{img.alt}</p>
                                </div>
                            </div>
                        ))}
                    </div>

                    <div className="text-center mt-10 reveal">
                        <p className="text-gray-400 text-xs italic">More media records are currently being archived.</p>
                    </div>
                </div>
            </section>

            {/* Gallery Lightbox */}
            {lightboxIndex !== null && (
                <GalleryLightbox
                    images={filteredGallery}
                    currentIndex={lightboxIndex}
                    onClose={() => setLightboxIndex(null)}
                    onNavigate={(i) => setLightboxIndex(i)}
                />
            )}

            {/* ── COMMAND TEAM (LEADERSHIP) ── */}
            <section className="py-24 md:py-32 bg-[#10160d]/90 border-t border-ncc-olive/20 relative overflow-hidden z-20 backdrop-blur-sm">
                <div className="absolute inset-0 opacity-15">
                    <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_70%,rgba(74,93,35,0.25)_0%,transparent_50%),radial-gradient(circle_at_70%_30%,rgba(212,175,55,0.15)_0%,transparent_50%)]"></div>
                </div>
                <div className="max-w-5xl mx-auto px-6 relative z-10">
                    <div className="text-center mb-20 reveal">
                        <span className="block text-ncc-gold font-bold uppercase tracking-[0.2em] text-xs mb-2">Command Staff</span>
                        <h2 className="font-heading text-4xl md:text-5xl font-extrabold text-white uppercase">Our Leadership</h2>
                        <div className="w-20 h-1 bg-ncc-gold mx-auto mt-4 rounded-full"></div>
                    </div>

                    <div className="grid md:grid-cols-2 gap-8">
                        {/* ANO Card */}
                        <div className="bg-[#131b0f]/35 border border-ncc-olive/20 rounded-3xl p-10 text-center hover:border-ncc-gold/40 hover:-translate-y-2.5 transition-all duration-500 reveal shadow-2xl relative overflow-hidden group backdrop-blur-md">
                            {/* HUD Gold corners */}
                            <div className="absolute inset-0 pointer-events-none rounded-3xl z-10">
                                <div className="absolute top-0 left-0 w-3.5 h-3.5 border-t-2 border-l-2 border-ncc-gold/40 rounded-tl-lg" />
                                <div className="absolute top-0 right-0 w-3.5 h-3.5 border-t-2 border-r-2 border-ncc-gold/40 rounded-tr-lg" />
                                <div className="absolute bottom-0 left-0 w-3.5 h-3.5 border-b-2 border-l-2 border-ncc-gold/40 rounded-bl-lg" />
                                <div className="absolute bottom-0 right-0 w-3.5 h-3.5 border-b-2 border-r-2 border-ncc-gold/40 rounded-br-lg" />
                            </div>

                            <div className="absolute top-0 left-0 right-0 h-1.5 bg-ncc-gold"></div>
                            
                            <div className="w-24 h-24 mx-auto rounded-2xl bg-ncc-olive/10 border-2 border-ncc-gold/40 flex items-center justify-center mb-6 shadow-xl relative overflow-hidden group-hover:border-ncc-gold transition-colors duration-300">
                                <div className="absolute inset-0 bg-gradient-to-tr from-ncc-gold/5 to-transparent"></div>
                                <i className="fas fa-user-tie text-4xl text-ncc-gold animate-float relative z-10"></i>
                            </div>

                            <span className="text-ncc-gold text-[10px] font-bold uppercase tracking-[0.2em] bg-ncc-olive/15 border border-ncc-olive/35 px-3.5 py-1 rounded-full">Associate NCC Officer</span>
                            <h3 className="font-heading text-2xl font-bold text-white mt-4">Capt. ANO Officer</h3>
                            <p className="text-gray-300 text-xs mt-4 leading-relaxed italic border-t border-ncc-olive/20 pt-4">
                                &ldquo;NCC teaches you the values that shape your entire life — discipline, service, and love for the nation.&rdquo;
                            </p>
                        </div>

                        {/* SUO Card */}
                        <div className="bg-[#131b0f]/35 border border-ncc-olive/20 rounded-3xl p-10 text-center hover:border-ncc-gold/40 hover:-translate-y-2.5 transition-all duration-500 reveal delay-100 shadow-2xl relative overflow-hidden group backdrop-blur-md">
                            {/* HUD Gold corners */}
                            <div className="absolute inset-0 pointer-events-none rounded-3xl z-10">
                                <div className="absolute top-0 left-0 w-3.5 h-3.5 border-t-2 border-l-2 border-ncc-gold/40 rounded-tl-lg" />
                                <div className="absolute top-0 right-0 w-3.5 h-3.5 border-t-2 border-r-2 border-ncc-gold/40 rounded-tr-lg" />
                                <div className="absolute bottom-0 left-0 w-3.5 h-3.5 border-b-2 border-l-2 border-ncc-gold/40 rounded-bl-lg" />
                                <div className="absolute bottom-0 right-0 w-3.5 h-3.5 border-b-2 border-r-2 border-ncc-gold/40 rounded-br-lg" />
                            </div>

                            <div className="absolute top-0 left-0 right-0 h-1.5 bg-ncc-gold"></div>
                            
                            <div className="w-24 h-24 mx-auto rounded-2xl bg-ncc-olive/10 border-2 border-ncc-gold/40 flex items-center justify-center mb-6 shadow-xl relative overflow-hidden group-hover:border-ncc-gold transition-colors duration-300">
                                <div className="absolute inset-0 bg-gradient-to-tr from-ncc-gold/5 to-transparent"></div>
                                <i className="fas fa-user-shield text-4xl text-ncc-gold animate-float relative z-10"></i>
                            </div>

                            <span className="text-ncc-gold text-[10px] font-bold uppercase tracking-[0.2em] bg-ncc-olive/15 border border-ncc-olive/35 px-3.5 py-1 rounded-full">Senior Under Officer</span>
                            <h3 className="font-heading text-2xl font-bold text-white mt-4">SUO Command Team</h3>
                            <p className="text-gray-300 text-xs mt-4 leading-relaxed italic border-t border-ncc-olive/20 pt-4">
                                &ldquo;Leading from the front, serving with pride. NCC is not just an activity — it&apos;s a way of life.&rdquo;
                            </p>
                        </div>
                    </div>
                </div>
            </section>

            {/* ── EVENTS SECTION (Calendar Tear-Off Sheets) ── */}
            <section id="events" className="py-24 md:py-32 relative z-20">
                <div className="max-w-7xl mx-auto px-6">
                    <div className="text-center mb-20 reveal">
                        <span className="block text-ncc-gold font-bold uppercase tracking-[0.2em] text-xs mb-2">Stay Updated</span>
                        <h2 className="font-heading text-4xl md:text-5xl font-extrabold text-white uppercase">Unit Training Calendar</h2>
                        <div className="w-20 h-1 bg-ncc-gold mx-auto mt-4 rounded-full"></div>
                    </div>

                    <div className="grid md:grid-cols-2 gap-8">
                        {loadingEvents ? (
                            Array.from({ length: 4 }).map((_, idx) => (
                                <div
                                    key={idx}
                                    className="bg-[#131b0f]/25 border border-ncc-olive/20 rounded-3xl overflow-hidden flex flex-col sm:flex-row animate-pulse shadow-sm"
                                >
                                    <div className="w-full sm:w-32 bg-[#131b0f]/15 border-r border-ncc-olive/15 flex flex-col justify-center items-center p-6 relative">
                                        <div className="absolute top-0 left-0 right-0 h-1 bg-ncc-olive/30"></div>
                                        <div className="h-3 w-10 bg-ncc-olive/20 rounded mb-2"></div>
                                        <div className="h-8 w-12 bg-ncc-olive/30 rounded mb-2"></div>
                                        <div className="h-3 w-12 bg-ncc-olive/20 rounded"></div>
                                    </div>
                                    <div className="p-6 flex-grow flex flex-col justify-between">
                                        <div>
                                            <div className="flex items-center gap-2 mb-3">
                                                <div className="h-4 w-16 bg-ncc-olive/20 rounded"></div>
                                                <div className="h-3 w-12 bg-ncc-olive/15 rounded"></div>
                                            </div>
                                            <div className="h-6 w-3/4 bg-ncc-olive/20 rounded mb-2"></div>
                                        </div>
                                        <div className="h-4 w-1/3 bg-ncc-olive/20 rounded mt-4"></div>
                                    </div>
                                </div>
                            ))
                        ) : (() => {
                            const localDate = new Date();
                            const year = localDate.getFullYear();
                            const month = String(localDate.getMonth() + 1).padStart(2, '0');
                            const day = String(localDate.getDate()).padStart(2, '0');
                            const todayStr = `${year}-${month}-${day}`;

                            const upcomingEvents = events
                                .filter(ev => ev.date >= todayStr)
                                .sort((a, b) => a.date.localeCompare(b.date));
                                
                            const completedEvents = events
                                .filter(ev => ev.date < todayStr)
                                .sort((a, b) => b.date.localeCompare(a.date));
                                
                            const orderedEvents = [...upcomingEvents, ...completedEvents];

                            if (orderedEvents.length === 0) {
                                return (
                                    <div className="col-span-full py-16 text-center bg-[#131b0f]/35 border border-ncc-olive/20 rounded-3xl shadow-sm max-w-lg mx-auto">
                                        <div className="w-16 h-16 bg-ncc-olive/10 border border-ncc-olive/20 rounded-2xl flex items-center justify-center mx-auto mb-6 text-ncc-gold">
                                            <i className="fas fa-calendar-times text-3xl"></i>
                                        </div>
                                        <h3 className="text-xl font-heading font-extrabold text-white mb-2">No Training Events Scheduled</h3>
                                        <p className="text-gray-300 text-sm max-w-sm mx-auto px-4">
                                            There are currently no events or camps on the training calendar. Please check back later for updates from the ANO.
                                        </p>
                                    </div>
                                );
                            }

                            return orderedEvents.map((ev) => {
                                const dateObj = new Date(ev.date);
                                const dayNum = dateObj.getDate();
                                const monthName = dateObj.toLocaleString('default', { month: 'short' }).toUpperCase();
                                const yearNum = dateObj.getFullYear();
                                const isUpcoming = ev.date >= todayStr;
                                const status = isUpcoming ? 'Upcoming' : 'Completed';

                                return (
                                    <div
                                        key={ev.id}
                                        className="bg-[#131b0f]/35 border border-ncc-olive/20 rounded-3xl shadow-sm overflow-hidden hover:border-ncc-gold/45 hover:shadow-2xl hover:-translate-y-1 transition-all duration-300 reveal group flex flex-col sm:flex-row backdrop-blur-md relative"
                                    >
                                        {/* HUD Gold corners */}
                                        <div className="absolute inset-0 pointer-events-none rounded-3xl z-10">
                                            <div className="absolute top-0 left-0 w-3 h-3 border-t-2 border-l-2 border-ncc-gold/40 rounded-tl-lg" />
                                            <div className="absolute top-0 right-0 w-3 h-3 border-t-2 border-r-2 border-ncc-gold/40 rounded-tr-lg" />
                                            <div className="absolute bottom-0 left-0 w-3 h-3 border-b-2 border-l-2 border-ncc-gold/40 rounded-bl-lg" />
                                            <div className="absolute bottom-0 right-0 w-3 h-3 border-b-2 border-r-2 border-ncc-gold/40 rounded-br-lg" />
                                        </div>

                                        {/* Calendar Sheet Date Badge */}
                                        <div className="w-full sm:w-32 bg-[#131b0f]/25 border-r border-ncc-olive/25 flex flex-col justify-center items-center p-6 relative">
                                            <div className="absolute top-0 left-0 right-0 h-1 bg-ncc-gold"></div>
                                            <span className="text-[10px] font-bold text-gray-300 tracking-widest">{monthName}</span>
                                            <span className="text-4xl font-heading font-extrabold text-white leading-none my-1">{dayNum}</span>
                                            <span className="text-[10px] font-bold text-gray-300 tracking-wider">{yearNum}</span>
                                        </div>

                                        {/* Event Details */}
                                        <div className="p-6 flex-grow flex flex-col justify-between">
                                            <div>
                                                <div className="flex items-center gap-2 mb-2">
                                                    <span className={`text-[9px] font-bold px-2 py-0.5 rounded uppercase tracking-wider ${
                                                        isUpcoming ? 'bg-amber-950/40 border border-ncc-gold/30 text-ncc-gold' : 'bg-gray-900 border border-ncc-olive/20 text-gray-400'
                                                    }`}>{status}</span>
                                                    <span className="text-gray-400 text-[10px] font-semibold uppercase">{ev.type}</span>
                                                </div>
                                                <h3 className="font-heading text-lg font-bold text-white mb-3 group-hover:text-ncc-gold transition-colors">{ev.title}</h3>
                                            </div>
                                            <div className="flex items-center gap-2 text-xs font-semibold text-gray-300 mt-2">
                                                <i className="fas fa-map-marker-alt text-ncc-gold"></i>
                                                <span>{ev.location}</span>
                                            </div>
                                        </div>
                                    </div>
                                );
                            });
                        })()}
                    </div>
                </div>
            </section>

            {/* ── FOOTER SECTION ── */}
            <footer id="contact" className="bg-[#0a0d06] text-white relative overflow-hidden border-t border-ncc-olive/25 z-20">
                <div className="h-1 bg-gradient-to-r from-ncc-olive via-ncc-gold to-ncc-red"></div>

                <div className="max-w-7xl mx-auto px-6 py-16">
                    <div className="grid md:grid-cols-3 gap-12">
                        {/* Brand info */}
                        <div>
                            <div className="flex items-center gap-3 mb-4">
                                <img src="/assets/images/ncc-logo.png" alt="NCC" className="h-12" />
                                <div>
                                    <h3 className="font-heading text-2xl font-bold">SASTRA NCC</h3>
                                    <p className="text-ncc-gold text-[10px] tracking-[0.2em] uppercase">Army Wing</p>
                                </div>
                            </div>
                            <p className="text-gray-300 text-xs leading-relaxed mb-6">
                                06/34 (TN) INDEP COY, NCC (ARMY), THANJAVUR<br />
                                Forging leaders through Unity and Discipline since 2019.
                            </p>
                            <div className="flex gap-3">
                                <a href="#" className="w-10 h-10 rounded-xl bg-ncc-olive/10 border border-ncc-olive/35 flex items-center justify-center hover:bg-ncc-gold hover:text-black transition-all duration-300 text-sm text-ncc-gold">
                                    <i className="fab fa-instagram"></i>
                                </a>
                                <a href="#" className="w-10 h-10 rounded-xl bg-ncc-olive/10 border border-ncc-olive/35 flex items-center justify-center hover:bg-ncc-gold hover:text-black transition-all duration-300 text-sm text-ncc-gold">
                                    <i className="fab fa-twitter"></i>
                                </a>
                                <a href="#" className="w-10 h-10 rounded-xl bg-ncc-olive/10 border border-ncc-olive/35 flex items-center justify-center hover:bg-ncc-gold hover:text-black transition-all duration-300 text-sm text-ncc-gold">
                                    <i className="fab fa-linkedin-in"></i>
                                </a>
                            </div>
                        </div>

                        {/* Quick Navigation links */}
                        <div>
                            <h4 className="font-heading text-lg font-bold mb-4 text-ncc-gold uppercase tracking-wider">Navigation</h4>
                            <div className="space-y-2">
                                {['About NCC', 'Our Legacy', 'Achievements', 'Gallery', 'Events', 'Cadet Login'].map((link) => (
                                    <a key={link} href={link === 'Cadet Login' ? '/login' : `#${link.toLowerCase().replace(/\s/g, '')}`} className="block text-gray-300 hover:text-ncc-gold text-xs transition-colors">
                                        <i className="fas fa-chevron-right text-ncc-gold text-[8px] mr-2"></i>
                                        {link}
                                    </a>
                                ))}
                            </div>
                        </div>

                        {/* Office contacts */}
                        <div>
                            <h4 className="font-heading text-lg font-bold mb-4 text-ncc-gold uppercase tracking-wider">Contact Us</h4>
                            <div className="space-y-3 text-gray-300 text-xs">
                                <p className="flex items-start gap-3">
                                    <i className="fas fa-map-marker-alt text-ncc-gold mt-1"></i>
                                    NCC Office, SASTRA Deemed University, Thanjavur, Tamil Nadu — 613401
                                </p>
                                <p className="flex items-center gap-3">
                                    <i className="fas fa-envelope text-ncc-gold"></i>
                                    ncc@sastra.ac.in
                                </p>
                                <p className="flex items-center gap-3">
                                    <i className="fas fa-globe text-ncc-gold"></i>
                                    <a href="https://indiancc.nic.in" target="_blank" rel="noopener noreferrer" className="hover:text-[#4A5D23] transition-colors">
                                        indiancc.nic.in (Official NCC)
                                    </a>
                                </p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Bottom copyright stripe */}
                <div className="border-t border-ncc-olive/20 py-6 text-center">
                    <p className="text-gray-400 text-xs">
                        &copy; 2026 SASTRA NCC Army Wing. All Rights Reserved.
                    </p>
                    <p className="text-ncc-gold font-heading font-extrabold text-sm mt-1.5 tracking-widest">
                        JAI HIND 🇮🇳
                    </p>
                </div>
            </footer>
        </main >
    );
}
