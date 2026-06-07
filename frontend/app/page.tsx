'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import AnimatedCounter from '@/components/AnimatedCounter';
import GalleryLightbox from '@/components/GalleryLightbox';
import MobileNav from '@/components/MobileNav';

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
    { year: '2019', batch: 'Batch 1', title: 'The Beginning', description: 'SASTRA NCC Army Wing was established under 06/34 (TN) INDEP COY, Thanjavur. The first cadets enrolled, laying the foundation.' },
    { year: '2020', batch: 'Batch 2', title: 'Building Resilience', description: 'Despite COVID-19 challenges, the contingent continued with virtual training and adapted to new norms.' },
    { year: '2021', batch: 'Batch 3', title: 'Rising Strong', description: 'First set of cadets completed B & C certificates. Representation in state-level camps increased.' },
    { year: '2022', batch: 'Batch 4', title: 'Growing Glory', description: 'Cadets participated in Republic Day Camp selections and various national integration camps.' },
    { year: '2023', batch: 'Batch 5', title: 'Digital Leap', description: 'The batch that built this digital platform for the contingent. Multiple camp participations and increased visibility.' },
    { year: '2024', batch: 'Batch 6', title: 'Expanding Horizons', description: 'Record number of camp participations. Cadets excelled in drill, shooting, and cultural competitions.' },
    { year: '2025–26', batch: 'Batch 7', title: 'The Current Legacy', description: 'The current serving batch continues the tradition of excellence, discipline, and national service.' },
];

