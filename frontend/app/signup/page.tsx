'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { signupAction } from '@/app/actions';
import Link from 'next/link';
import TacticalBattleMap from '@/components/TacticalBattleMap';
import TargetCursor from '@/components/TargetCursor';
import CornerBrackets from '@/components/CornerBrackets';
import HudDatePicker from '@/components/HudDatePicker';
import HudSelect from '@/components/HudSelect';

/** Plays a short synthesizer beep for tactical audio feedback */
function playTacClick(type: 'soft' | 'confirm' | 'error' | 'hover' = 'soft') {
  if (typeof window === 'undefined') return;
  const isMuted = localStorage.getItem('ncc_sound_muted') === 'true';
  if (isMuted) return;

  try {
    const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);

    if (type === 'confirm') {
      osc.type = 'sine';
      osc.frequency.setValueAtTime(523.25, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(783.99, ctx.currentTime + 0.18);
      gain.gain.setValueAtTime(0.03, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.18);
      osc.start(); osc.stop(ctx.currentTime + 0.18);
    } else if (type === 'error') {
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(180, ctx.currentTime);
      gain.gain.setValueAtTime(0.035, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.2);
      osc.start(); osc.stop(ctx.currentTime + 0.2);
    } else if (type === 'hover') {
      osc.type = 'sine';
      osc.frequency.setValueAtTime(240, ctx.currentTime);
      gain.gain.setValueAtTime(0.012, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.04);
      osc.start(); osc.stop(ctx.currentTime + 0.04);
    } else {
      osc.type = 'sine';
      osc.frequency.setValueAtTime(200, ctx.currentTime);
      gain.gain.setValueAtTime(0.025, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.05);
      osc.start(); osc.stop(ctx.currentTime + 0.05);
    }
  } catch (_) {}
}

