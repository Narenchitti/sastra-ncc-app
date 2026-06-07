'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { loginAction } from '@/app/actions';
import Link from 'next/link';

export default function LoginPage() {
  const router = useRouter();
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

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

  // Generate particles for background animation
  const [particles, setParticles] = useState<any[]>([]);
  useEffect(() => {
    setParticles(
      Array.from({ length: 20 }, (_, i) => ({
        id: i,
        left: Math.random() * 100,
        delay: Math.random() * 8,
        duration: 6 + Math.random() * 10,
        size: 2 + Math.random() * 2,
      }))
    );
  }, []);

  return (
    <div className="relative min-h-screen flex items-center justify-center bg-ncc-dark overflow-hidden font-body">
      {/* Background Gradients */}
      <div className="absolute inset-0 z-0">
        <div className="absolute top-[-20%] left-[-20%] w-[60%] h-[60%] rounded-full bg-ncc-navy/30 blur-[120px]"></div>
        <div className="absolute bottom-[-20%] right-[-20%] w-[60%] h-[60%] rounded-full bg-ncc-red/10 blur-[120px]"></div>
        <div className="absolute inset-0 bg-gradient-to-b from-[#060a13] via-[#091122] to-ncc-dark opacity-95"></div>
      </div>

      {/* Floating Particles */}
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

      {/* Login Card Container */}
      <div className="relative z-10 w-full max-w-lg px-4 md:px-6">
        <div className="glass-dark rounded-2xl p-8 md:p-12 border border-white/10 shadow-2xl relative overflow-hidden">
          
          {/* Top Tricolor Bar Accent */}
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-ncc-red via-ncc-gold to-ncc-sky"></div>

          {/* Insignia & Header */}
          <div className="text-center mb-10">
            <div className="flex justify-center items-center gap-4 mb-6">
              <Link href="/">
                <img src="/assets/images/sastra-logo.png" alt="SASTRA" className="h-12 hover:scale-105 transition-transform drop-shadow" />
              </Link>
              <img src="/assets/images/ncc-logo.png" alt="NCC" className="h-14 animate-float drop-shadow-lg" />
            </div>
            
            <h1 className="font-heading text-3xl font-bold text-white tracking-wide uppercase">
              Command Portal
            </h1>
            <p className="text-gray-400 text-sm mt-2 font-light">
              Sign in with your contingent credentials
            </p>
          </div>

          {/* Login Form */}
          <form action={clientAction} className="space-y-6">
            <div>
              <label className="block text-xs font-semibold text-gray-300 uppercase tracking-widest mb-2">
                Email Address
              </label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 flex items-center pl-4 text-gray-500">
                  <i className="fas fa-envelope"></i>
                </span>
                <input
                  name="email"
                  type="email"
                  className="w-full pl-11 pr-4 py-3.5 rounded-lg bg-white/5 border border-white/10 outline-none text-white placeholder-white/30 text-sm focus:border-ncc-red focus:ring-1 focus:ring-ncc-red transition-all"
                  required
                  placeholder="cadet@sastra.ncc"
                  disabled={isLoading}
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-300 uppercase tracking-widest mb-2">
                Password
              </label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 flex items-center pl-4 text-gray-500">
                  <i className="fas fa-lock"></i>
                </span>
                <input
                  name="password"
                  type="password"
                  className="w-full pl-11 pr-4 py-3.5 rounded-lg bg-white/5 border border-white/10 outline-none text-white placeholder-white/30 text-sm focus:border-ncc-red focus:ring-1 focus:ring-ncc-red transition-all"
                  required
                  placeholder="Password (Registration Number)"
                  disabled={isLoading}
                />
              </div>
            </div>

            {error && (
              <div className="flex items-center gap-2 text-ncc-red text-xs bg-ncc-red/10 border border-ncc-red/20 py-3 px-4 rounded-lg animate-fade-in justify-center">
                <i className="fas fa-exclamation-circle"></i>
                <span>{error}</span>
              </div>
            )}

            <button
              type="submit"
              disabled={isLoading}
              className="w-full bg-ncc-red text-white text-sm font-heading font-bold py-3.5 rounded-lg hover:bg-red-700 active:translate-y-px transition-all shadow-lg shadow-ncc-red/20 tracking-wider uppercase flex justify-center items-center gap-2"
            >
              {isLoading ? (
                <>
                  <i className="fas fa-spinner animate-spin"></i>
                  <span>Authenticating...</span>
                </>
              ) : (
                <>
                  <i className="fas fa-sign-in-alt"></i>
                  <span>Login</span>
                </>
              )}
            </button>
          </form>

          {/* Footer Backlink */}
          <div className="text-center mt-8 pt-6 border-t border-white/5">
            <Link href="/" className="text-xs text-gray-500 hover:text-ncc-sky transition-colors flex items-center justify-center gap-2">
              <i className="fas fa-arrow-left"></i>
              <span>Back to Contingent Home</span>
            </Link>
          </div>

        </div>
      </div>
    </div>
  );
}

