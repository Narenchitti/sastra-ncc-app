'use client';

import { useEffect, useState, useRef } from 'react';
import Link from 'next/link';
import AnimatedCounter from '@/components/AnimatedCounter';
import GalleryLightbox from '@/components/GalleryLightbox';
import MobileNav from '@/components/MobileNav';

/* ═══════════════════════════════════════════════
   PLACEHOLDER DATA — Replace with real content
   ═══════════════════════════════════════════════ */

const GALLERY_IMAGES = [
    { src: '/assets/images/ncc-logo.png', alt: 'NCC Cadets at Morning Drill Parade', category: 'Parades' },
    { src: '/assets/images/sastra-main-logo.png', alt: 'Annual Camp Training Session', category: 'Camps' },
    { src: '/assets/images/sastra-40-logo.png', alt: 'Republic Day Celebration', category: 'Cultural' },
    { src: '/assets/images/ncc-logo.png', alt: 'Rifle Drill Practice', category: 'Training' },
    { src: '/assets/images/sastra-main-logo.png', alt: 'Combined Annual Training Camp', category: 'Camps' },
    { src: '/assets/images/sastra-40-logo.png', alt: 'Independence Day Flag Hoisting', category: 'Cultural' },
    { src: '/assets/images/ncc-logo.png', alt: 'Cross-Country Run Championship', category: 'Training' },
    { src: '/assets/images/sastra-main-logo.png', alt: 'NCC Day Celebrations at SASTRA', category: 'Special Events' },
    { src: '/assets/images/sastra-40-logo.png', alt: 'Guard of Honour Parade', category: 'Parades' },
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

/* ═══════════════════════════════════════════════
   MAIN PAGE COMPONENT
   ═══════════════════════════════════════════════ */

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
    const particles = Array.from({ length: 30 }, (_, i) => ({
        id: i,
        left: Math.random() * 100,
        delay: Math.random() * 10,
        duration: 8 + Math.random() * 12,
        size: 2 + Math.random() * 3,
    }));

    return (
        <main className="min-h-screen bg-white text-gray-900 overflow-x-hidden">

            {/* ═══════════════════════════════════
          SECTION 1: STICKY NAVBAR
      ═══════════════════════════════════ */}
            <nav
                className={`fixed w-full z-50 transition-all duration-500 ${scrolled
                    ? 'bg-white/95 backdrop-blur-md shadow-lg'
                    : 'bg-transparent shadow-none'
                    }`}
            >
                <div className="w-full px-0 py-3 flex justify-between items-center">
                    {/* Logos + Branding */}
                    <Link href="/" className="flex items-center gap-2 md:gap-3 group ml-2 md:ml-4">
                        <img src="/assets/images/sastra-logo.png" alt="SASTRA Logo" className="h-10 md:h-14 drop-shadow-sm group-hover:scale-105 transition-transform" />
                        <img src="/assets/images/sastra-40-logo.png" alt="SASTRA 40 Years" className="h-10 md:h-14 drop-shadow-sm group-hover:scale-105 transition-transform" />
                        <img src="/assets/images/ncc-logo.png" alt="NCC Logo" className="h-10 md:h-14 drop-shadow-sm group-hover:scale-105 transition-transform" />
                        <div className="flex flex-col ml-1">
                            <span className={`font-heading font-bold text-lg md:text-2xl leading-none transition-colors duration-500 ${scrolled ? 'text-ncc-navy' : 'text-white'}`}>
                                SASTRA <span className="text-ncc-red">NCC</span>
                            </span>
                            <span className={`text-[9px] md:text-xs font-bold tracking-[0.15em] uppercase transition-colors duration-500 ${scrolled ? 'text-ncc-sky' : 'text-ncc-gold'}`}>
                                Army Wing
                            </span>
                        </div>
                    </Link>

                    {/* Desktop Nav */}
                    <div className="hidden lg:flex items-center gap-6 xl:gap-8 mr-4 md:mr-6">
                        {NAV_ITEMS.map((item) => (
                            <a
                                key={item.label}
                                href={item.href}
                                className={`font-medium text-sm tracking-wide uppercase relative after:content-[''] after:absolute after:bottom-[-4px] after:left-0 after:w-0 after:h-[2px] after:bg-ncc-red after:transition-all hover:after:w-full transition-colors ${scrolled ? 'text-ncc-navy hover:text-ncc-red' : 'text-white/80 hover:text-white'
                                    }`}
                            >
                                {item.label}
                            </a>
                        ))}
                        <Link
                            href="/login"
                            className={`px-5 py-2 border-2 rounded font-heading font-bold uppercase tracking-wider text-sm transition-all hover:-translate-y-0.5 ${scrolled
                                ? 'border-ncc-red text-ncc-red hover:bg-ncc-red hover:text-white'
                                : 'border-white text-white hover:bg-white hover:text-ncc-navy'
                                }`}
                        >
                            Login
                        </Link>
                    </div>

                    {/* Mobile Hamburger */}
                    <button
                        onClick={() => setMobileMenuOpen(true)}
                        className={`lg:hidden text-2xl transition-colors ${scrolled ? 'text-ncc-navy' : 'text-white'}`}
                    >
                        <i className="fas fa-bars"></i>
                    </button>
                </div>
            </nav>

            <MobileNav isOpen={mobileMenuOpen} onClose={() => setMobileMenuOpen(false)} navItems={NAV_ITEMS} />

            {/* ═══════════════════════════════════
          SECTION 2: HERO (Cinematic)
      ═══════════════════════════════════ */}
            <section id="home" className="relative h-screen flex items-center justify-center overflow-hidden bg-ncc-dark">
                {/* Video Background with Parallax */}
                <div className="absolute inset-0 z-0">
                    <video
                        id="hero-video"
                        autoPlay
                        muted
                        loop
                        playsInline
                        className="absolute inset-0 w-full h-[120%] object-cover opacity-[0.55]"
                    >
                        <source src="/assets/videos/drill.mp4" type="video/mp4" />
                    </video>
                    <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-black/30 to-black/55"></div>
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
                    <div className="inline-flex items-center gap-2 glass px-6 md:px-8 py-3 rounded-full text-ncc-gold font-bold text-sm md:text-lg mb-6 animate-fade-up tracking-wider">
                        <i className="fas fa-star"></i>
                        <span>06/34 (TN) INDEP COY, NCC (ARMY), THANJAVUR</span>
                        <i className="fas fa-star"></i>
                    </div>

                    <h1 className="font-heading text-5xl sm:text-6xl md:text-8xl lg:text-9xl font-bold mb-4 tracking-tight leading-none animate-fade-up delay-100">
                        <span className="text-transparent bg-clip-text bg-gradient-to-r from-ncc-sky to-[#e8f4fd]">UNITY AND</span>{' '}
                        <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#ff6b6b] to-ncc-red">
                            DISCIPLINE
                        </span>
                    </h1>



                    <p className="text-base md:text-xl text-gray-300 font-light mb-10 tracking-wide animate-fade-up delay-300 max-w-2xl mx-auto">
                        Forging Leaders for Tomorrow at SASTRA Deemed University
                    </p>

                    <div className="flex flex-col sm:flex-row gap-4 justify-center animate-fade-up delay-400">
                        <a
                            href="#about"
                            className="bg-ncc-red text-white border-2 border-ncc-red px-8 md:px-10 py-3.5 md:py-4 rounded font-heading font-bold uppercase tracking-wider hover:bg-transparent hover:text-ncc-red shadow-lg shadow-ncc-red/30 transition-all transform hover:-translate-y-1 text-sm md:text-base"
                        >
                            Explore Our Legacy
                        </a>
                        <Link
                            href="/login"
                            className="bg-transparent text-white border-2 border-white/50 px-8 md:px-10 py-3.5 md:py-4 rounded font-heading font-bold uppercase tracking-wider hover:bg-ncc-navy hover:text-white hover:border-ncc-navy transition-all transform hover:-translate-y-1 text-sm md:text-base"
                        >
                            Cadet Login
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

            {/* ═══════════════════════════════════
          STAT COUNTERS BAR
      ═══════════════════════════════════ */}
            <section className="bg-ncc-navy py-12 md:py-16 relative overflow-hidden">
                <div className="absolute inset-0 opacity-10">
                    <div className="absolute inset-0" style={{ backgroundImage: 'repeating-linear-gradient(45deg, transparent, transparent 35px, rgba(255,255,255,0.05) 35px, rgba(255,255,255,0.05) 70px)' }}></div>
                </div>
                <div className="max-w-6xl mx-auto px-6 grid grid-cols-2 md:grid-cols-4 gap-8 relative z-10">
                    <AnimatedCounter end={200} suffix="+" label="Cadets Trained" icon="fas fa-users" />
                    <AnimatedCounter end={15} suffix="+" label="Camps Attended" icon="fas fa-campground" />
                    <AnimatedCounter end={7} suffix="" label="Years of Excellence" icon="fas fa-award" />
                    <AnimatedCounter end={50} suffix="+" label="Achievements" icon="fas fa-medal" />
                </div>
            </section>

            {/* ═══════════════════════════════════
          SECTION 3: ABOUT NCC
      ═══════════════════════════════════ */}
            <section id="about" className="py-20 md:py-28 bg-gradient-to-b from-white to-gray-50">
                <div className="max-w-7xl mx-auto px-6">
                    <div className="text-center mb-16 reveal">
                        <span className="block text-ncc-red font-bold uppercase tracking-[0.2em] text-sm mb-2">Who We Are</span>
                        <h2 className="font-heading text-4xl md:text-5xl font-bold text-ncc-navy">The National Cadet Corps</h2>
                    </div>

                    {/* Cards Row */}
                    <div className="grid md:grid-cols-3 gap-8 mb-20">
                        <div className="bg-white p-8 md:p-10 rounded-xl shadow-xl border-t-4 border-ncc-red hover:-translate-y-2 transition-transform duration-300 reveal">
                            <div className="w-16 h-16 bg-red-50 rounded-full flex items-center justify-center text-3xl text-ncc-red mb-6 mx-auto">
                                <i className="fas fa-bullseye"></i>
                            </div>
                            <h3 className="font-heading text-xl md:text-2xl font-bold text-ncc-navy mb-4 text-center">The Aim</h3>
                            <p className="text-gray-600 text-center leading-relaxed text-sm md:text-base">
                                To develop character, comradeship, discipline, leadership, secular outlook, spirit of adventure, and ideals of selfless service amongst the youth of the country.
                            </p>
                        </div>

                        <div className="bg-white p-8 md:p-10 rounded-xl shadow-xl border-t-4 border-ncc-navy hover:-translate-y-2 transition-transform duration-300 reveal delay-100">
                            <div className="w-16 h-16 bg-blue-50 rounded-full flex items-center justify-center text-3xl text-ncc-navy mb-6 mx-auto">
                                <i className="fas fa-eye"></i>
                            </div>
                            <h3 className="font-heading text-xl md:text-2xl font-bold text-ncc-navy mb-4 text-center">The Vision</h3>
                            <p className="text-gray-600 text-center leading-relaxed text-sm md:text-base">
                                To create a human resource of organized, trained, and motivated youth to provide leadership in all walks of life and be always available for the service of the nation.
                            </p>
                        </div>

                        <div className="bg-white p-8 md:p-10 rounded-xl shadow-xl border-t-4 border-ncc-gold hover:-translate-y-2 transition-transform duration-300 reveal delay-200">
                            <div className="w-16 h-16 bg-yellow-50 rounded-full flex items-center justify-center text-3xl text-ncc-gold mb-6 mx-auto">
                                <i className="fas fa-flag"></i>
                            </div>
                            <h3 className="font-heading text-xl md:text-2xl font-bold text-ncc-navy mb-4 text-center">The Motto</h3>
                            <p className="text-gray-600 text-center leading-relaxed text-sm md:text-base">
                                <strong>&quot;Unity and Discipline&quot;</strong> (एकता और अनुशासन) — adopted on 12th October 1980 during the 12th Central Advisory Committee meeting.
                            </p>
                        </div>
                    </div>

                    {/* About Detail */}
                    <div className="grid md:grid-cols-2 gap-12 items-center">
                        <div className="reveal-left">
                            <div className="bg-ncc-navy rounded-2xl p-8 md:p-12 flex items-center justify-center relative overflow-hidden">
                                <div className="absolute inset-0 opacity-5">
                                    <div className="absolute inset-0" style={{ backgroundImage: 'repeating-linear-gradient(45deg, transparent, transparent 20px, rgba(255,255,255,0.1) 20px, rgba(255,255,255,0.1) 40px)' }}></div>
                                </div>
                                <img src="/assets/images/ncc-logo.png" alt="NCC Crest" className="w-48 md:w-64 drop-shadow-2xl animate-float relative z-10" />
                            </div>
                        </div>
                        <div className="reveal-right">
                            <h3 className="font-heading text-3xl font-bold text-ncc-navy mb-6">
                                About the National Cadet Corps
                            </h3>
                            <p className="text-gray-600 leading-relaxed mb-4 text-sm md:text-base">
                                The National Cadet Corps (NCC) is the Indian military cadet corps providing exposure to the cadets in a wide range of activities, with a focus on developing qualities of character, comradeship, discipline, leadership, and a spirit of adventure.
                            </p>
                            <p className="text-gray-600 leading-relaxed mb-4 text-sm md:text-base">
                                Formed on 15th July 1948 through an Act of Parliament, NCC has grown into the world&apos;s largest uniformed youth organization with a strength of over 14 lakh cadets across the country.
                            </p>
                            <p className="text-gray-600 leading-relaxed text-sm md:text-base">
                                At SASTRA Deemed University, the NCC Army Wing operates under <strong>06/34 (TN) INDEP COY, NCC (ARMY), THANJAVUR</strong>, training dedicated cadets through rigorous physical training, drill, community service, and adventure activities.
                            </p>
                        </div>
                    </div>
                </div>
            </section>

            {/* ═══════════════════════════════════
          NCC PLEDGE SECTION
      ═══════════════════════════════════ */}
            <section className="bg-ncc-dark py-16 md:py-24 relative overflow-hidden">
                <div className="absolute inset-0 opacity-20">
                    <div className="absolute inset-0" style={{ backgroundImage: 'radial-gradient(circle at 50% 50%, rgba(210,16,52,0.2) 0%, transparent 70%)' }}></div>
                </div>
                <div className="max-w-3xl mx-auto px-6 text-center relative z-10 reveal">
                    <div className="mb-6">
                        <i className="fas fa-hand-fist text-ncc-gold text-4xl"></i>
                    </div>
                    <h2 className="font-heading text-3xl md:text-4xl font-bold text-white mb-8 tracking-wide">
                        The NCC Pledge
                    </h2>
                    <blockquote className="text-gray-300 text-base md:text-lg leading-relaxed italic space-y-4 border-l-4 border-ncc-red pl-6 md:pl-8 text-left">
                        <p>&ldquo;We the cadets of the National Cadet Corps, do solemnly pledge that we shall always uphold the unity of India.</p>
                        <p>We resolve to be disciplined and responsible citizens of our nation.</p>
                        <p>We shall undertake positive community service in the service of the nation.</p>
                        <p>We shall not participate in or encourage any activity that tends to create disharmony in our society.</p>
                        <p className="text-white font-semibold not-italic">Jai Hind.&rdquo;</p>
                    </blockquote>
                </div>
            </section>

            {/* ═══════════════════════════════════
          SECTION 4: LEGACY TIMELINE
      ═══════════════════════════════════ */}
            <section id="legacy" className="py-20 md:py-28 bg-gradient-to-b from-gray-50 to-white">
                <div className="max-w-5xl mx-auto px-6">
                    <div className="text-center mb-16 reveal">
                        <span className="block text-ncc-red font-bold uppercase tracking-[0.2em] text-sm mb-2">Our Journey</span>
                        <h2 className="font-heading text-4xl md:text-5xl font-bold text-ncc-navy">Life at NCC SASTRA</h2>
                        <p className="text-gray-500 mt-3 max-w-lg mx-auto">From Batch 1 to the current Batch 7 — a legacy of discipline, service, and excellence.</p>
                    </div>

                    <div className="relative">
                        {/* Timeline Line */}
                        <div className="timeline-line"></div>

                        {TIMELINE_DATA.map((item, i) => (
                            <div
                                key={item.batch}
                                className={`relative flex items-center mb-12 md:mb-16 ${i % 2 === 0 ? 'md:flex-row' : 'md:flex-row-reverse'
                                    } flex-row`}
                            >
                                {/* Content */}
                                <div className={`w-full md:w-5/12 ${i % 2 === 0 ? 'md:pr-12 md:text-right' : 'md:pl-12'} pl-12 md:pl-0 reveal`}>
                                    <span className="inline-block bg-ncc-red text-white text-xs font-bold px-3 py-1 rounded-full mb-2 tracking-wider">
                                        {item.batch}
                                    </span>
                                    <h3 className="font-heading text-xl md:text-2xl font-bold text-ncc-navy mb-2">{item.title}</h3>
                                    <p className="text-gray-500 text-sm leading-relaxed">{item.description}</p>
                                </div>

                                {/* Center Dot */}
                                <div className="absolute left-[20px] md:left-1/2 md:-translate-x-1/2 w-10 h-10 bg-white border-4 border-ncc-navy rounded-full flex items-center justify-center z-10 shadow-lg">
                                    <span className="text-ncc-navy font-heading font-bold text-[10px]">{item.year}</span>
                                </div>

                                {/* Spacer for other side */}
                                <div className="hidden md:block w-5/12"></div>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* ═══════════════════════════════════
          SECTION 5: ACHIEVEMENTS
      ═══════════════════════════════════ */}
            <section id="achievements" className="py-20 md:py-28 bg-ncc-navy relative overflow-hidden">
                <div className="absolute inset-0 opacity-5">
                    <div className="absolute inset-0" style={{ backgroundImage: 'repeating-linear-gradient(135deg, transparent, transparent 40px, rgba(255,255,255,0.1) 40px, rgba(255,255,255,0.1) 80px)' }}></div>
                </div>
                <div className="max-w-7xl mx-auto px-6 relative z-10">
                    <div className="text-center mb-16 reveal">
                        <span className="block text-ncc-gold font-bold uppercase tracking-[0.2em] text-sm mb-2">Our Glory</span>
                        <h2 className="font-heading text-4xl md:text-5xl font-bold text-white">Achievements & Honours</h2>
                    </div>

                    {/* Highlight Bar */}
                    <div className="glass rounded-xl p-6 md:p-8 mb-12 reveal">
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
                            {[
                                { num: '15+', label: 'Camp Participations', icon: 'fas fa-campground' },
                                { num: '3', label: 'RDC Selections', icon: 'fas fa-trophy' },
                                { num: '200+', label: 'Cadets Trained', icon: 'fas fa-user-graduate' },
                                { num: '50+', label: 'Awards Won', icon: 'fas fa-medal' },
                            ].map((s) => (
                                <div key={s.label} className="group">
                                    <i className={`${s.icon} text-ncc-gold text-2xl mb-2 group-hover:scale-110 transition-transform`}></i>
                                    <div className="font-heading text-2xl md:text-3xl font-bold text-white">{s.num}</div>
                                    <div className="text-gray-400 text-xs uppercase tracking-wider">{s.label}</div>
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
                                className="glass rounded-xl p-6 hover:-translate-y-2 transition-all duration-300 group reveal"
                                style={{ transitionDelay: `${i * 100}ms` }}
                            >
                                <div className="w-12 h-12 rounded-full bg-ncc-red/20 flex items-center justify-center text-ncc-red mb-4 group-hover:bg-ncc-red group-hover:text-white transition-colors">
                                    <i className={ach.icon}></i>
                                </div>
                                <span className="text-ncc-gold text-[10px] font-bold uppercase tracking-[0.2em]">{ach.cat}</span>
                                <h3 className="font-heading text-lg font-bold text-white mt-1 mb-2">{ach.title}</h3>
                                <p className="text-gray-400 text-sm leading-relaxed">{ach.desc}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* ═══════════════════════════════════
          SECTION 6: GALLERY
      ═══════════════════════════════════ */}
            <section id="gallery" className="py-20 md:py-28 bg-gradient-to-b from-gray-50 to-white">
                <div className="max-w-7xl mx-auto px-6">
                    <div className="text-center mb-12 reveal">
                        <span className="block text-ncc-red font-bold uppercase tracking-[0.2em] text-sm mb-2">Memories</span>
                        <h2 className="font-heading text-4xl md:text-5xl font-bold text-ncc-navy">Gallery</h2>
                        <p className="text-gray-500 mt-3">Moments captured through our journey of service and discipline.</p>
                    </div>

                    {/* Category Tabs */}
                    <div className="flex flex-wrap justify-center gap-2 md:gap-3 mb-10 reveal">
                        {GALLERY_CATEGORIES.map((cat) => (
                            <button
                                key={cat}
                                onClick={() => setGalleryFilter(cat)}
                                className={`px-4 md:px-5 py-2 rounded-full text-xs md:text-sm font-bold uppercase tracking-wider transition-all ${galleryFilter === cat
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
                                className="relative group cursor-pointer rounded-xl overflow-hidden shadow-md hover:shadow-2xl transition-all duration-300 reveal"
                            >
                                <div className={`bg-gradient-to-br from-ncc-navy/90 to-ncc-dark flex items-center justify-center ${i % 3 === 0 ? 'h-64' : i % 3 === 1 ? 'h-48' : 'h-56'
                                    }`}>
                                    <img
                                        src={img.src}
                                        alt={img.alt}
                                        className="w-16 md:w-20 opacity-30 group-hover:opacity-60 transition-opacity"
                                    />
                                </div>
                                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end p-4">
                                    <div>
                                        <p className="text-white font-medium text-sm">{img.alt}</p>
                                        <p className="text-ncc-gold text-[10px] uppercase tracking-[0.2em] mt-1">{img.category}</p>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>

                    <div className="text-center mt-10 reveal">
                        <p className="text-gray-400 text-sm italic">More photos coming soon — gallery is being organised by category.</p>
                    </div>
                </div>
            </section>

            {/* Lightbox */}
            {
                lightboxIndex !== null && (
                    <GalleryLightbox
                        images={filteredGallery}
                        currentIndex={lightboxIndex}
                        onClose={() => setLightboxIndex(null)}
                        onNavigate={(i) => setLightboxIndex(i)}
                    />
                )
            }

            {/* ═══════════════════════════════════
          SECTION 7: LEADERSHIP
      ═══════════════════════════════════ */}
            <section className="py-20 md:py-28 bg-ncc-dark relative overflow-hidden">
                <div className="absolute inset-0 opacity-10">
                    <div className="absolute inset-0" style={{ backgroundImage: 'radial-gradient(circle at 30% 70%, rgba(75,156,211,0.3) 0%, transparent 50%), radial-gradient(circle at 70% 30%, rgba(210,16,52,0.3) 0%, transparent 50%)' }}></div>
                </div>
                <div className="max-w-5xl mx-auto px-6 relative z-10">
                    <div className="text-center mb-16 reveal">
                        <span className="block text-ncc-gold font-bold uppercase tracking-[0.2em] text-sm mb-2">Leadership</span>
                        <h2 className="font-heading text-4xl md:text-5xl font-bold text-white">Our Command</h2>
                    </div>

                    <div className="grid md:grid-cols-2 gap-8">
                        {/* ANO Card */}
                        <div className="glass rounded-2xl p-8 text-center hover:-translate-y-2 transition-all duration-300 reveal">
                            <div className="w-28 h-28 mx-auto rounded-full bg-ncc-navy border-4 border-ncc-gold flex items-center justify-center mb-6">
                                <i className="fas fa-user-tie text-4xl text-ncc-gold"></i>
                            </div>
                            <span className="text-ncc-red text-xs font-bold uppercase tracking-[0.2em]">Associate NCC Officer</span>
                            <h3 className="font-heading text-2xl font-bold text-white mt-2">ANO — Placeholder</h3>
                            <p className="text-gray-400 text-sm mt-3 leading-relaxed italic">
                                &ldquo;NCC teaches you the values that shape your entire life — discipline, service, and love for the nation.&rdquo;
                            </p>
                        </div>

                        {/* SUO Card */}
                        <div className="glass rounded-2xl p-8 text-center hover:-translate-y-2 transition-all duration-300 reveal delay-100">
                            <div className="w-28 h-28 mx-auto rounded-full bg-ncc-navy border-4 border-ncc-sky flex items-center justify-center mb-6">
                                <i className="fas fa-user-shield text-4xl text-ncc-sky"></i>
                            </div>
                            <span className="text-ncc-sky text-xs font-bold uppercase tracking-[0.2em]">Senior Under Officer</span>
                            <h3 className="font-heading text-2xl font-bold text-white mt-2">SUO — Placeholder</h3>
                            <p className="text-gray-400 text-sm mt-3 leading-relaxed italic">
                                &ldquo;Leading from the front, serving with pride. NCC is not just an activity — it&apos;s a way of life.&rdquo;
                            </p>
                        </div>
                    </div>
                </div>
            </section>

            {/* ═══════════════════════════════════
          SECTION 8: NCC EVENTS AT SASTRA
      ═══════════════════════════════════ */}
            <section id="events" className="py-20 md:py-28 bg-gradient-to-b from-white to-gray-50">
                <div className="max-w-7xl mx-auto px-6">
                    <div className="text-center mb-16 reveal">
                        <span className="block text-ncc-red font-bold uppercase tracking-[0.2em] text-sm mb-2">Stay Updated</span>
                        <h2 className="font-heading text-4xl md:text-5xl font-bold text-ncc-navy">What&apos;s Happening at NCC</h2>
                        <p className="text-gray-500 mt-3">Current and upcoming events from the SASTRA NCC contingent.</p>
                    </div>

                    <div className="grid md:grid-cols-2 gap-6">
                        {UPCOMING_EVENTS.map((ev) => (
                            <div
                                key={ev.id}
                                className="bg-white rounded-xl shadow-lg border border-gray-100 overflow-hidden hover:shadow-xl transition-shadow reveal group"
                            >
                                <div className={`px-6 py-3 flex items-center justify-between ${ev.status === 'Upcoming' ? 'bg-ncc-red' : 'bg-gray-400'}`}>
                                    <span className="text-white font-bold text-xs uppercase tracking-wider">{ev.status}</span>
                                    <span className="text-white/80 text-xs">{ev.type}</span>
                                </div>
                                <div className="p-6">
                                    <h3 className="font-heading text-xl font-bold text-ncc-navy mb-3 group-hover:text-ncc-red transition-colors">{ev.title}</h3>
                                    <div className="flex flex-col sm:flex-row gap-3 text-gray-500 text-sm">
                                        <span className="flex items-center gap-2">
                                            <i className="far fa-calendar text-ncc-red"></i>
                                            {new Date(ev.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}
                                        </span>
                                        <span className="flex items-center gap-2">
                                            <i className="fas fa-map-marker-alt text-ncc-red"></i>
                                            {ev.location}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* ═══════════════════════════════════
          SECTION 9: FOOTER
      ═══════════════════════════════════ */}
            <footer id="contact" className="bg-ncc-navy text-white relative overflow-hidden">
                {/* NCC Tricolor stripe */}
                <div className="h-1 bg-gradient-to-r from-ncc-red via-ncc-gold to-ncc-sky"></div>

                <div className="max-w-7xl mx-auto px-6 py-16">
                    <div className="grid md:grid-cols-3 gap-12">
                        {/* Brand */}
                        <div>
                            <div className="flex items-center gap-3 mb-4">
                                <img src="/assets/images/ncc-logo.png" alt="NCC" className="h-12" />
                                <div>
                                    <h3 className="font-heading text-2xl font-bold">SASTRA NCC</h3>
                                    <p className="text-ncc-sky text-[10px] tracking-[0.2em] uppercase">Army Wing</p>
                                </div>
                            </div>
                            <p className="text-gray-400 text-sm leading-relaxed mb-4">
                                06/34 (TN) INDEP COY, NCC (ARMY), THANJAVUR<br />
                                Forging leaders through Unity and Discipline since 2019.
                            </p>
                            <div className="flex gap-3">
                                <a href="#" className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center hover:bg-ncc-red transition-colors text-sm">
                                    <i className="fab fa-instagram"></i>
                                </a>
                                <a href="#" className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center hover:bg-ncc-sky transition-colors text-sm">
                                    <i className="fab fa-twitter"></i>
                                </a>
                                <a href="#" className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center hover:bg-ncc-gold transition-colors text-sm">
                                    <i className="fab fa-linkedin-in"></i>
                                </a>
                            </div>
                        </div>

                        {/* Quick Links */}
                        <div>
                            <h4 className="font-heading text-lg font-bold mb-4 text-ncc-gold">Quick Links</h4>
                            <div className="space-y-2">
                                {['About NCC', 'Our Legacy', 'Achievements', 'Gallery', 'Events', 'Cadet Login'].map((link) => (
                                    <a key={link} href={link === 'Cadet Login' ? '/login' : `#${link.toLowerCase().replace(/\s/g, '')}`} className="block text-gray-400 hover:text-white text-sm transition-colors">
                                        <i className="fas fa-chevron-right text-ncc-red text-[8px] mr-2"></i>
                                        {link}
                                    </a>
                                ))}
                            </div>
                        </div>

                        {/* Contact */}
                        <div>
                            <h4 className="font-heading text-lg font-bold mb-4 text-ncc-gold">Contact Us</h4>
                            <div className="space-y-3 text-gray-400 text-sm">
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

                {/* Bottom Bar */}
                <div className="border-t border-white/10 py-6 text-center">
                    <p className="text-gray-500 text-xs">
                        &copy; 2026 SASTRA NCC Army Wing. All Rights Reserved.
                    </p>
                    <p className="text-ncc-gold font-heading font-bold text-sm mt-1 tracking-wider">
                        JAI HIND 🇮🇳
                    </p>
                </div>
            </footer>
        </main >
    );
}
