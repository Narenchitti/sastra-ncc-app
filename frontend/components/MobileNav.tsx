'use client';

import Link from 'next/link';

interface MobileNavProps {
    isOpen: boolean;
    onClose: () => void;
    navItems: { label: string; href: string }[];
}

export default function MobileNav({ isOpen, onClose, navItems }: MobileNavProps) {
    return (
        <>
            {/* Backdrop */}
            <div
                className={`fixed inset-0 bg-black/60 z-[90] transition-opacity duration-300 ${isOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
                    }`}
                onClick={onClose}
            />

            {/* Drawer */}
            <div
                className={`fixed top-0 right-0 h-full w-80 max-w-[85vw] bg-ncc-navy z-[95] transform transition-transform duration-300 ease-out shadow-2xl ${isOpen ? 'translate-x-0' : 'translate-x-full'
                    }`}
            >
                {/* Header */}
                <div className="p-6 border-b border-white/10 flex justify-between items-center">
                    <div>
                        <h3 className="font-heading text-xl font-bold text-white">SASTRA NCC</h3>
                        <p className="text-ncc-sky text-[10px] tracking-[0.2em] uppercase">Menu</p>
                    </div>
                    <button onClick={onClose} className="text-white/50 hover:text-white text-xl transition-colors">
                        <i className="fas fa-times"></i>
                    </button>
                </div>

                {/* Links */}
                <nav className="p-6 space-y-1">
                    {navItems.map((item, i) => (
                        <a
                            key={item.label}
                            href={item.href}
                            onClick={onClose}
                            className="block px-4 py-3.5 text-gray-300 hover:text-white hover:bg-white/5 rounded-lg transition-all font-medium uppercase tracking-wider text-sm"
                            style={{ animationDelay: `${i * 50}ms` }}
                        >
                            {item.label}
                        </a>
                    ))}
                </nav>

                {/* Login Button */}
                <div className="absolute bottom-0 left-0 right-0 p-6 border-t border-white/10">
                    <Link
                        href="/login"
                        onClick={onClose}
                        className="block w-full text-center py-3.5 bg-ncc-red text-white rounded-lg font-heading font-bold uppercase tracking-wider hover:bg-red-700 transition-colors"
                    >
                        Cadet Login
                    </Link>
                    <p className="text-center text-gray-500 text-[10px] mt-3 uppercase tracking-widest">
                        Jai Hind 🇮🇳
                    </p>
                </div>
            </div>
        </>
    );
}
