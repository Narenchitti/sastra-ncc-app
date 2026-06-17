'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { loginAction } from '@/app/actions';
import Link from 'next/link';
import WavingFlagBackground from '@/components/WavingFlagBackground';

export default function LoginPage() {
  const router = useRouter();
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [activeField, setActiveField] = useState<'email' | 'password' | null>(null);

  async function clientAction(formData: FormData) {
    setError('');
    setIsLoading(true);
    const res = await loginAction(formData);
    
    if (res.success && res.user) {
      localStorage.setItem('user', JSON.stringify(res.user));
      localStorage.setItem('access_token', res.accessToken);
      if (res.user.role === 'ANO' || res.user.rank === 'SUO' || res.user.rank === 'CUO') {
        router.push('/dashboard/ano');
      } else {
        router.push('/dashboard/cadet');
      }
    } else {
      setError(res.message || 'Login Failed');
      setIsLoading(false);
    }
  }

  // Floating ambient light particles
  const [particles, setParticles] = useState<any[]>([]);
  useEffect(() => {
    setParticles(
      Array.from({ length: 15 }, (_, i) => ({
        id: i,
        left: Math.random() * 100,
        delay: Math.random() * 5,
        duration: 8 + Math.random() * 12,
        size: 1.5 + Math.random() * 2,
      }))
    );
  }, []);

  return (
    <div className="relative min-h-screen flex items-center justify-center bg-[#040810] overflow-hidden font-sans select-none">
      
      {/* 1. Animated Waving NCC Tricolor Flag Canvas (100% Brightness/Opacity) */}
      <WavingFlagBackground />

      {/* 2. Light translucent overlays for premium texture, no black backing overlay */}
      <div className="absolute inset-0 z-0 pointer-events-none">
        {/* Very subtle glow highlights just to add depth to the colors */}
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full bg-white/5 blur-[120px]"></div>
        
        {/* Subtle grid overlay to tie it back to the military system look */}
        <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(255,255,255,0.03)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.03)_1px,transparent_1px)] bg-[size:3rem_3rem]"></div>
      </div>

      {/* 3. Floating Tricolor Particles */}
      <div className="absolute inset-0 z-[1] overflow-hidden pointer-events-none opacity-40">
        {particles.map((p) => {
          // Assign random tricolor colors to particles
          const colors = ['bg-[#D21034]', 'bg-[#E0A926]', 'bg-[#5D9BCE]'];
          const colorClass = colors[p.id % 3];
          return (
            <div
              key={p.id}
              className={`absolute rounded-full opacity-0 animate-[particle-float_infinite_linear] ${colorClass}`}
              style={{
                left: `${p.left}%`,
                bottom: '-10px',
                width: `${p.size}px`,
                height: `${p.size}px`,
                animationDelay: `${p.delay}s`,
                animationDuration: `${p.duration}s`,
              }}
            />
          );
        })}
      </div>

      {/* 4. Main Login Container */}
      <div className="relative z-10 w-full max-w-md px-6 py-12">
        
        {/* Frosted Dark Card for High Text Contrast */}
        <div className="relative border border-white/[0.08] bg-[#050912]/88 backdrop-blur-3xl px-8 py-10 md:px-10 rounded-3xl shadow-[0_30px_70px_rgba(0,0,0,0.85)] overflow-hidden transition-all duration-500 hover:border-white/[0.15]">
          
          {/* Top Tricolor Accent Line */}
          <div className="absolute top-0 left-0 right-0 h-[3px] bg-gradient-to-r from-[#D21034] via-[#E0A926] to-[#5D9BCE]"></div>

          {/* Insignia / Logos Header */}
          <div className="text-center mb-8">
            <div className="flex justify-center items-center gap-4 mb-5">
              <Link href="/" title="Back to Contingent Home" className="transition-transform duration-300 hover:scale-105 flex items-center gap-3">
                <img src="/assets/images/sastra_logo.png" alt="SASTRA Deemed University" className="h-10 object-contain drop-shadow" />
                <img src="/assets/images/40_years_logo.png" alt="SASTRA 40 Years" className="h-10 object-contain drop-shadow" />
              </Link>
              <div className="w-[1px] h-6 bg-white/10"></div>
              <img src="/assets/images/ncc_logo.png" alt="National Cadet Corps" className="h-12 object-contain drop-shadow" />
            </div>

            <h1 className="font-heading text-2xl font-black text-white tracking-widest uppercase">
              Command Portal
            </h1>
            <p className="text-gray-400 text-[11px] font-mono tracking-widest mt-1 uppercase">
              06/34 (TN) INDEP COY NCC (ARMY)
            </p>
          </div>

          {/* Login Form */}
          <form action={clientAction} className="space-y-5">
            
            {/* Email Field Group */}
            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest ml-1 font-mono">
                Security Link Identity (Email)
              </label>
              <div className="relative group">
                <span className={`absolute inset-y-0 left-0 flex items-center pl-4 transition-colors duration-300 ${
                  activeField === 'email' ? 'text-[#5D9BCE]' : 'text-gray-500'
                }`}>
                  <i className="fas fa-user-shield"></i>
                </span>
                <input
                  name="email"
                  type="email"
                  required
                  placeholder="cadet@sastra.edu"
                  disabled={isLoading}
                  onFocus={() => setActiveField('email')}
                  onBlur={() => setActiveField(null)}
                  className="w-full pl-11 pr-4 py-3.5 rounded-xl bg-black/40 border border-white/10 outline-none text-white placeholder-white/20 text-xs font-mono transition-all duration-300 focus:border-[#5D9BCE]/60 focus:ring-1 focus:ring-[#5D9BCE]/35"
                />
              </div>
            </div>

            {/* Password Field Group */}
            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest ml-1 font-mono">
                Command Key (Password)
              </label>
              <div className="relative group">
                <span className={`absolute inset-y-0 left-0 flex items-center pl-4 transition-colors duration-300 ${
                  activeField === 'password' ? 'text-[#D21034]' : 'text-gray-500'
                }`}>
                  <i className="fas fa-key"></i>
                </span>
                <input
                  name="password"
                  type="password"
                  required
                  placeholder="Registration Number"
                  disabled={isLoading}
                  onFocus={() => setActiveField('password')}
                  onBlur={() => setActiveField(null)}
                  className="w-full pl-11 pr-4 py-3.5 rounded-xl bg-black/40 border border-white/10 outline-none text-white placeholder-white/20 text-xs font-mono transition-all duration-300 focus:border-[#D21034]/60 focus:ring-1 focus:ring-[#D21034]/35"
                />
              </div>
            </div>

            {/* Error Alert Display */}
            {error && (
              <div className="flex items-center gap-2.5 text-[11px] text-[#D21034] bg-[#D21034]/8 border border-[#D21034]/20 py-3 px-4 rounded-xl font-mono animate-fade-in justify-center">
                <i className="fas fa-shield-halved animate-pulse"></i>
                <span>{error.toUpperCase()}</span>
              </div>
            )}

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isLoading}
              className="w-full relative overflow-hidden bg-gradient-to-r from-[#D21034] to-[#a80c26] text-white text-xs font-mono font-bold py-3.5 rounded-xl hover:shadow-[0_0_20px_rgba(210,16,52,0.3)] transition-all duration-300 active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none uppercase tracking-widest flex justify-center items-center gap-2"
            >
              {isLoading ? (
                <>
                  <i className="fas fa-spinner animate-spin"></i>
                  <span>Authenticating Credentials...</span>
                </>
              ) : (
                <>
                  <i className="fas fa-lock-open"></i>
                  <span>Establish Secure Link</span>
                </>
              )}
            </button>
          </form>

          {/* Footer Navigation Backlink */}
          <div className="text-center mt-8 pt-5 border-t border-white/5">
            <Link 
              href="/" 
              className="inline-flex items-center gap-2 text-[10px] font-mono uppercase tracking-widest text-gray-500 hover:text-[#5D9BCE] transition-colors duration-300 group"
            >
              <i className="fas fa-arrow-left transition-transform group-hover:-translate-x-1 duration-200"></i>
              <span>Back to Contingent Home</span>
            </Link>
          </div>

        </div>
      </div>
    </div>
  );
}
