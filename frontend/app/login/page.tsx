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
    <div className="relative min-h-screen w-full bg-[#03060c] overflow-hidden font-sans select-none">
      
      {/* ── IMMERSIVE FULL-SCREEN WAVING FLAG BACKGROUND ── */}
      <WavingFlagBackground />
      
      {/* Immersive overlay gradients for text contrast and depth */}
      <div className="absolute inset-0 bg-[#03060c]/20 z-0 pointer-events-none"></div>
      {/* Left-side dark gradient to make the left branding text pop */}
      <div className="absolute inset-y-0 left-0 w-full md:w-[60%] bg-gradient-to-r from-[#03060c]/80 via-[#03060c]/45 to-transparent z-0 pointer-events-none"></div>
      {/* Bottom dark gradient for mobile stack overlays */}
      <div className="absolute inset-x-0 bottom-0 h-[35%] bg-gradient-to-t from-[#03060c]/85 via-[#03060c]/20 to-transparent z-0 pointer-events-none"></div>
      {/* Right-side dark gradient to make the login card stand out and be readable */}
      <div className="absolute inset-y-0 right-0 w-full md:w-[45%] bg-gradient-to-l from-[#03060c]/70 via-[#03060c]/30 to-transparent z-0 pointer-events-none"></div>

      {/* Subtle grid overlay */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(255,255,255,0.01)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.01)_1px,transparent_1px)] bg-[size:3rem_3rem] z-0 pointer-events-none"></div>

      {/* Floating Particles */}
      <div className="absolute inset-0 z-[1] overflow-hidden pointer-events-none opacity-20">
        {particles.map((p) => {
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

      {/* ── MAIN CONTENT LAYER (Z-10) ── */}
      <div className="relative z-10 w-full min-h-screen flex flex-col md:flex-row justify-between items-stretch p-6 md:p-12 lg:p-16">
        
        {/* LEFT COLUMN: BRANDING AND TITLES (55% width on desktop) */}
        <div className="flex flex-col justify-between w-full md:w-[55%] lg:w-[60%] py-4 md:py-8">
          {/* Top Branding */}
          <div className="flex items-center gap-3">
            <Link href="/" className="hover:opacity-85 transition-opacity">
              <img src="/assets/images/ncc_logo.png" alt="NCC Logo" className="h-10 object-contain drop-shadow" />
            </Link>
            <div className="w-[1.5px] h-5 bg-white/25"></div>
            <div className="flex flex-col">
              <span className="font-sans font-black text-xs text-white leading-none tracking-widest uppercase">
                06/34 (TN) INDEP COY
              </span>
              <span className="text-[8px] font-mono text-[#E0A926] font-black uppercase mt-0.5 tracking-wider">
                NCC ARMY WING
              </span>
            </div>
          </div>

          {/* Bottom Title Info */}
          <div className="max-w-xl mt-16 md:mt-0">
            <div className="inline-flex items-center gap-2 px-2.5 py-0.5 rounded bg-white/5 border border-white/10 text-[#E0A926] text-[8px] font-mono tracking-widest uppercase mb-4">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping"></span>
              PORTAL LINK // ONLINE
            </div>
            <h2 className="text-3xl lg:text-4xl font-black font-heading text-white leading-tight uppercase tracking-wider">
              Command & Control <br />
              <span className="text-[#E0A926]">Portal Gateway</span>
            </h2>
            <p className="text-[10px] lg:text-[11px] font-mono text-gray-300 mt-4 leading-relaxed uppercase tracking-widest">
              Official Administrative Gateway for the Boys Contingent of SASTRA Deemed University. Authorized personnel access only. 
            </p>
          </div>
        </div>

        {/* RIGHT COLUMN: FLOATING COMPACT LOGIN CARD (40% width on desktop) */}
        <div className="flex items-center justify-center md:justify-end w-full md:w-[45%] lg:w-[40%] mt-12 md:mt-0">
          
          {/* Glassmorphic Login Form Card (Tighter padding & max-width for premium look) */}
          <div className="w-full max-w-[340px] relative border border-white/[0.08] bg-[#050912]/85 backdrop-blur-2xl px-6 py-8 rounded-3xl shadow-[0_25px_60px_rgba(0,0,0,0.85)] overflow-hidden transition-all duration-500 hover:border-white/[0.15]">
            
            {/* Top Tricolor Accent Line */}
            <div className="absolute top-0 left-0 right-0 h-[3px] bg-gradient-to-r from-[#D21034] via-[#E0A926] to-[#5D9BCE]"></div>

            {/* Insignia & Logos */}
            <div className="text-center mb-6">
              <div className="flex justify-center items-center gap-3 mb-4">
                <Link href="/" title="Back to Contingent Home" className="transition-transform duration-300 hover:scale-105 flex items-center gap-2">
                  <img src="/assets/images/sastra_logo.png" alt="SASTRA" className="h-8 object-contain drop-shadow" />
                  <img src="/assets/images/40_years_logo.png" alt="SASTRA 40 Years" className="h-8 object-contain drop-shadow" />
                </Link>
                <div className="w-[1px] h-4 bg-white/10"></div>
                <img src="/assets/images/ncc_logo.png" alt="NCC" className="h-10 object-contain drop-shadow" />
              </div>

              <h1 className="font-heading text-lg font-black text-white tracking-widest uppercase">
                Command Portal
              </h1>
              <p className="text-gray-400 text-[9px] font-mono tracking-widest mt-1 uppercase">
                06/34 (TN) INDEP COY NCC (ARMY)
              </p>
            </div>

            {/* Login Inputs Form */}
            <form action={clientAction} className="space-y-4">
              
              {/* Email Input Group */}
              <div className="flex flex-col gap-1">
                <label className="text-[9px] font-bold text-gray-400 uppercase tracking-widest ml-1 font-mono">
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
                    className="w-full pl-11 pr-4 py-2.5 rounded-xl bg-black/40 border border-white/10 outline-none text-white placeholder-white/20 text-xs font-mono transition-all duration-300 focus:border-[#5D9BCE]/60 focus:ring-1 focus:ring-[#5D9BCE]/35"
                  />
                </div>
              </div>

              {/* Password Input Group */}
              <div className="flex flex-col gap-1">
                <label className="text-[9px] font-bold text-gray-400 uppercase tracking-widest ml-1 font-mono">
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
                    className="w-full pl-11 pr-4 py-2.5 rounded-xl bg-black/40 border border-white/10 outline-none text-white placeholder-white/20 text-xs font-mono transition-all duration-300 focus:border-[#D21034]/60 focus:ring-1 focus:ring-[#D21034]/35"
                  />
                </div>
              </div>

              {/* Error Alert Display */}
              {error && (
                <div className="flex items-center gap-2 text-[9.5px] text-[#D21034] bg-[#D21034]/8 border border-[#D21034]/20 py-2 px-3 rounded-xl font-mono animate-fade-in justify-center">
                  <i className="fas fa-shield-halved animate-pulse"></i>
                  <span>{error.toUpperCase()}</span>
                </div>
              )}

              {/* Submit Button */}
              <button
                type="submit"
                disabled={isLoading}
                className="w-full relative overflow-hidden bg-gradient-to-r from-[#D21034] to-[#a80c26] text-white text-xs font-mono font-bold py-3 rounded-xl hover:shadow-[0_0_20px_rgba(210,16,52,0.3)] transition-all duration-300 active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none uppercase tracking-widest flex justify-center items-center gap-2"
              >
                {isLoading ? (
                  <>
                    <i className="fas fa-spinner animate-spin"></i>
                    <span>Authenticating...</span>
                  </>
                ) : (
                  <>
                    <i className="fas fa-lock-open"></i>
                    <span>Establish Link</span>
                  </>
                )}
              </button>
            </form>

            {/* Backlink */}
            <div className="text-center mt-6 pt-3.5 border-t border-white/5">
              <Link 
                href="/" 
                className="inline-flex items-center gap-2 text-[9px] font-mono uppercase tracking-widest text-gray-500 hover:text-[#5D9BCE] transition-colors duration-300 group"
              >
                <i className="fas fa-arrow-left transition-transform group-hover:-translate-x-1 duration-200"></i>
                <span>Back to Home</span>
              </Link>
            </div>

          </div>
        </div>
      </div>
    </div>
  );
}
