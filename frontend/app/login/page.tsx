'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { loginAction } from '@/app/actions';
import Link from 'next/link';
import TacticalBattleMap from '@/components/TacticalBattleMap';
import TargetCursor from '@/components/TargetCursor';

/** Plays a short synthesizer beep for tactical audio feedback */
function playTacClick(type: 'soft' | 'confirm' | 'error' = 'soft') {
  try {
    const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);

    if (type === 'confirm') {
      osc.type = 'sine';
      osc.frequency.setValueAtTime(660, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.1);
      gain.gain.setValueAtTime(0.04, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.22);
      osc.start(); osc.stop(ctx.currentTime + 0.22);
    } else if (type === 'error') {
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(220, ctx.currentTime);
      gain.gain.setValueAtTime(0.04, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.2);
      osc.start(); osc.stop(ctx.currentTime + 0.2);
    } else {
      osc.type = 'sine';
      osc.frequency.setValueAtTime(440, ctx.currentTime);
      gain.gain.setValueAtTime(0.025, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.12);
      osc.start(); osc.stop(ctx.currentTime + 0.12);
    }
  } catch (_) {}
}

export default function LoginPage() {
  const router = useRouter();
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [activeField, setActiveField] = useState<'email' | 'password' | null>(null);
  const [authLogs, setAuthLogs] = useState<string[]>([]);
  const logsEndRef = useRef<HTMLDivElement | null>(null);

  const addLog = (msg: string) => {
    const ts = new Date().toLocaleTimeString('en-US', { hour12: false });
    setAuthLogs(prev => [...prev.slice(-6), `[${ts}] ${msg}`]);
  };

  useEffect(() => {
    const ts = new Date().toLocaleTimeString('en-US', { hour12: false });
    setAuthLogs([
      `[${ts}] SYS: SASTRA NCC SECURE PORTAL v2.0`,
      `[${ts}] SYS: CONTINGENT 06/34 (TN) INDEP COY`,
      `[${ts}] SYS: AWAITING AUTHENTICATION HANDSHAKE...`,
    ]);
  }, []);

  useEffect(() => {
    logsEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [authLogs]);

  async function clientAction(formData: FormData) {
    setError('');
    setIsLoading(true);
    addLog('SYS: INITIATING SECURE LINK HANDSHAKE...');
    playTacClick('confirm');

    const res = await loginAction(formData);

    if (res.success && res.user) {
      addLog('SYS: IDENTITY VERIFIED — ACCESS GRANTED.');
      addLog(`SYS: ROUTING TO ${res.user.role === 'ANO' || res.user.rank === 'SUO' || res.user.rank === 'CUO' ? 'COMMAND CENTER' : 'CADET PORTAL'}...`);
      localStorage.setItem('user', JSON.stringify(res.user));
      localStorage.setItem('access_token', res.accessToken);
      setTimeout(() => {
        if (res.user!.role === 'ANO' || res.user!.rank === 'SUO' || res.user!.rank === 'CUO') {
          router.push('/dashboard/ano');
        } else {
          router.push('/dashboard/cadet');
        }
      }, 600);
    } else {
      addLog('SYS: AUTHENTICATION FAILED — CLEARANCE DENIED.');
      playTacClick('error');
      setError(res.message || 'Authentication Failed');
      setIsLoading(false);
    }
  }

  return (
    <div className="relative min-h-screen w-full bg-[#080b06] overflow-hidden font-mono select-none">

      {/* ── Custom Target Cursor ── */}
      <TargetCursor />

      {/* ── TacticalBattleMap Background ── */}
      <div className="fixed inset-0 z-0 pointer-events-none opacity-90">
        <div className="absolute inset-0 bg-[#080b06] z-[-2]" />
        <TacticalBattleMap />
        <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(74,93,35,0.025)_1px,transparent_1px),linear-gradient(to_bottom,rgba(74,93,35,0.025)_1px,transparent_1px)] bg-[size:4rem_4rem]" />
      </div>

      {/* ── HUD Scanner Overlay ── */}
      <div className="hud-scanner z-30" />

      {/* ── Depth gradient overlays ── */}
      <div className="absolute inset-0 bg-gradient-to-r from-[#080b06]/80 via-[#080b06]/30 to-transparent z-[1] pointer-events-none" />
      <div className="absolute inset-0 bg-gradient-to-l from-[#080b06]/65 via-transparent to-transparent z-[1] pointer-events-none" />
      <div className="absolute inset-x-0 bottom-0 h-40 bg-gradient-to-t from-[#080b06] to-transparent z-[1] pointer-events-none" />

      {/* ── MAIN CONTENT ── */}
      <div className="relative z-10 w-full min-h-screen flex flex-col md:flex-row justify-between items-stretch p-6 md:p-12 lg:p-16">

        {/* LEFT: Branding / Mission Brief */}
        <div className="flex flex-col justify-between w-full md:w-[55%] lg:w-[58%] py-4 md:py-8">

          {/* Top Brand */}
          <div className="flex items-center gap-3">
            <Link href="/" className="hover:opacity-80 transition-opacity">
              <img src="/assets/images/ncc_logo.png" alt="NCC Logo" className="h-10 object-contain drop-shadow animate-float" />
            </Link>
            <div className="w-[1.5px] h-5 bg-ncc-olive/30" />
            <div className="flex flex-col">
              <span className="font-sans font-black text-xs text-white leading-none tracking-widest uppercase">
                06/34 (TN) INDEP COY
              </span>
              <span className="text-[8px] font-mono text-ncc-gold font-black uppercase mt-0.5 tracking-wider">
                NCC ARMY WING
              </span>
            </div>
          </div>

          {/* Bottom Mission Brief */}
          <div className="max-w-xl mt-16 md:mt-0">
            <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded bg-ncc-olive/10 border border-ncc-olive/25 text-ncc-gold text-[8px] font-mono tracking-widest uppercase mb-5">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
              SECURE LINK // PORTAL ONLINE
            </div>
            <h2 className="text-3xl lg:text-4xl font-black font-heading text-white leading-tight uppercase tracking-wider">
              Command &amp; Control <br />
              <span className="text-ncc-gold">Portal Gateway</span>
            </h2>
            <p className="text-[10px] lg:text-[11px] font-mono text-gray-400 mt-5 leading-loose uppercase tracking-widest max-w-sm">
              Official Administrative Gateway — Boys Contingent, SASTRA Deemed University.
              Authorized Personnel Access Only.
            </p>

            {/* Auth Terminal Feed */}
            <div className="mt-8 bg-black/55 border border-ncc-olive/25 rounded-lg p-4 font-mono text-[9px] leading-relaxed max-w-sm backdrop-blur-sm">
              <div className="flex items-center gap-2 text-ncc-olive/70 mb-2 border-b border-ncc-olive/15 pb-2">
                <i className="fas fa-terminal text-[8px]" />
                <span className="uppercase tracking-widest">auth.log</span>
                <span className="ml-auto w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              </div>
              <div className="space-y-1 overflow-hidden max-h-24">
                {authLogs.map((log, i) => (
                  <div key={i} className="phosphor-text opacity-90">{log}</div>
                ))}
                <div ref={logsEndRef} />
              </div>
            </div>
          </div>
        </div>

        {/* RIGHT: Login Card */}
        <div className="flex items-center justify-center md:justify-end w-full md:w-[45%] lg:w-[40%] mt-12 md:mt-0">
          <div className="w-full max-w-[360px] relative overflow-hidden rounded-xl tac-card-gold shadow-[0_30px_70px_rgba(0,0,0,0.85)]">

            {/* Tricolor bar */}
            <div className="tricolor-bar" />

            <div className="p-8">
              {/* Logos */}
              <div className="text-center mb-7">
                <div className="flex justify-center items-center gap-3 mb-5">
                  <Link href="/" className="transition-transform duration-300 hover:scale-105 flex items-center gap-2">
                    <img src="/assets/images/sastra_logo.png" alt="SASTRA" className="h-7 object-contain drop-shadow" />
                    <img src="/assets/images/40_years_logo.png" alt="SASTRA 40 Years" className="h-7 object-contain drop-shadow" />
                  </Link>
                  <div className="w-[1px] h-4 bg-ncc-olive/30" />
                  <img src="/assets/images/ncc_logo.png" alt="NCC" className="h-9 object-contain drop-shadow" />
                </div>
                <h1 className="font-heading text-lg font-black text-white tracking-widest uppercase">
                  Command Portal
                </h1>
                <p className="text-ncc-olive/70 text-[8px] font-mono tracking-widest mt-1 uppercase">
                  06/34 (TN) INDEP COY NCC (ARMY)
                </p>
                <div className="mt-3 w-full h-px bg-gradient-to-r from-transparent via-ncc-olive/30 to-transparent" />
              </div>

              {/* Form */}
              <form action={clientAction} className="space-y-5">

                {/* Email */}
                <div className="flex flex-col gap-1.5">
                  <label className="text-[8px] font-bold text-ncc-olive/80 uppercase tracking-widest font-mono flex items-center gap-1.5">
                    <i className="fas fa-user-shield text-[7px]" />
                    Identity Link (Email)
                  </label>
                  <div className="relative">
                    {/* Left bracket accent */}
                    <span className={`absolute left-3 top-1/2 -translate-y-1/2 font-mono text-sm transition-colors duration-300 ${
                      activeField === 'email' ? 'text-ncc-sky' : 'text-ncc-olive/40'
                    }`}>[</span>
                    <input
                      name="email"
                      type="email"
                      required
                      placeholder="cadet@sastra.edu"
                      disabled={isLoading}
                      onFocus={() => { setActiveField('email'); addLog('SYS: EMAIL IDENTITY FIELD ACTIVE...'); playTacClick(); }}
                      onBlur={() => setActiveField(null)}
                      className="w-full px-7 py-2.5 rounded-md bg-black/45 border border-ncc-olive/25 outline-none text-gray-200 placeholder-white/15 text-xs font-mono transition-all duration-300 focus:border-ncc-sky/55 focus:ring-1 focus:ring-ncc-sky/25 focus:shadow-[0_0_12px_rgba(75,156,211,0.12)]"
                    />
                    <span className={`absolute right-3 top-1/2 -translate-y-1/2 font-mono text-sm transition-colors duration-300 ${
                      activeField === 'email' ? 'text-ncc-sky' : 'text-ncc-olive/40'
                    }`}>]</span>
                  </div>
                </div>

                {/* Password */}
                <div className="flex flex-col gap-1.5">
                  <label className="text-[8px] font-bold text-ncc-olive/80 uppercase tracking-widest font-mono flex items-center gap-1.5">
                    <i className="fas fa-key text-[7px]" />
                    Command Key (Password)
                  </label>
                  <div className="relative">
                    <span className={`absolute left-3 top-1/2 -translate-y-1/2 font-mono text-sm transition-colors duration-300 ${
                      activeField === 'password' ? 'text-ncc-red' : 'text-ncc-olive/40'
                    }`}>[</span>
                    <input
                      name="password"
                      type="password"
                      required
                      placeholder="Registration Number"
                      disabled={isLoading}
                      onFocus={() => { setActiveField('password'); addLog('SYS: COMMAND KEY FIELD ACTIVE...'); playTacClick(); }}
                      onBlur={() => setActiveField(null)}
                      className="w-full px-7 py-2.5 rounded-md bg-black/45 border border-ncc-olive/25 outline-none text-gray-200 placeholder-white/15 text-xs font-mono transition-all duration-300 focus:border-ncc-red/55 focus:ring-1 focus:ring-ncc-red/25 focus:shadow-[0_0_12px_rgba(210,16,52,0.12)]"
                    />
                    <span className={`absolute right-3 top-1/2 -translate-y-1/2 font-mono text-sm transition-colors duration-300 ${
                      activeField === 'password' ? 'text-ncc-red' : 'text-ncc-olive/40'
                    }`}>]</span>
                  </div>
                </div>

                {/* Error */}
                {error && (
                  <div className="flex items-center gap-2 text-[9.5px] text-red-400 bg-ncc-red/8 border border-ncc-red/25 py-2 px-3 rounded-md font-mono animate-fade-in">
                    <i className="fas fa-shield-halved animate-pulse text-ncc-red" />
                    <span>{error.toUpperCase()}</span>
                  </div>
                )}

                {/* Submit */}
                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full relative overflow-hidden bg-gradient-to-r from-ncc-gold/20 to-ncc-olive/20 border border-ncc-gold/40 text-ncc-gold text-[10px] font-mono font-bold py-3 rounded-md hover:bg-ncc-gold/25 hover:border-ncc-gold/65 hover:shadow-[0_0_20px_rgba(212,175,55,0.2)] transition-all duration-300 active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none uppercase tracking-widest flex justify-center items-center gap-2.5"
                  onMouseEnter={() => playTacClick()}
                >
                  {/* Scan animation overlay */}
                  {isLoading && (
                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-ncc-gold/10 to-transparent animate-shimmer" />
                  )}
                  {isLoading ? (
                    <>
                      <i className="fas fa-spinner animate-spin" />
                      <span>Authenticating...</span>
                    </>
                  ) : (
                    <>
                      <i className="fas fa-unlock-alt" />
                      <span>Establish Secure Link</span>
                    </>
                  )}
                </button>
              </form>

              {/* Back link */}
              <div className="text-center mt-6 pt-4 border-t border-ncc-olive/15">
                <Link
                  href="/"
                  className="inline-flex items-center gap-2 text-[8px] font-mono uppercase tracking-widest text-ncc-olive/55 hover:text-ncc-gold transition-colors duration-300 group"
                  onMouseEnter={() => playTacClick()}
                >
                  <i className="fas fa-arrow-left transition-transform group-hover:-translate-x-1 duration-200" />
                  <span>Back to Home</span>
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