export default function SignupPage() {
  const router = useRouter();
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [activeField, setActiveField] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [dob, setDob] = useState('');
  const [rank, setRank] = useState('Cadet');
  const [year, setYear] = useState('I Year');
  const [branch, setBranch] = useState('');
  const [batchYear, setBatchYear] = useState('2026');
  const [nameVal, setNameVal] = useState('');
  const [emailVal, setEmailVal] = useState('');
  const [regNoVal, setRegNoVal] = useState('');
  const [authLogs, setAuthLogs] = useState<string[]>([]);
  const logsEndRef = useRef<HTMLDivElement | null>(null);

  const addLog = (msg: string) => {
    const ts = new Date().toLocaleTimeString('en-US', { hour12: false });
    setAuthLogs(prev => [...prev.slice(-6), `[${ts}] ${msg}`]);
  };

  useEffect(() => {
    const ts = new Date().toLocaleTimeString('en-US', { hour12: false });
    setAuthLogs([
      `[${ts}] SYS: SASTRA NCC ENLISTMENT TERMINAL v2.0`,
      `[${ts}] SYS: INITIALIZING CADET REGISTRATION LINK...`,
      `[${ts}] SYS: AWAITING ENLISTMENT TELEMETRY INPUTS...`,
    ]);
  }, []);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const paramName = params.get('name');
      const paramEmail = params.get('email');
      const paramRegNo = params.get('regNo');
      const paramDept = params.get('dept');

      if (paramName) {
        setNameVal(paramName.toUpperCase());
        addLog(`SYS: LOADED TELEMETRY NAME → ${paramName.toUpperCase()}`);
      }
      if (paramEmail) {
        setEmailVal(paramEmail);
        addLog(`SYS: LOADED TELEMETRY EMAIL → ${paramEmail}`);
      }
      if (paramRegNo) {
        setRegNoVal(paramRegNo);
        addLog(`SYS: LOADED TELEMETRY REG_NO → ${paramRegNo}`);
      }
      if (paramDept) {
        addLog(`SYS: PARSING TELEMETRY DEPT → ${paramDept.toUpperCase()}`);
        const lowerDept = paramDept.toLowerCase();
        
        // Auto-select Branch/Course
        if (lowerDept.includes('computer') || lowerDept.includes('cse') || lowerDept.includes('c.s.e')) {
          if (lowerDept.includes('artificial') || lowerDept.includes('ai') || lowerDept.includes('a.i')) {
            setBranch('B.Tech. Computer Science & Engineering (Artificial Intelligence & Data Science)');
          } else if (lowerDept.includes('cyber') || lowerDept.includes('security') || lowerDept.includes('cys')) {
            setBranch('B.Tech. Computer Science & Engineering (Cyber Security & Block Chain Technology)');
          } else if (lowerDept.includes('iot') || lowerDept.includes('automation')) {
            setBranch('B.Tech. Computer Science & Engineering (IoT & Automation)');
          } else if (lowerDept.includes('network')) {
            setBranch('B.Tech. Computer Science & Engineering (Networks)');
          } else {
            setBranch('B.Tech. Computer Science & Engineering');
          }
        } else if (lowerDept.includes('aerospace') || lowerDept.includes('aero')) {
          setBranch('B.Tech. Aerospace Engineering');
        } else if (lowerDept.includes('bioengineering') || lowerDept.includes('bio eng')) {
          setBranch('B.Tech. Bioengineering');
        } else if (lowerDept.includes('bioinformatics')) {
          setBranch('B.Tech. Bioinformatics');
        } else if (lowerDept.includes('biotech') || lowerDept.includes('biotechnology')) {
          setBranch('B.Tech. Biotechnology');
        } else if (lowerDept.includes('chemical') || lowerDept.includes('chem')) {
          setBranch('B.Tech. Chemical Engineering');
        } else if (lowerDept.includes('civil')) {
          setBranch('B.Tech. Civil Engineering [2023-24]');
        } else if (lowerDept.includes('electrical') || lowerDept.includes('eee')) {
          setBranch('B.Tech. Electrical and Electronics Engineering');
        } else if (lowerDept.includes('electronics') || lowerDept.includes('ece') || lowerDept.includes('e.c.e')) {
          if (lowerDept.includes('computer')) {
            setBranch('B.Tech. Electronics and Computer Engineering');
          } else if (lowerDept.includes('instrumentation') || lowerDept.includes('eie')) {
            setBranch('B.Tech. Electronics & Instrumentation Engineering');
          } else if (lowerDept.includes('vlsi')) {
            setBranch('B.Tech. Electronics Engineering (VLSI Design & Technology)');
          } else {
            setBranch('B.Tech. Electronics & Communication Engineering');
          }
        } else if (lowerDept.includes('robotics')) {
          setBranch('B.Tech. Robotics & Artificial Intelligence');
        } else if (lowerDept.includes('information') || lowerDept.includes('it') || lowerDept.includes('i.t')) {
          setBranch('B.Tech. Information Technology');
        } else if (lowerDept.includes('mechanical') || lowerDept.includes('mech')) {
          setBranch('B.Tech. Mechanical Engineering');
        } else if (lowerDept.includes('mechatronics')) {
          setBranch('B.Tech. Mechatronics');
        } else if (lowerDept.includes('law') || lowerDept.includes('llb') || lowerDept.includes('l.l.b')) {
          if (lowerDept.includes('ba')) {
            setBranch('BA LLB [2024-29] (5 Years Integrated)');
          } else if (lowerDept.includes('bba')) {
            setBranch('BBA LLB [2024-29] (5 Years Integrated)');
          } else {
            setBranch('B.Com LLB [2024-29] (5 Years Integrated)');
          }
        }

        // Auto-select Year
        if (lowerDept.includes('ii year') || lowerDept.includes('2nd year') || lowerDept.includes('/ ii') || lowerDept.includes('second year')) {
          setYear('II Year');
        } else if (lowerDept.includes('iii year') || lowerDept.includes('3rd year') || lowerDept.includes('/ iii') || lowerDept.includes('third year')) {
          setYear('III Year');
        } else if (lowerDept.includes('iv year') || lowerDept.includes('4th year') || lowerDept.includes('/ iv') || lowerDept.includes('fourth year')) {
          setYear('IV Year');
        } else if (lowerDept.includes('v year') || lowerDept.includes('5th year') || lowerDept.includes('/ v') || lowerDept.includes('fifth year')) {
          setYear('V Year');
        } else if (lowerDept.includes('i year') || lowerDept.includes('1st year') || lowerDept.includes('/ i') || lowerDept.includes('first year')) {
          setYear('I Year');
        }
      }
    }
  }, []);

  useEffect(() => {
    logsEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [authLogs]);

  async function clientAction(formData: FormData) {
    setError('');
    setSuccessMsg('');
    setIsLoading(true);
    addLog('SYS: TRANSMITTING ENLISTMENT PACKET...');
    playTacClick('confirm');

    // Combine custom year and branch picker values into yearBranch
    const yearVal = formData.get('year') as string;
    const branchVal = formData.get('branch') as string;
    formData.set('yearBranch', `${yearVal}, ${branchVal}`);

    const res = await signupAction(formData);

    if (res.success) {
      addLog('SYS: TRANSMISSION COMPLETED. REGISTRATION RECORDED.');
      addLog('SYS: ACCOUNT STATUS SET TO PENDING_APPROVAL.');
      setSuccessMsg(res.message || 'Signup successful. Awaiting verification.');
      setTimeout(() => {
        router.push('/login');
      }, 3000);
    } else {
      addLog('SYS: TRANSMISSION FAILED — ACCESS BLOCKED.');
      playTacClick('error');
      setError(res.message || 'Registration Failed');
      setIsLoading(false);
    }
  }

  return (
    <div className="relative min-h-screen w-full bg-[#080b06] overflow-x-hidden font-sans select-none">
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

      <div className="relative z-10 w-full min-h-screen flex flex-col items-center justify-center p-4 md:p-6 lg:p-8">
        <div className="max-w-[1360px] w-full flex flex-col md:flex-row items-stretch justify-between gap-6 lg:gap-12">
          
          {/* LEFT: Branding & Console logs */}
          <div className="flex flex-col justify-between w-full md:w-[25%] py-2 md:mr-auto">
            {/* Top Brand */}
            <div className="flex items-center gap-3">
              <Link href="/" className="hover:opacity-80 transition-opacity" onMouseEnter={() => playTacClick('hover')}>
                <img src="/assets/images/ncc_logo.png" alt="NCC Logo" className="h-10 object-contain drop-shadow animate-float" />
              </Link>
              <div className="w-[1.5px] h-5 bg-ncc-olive/30" />
              <div className="flex flex-col">
                <span className="font-sans font-extrabold text-sm text-white leading-none tracking-wider uppercase">
                  06/34 (TN) INDEP COY
                </span>
                <span className="text-[8.5px] font-bold tracking-[0.25em] text-ncc-sky uppercase mt-1">
                  NCC ARMY ENLISTMENT
                </span>
              </div>
            </div>

            {/* Center Info and Log */}
            <div className="max-w-xl mt-10 md:mt-16">
              <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded bg-ncc-sky/10 border border-ncc-sky/25 text-ncc-sky text-[10px] font-mono tracking-widest uppercase mb-5">
                <span className="w-1.5 h-1.5 rounded-full bg-ncc-sky animate-ping" />
                ENLISTMENT NETWORK // LINK ESTABLISHED
              </div>
              <h2 className="text-3xl lg:text-4xl font-black font-heading text-white leading-tight uppercase tracking-wider">
                Cadet Registration &amp; <br />
                <span className="text-ncc-sky">Enlistment Terminal</span>
              </h2>
              <p className="text-xs lg:text-xs font-sans text-gray-400 mt-5 leading-relaxed uppercase tracking-wider max-w-sm">
                Official cadet enlistment form. Submit details to create your secure identity card record.
                All signups require validation by the ANO, SUO, or CUO.
              </p>

              {/* Auth Terminal Feed */}
              <div className="mt-8 bg-black/55 border border-ncc-sky/25 rounded-lg p-4 font-mono text-[11px] leading-relaxed max-w-sm backdrop-blur-sm">
                <div className="flex items-center gap-2 text-ncc-sky/70 mb-2 border-b border-ncc-sky/15 pb-2">
                  <i className="fas fa-terminal text-[10px]" />
                  <span className="uppercase tracking-widest">enlistment.log</span>
                  <span className="ml-auto w-1.5 h-1.5 rounded-full bg-ncc-sky animate-pulse" />
                </div>
                <div className="space-y-1 overflow-hidden max-h-24">
                  {authLogs.map((log, i) => (
                    <div key={i} className="text-ncc-sky/90 opacity-90">{log}</div>
                  ))}
                  <div ref={logsEndRef} />
                </div>
              </div>
            </div>
          </div>

          {/* RIGHT: Signup Form Card */}
          <div className="flex items-center justify-center md:justify-end w-full md:w-[72%] relative">
            
            {/* Glowing backdrops for depth */}
            <div className="glow-backdrop-blur-sky absolute -top-12 -left-12 opacity-65 z-0"></div>
            <div className="glow-backdrop-blur-gold absolute -bottom-12 -right-12 opacity-45 z-0"></div>

            <div className="w-full max-w-[840px] relative overflow-visible rounded-xl bg-black/75 border border-ncc-sky/35 shadow-[0_30px_70px_rgba(0,0,0,0.85)] z-10 group">
              
              {/* CornerBrackets on hover */}
              <CornerBrackets colorClass="border-ncc-sky/60" />

              {/* Tricolor top bar */}
              <div className="h-1.5 w-full bg-gradient-to-r from-ncc-orange via-white to-ncc-green" />

              <div className="px-6 py-4">
                {/* Logos */}
                <div className="text-center mb-3">
                  <h1 className="font-heading text-xl font-black text-white tracking-wider uppercase">
                    Register Account
                  </h1>
                  <p className="text-ncc-sky/70 text-[10px] font-mono tracking-widest mt-1 uppercase">
                    Submit Nom Roll Telemetry
                  </p>
                  <div className="mt-1 w-full h-px bg-gradient-to-r from-transparent via-ncc-sky/30 to-transparent" />
                </div>

                {/* Form */}
                <form action={clientAction} className="space-y-3">
                  
                  {/* Row 1: Name & Email */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {/* Name */}
                    <div className="flex flex-col gap-1">
                      <label className="text-[10px] font-bold text-ncc-sky/80 uppercase tracking-widest font-sans">
                        Full Name
                      </label>
                      <div className="relative">
                        <span className={`absolute left-3 top-1/2 -translate-y-1/2 font-mono text-sm transition-all duration-300 ${
                          activeField === 'name' ? 'text-ncc-sky drop-shadow-[0_0_6px_rgba(75,156,211,0.85)] font-bold' : 'text-ncc-olive/40'
                        }`}>[</span>
                        <input
                          name="name"
                          type="text"
                          required
                          placeholder="A B VENKATARAMANAN"
                          value={nameVal}
                          onChange={e => setNameVal(e.target.value)}
                          disabled={isLoading}
                          onMouseEnter={() => playTacClick('hover')}
                          onFocus={() => { setActiveField('name'); addLog('SYS: ENTERING NAME...'); playTacClick('soft'); }}
                          onBlur={() => setActiveField(null)}
                          className="w-full px-7 py-1.5 bg-black/60 border border-ncc-sky/25 outline-none text-gray-200 placeholder-white/30 text-sm font-sans transition-all duration-300 focus:border-ncc-sky/55 focus:ring-1 focus:ring-ncc-sky/25 focus:shadow-[0_0_12px_rgba(75,156,211,0.15)]"
                        />
                        <span className={`absolute right-3 top-1/2 -translate-y-1/2 font-mono text-sm transition-all duration-300 ${
                          activeField === 'name' ? 'text-ncc-sky drop-shadow-[0_0_6px_rgba(75,156,211,0.85)] font-bold' : 'text-ncc-olive/40'
                        }`}>]</span>
                      </div>
                    </div>

                    {/* Email */}
                    <div className="flex flex-col gap-1">
                      <label className="text-[10px] font-bold text-ncc-sky/80 uppercase tracking-widest font-sans">
                        Email address
                      </label>
                      <div className="relative">
                        <span className={`absolute left-3 top-1/2 -translate-y-1/2 font-mono text-sm transition-all duration-300 ${
                          activeField === 'email' ? 'text-ncc-sky drop-shadow-[0_0_6px_rgba(75,156,211,0.85)] font-bold' : 'text-ncc-olive/40'
                        }`}>[</span>
                        <input
                          name="email"
                          type="email"
                          required
                          placeholder="cadet@sastra.edu"
                          value={emailVal}
                          onChange={e => setEmailVal(e.target.value)}
                          disabled={isLoading}
                          onMouseEnter={() => playTacClick('hover')}
                          onFocus={() => { setActiveField('email'); addLog('SYS: ENTERING EMAIL...'); playTacClick('soft'); }}
                          onBlur={() => setActiveField(null)}
                          className="w-full px-7 py-1.5 bg-black/60 border border-ncc-sky/25 outline-none text-gray-200 placeholder-white/30 text-sm font-sans transition-all duration-300 focus:border-ncc-sky/55 focus:ring-1 focus:ring-ncc-sky/25 focus:shadow-[0_0_12px_rgba(75,156,211,0.15)]"
                        />
                        <span className={`absolute right-3 top-1/2 -translate-y-1/2 font-mono text-sm transition-all duration-300 ${
                          activeField === 'email' ? 'text-ncc-sky drop-shadow-[0_0_6px_rgba(75,156,211,0.85)] font-bold' : 'text-ncc-olive/40'
                        }`}>]</span>
                      </div>
                    </div>
                  </div>

                  {/* Row 2: Password, Rank & DOB */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    {/* Password */}
                    <div className="flex flex-col gap-1">
                      <label className="text-[10px] font-bold text-ncc-sky/80 uppercase tracking-widest font-sans">
                        Password
                      </label>
                      <div className="relative">
                        <span className={`absolute left-3 top-1/2 -translate-y-1/2 font-mono text-sm transition-all duration-300 ${
                          activeField === 'password' ? 'text-ncc-sky drop-shadow-[0_0_6px_rgba(75,156,211,0.85)] font-bold' : 'text-ncc-olive/40'
                        }`}>[</span>
                        <input
                          name="password"
                          type={showPassword ? 'text' : 'password'}
                          required
                          placeholder="Password"
                          disabled={isLoading}
                          onMouseEnter={() => playTacClick('hover')}
                          onFocus={() => { setActiveField('password'); addLog('SYS: SECURING PASSWORD...'); playTacClick('soft'); }}
                          onBlur={() => setActiveField(null)}
                          className="w-full pl-7 pr-12 py-1.5 bg-black/60 border border-ncc-sky/25 outline-none text-gray-200 placeholder-white/30 text-sm font-sans transition-all duration-300 focus:border-ncc-sky/55 focus:ring-1 focus:ring-ncc-sky/25 focus:shadow-[0_0_12px_rgba(75,156,211,0.15)]"
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          onMouseEnter={() => playTacClick('hover')}
                          className="absolute right-7 top-1/2 -translate-y-1/2 text-ncc-olive/50 hover:text-ncc-gold transition-colors text-xs z-10"
                        >
                          <i className={showPassword ? 'fas fa-eye-slash' : 'fas fa-eye'} />
                        </button>
                        <span className={`absolute right-3 top-1/2 -translate-y-1/2 font-mono text-sm transition-all duration-300 ${
                          activeField === 'password' ? 'text-ncc-sky drop-shadow-[0_0_6px_rgba(75,156,211,0.85)] font-bold' : 'text-ncc-olive/40'
                        }`}>]</span>
                      </div>
                    </div>

                    {/* Rank */}
                    <div className="flex flex-col gap-1">
                      <label className="text-[10px] font-bold text-ncc-sky/80 uppercase tracking-widest font-sans">
                        Rank
                      </label>
                      <div className="relative">
                        <span className={`absolute left-3 top-1/2 -translate-y-1/2 font-mono text-sm transition-all duration-300 ${
                          activeField === 'rank' ? 'text-ncc-sky drop-shadow-[0_0_6px_rgba(75,156,211,0.85)] font-bold' : 'text-ncc-olive/40'
                        } z-10 pointer-events-none`}>[</span>
                        <HudSelect
                          name="rank"
                          value={rank}
                          onChange={(val) => {
                            setRank(val);
                            addLog(`SYS: SELECTED RANK → ${val}`);
                          }}
                          options={[
                            { label: 'Cadet (CDT)', value: 'Cadet' },
                            { label: 'Lance Corporal (L/CPL)', value: 'Lance Corporal' },
                            { label: 'Corporal (CPL)', value: 'Corporal' },
                            { label: 'Sergeant (SGT)', value: 'Sergeant' },
                            { label: 'CQMS', value: 'CQMS' },
                            { label: 'CSM', value: 'CSM' },
                            { label: 'CUO', value: 'CUO' },
                            { label: 'SUO', value: 'SUO' }
                          ]}
                          required
                          disabled={isLoading}
                          onFocus={() => { setActiveField('rank'); addLog('SYS: RANK SELECT ACTIVE...'); }}
                          onBlur={() => setActiveField(null)}
                        />
                        <span className={`absolute right-3 top-1/2 -translate-y-1/2 font-mono text-sm transition-all duration-300 ${
                          activeField === 'rank' ? 'text-ncc-sky drop-shadow-[0_0_6px_rgba(75,156,211,0.85)] font-bold' : 'text-ncc-olive/40'
                        } z-10 pointer-events-none`}>]</span>
                      </div>
                    </div>

                    {/* Date of Birth */}
                    <div className="flex flex-col gap-1">
                      <label className="text-[10px] font-bold text-ncc-sky/80 uppercase tracking-widest font-sans">
                        Date of Birth
                      </label>
                      <div className="relative">
                        <span className={`absolute left-3 top-1/2 -translate-y-1/2 font-mono text-sm transition-all duration-300 ${
                          activeField === 'dob' ? 'text-ncc-sky drop-shadow-[0_0_6px_rgba(75,156,211,0.85)] font-bold' : 'text-ncc-olive/40'
                        } z-10 pointer-events-none`}>[</span>
                        <HudDatePicker
                          name="dob"
                          value={dob}
                          onChange={(val) => {
                            setDob(val);
                            addLog(`SYS: DOB CONFIG → ${val}`);
                          }}
                          required
                        />
                        <span className={`absolute right-3 top-1/2 -translate-y-1/2 font-mono text-sm transition-all duration-300 ${
                          activeField === 'dob' ? 'text-ncc-sky drop-shadow-[0_0_6px_rgba(75,156,211,0.85)] font-bold' : 'text-ncc-olive/40'
                        } z-10 pointer-events-none`}>]</span>
                      </div>
                    </div>
                  </div>

                  {/* Row 3: Regimental No, University Reg No & Hostel Info */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    {/* Regimental No */}
                    <div className="flex flex-col gap-1">
                      <label className="text-[10px] font-bold text-ncc-sky/80 uppercase tracking-widest font-sans">
                        Regimental No
                      </label>
                      <div className="relative">
                        <span className={`absolute left-3 top-1/2 -translate-y-1/2 font-mono text-sm transition-all duration-300 ${
                          activeField === 'regimentalNo' ? 'text-ncc-sky drop-shadow-[0_0_6px_rgba(75,156,211,0.85)] font-bold' : 'text-ncc-olive/40'
                        }`}>[</span>
                        <input
                          name="regimentalNumber"
                          type="text"
                          required
                          placeholder="TN2023SDA023581"
                          disabled={isLoading}
                          onMouseEnter={() => playTacClick('hover')}
                          onFocus={() => { setActiveField('regimentalNo'); addLog('SYS: ENTERING REGIMENTAL NUMBER...'); playTacClick('soft'); }}
                          onBlur={() => setActiveField(null)}
                          className="w-full px-7 py-1.5 bg-black/60 border border-ncc-sky/25 outline-none text-gray-200 placeholder-white/30 text-sm font-sans transition-all duration-300 focus:border-ncc-sky/55 focus:ring-1 focus:ring-ncc-sky/25 focus:shadow-[0_0_12px_rgba(75,156,211,0.15)]"
                        />
                        <span className={`absolute right-3 top-1/2 -translate-y-1/2 font-mono text-sm transition-all duration-300 ${
                          activeField === 'regimentalNo' ? 'text-ncc-sky drop-shadow-[0_0_6px_rgba(75,156,211,0.85)] font-bold' : 'text-ncc-olive/40'
                        }`}>]</span>
                      </div>
                    </div>

                    {/* University Registration No */}
                    <div className="flex flex-col gap-1">
                      <label className="text-[10px] font-bold text-ncc-sky/80 uppercase tracking-widest font-sans">
                        University Reg No
                      </label>
                      <div className="relative">
                        <span className={`absolute left-3 top-1/2 -translate-y-1/2 font-mono text-sm transition-all duration-300 ${
                          activeField === 'regNo' ? 'text-ncc-sky drop-shadow-[0_0_6px_rgba(75,156,211,0.85)] font-bold' : 'text-ncc-olive/40'
                        }`}>[</span>
                        <input
                          name="registrationNumber"
                          type="text"
                          required
                          placeholder="127009001"
                          value={regNoVal}
                          onChange={e => setRegNoVal(e.target.value)}
                          disabled={isLoading}
                          onMouseEnter={() => playTacClick('hover')}
                          onFocus={() => { setActiveField('regNo'); addLog('SYS: ENTERING UNIVERSITY REGISTER NUMBER...'); playTacClick('soft'); }}
                          onBlur={() => setActiveField(null)}
                          className="w-full px-7 py-1.5 bg-black/60 border border-ncc-sky/25 outline-none text-gray-200 placeholder-white/30 text-sm font-sans transition-all duration-300 focus:border-ncc-sky/55 focus:ring-1 focus:ring-ncc-sky/25 focus:shadow-[0_0_12px_rgba(75,156,211,0.15)]"
                        />
                        <span className={`absolute right-3 top-1/2 -translate-y-1/2 font-mono text-sm transition-all duration-300 ${
                          activeField === 'regNo' ? 'text-ncc-sky drop-shadow-[0_0_6px_rgba(75,156,211,0.85)] font-bold' : 'text-ncc-olive/40'
                        }`}>]</span>
                      </div>
                    </div>

                    {/* Hostel Info */}
                    <div className="flex flex-col gap-1">
                      <label className="text-[10px] font-bold text-ncc-sky/80 uppercase tracking-widest font-sans">
                        Hostel &amp; Room Info
                      </label>
                      <div className="relative">
                        <span className={`absolute left-3 top-1/2 -translate-y-1/2 font-mono text-sm transition-all duration-300 ${
                          activeField === 'hostelInfo' ? 'text-ncc-sky drop-shadow-[0_0_6px_rgba(75,156,211,0.85)] font-bold' : 'text-ncc-olive/40'
                        }`}>[</span>
                        <input
                          name="hostelInfo"
                          type="text"
                          required
                          placeholder="Vinaya Block-1, S-239 / Day Scholar"
                          disabled={isLoading}
                          onMouseEnter={() => playTacClick('hover')}
                          onFocus={() => { setActiveField('hostelInfo'); addLog('SYS: ENTERING RESIDENCY RECORD...'); playTacClick('soft'); }}
                          onBlur={() => setActiveField(null)}
                          className="w-full px-7 py-1.5 bg-black/60 border border-ncc-sky/25 outline-none text-gray-200 placeholder-white/30 text-sm font-sans transition-all duration-300 focus:border-ncc-sky/55 focus:ring-1 focus:ring-ncc-sky/25 focus:shadow-[0_0_12px_rgba(75,156,211,0.15)]"
                        />
                        <span className={`absolute left-3 top-1/2 -translate-y-1/2 font-mono text-sm transition-all duration-300 ${
                          activeField === 'hostelInfo' ? 'text-ncc-sky drop-shadow-[0_0_6px_rgba(75,156,211,0.85)] font-bold' : 'text-ncc-olive/40'
                        }`}>]</span>
                      </div>
                    </div>
                  </div>

                  {/* Row 4: Academic Branch / Course */}
                  <div className="flex flex-col gap-1">
                    <label className="text-[10px] font-bold text-ncc-sky/80 uppercase tracking-widest font-sans">
                      Academic Branch / Course
                    </label>
                    <div className="relative">
                      <span className={`absolute left-3 top-1/2 -translate-y-1/2 font-mono text-sm transition-all duration-300 ${
                        activeField === 'branch' ? 'text-ncc-sky drop-shadow-[0_0_6px_rgba(75,156,211,0.85)] font-bold' : 'text-ncc-olive/40'
                      } z-10 pointer-events-none`}>[</span>
                      <HudSelect
                        name="branch"
                        value={branch}
                        onChange={(val) => {
                          setBranch(val);
                          addLog(`SYS: SELECTED COURSE → ${val}`);
                        }}
                        options={[
                          "B.Tech. Aerospace Engineering",
                          "B.Tech. Bioengineering",
                          "B.Tech. Bioinformatics",
                          "B.Tech. Biotechnology",
                          "B.Tech. Chemical Engineering",
                          "B.Tech. Civil Engineering [2018-19]",
                          "B.Tech. Civil Engineering [2023-24]",
                          "B.Tech. Computer Science & Engineering",
                          "B.Tech. Computer Science & Engineering (Artificial Intelligence & Data Science)",
                          "B.Tech. Computer Science & Engineering (Cyber Security & Block Chain Technology)",
                          "B.Tech. Computer Science & Engineering (IoT & Automation)",
                          "B.Tech. Computer Science & Engineering (Networks)",
                          "B.Tech. Electrical and Electronics Engineering",
                          "B.Tech. Electronics & Communication Engineering",
                          "B.Tech. Electronics and Computer Engineering",
                          "B.Tech. Electronics & Instrumentation Engineering",
                          "B.Tech. Robotics & Artificial Intelligence",
                          "B.Tech. Electronics Engineering (VLSI Design & Technology)",
                          "B.Tech. Information Technology",
                          "B.Tech. Mechanical Engineering",
                          "B.Tech. Mechatronics",
                          "BA LLB [2022-27] (5 Years Integrated)",
                          "BA LLB [2023-28] (5 Years Integrated)",
                          "BA LLB [2024-29] (5 Years Integrated)",
                          "BBA LLB [2022-27] (5 Years Integrated)",
                          "BBA LLB [2023-28] (5 Years Integrated)",
                          "BBA LLB [2024-29] (5 Years Integrated)",
                          "B.Com LLB [2022-27] (5 Years Integrated)",
                          "B.Com LLB [2023-28] (5 Years Integrated)",
                          "B.Com LLB [2024-29] (5 Years Integrated)",
                          "M.Sc. Integrated Biotechnology (5 Years Integrated)",
                          "M.Sc. Integrated Physics (5 Years Integrated)",
                          "M.Sc. Integrated Chemistry (5 Years Integrated)",
                          "M.Sc. Integrated Mathematics (5 Years Integrated)",
                          "M.Sc. Integrated Mathematics and Computing (5 Years Integrated)",
                          "M.Sc. Integrated Data Science (5 Years Integrated)",
                          "M.Tech. Integrated Biotechnology (5 Years Integrated)",
                          "M.Tech. Integrated Medical Nanotechnology (5 Years Integrated)",
                          "B.Sc. B.Ed Physics (Integrated)",
                          "B.Sc. B.Ed Maths (Integrated)",
                          "BA B.Ed English (Integrated)",
                          "B.Com CA [2023-24]",
                          "B.Com CA [2024-25]",
                          "B.Com BFSI [2023-24]",
                          "B.Com BFSI [2024-25]"
                        ]}
                        required
                        disabled={isLoading}
                        searchable={true}
                        openUpward={true}
                        placeholder="Type or click to choose course..."
                        onFocus={() => { setActiveField('branch'); addLog('SYS: COURSE SELECT ACTIVE...'); }}
                        onBlur={() => setActiveField(null)}
                      />
                      <span className={`absolute right-3 top-1/2 -translate-y-1/2 font-mono text-sm transition-all duration-300 ${
                        activeField === 'branch' ? 'text-ncc-sky drop-shadow-[0_0_6px_rgba(75,156,211,0.85)] font-bold' : 'text-ncc-olive/40'
                      } z-10 pointer-events-none`}>]</span>
                    </div>
                  </div>

                  {/* Row 5: Year & Batch Year */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {/* Academic Year */}
                    <div className="flex flex-col gap-1">
                      <label className="text-[10px] font-bold text-ncc-sky/80 uppercase tracking-widest font-sans">
                        Academic Year
                      </label>
                      <div className="relative">
                        <span className={`absolute left-3 top-1/2 -translate-y-1/2 font-mono text-sm transition-all duration-300 ${
                          activeField === 'year' ? 'text-ncc-sky drop-shadow-[0_0_6px_rgba(75,156,211,0.85)] font-bold' : 'text-ncc-olive/40'
                        } z-10 pointer-events-none`}>[</span>
                        <HudSelect
                          name="year"
                          value={year}
                          onChange={(val) => {
                            setYear(val);
                            addLog(`SYS: SELECTED YEAR → ${val}`);
                          }}
                          options={['I Year', 'II Year', 'III Year', 'IV Year', 'V Year']}
                          required
                          disabled={isLoading}
                          openUpward={true}
                          onFocus={() => { setActiveField('year'); addLog('SYS: YEAR SELECT ACTIVE...'); }}
                          onBlur={() => setActiveField(null)}
                        />
                        <span className={`absolute right-3 top-1/2 -translate-y-1/2 font-mono text-sm transition-all duration-300 ${
                          activeField === 'year' ? 'text-ncc-sky drop-shadow-[0_0_6px_rgba(75,156,211,0.85)] font-bold' : 'text-ncc-olive/40'
                        } z-10 pointer-events-none`}>]</span>
                      </div>
                    </div>

                    {/* Batch Passout Year */}
                    <div className="flex flex-col gap-1">
                      <label className="text-[10px] font-bold text-ncc-sky/80 uppercase tracking-widest font-sans">
                        Batch Year (Passout)
                      </label>
                      <div className="relative">
                        <span className={`absolute left-3 top-1/2 -translate-y-1/2 font-mono text-sm transition-all duration-300 ${
                          activeField === 'batchYear' ? 'text-ncc-sky drop-shadow-[0_0_6px_rgba(75,156,211,0.85)] font-bold' : 'text-ncc-olive/40'
                        } z-10 pointer-events-none`}>[</span>
                        <HudSelect
                          name="batchYear"
                          value={batchYear}
                          onChange={(val) => {
                            setBatchYear(val);
                            addLog(`SYS: SELECTED BATCH → ${val}`);
                          }}
                          options={[
                            { label: '2026 (Batch 5)', value: '2026' },
                            { label: '2027 (Batch 6)', value: '2027' },
                            { label: '2028 (Batch 7)', value: '2028' },
                            { label: '2029 (Batch 8)', value: '2029' }
                          ]}
                          required
                          disabled={isLoading}
                          openUpward={true}
                          onFocus={() => { setActiveField('batchYear'); addLog('SYS: BATCH SELECT ACTIVE...'); }}
                          onBlur={() => setActiveField(null)}
                        />
                        <span className={`absolute right-3 top-1/2 -translate-y-1/2 font-mono text-sm transition-all duration-300 ${
                          activeField === 'batchYear' ? 'text-ncc-sky drop-shadow-[0_0_6px_rgba(75,156,211,0.85)] font-bold' : 'text-ncc-olive/40'
                        } z-10 pointer-events-none`}>]</span>
                      </div>
                    </div>
                  </div>

                  {/* Alerts */}
                  {error && (
                    <div className="flex items-center gap-2 text-xs text-red-400 bg-red-950/20 border border-red-500/30 py-2 px-3 rounded font-mono animate-fade-in">
                      <i className="fas fa-shield-halved animate-pulse text-red-500" />
                      <span>{error.toUpperCase()}</span>
                    </div>
                  )}

                  {successMsg && (
                    <div className="flex items-center gap-2 text-xs text-emerald-400 bg-emerald-950/20 border border-emerald-500/30 py-2 px-3 rounded font-mono animate-fade-in">
                      <i className="fas fa-check-circle animate-pulse text-emerald-500" />
                      <span>{successMsg.toUpperCase()}</span>
                    </div>
                  )}

                  {/* Submit */}
                  <button
                    type="submit"
                    disabled={isLoading}
                    className="w-full relative overflow-hidden bg-gradient-to-r from-ncc-sky/20 to-ncc-olive/20 border border-ncc-sky/40 text-ncc-sky text-[10px] font-sans font-bold py-3.5 rounded hover:bg-ncc-sky/25 hover:border-ncc-sky/65 hover:shadow-[0_0_20px_rgba(75,156,211,0.2)] transition-all duration-300 active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none uppercase tracking-widest flex justify-center items-center gap-2.5"
                    onMouseEnter={() => playTacClick('hover')}
                  >
                    {isLoading && (
                      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-ncc-sky/10 to-transparent animate-shimmer" />
                    )}
                    {isLoading ? (
                      <>
                        <i className="fas fa-spinner animate-spin" />
                        <span>Transmitting Packet...</span>
                      </>
                    ) : (
                      <>
                        <i className="fas fa-file-signature" />
                        <span>Transmit Enlistment Packet</span>
                      </>
                    )}
                  </button>
                </form>

                {/* Navigation Back */}
                <div className="text-center mt-4 pt-2.5 border-t border-ncc-sky/15 flex justify-between items-center text-xs font-sans uppercase tracking-widest">
                  <Link
                    href="/login"
                    className="text-ncc-sky/55 hover:text-white transition-colors duration-300 flex items-center gap-1"
                    onMouseEnter={() => playTacClick('hover')}
                  >
                    <i className="fas fa-arrow-left" />
                    <span>Existing Link (Login)</span>
                  </Link>
                  <Link
                    href="/"
                    className="text-ncc-olive/55 hover:text-ncc-gold transition-colors duration-300 flex items-center gap-1"
                    onMouseEnter={() => playTacClick('hover')}
                  >
                    <span>Home</span>
                    <i className="fas fa-home" />
                  </Link>
                </div>

              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