const UPCOMING_EVENTS = [
    { id: 1, title: 'Annual Training Camp (ATC)', date: '2026-03-15', location: 'NCC Campsite, Thanjavur', type: 'Camp', status: 'Upcoming' },
    { id: 2, title: 'Combined Annual Training Camp (CATC)', date: '2026-04-01', location: 'NCC Group HQ, Trichy', type: 'Camp', status: 'Upcoming' },
    { id: 3, title: 'Republic Day Rehearsal Parade', date: '2026-01-20', location: 'SASTRA Main Ground', type: 'Parade', status: 'Completed' },
    { id: 4, title: 'NCC Day Celebrations', date: '2025-11-22', location: 'SASTRA Auditorium', type: 'Event', status: 'Completed' },
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
        <main className="min-h-screen bg-white text-gray-900 overflow-x-hidden font-body">

            {/* ── STICKY NAVBAR ── */}
            <nav
                className={`fixed w-full z-50 transition-all duration-500 ${
                    scrolled
                        ? 'bg-ncc-navy/95 border-b border-white/10 backdrop-blur-md shadow-xl py-2.5'
                        : 'bg-transparent shadow-none py-5'
                }`}
            >
                <div className="w-full px-4 md:px-8 flex justify-between items-center">
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
            <section id="home" className="relative h-screen flex items-center justify-center overflow-hidden bg-ncc-dark">
                {/* Video Background with Parallax */}
                <div className="absolute inset-0 z-0">
                    <video
                        id="hero-video"
                        autoPlay
                        muted
                        loop
                        playsInline
                        className="absolute inset-0 w-full h-[120%] object-cover opacity-[0.45]"
                    >
                        <source src="/assets/videos/drill.mp4" type="video/mp4" />
                    </video>
                    {/* Immersive overlay gradients & patterns */}
                    <div className="absolute inset-0 bg-gradient-to-b from-black/50 via-[#002147]/45 to-[#051122]/95"></div>
                    <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(255,255,255,0.025)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.025)_1px,transparent_1px)] bg-[size:4rem_4rem]"></div>
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
                            }}
                        />
                    ))}
                </div>

                {/* Hero Content */}
                <div className="relative z-10 text-center max-w-5xl px-4">
                    <div className="inline-flex items-center gap-2 glass-navy px-6 md:px-8 py-3.5 rounded-full text-ncc-gold font-bold text-xs md:text-sm mb-6 animate-fade-up tracking-wider border border-ncc-gold/30 shadow-lg shadow-ncc-gold/5">
                        <i className="fas fa-star text-ncc-red animate-pulse"></i>
                        <span>06/34 (TN) INDEP COY, NCC (ARMY), THANJAVUR</span>
                        <i className="fas fa-star text-ncc-red animate-pulse"></i>
                    </div>

                    <h1 className="font-heading text-5xl sm:text-6xl md:text-8xl lg:text-9xl font-extrabold mb-6 tracking-tight leading-none animate-fade-up delay-100 uppercase">
                        <span className="text-transparent bg-clip-text bg-gradient-to-r from-ncc-sky via-[#e8f4fd] to-white">Unity and</span><br />
                        <span className="text-transparent bg-clip-text bg-gradient-to-r from-ncc-red via-red-500 to-[#ffb3b3] animate-text-glow">Discipline</span>
                    </h1>

                    <p className="text-sm md:text-lg text-gray-300 font-medium mb-10 tracking-widest uppercase animate-fade-up delay-300 max-w-2xl mx-auto">
                        Forging Leaders for Tomorrow at SASTRA Deemed University
                    </p>

                    <div className="flex flex-col sm:flex-row gap-4 justify-center animate-fade-up delay-400">
                        <a
                            href="#about"
                            className="bg-ncc-red text-white border-2 border-ncc-red px-10 py-4 rounded-xl font-heading font-bold uppercase tracking-wider hover:bg-transparent hover:text-ncc-red shadow-lg shadow-ncc-red/30 transition-all duration-300 transform hover:-translate-y-1 text-xs md:text-sm flex items-center justify-center gap-2"
                        >
                            <i className="fas fa-shield-halved"></i> Explore Our Legacy
                        </a>
                        <Link
                            href="/login"
                            className="bg-transparent text-white border-2 border-white/30 px-10 py-4 rounded-xl font-heading font-bold uppercase tracking-wider hover:bg-white hover:text-ncc-navy hover:border-white transition-all duration-300 transform hover:-translate-y-1 text-xs md:text-sm flex items-center justify-center gap-2"
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
            <section className="bg-ncc-navy border-t border-b border-white/5 py-12 md:py-16 relative overflow-hidden z-20">
                <div className="absolute inset-0 opacity-10">
                    <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:3rem_3rem]"></div>
                </div>
                <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-ncc-red via-ncc-gold to-ncc-sky"></div>
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
            <section id="about" className="py-24 md:py-32 bg-gradient-to-b from-white to-slate-50">
                <div className="max-w-7xl mx-auto px-6">
                    <div className="text-center mb-20 reveal">
                        <span className="block text-ncc-red font-bold uppercase tracking-[0.2em] text-xs mb-2">Who We Are</span>
                        <h2 className="font-heading text-4xl md:text-5xl font-extrabold text-ncc-navy uppercase">The National Cadet Corps</h2>
                        <div className="w-20 h-1 bg-ncc-red mx-auto mt-4 rounded-full"></div>
                    </div>

                    {/* Core Values Cards Row */}
                    <div className="grid md:grid-cols-3 gap-8 mb-24">
                        {/* Aim Card */}
                        <div className="bg-gradient-to-b from-[#0a0f1a] to-[#040810] p-8 md:p-10 rounded-3xl shadow-xl hover:-translate-y-2.5 transition-all duration-500 border border-white/5 flex flex-col items-center text-center relative overflow-hidden group reveal">
                            <div className="absolute top-0 left-0 right-0 h-1.5 bg-ncc-red"></div>
                            <div className="w-16 h-16 rounded-2xl bg-ncc-red/10 text-ncc-red border border-ncc-red/20 flex items-center justify-center text-2xl mb-6 mx-auto group-hover:bg-ncc-red group-hover:text-white transition-all duration-500 shadow-inner">
                                <i className="fas fa-bullseye"></i>
                            </div>
                            <h3 className="font-heading text-xl md:text-2xl font-bold text-white mb-4 uppercase tracking-wide">The Aim</h3>
                            <p className="text-gray-400 leading-relaxed text-xs">
                                To develop character, comradeship, discipline, leadership, secular outlook, spirit of adventure, and ideals of selfless service amongst the youth of the country.
                            </p>
                        </div>

                        {/* Vision Card */}
                        <div className="bg-gradient-to-b from-[#0a0f1a] to-[#040810] p-8 md:p-10 rounded-3xl shadow-xl hover:-translate-y-2.5 transition-all duration-500 border border-white/5 flex flex-col items-center text-center relative overflow-hidden group reveal delay-100">
                            <div className="absolute top-0 left-0 right-0 h-1.5 bg-ncc-sky"></div>
                            <div className="w-16 h-16 rounded-2xl bg-ncc-sky/10 text-ncc-sky border border-ncc-sky/20 flex items-center justify-center text-2xl mb-6 mx-auto group-hover:bg-ncc-sky group-hover:text-white transition-all duration-500 shadow-inner">
                                <i className="fas fa-eye"></i>
                            </div>
                            <h3 className="font-heading text-xl md:text-2xl font-bold text-white mb-4 uppercase tracking-wide">The Vision</h3>
                            <p className="text-gray-400 leading-relaxed text-xs">
                                To create a human resource of organized, trained, and motivated youth to provide leadership in all walks of life and be always available for the service of the nation.
                            </p>
                        </div>

                        {/* Motto Card */}
                        <div className="bg-gradient-to-b from-[#0a0f1a] to-[#040810] p-8 md:p-10 rounded-3xl shadow-xl hover:-translate-y-2.5 transition-all duration-500 border border-white/5 flex flex-col items-center text-center relative overflow-hidden group reveal delay-200">
                            <div className="absolute top-0 left-0 right-0 h-1.5 bg-ncc-gold"></div>
                            <div className="w-16 h-16 rounded-2xl bg-ncc-gold/10 text-ncc-gold border border-ncc-gold/20 flex items-center justify-center text-2xl mb-6 mx-auto group-hover:bg-ncc-gold group-hover:text-white transition-all duration-500 shadow-inner">
                                <i className="fas fa-flag"></i>
                            </div>
                            <h3 className="font-heading text-xl md:text-2xl font-bold text-white mb-4 uppercase tracking-wide">The Motto</h3>
                            <p className="text-gray-400 leading-relaxed text-xs">
                                <strong>&quot;Unity and Discipline&quot;</strong> (एकता और अनुशासन) — adopted on 12th October 1980 during the 12th Central Advisory Committee meeting.
                            </p>
                        </div>
                    </div>

                    {/* About Detail */}
                    <div className="grid md:grid-cols-2 gap-16 items-center">
                        <div className="reveal-left">
                            <div className="bg-gradient-to-br from-[#002147] to-[#051122] rounded-3xl p-8 md:p-12 flex items-center justify-center relative overflow-hidden border border-white/5 shadow-2xl">
                                <div className="absolute inset-0 opacity-10">
                                    <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(255,255,255,0.05)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.05)_1px,transparent_1px)] bg-[size:2rem_2rem]"></div>
                                </div>
                                <img src="/assets/images/ncc-logo.png" alt="NCC Crest" className="w-48 md:w-56 drop-shadow-[0_0_35px_rgba(210,16,52,0.3)] animate-float relative z-10" />
                            </div>
                        </div>
                        <div className="reveal-right">
                            <h3 className="font-heading text-3xl font-bold text-ncc-navy mb-6 uppercase tracking-wider">
                                Guarding the Legacy of Honour
                            </h3>
                            <p className="text-gray-600 leading-relaxed mb-4 text-xs md:text-sm">
                                The National Cadet Corps (NCC) is the premier youth organization of India, providing high-standard exposure to military drill, physical fitness, field craft, and adventure. 
                            </p>
                            <p className="text-gray-600 leading-relaxed mb-4 text-xs md:text-sm">
                                Formed through an Act of Parliament in 1948, the NCC has served as a primary pathway for building discipline and patriotic values among university graduates, training them to lead during national and community emergencies.
                            </p>
                            <p className="text-gray-600 leading-relaxed text-xs md:text-sm">
                                The NCC Army Wing at SASTRA Deemed University, working under the **06/34 (TN) INDEP COY, Thanjavur**, instills structural leadership training, organizing regular blood donations, environment camps, and Republic Day selections.
                            </p>
                        </div>
                    </div>
                </div>
            </section>

            {/* ── IMMERSIVE PLEDGE SECTION ── */}
            <section className="bg-gradient-to-b from-[#051122] to-[#010408] py-20 md:py-28 relative overflow-hidden border-t border-b border-white/5">
                <div className="absolute inset-0 opacity-15">
                    <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(212,175,55,0.15)_0%,transparent_70%)]"></div>
                    <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:3rem_3rem]"></div>
                </div>
                <div className="max-w-4xl mx-auto px-6 text-center relative z-10 reveal">
                    <div className="w-16 h-16 rounded-2xl bg-ncc-gold/10 text-ncc-gold border border-ncc-gold/20 flex items-center justify-center text-3xl mb-8 mx-auto shadow-inner">
                        <i className="fas fa-hand-fist"></i>
                    </div>
                    <h2 className="font-heading text-3xl md:text-4xl font-extrabold text-white mb-8 tracking-wider uppercase">
                        The NCC Pledge
                    </h2>
                    <div className="relative p-8 md:p-12 bg-white/5 border border-white/10 rounded-3xl backdrop-blur-md shadow-2xl">
                        <div className="absolute -top-3 -left-3 text-white/15 text-7xl font-serif">&ldquo;</div>
                        <div className="absolute -bottom-10 -right-3 text-white/15 text-7xl font-serif">&rdquo;</div>
                        <blockquote className="text-gray-300 text-base md:text-xl leading-relaxed italic space-y-6 text-center">
                            <p>We the cadets of the National Cadet Corps, do solemnly pledge that we shall always uphold the unity of India.</p>
                            <p>We resolve to be disciplined and responsible citizens of our nation.</p>
                            <p>We shall undertake positive community service in the service of the nation.</p>
                            <p>We shall not participate in or encourage any activity that tends to create disharmony in our society.</p>
                            <p className="text-ncc-gold font-heading font-extrabold not-italic text-2xl tracking-widest mt-8 drop-shadow-[0_0_15px_rgba(212,175,55,0.4)]">
                                JAI HIND 🇮🇳
                            </p>
                        </blockquote>
                    </div>
                </div>
            </section>

            {/* ── LEGACY TIMELINE ── */}
            <section id="legacy" className="py-24 md:py-32 bg-gradient-to-b from-gray-50 to-white">
                <div className="max-w-5xl mx-auto px-6">
                    <div className="text-center mb-20 reveal">
                        <span className="block text-ncc-red font-bold uppercase tracking-[0.2em] text-xs mb-2">Our Journey</span>
                        <h2 className="font-heading text-4xl md:text-5xl font-extrabold text-ncc-navy uppercase">Contingent Legacy</h2>
                        <p className="text-gray-500 text-xs mt-3 max-w-lg mx-auto">From the inaugural Batch 1 to our active serving Batch 7, maintaining a proud heritage of academic-military service.</p>
                        <div className="w-20 h-1 bg-ncc-red mx-auto mt-4 rounded-full"></div>
                    </div>

                    <div className="relative">
                        {/* Timeline Center Line */}
                        <div className="timeline-line"></div>

                        {TIMELINE_DATA.map((item, i) => (
                            <div
                                key={item.batch}
                                className={`relative flex items-center mb-12 md:mb-16 ${
                                    i % 2 === 0 ? 'md:flex-row' : 'md:flex-row-reverse'
                                } flex-row`}
                            >
                                {/* Card Content */}
                                <div className={`w-full md:w-5/12 ${i % 2 === 0 ? 'md:pr-12 md:text-right' : 'md:pl-12'} pl-12 md:pl-0 reveal`}>
                                    <span className="inline-block bg-ncc-red text-white text-[10px] font-bold px-3 py-1 rounded-full mb-3 tracking-wider uppercase">
                                        {item.batch}
                                    </span>
                                    <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-shadow relative">
                                        <h3 className="font-heading text-lg md:text-xl font-bold text-ncc-navy mb-2">{item.title}</h3>
                                        <p className="text-gray-500 text-xs leading-relaxed">{item.description}</p>
                                    </div>
                                </div>

                                {/* Center Dot */}
                                <div className="absolute left-[20px] md:left-1/2 md:-translate-x-1/2 w-12 h-12 bg-ncc-navy border-4 border-ncc-gold rounded-full flex items-center justify-center z-10 shadow-lg transition-all hover:scale-110">
                                    <span className="text-ncc-gold font-heading font-extrabold text-[10px]">{item.year}</span>
                                </div>

                                {/* Spacer for opposite side */}
                                <div className="hidden md:block w-5/12"></div>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* ── ACHIEVEMENTS SECTION ── */}
            <section id="achievements" className="py-24 md:py-32 bg-ncc-navy relative overflow-hidden">
                <div className="absolute inset-0 opacity-5">
                    <div className="absolute inset-0" style={{ backgroundImage: 'repeating-linear-gradient(135deg, transparent, transparent 40px, rgba(255,255,255,0.1) 40px, rgba(255,255,255,0.1) 80px)' }}></div>
                </div>
                <div className="max-w-7xl mx-auto px-6 relative z-10">
                    <div className="text-center mb-20 reveal">
                        <span className="block text-ncc-gold font-bold uppercase tracking-[0.2em] text-xs mb-2">Our Glory</span>
                        <h2 className="font-heading text-4xl md:text-5xl font-extrabold text-white uppercase">Honours & Medals</h2>
                        <div className="w-20 h-1 bg-ncc-gold mx-auto mt-4 rounded-full"></div>
                    </div>

                    {/* Stats Highlights */}
                    <div className="bg-white/5 border border-white/10 rounded-2xl p-6 md:p-8 mb-16 reveal">
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
                            {[
                                { num: '15+', label: 'Camp Participations', icon: 'fas fa-campground' },
                                { num: '3', label: 'RDC Selections', icon: 'fas fa-trophy' },
                                { num: '200+', label: 'Cadets Trained', icon: 'fas fa-user-graduate' },
                                { num: '50+', label: 'Awards Won', icon: 'fas fa-medal' },
                            ].map((s) => (
                                <div key={s.label} className="group">
                                    <i className={`${s.icon} text-ncc-gold text-2xl mb-2 group-hover:scale-110 transition-transform`}></i>
                                    <div className="font-heading text-2xl md:text-3xl font-extrabold text-white">{s.num}</div>
                                    <div className="text-gray-400 text-[9px] uppercase tracking-wider font-semibold mt-1">{s.label}</div>
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
                                className="bg-white/5 p-8 rounded-3xl hover:-translate-y-2 transition-all duration-300 border border-white/10 hover:border-white/20 hover:shadow-2xl group reveal relative overflow-hidden"
                                style={{ transitionDelay: `${i * 100}ms` }}
                            >
                                <div className="w-14 h-14 rounded-2xl bg-white/5 text-ncc-gold border border-white/10 flex items-center justify-center text-2xl mb-6 group-hover:bg-ncc-red group-hover:text-white transition-all duration-500 shadow-inner">
                                    <i className={ach.icon}></i>
                                </div>
                                <span className="text-ncc-gold text-[10px] font-bold uppercase tracking-[0.2em]">{ach.cat}</span>
                                <h3 className="font-heading text-xl font-bold text-white mt-2 mb-3 leading-snug">{ach.title}</h3>
                                <p className="text-gray-400 text-xs leading-relaxed">{ach.desc}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* ── GALLERY SECTION ── */}
            <section id="gallery" className="py-24 md:py-32 bg-gradient-to-b from-gray-50 to-white">
                <div className="max-w-7xl mx-auto px-6">
                    <div className="text-center mb-16 reveal">
                        <span className="block text-ncc-red font-bold uppercase tracking-[0.2em] text-xs mb-2">Memories</span>
                        <h2 className="font-heading text-4xl md:text-5xl font-extrabold text-ncc-navy uppercase">Contingent Logs</h2>
                        <p className="text-gray-500 text-xs mt-3">Moments captured during camps, parades, and social service initiatives.</p>
                        <div className="w-20 h-1 bg-ncc-red mx-auto mt-4 rounded-full"></div>
                    </div>

                    {/* Category Tabs */}
                    <div className="flex flex-wrap justify-center gap-2 md:gap-3 mb-12 reveal">
                        {GALLERY_CATEGORIES.map((cat) => (
                            <button
                                key={cat}
                                onClick={() => setGalleryFilter(cat)}
                                className={`px-5 py-2 rounded-full text-xs font-bold uppercase tracking-wider transition-all ${
                                    galleryFilter === cat
                                        ? 'bg-ncc-red text-white shadow-lg shadow-ncc-red/30'
                                        : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
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
                                className="relative group cursor-pointer rounded-3xl overflow-hidden shadow-md hover:shadow-2xl hover:scale-[1.03] transition-all duration-500 reveal border border-gray-100"
                            >
                                <div className={`relative overflow-hidden w-full ${
                                    i % 3 === 0 ? 'h-72' : i % 3 === 1 ? 'h-52' : 'h-64'
                                }`}>
                                    <img
                                        src={img.src}
                                        alt={img.alt}
                                        className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                                    />
                                    {/* Gradient overlay */}
                                    <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/30 to-transparent opacity-60 group-hover:opacity-85 transition-opacity duration-300"></div>
                                    
                                    {/* Magnifying search glass on hover */}
                                    <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-300 transform scale-95 group-hover:scale-100">
                                        <div className="w-12 h-12 rounded-full bg-ncc-red text-white flex items-center justify-center text-lg shadow-xl shadow-ncc-red/30">
                                            <i className="fas fa-search-plus"></i>
                                        </div>
                                    </div>
                                </div>
                                <div className="absolute bottom-0 left-0 right-0 p-6 z-10 pointer-events-none transform translate-y-2 group-hover:translate-y-0 transition-transform duration-300">
                                    <span className="text-ncc-gold font-heading text-[10px] font-bold tracking-widest uppercase bg-black/40 px-2.5 py-1 rounded-md backdrop-blur-sm border border-white/10">{img.category}</span>
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
            <section className="py-24 md:py-32 bg-ncc-dark relative overflow-hidden border-t border-white/5">
                <div className="absolute inset-0 opacity-15">
                    <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_70%,rgba(75,156,211,0.2)_0%,transparent_50%),radial-gradient(circle_at_70%_30%,rgba(210,16,52,0.2)_0%,transparent_50%)]"></div>
                </div>
                <div className="max-w-5xl mx-auto px-6 relative z-10">
                    <div className="text-center mb-20 reveal">
                        <span className="block text-ncc-gold font-bold uppercase tracking-[0.2em] text-xs mb-2">Command Staff</span>
                        <h2 className="font-heading text-4xl md:text-5xl font-extrabold text-white uppercase">Our Leadership</h2>
                        <div className="w-20 h-1 bg-ncc-gold mx-auto mt-4 rounded-full"></div>
                    </div>

                    <div className="grid md:grid-cols-2 gap-8">
                        {/* ANO Card */}
                        <div className="glass-navy rounded-3xl p-10 text-center border border-white/5 hover:border-white/15 hover:-translate-y-2.5 transition-all duration-500 reveal shadow-2xl relative overflow-hidden group">
                            <div className="absolute top-0 left-0 right-0 h-1.5 bg-ncc-gold"></div>
                            
                            <div className="w-24 h-24 mx-auto rounded-2xl bg-gradient-to-br from-[#0f1b29] to-[#040810] border-2 border-ncc-gold/60 flex items-center justify-center mb-6 shadow-xl relative overflow-hidden group-hover:border-ncc-gold transition-colors duration-300">
                                <div className="absolute inset-0 bg-gradient-to-tr from-ncc-gold/5 to-transparent"></div>
                                <i className="fas fa-user-tie text-4xl text-ncc-gold animate-float relative z-10"></i>
                            </div>

                            <span className="text-ncc-red text-[10px] font-bold uppercase tracking-[0.2em] bg-ncc-red/10 border border-ncc-red/20 px-3.5 py-1 rounded-full">Associate NCC Officer</span>
                            <h3 className="font-heading text-2xl font-bold text-white mt-4">Capt. ANO Officer</h3>
                            <p className="text-gray-400 text-xs mt-4 leading-relaxed italic border-t border-white/5 pt-4">
                                &ldquo;NCC teaches you the values that shape your entire life — discipline, service, and love for the nation.&rdquo;
                            </p>
                        </div>

                        {/* SUO Card */}
                        <div className="glass-navy rounded-3xl p-10 text-center border border-white/5 hover:border-white/15 hover:-translate-y-2.5 transition-all duration-500 reveal delay-100 shadow-2xl relative overflow-hidden group">
                            <div className="absolute top-0 left-0 right-0 h-1.5 bg-ncc-sky"></div>
                            
                            <div className="w-24 h-24 mx-auto rounded-2xl bg-gradient-to-br from-[#0f1b29] to-[#040810] border-2 border-ncc-sky/60 flex items-center justify-center mb-6 shadow-xl relative overflow-hidden group-hover:border-ncc-sky transition-colors duration-300">
                                <div className="absolute inset-0 bg-gradient-to-tr from-ncc-sky/5 to-transparent"></div>
                                <i className="fas fa-user-shield text-4xl text-ncc-sky animate-float relative z-10"></i>
                            </div>

                            <span className="text-ncc-sky text-[10px] font-bold uppercase tracking-[0.2em] bg-ncc-sky/10 border border-ncc-sky/20 px-3.5 py-1 rounded-full">Senior Under Officer</span>
                            <h3 className="font-heading text-2xl font-bold text-white mt-4">SUO Command Team</h3>
                            <p className="text-gray-400 text-xs mt-4 leading-relaxed italic border-t border-white/5 pt-4">
                                &ldquo;Leading from the front, serving with pride. NCC is not just an activity — it&apos;s a way of life.&rdquo;
                            </p>
                        </div>
                    </div>
                </div>
            </section>

            {/* ── EVENTS SECTION (Calendar Tear-Off Sheets) ── */}
            <section id="events" className="py-24 md:py-32 bg-gradient-to-b from-white to-gray-50">
                <div className="max-w-7xl mx-auto px-6">
                    <div className="text-center mb-20 reveal">
                        <span className="block text-ncc-red font-bold uppercase tracking-[0.2em] text-xs mb-2">Stay Updated</span>
                        <h2 className="font-heading text-4xl md:text-5xl font-extrabold text-ncc-navy uppercase">Unit Training Calendar</h2>
                        <div className="w-20 h-1 bg-ncc-red mx-auto mt-4 rounded-full"></div>
                    </div>

                    <div className="grid md:grid-cols-2 gap-8">
                        {UPCOMING_EVENTS.map((ev) => {
                            const dateObj = new Date(ev.date);
                            const day = dateObj.getDate();
                            const month = dateObj.toLocaleString('default', { month: 'short' }).toUpperCase();
                            const year = dateObj.getFullYear();
                            return (
                                <div
                                    key={ev.id}
                                    className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden hover:shadow-xl hover:-translate-y-1 transition-all duration-300 reveal group flex flex-col sm:flex-row"
                                >
                                    {/* Calendar Sheet Date Badge */}
                                    <div className="w-full sm:w-32 bg-slate-50 border-r border-gray-100 flex flex-col justify-center items-center p-6 relative">
                                        <div className="absolute top-0 left-0 right-0 h-1 bg-ncc-red"></div>
                                        <span className="text-[10px] font-bold text-gray-400 tracking-widest">{month}</span>
                                        <span className="text-4xl font-heading font-extrabold text-ncc-navy leading-none my-1">{day}</span>
                                        <span className="text-[10px] font-bold text-gray-400 tracking-wider">{year}</span>
                                    </div>

                                    {/* Event Details */}
                                    <div className="p-6 flex-grow flex flex-col justify-between">
                                        <div>
                                            <div className="flex items-center gap-2 mb-2">
                                                <span className={`text-[9px] font-bold px-2 py-0.5 rounded uppercase tracking-wider ${
                                                    ev.status === 'Upcoming' ? 'bg-red-100 text-ncc-red' : 'bg-gray-100 text-gray-500'
                                                }`}>{ev.status}</span>
                                                <span className="text-gray-400 text-[10px] font-semibold uppercase">{ev.type}</span>
                                            </div>
                                            <h3 className="font-heading text-lg font-bold text-ncc-navy mb-3 group-hover:text-ncc-red transition-colors">{ev.title}</h3>
                                        </div>
                                        <div className="flex items-center gap-2 text-xs font-semibold text-gray-400 mt-2">
                                            <i className="fas fa-map-marker-alt text-ncc-red"></i>
                                            <span>{ev.location}</span>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            </section>

            {/* ── FOOTER SECTION ── */}
            <footer id="contact" className="bg-ncc-navy text-white relative overflow-hidden">
                <div className="h-1 bg-gradient-to-r from-ncc-red via-ncc-gold to-ncc-sky"></div>

                <div className="max-w-7xl mx-auto px-6 py-16">
                    <div className="grid md:grid-cols-3 gap-12">
                        {/* Brand info */}
                        <div>
                            <div className="flex items-center gap-3 mb-4">
                                <img src="/assets/images/ncc-logo.png" alt="NCC" className="h-12" />
                                <div>
                                    <h3 className="font-heading text-2xl font-bold">SASTRA NCC</h3>
                                    <p className="text-ncc-sky text-[10px] tracking-[0.2em] uppercase">Army Wing</p>
                                </div>
                            </div>
                            <p className="text-gray-400 text-xs leading-relaxed mb-6">
                                06/34 (TN) INDEP COY, NCC (ARMY), THANJAVUR<br />
                                Forging leaders through Unity and Discipline since 2019.
                            </p>
                            <div className="flex gap-3">
                                <a href="#" className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center hover:bg-ncc-red transition-all duration-300 text-sm">
                                    <i className="fab fa-instagram"></i>
                                </a>
                                <a href="#" className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center hover:bg-ncc-sky transition-all duration-300 text-sm">
                                    <i className="fab fa-twitter"></i>
                                </a>
                                <a href="#" className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center hover:bg-ncc-gold transition-all duration-300 text-sm">
                                    <i className="fab fa-linkedin-in"></i>
                                </a>
                            </div>
                        </div>

                        {/* Quick Navigation links */}
                        <div>
                            <h4 className="font-heading text-lg font-bold mb-4 text-ncc-gold uppercase tracking-wider">Navigation</h4>
                            <div className="space-y-2">
                                {['About NCC', 'Our Legacy', 'Achievements', 'Gallery', 'Events', 'Cadet Login'].map((link) => (
                                    <a key={link} href={link === 'Cadet Login' ? '/login' : `#${link.toLowerCase().replace(/\s/g, '')}`} className="block text-gray-400 hover:text-white text-xs transition-colors">
                                        <i className="fas fa-chevron-right text-ncc-red text-[8px] mr-2"></i>
                                        {link}
                                    </a>
                                ))}
                            </div>
                        </div>

                        {/* Office contacts */}
                        <div>
                            <h4 className="font-heading text-lg font-bold mb-4 text-ncc-gold uppercase tracking-wider">Contact Us</h4>
                            <div className="space-y-3 text-gray-400 text-xs">
                                <p className="flex items-start gap-3">
                                    <i className="fas fa-map-marker-alt text-ncc-red mt-1"></i>
                                    NCC Office, SASTRA Deemed University, Thanjavur, Tamil Nadu — 613401
                                </p>
                                <p className="flex items-center gap-3">
                                    <i className="fas fa-envelope text-ncc-red"></i>
                                    ncc@sastra.ac.in
                                </p>
                                <p className="flex items-center gap-3">
                                    <i className="fas fa-globe text-ncc-red"></i>
                                    <a href="https://indiancc.nic.in" target="_blank" rel="noopener noreferrer" className="hover:text-white transition-colors">
                                        indiancc.nic.in (Official NCC)
                                    </a>
                                </p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Bottom copyright stripe */}
                <div className="border-t border-white/10 py-6 text-center">
                    <p className="text-gray-500 text-xs">
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
