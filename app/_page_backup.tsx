import Link from 'next/link';

export default function Home() {
    return (
        <main className="min-h-screen bg-white text-gray-900">
            {/* Navbar */}
            <nav className="fixed w-full z-50 bg-white/95 backdrop-blur-sm shadow-sm transition-all border-b border-gray-100">
                <div className="max-w-7xl mx-auto px-6 py-4 flex justify-between items-center">
                    <Link href="/" className="flex items-center gap-3 group">
                        <img src="/assets/images/ncc-logo.png" alt="NCC Logo" className="h-14 drop-shadow-sm group-hover:scale-105 transition-transform" />
                        <div className="flex flex-col">
                            <span className="font-heading font-bold text-2xl text-ncc-navy leading-none">
                                SASTRA <span className="text-ncc-red">NCC</span>
                            </span>
                            <span className="text-xs font-bold tracking-[0.2em] text-ncc-sky uppercase">Boys Contingent</span>
                        </div>
                    </Link>

                    <div className="hidden md:flex items-center gap-8 font-medium text-sm tracking-wide text-ncc-navy uppercase">
                        {['About', 'Legacy', 'Glory', 'Gallery'].map((item) => (
                            <Link
                                key={item}
                                href={`#${item.toLowerCase()}`}
                                className="hover:text-ncc-red relative after:content-[''] after:absolute after:bottom-[-4px] after:left-0 after:w-0 after:h-[2px] after:bg-ncc-red after:transition-all hover:after:w-full"
                            >
                                {item}
                            </Link>
                        ))}
                        <Link
                            href="/login"
                            className="px-6 py-2.5 border-2 border-ncc-navy text-ncc-navy rounded-md hover:bg-ncc-navy hover:text-white transition-colors"
                        >
                            Login
                        </Link>
                    </div>

                    <button className="md:hidden text-2xl text-ncc-navy">
                        <i className="fas fa-bars"></i>
                    </button>
                </div>
            </nav>

            {/* Hero Section */}
            <section id="home" className="relative h-screen flex items-center justify-center pt-20 overflow-hidden bg-black">
                {/* Video Background */}
                <div className="absolute inset-0 z-0 opacity-80 bg-white/10">
                    <div className="absolute inset-0 bg-white/90 z-10"></div> {/* Heavy White Overlay */}
                    <video autoPlay muted loop playsInline className="absolute inset-0 w-full h-full object-cover grayscale opacity-50">
                        <source src="/assets/videos/drill.mp4" type="video/mp4" />
                    </video>
                </div>

                {/* Floating Badge */}
                <div className="absolute top-32 right-10 z-20 hidden lg:block animate-float">
                    <img src="/assets/images/sastra-40-logo.png" alt="Sastra 40" className="w-32 drop-shadow-xl opacity-90" />
                </div>

                <div className="relative z-10 text-center max-w-4xl px-4">
                    <div className="inline-flex items-center gap-2 bg-white px-6 py-2 rounded-full shadow-lg border border-gray-100 text-ncc-red font-bold text-sm mb-8 animate-fade-up">
                        <i className="fas fa-star text-ncc-gold"></i>
                        <span>EST. 5TH BATCH | 7 YEARS OF EXCELLENCE</span>
                    </div>

                    <h1 className="font-heading text-6xl md:text-8xl font-bold text-ncc-navy mb-6 tracking-tight leading-none animate-fade-up delay-100">
                        UNITY AND <br className="md:hidden" /> <span className="text-ncc-red">DISCIPLINE</span>
                    </h1>

                    <p className="text-xl md:text-2xl text-gray-500 font-light mb-10 tracking-wide animate-fade-up delay-200">
                        The Premier Youth Wing of SASTRA Deemed University
                    </p>

                    <div className="flex flex-col sm:flex-row gap-4 justify-center animate-fade-up delay-300">
                        <Link
                            href="/login"
                            className="bg-ncc-red text-white border-2 border-ncc-red px-10 py-4 rounded font-heading font-bold uppercase tracking-wider hover:bg-transparent hover:text-ncc-red shadow-lg shadow-ncc-red/30 transition-all transform hover:-translate-y-1"
                        >
                            Join The Legacy
                        </Link>
                        <Link
                            href="#about"
                            className="bg-transparent text-ncc-navy border-2 border-ncc-navy px-10 py-4 rounded font-heading font-bold uppercase tracking-wider hover:bg-ncc-navy hover:text-white transition-all transform hover:-translate-y-1"
                        >
                            Explore
                        </Link>
                    </div>
                </div>
            </section>

            {/* About Section */}
            <section id="about" className="py-24 bg-gradient-to-b from-white to-gray-50">
                <div className="max-w-7xl mx-auto px-6">
                    <div className="text-center mb-16">
                        <span className="block text-ncc-red font-bold uppercase tracking-[0.2em] text-sm mb-2">Who We Are</span>
                        <h2 className="font-heading text-5xl font-bold text-ncc-navy">The Foundation</h2>
                    </div>

                    <div className="grid md:grid-cols-3 gap-8">
                        {/* Mission Card */}
                        <div className="bg-white p-10 rounded-xl shadow-xl border-t-4 border-ncc-red hover:-translate-y-2 transition-transform duration-300">
                            <div className="w-16 h-16 bg-red-50 rounded-full flex items-center justify-center text-3xl text-ncc-red mb-6 mx-auto">
                                <i className="fas fa-shield-alt"></i>
                            </div>
                            <h3 className="font-heading text-2xl font-bold text-ncc-navy mb-4 text-center">The Mission</h3>
                            <p className="text-gray-600 text-center leading-relaxed">
                                To develop character, comradeship, discipline, leadership, secular outlook, spirit of adventure, and ideals of selfless service amongst the youth of the country.
                            </p>
                        </div>

                        {/* Vision Card */}
                        <div className="bg-white p-10 rounded-xl shadow-xl border-t-4 border-ncc-navy hover:-translate-y-2 transition-transform duration-300">
                            <div className="w-16 h-16 bg-blue-50 rounded-full flex items-center justify-center text-3xl text-ncc-navy mb-6 mx-auto">
                                <i className="fas fa-eye"></i>
                            </div>
                            <h3 className="font-heading text-2xl font-bold text-ncc-navy mb-4 text-center">The Vision</h3>
                            <p className="text-gray-600 text-center leading-relaxed">
                                To create a human resource of organized, trained, and motivated youth to provide leadership in all walks of life and be always available for the service of the nation.
                            </p>
                        </div>

                        {/* Legacy Card */}
                        <div className="bg-white p-10 rounded-xl shadow-xl border-t-4 border-ncc-sky hover:-translate-y-2 transition-transform duration-300">
                            <div className="w-16 h-16 bg-sky-50 rounded-full flex items-center justify-center text-3xl text-ncc-sky mb-6 mx-auto">
                                <i className="fas fa-university"></i>
                            </div>
                            <h3 className="font-heading text-2xl font-bold text-ncc-navy mb-4 text-center">SASTRA Legacy</h3>
                            <p className="text-gray-600 text-center leading-relaxed">
                                Established 7 years ago, the SASTRA NCC Boys Contingent has been a beacon of excellence. Consistently upholding high standards from the 1st to the 5th Batch.
                            </p>
                        </div>
                    </div>
                </div>
            </section>

            {/* Footer */}
            <footer className="bg-ncc-navy text-white py-12 border-t border-white/10">
                <div className="max-w-7xl mx-auto px-6 flex flex-col md:flex-row justify-between items-center gap-8">
                    <div className="text-center md:text-left">
                        <h3 className="font-heading text-2xl font-bold mb-2">SASTRA NCC</h3>
                        <p className="text-gray-400 text-sm max-w-md">
                            Forging leaders for tomorrow through Unity and Discipline. <br /> Proudly part of SASTRA Deemed University.
                        </p>
                    </div>
                    <div className="flex gap-6">
                        <a href="#" className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center hover:bg-ncc-red transition-colors">
                            <i className="fab fa-instagram"></i>
                        </a>
                        <a href="#" className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center hover:bg-ncc-sky transition-colors">
                            <i className="fab fa-twitter"></i>
                        </a>
                        <a href="#" className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center hover:bg-ncc-gold transition-colors">
                            <i className="fab fa-linkedin-in"></i>
                        </a>
                    </div>
                </div>
                <div className="text-center mt-12 pt-8 border-t border-white/10 text-gray-500 text-xs">
                    &copy; 2026 SASTRA NCC Boys Contingent. All Rights Reserved. | Cloud Powered by Supabase ☁️
                </div>
            </footer>
        </main>
    );
}
