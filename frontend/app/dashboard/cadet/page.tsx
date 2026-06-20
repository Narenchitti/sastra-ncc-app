'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { getDashboardData, submitPermission, submitAchievement, deleteAchievement, submitAchievementForVerification, getAttendanceSheet, submitBulkAttendance, updatePermissionStatus, deletePermission } from '@/app/actions';
import { User, Event, Permission, Achievement, Attendance } from '@/lib/types';
import ArmyNewsFeed from '@/components/ArmyNewsFeed';
import TacticalBattleMap from '@/components/TacticalBattleMap';
import TargetCursor from '@/components/TargetCursor';
import CornerBrackets from '@/components/CornerBrackets';

/** Format Date as YYYY-MM-DD in local timezone (not UTC) */
function toLocalDateStr(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/** Get Monday of the week containing `ref` (defaults to today). Non-mutating. */
function getMonday(ref?: Date): Date {
  const d = new Date(ref ?? Date.now());
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

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

export default function CadetDashboard() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [activeTab, setActiveTab] = useState('home');
  const [data, setData] = useState<{ events: Event[], permissions: Permission[], achievements: Achievement[], attendance: Attendance[], permissionManagerId?: string | null }>({ events: [], permissions: [], achievements: [], attendance: [] });
  const [message, setMessage] = useState('');
  const [attFilter, setAttFilter] = useState<'all' | 'parade' | 'event' | 'other'>('all');

  // Achievement State
  const [achCategory, setAchCategory] = useState<string>('Camp');
  const [editingAch, setEditingAch] = useState<Achievement | null>(null);

  // Attendance Register State
  const [showRegister, setShowRegister] = useState(false);
  const [registerEvent, setRegisterEvent] = useState<Event | null>(null);
  const [sheetData, setSheetData] = useState<any[]>([]);
  const [attendanceMarks, setAttendanceMarks] = useState<{ [key: string]: string }>({});
  const [confirmStep, setConfirmStep] = useState(0);

  // Time Mocking
  const [currentTime, setCurrentTime] = useState<Date | null>(null);

  // Schedule Navigation, Filtering, Details, and Leave Pre-filling
  const [currentWeekStart, setCurrentWeekStart] = useState<Date>(() => getMonday());
  const [scheduleFilter, setScheduleFilter] = useState<'All' | 'Parade' | 'Theory' | 'Camp' | 'Event'>('All');
  const [selectedEvent, setSelectedEvent] = useState<any | null>(null);
  const [leavePrefill, setLeavePrefill] = useState<{ startDate: string; endDate: string; reason: string } | null>(null);

  useEffect(() => {
    setCurrentTime(new Date());
    const timer = setInterval(() => setCurrentTime(new Date()), 60000);

    const stored = localStorage.getItem('user');
    if (!stored) {
      router.push('/login');
    } else {
      const u = JSON.parse(stored);
      setUser(u);
      refreshData();
    }
    return () => clearInterval(timer);
  }, []);

  async function refreshData() {
    setData(await getDashboardData());
  }

  // --- SUO APPROVAL LOGIC ---
  async function handleSuoAction(permId: string, action: 'FORWARD' | 'REJECT', comment: string) {
    const status = action === 'FORWARD' ? 'FORWARDED_TO_ANO' : 'REJECTED_BY_SUO';
    const fd = new FormData();
    fd.append('permId', permId);
    fd.append('status', status);
    fd.append('comment', comment);
    fd.append('role', 'SUO');

    const res = await updatePermissionStatus(fd);
    if (res.success) {
      setMessage(action === 'FORWARD' ? 'Approved & Forwarded to ANO' : 'Rejected successfully');
      refreshData();
    }
  }

  // --- ATTENDANCE TIME LOGIC ---
  function isRegisterOpen(event: Event) {
    if (!currentTime) return false;
    const startDateTime = new Date(`${event.date}T${event.startTime}`);
    const endDateTime = new Date(`${event.date}T${event.endTime}`);
    const openTime = new Date(startDateTime.getTime() - 10 * 60000); // 10 Minutes before start
    return currentTime >= openTime && currentTime <= endDateTime;
  }

  function getRegisterStatus(event: Event) {
    if (!currentTime) return { status: 'loading', label: 'Loading...' };
    if (isRegisterOpen(event)) return { status: 'open', label: 'Register Open' };
    const endDateTime = new Date(`${event.date}T${event.endTime}`);
    if (currentTime > endDateTime) return { status: 'closed', label: 'Event Completed' };
    return { status: 'upcoming', label: 'Not Open Yet' };
  }

  // --- ATTENDANCE REGISTER LOGIC ---
  async function launchRegister(targetEvent?: Event) {
    let ev = targetEvent;

    if (!ev) {
      ev = data.events.find(e => isRegisterOpen(e));
      if (!ev) {
        alert('No Attendance Registers are currently open (opens 10 mins before start).');
        return;
      }
    } else {
      if (!isRegisterOpen(ev)) {
        alert(`Attendance for "${ev.title}" is not open yet. It opens 10 mins before ${ev.startTime}.`);
        return;
      }
    }

    setRegisterEvent(ev);
    const res = await getAttendanceSheet(ev.id, ev.date);
    setSheetData(res.sheet);
    const initialMarks: any = {};
    res.sheet.forEach((u: any) => {
      if (u.autoPermission) initialMarks[u.id] = 'Permission';
      else if (u.existingStatus) initialMarks[u.id] = u.existingStatus;
      else initialMarks[u.id] = 'Present';
    });
    setAttendanceMarks(initialMarks);
    setShowRegister(true);
    setConfirmStep(0);
  }

  async function finalSubmitAttendance() {
    if (!registerEvent || !user) return;
    const records = Object.entries(attendanceMarks).map(([uid, status]) => ({
      userId: uid, status
    }));
    await submitBulkAttendance(registerEvent.id, records, user.id);
    setMessage('Attendance Register Saved Successfully!');
    setShowRegister(false);
  }

  if (!user) return null;
  const isRankHolder = ['Sergeant', 'CSM', 'CUO', 'SUO'].includes(user.rank);
  const isSUO = user.rank === 'SUO' || user.rank === 'CUO';

  const currentYear = new Date().getFullYear();
  const getYearLabel = (batch: number) => {
    const diff = batch - currentYear;
    if (diff === 0) return '3rd Year';
    if (diff === 1) return '2nd Year';
    if (diff === 2) return '1st Year';
    return 'Others';
  };

  /* ... Calendar ... */
  const CalendarView = () => {
    const weekDates = Array.from({ length: 7 }, (_, i) => {
      const d = new Date(currentWeekStart);
      d.setDate(currentWeekStart.getDate() + i);
      return d;
    });
    const weekEnd = new Date(weekDates[6]);
    const rangeLabel = `${weekDates[0].toLocaleDateString('default', { day: 'numeric', month: 'short' })} - ${weekEnd.toLocaleDateString('default', { day: 'numeric', month: 'short', year: 'numeric' })}`;

    const filteredEvents = data.events.filter(e => {
      if (scheduleFilter === 'All') return true;
      return e.type === scheduleFilter;
    });

    return (
      <div className="tac-card overflow-hidden">
        {/* Header */}
        <div className="p-6 border-b border-ncc-olive/15 flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
          <div>
            <h3 className="font-heading text-xl font-bold text-white uppercase tracking-wider">Weekly Training Schedule</h3>
            <p className="text-ncc-gold font-bold uppercase text-xs tracking-widest mt-0.5 font-mono">{rangeLabel}</p>
          </div>
          {/* Week Navigation */}
          <div className="flex items-center gap-2 self-start sm:self-auto">
            <button 
              onClick={() => {
                setCurrentWeekStart(prev => {
                  const d = new Date(prev);
                  d.setDate(d.getDate() - 7);
                  return d;
                });
              }}
              className="w-8 h-8 rounded-md border border-ncc-olive/25 flex items-center justify-center hover:border-ncc-gold/40 transition-colors text-ncc-olive/70 hover:text-ncc-gold"
              title="Previous Week"
            >
              <i className="fas fa-chevron-left text-xs"></i>
            </button>
            <button 
              onClick={() => {
                setCurrentWeekStart(getMonday());
                playTacClick();
              }}
              className="px-3 h-8 rounded-md border border-ncc-olive/25 text-xs font-sans font-semibold hover:border-ncc-gold/40 hover:text-ncc-gold transition-colors text-ncc-olive/70"
            >
              TODAY
            </button>
            <button 
              onClick={() => {
                setCurrentWeekStart(prev => {
                  const d = new Date(prev);
                  d.setDate(d.getDate() + 7);
                  return d;
                });
              }}
              className="w-8 h-8 rounded-md border border-ncc-olive/25 flex items-center justify-center hover:border-ncc-gold/40 transition-colors text-ncc-olive/70 hover:text-ncc-gold"
              title="Next Week"
            >
              <i className="fas fa-chevron-right text-xs"></i>
            </button>
          </div>
        </div>

        {/* Filter Pills */}
        <div className="flex gap-2 p-4 border-b border-ncc-olive/10 overflow-x-auto">
          {(['All', 'Parade', 'Theory', 'Camp', 'Event'] as const).map(f => {
            const isActive = scheduleFilter === f;
            const label = f === 'Theory' ? 'Theory' : f === 'Event' ? 'Events' : f === 'All' ? 'All' : `${f}s`;
            return (
              <button
                key={f}
                onClick={() => { setScheduleFilter(f); playTacClick(); }}
                className={`px-3.5 py-1.5 rounded-sm text-xs font-sans font-bold tracking-widest uppercase transition-all border ${
                  isActive 
                    ? 'bg-ncc-gold/15 border-ncc-gold/50 text-ncc-gold shadow-[0_0_10px_rgba(212,175,55,0.1)]' 
                    : 'bg-transparent border-ncc-olive/20 text-ncc-olive/70 hover:border-ncc-olive/40 hover:text-gray-300'
                }`}
              >
                {label}
              </button>
            );
          })}
        </div>

        {/* Calendar Grid */}
        <div className="grid grid-cols-1 md:grid-cols-7 gap-px bg-ncc-olive/10 border-b border-ncc-olive/10">
          {weekDates.map((dateObj, i) => {
            const dateStr = toLocalDateStr(dateObj);
            const dayName = dateObj.toLocaleDateString('default', { weekday: 'short' });
            const dayNum = dateObj.getDate();
            const daysEvents = filteredEvents.filter(e => e.date === dateStr);
            const isToday = dateStr === toLocalDateStr(currentTime ?? new Date());

            return (
              <div key={i} className={`min-h-[140px] p-3 flex flex-col gap-2 transition-colors ${isToday ? 'bg-ncc-gold/5 border border-ncc-gold/25' : 'bg-black/30 hover:bg-white/[0.03]'}`}>
                <div className="text-center mb-1">
                  <span className="block text-xs uppercase font-bold text-ncc-olive/60 tracking-widest font-sans">{dayName}</span>
                  <span className={`text-lg font-bold leading-none font-mono ${isToday ? 'text-ncc-gold shadow-[0_0_8px_rgba(212,175,55,0.5)]' : 'text-gray-400'}`}>{dayNum}</span>
                </div>
                <div className="flex flex-col gap-1.5 flex-grow justify-end">
                  {daysEvents.map(ev => {
                    const status = getRegisterStatus(ev);
                    const attRecord = data.attendance.find(a => a.eventId === ev.id && a.userId === user.id);
                    const approvedLeave = data.permissions.find(p => 
                      p.cadetId === user.id && 
                      p.status.includes('APPROVED') && 
                      ev.date >= p.startDate && ev.date <= p.endDate
                    );

                    return (
                      <div 
                        key={ev.id} 
                        onClick={() => { setSelectedEvent(ev); playTacClick(); }}
                        className={`text-xs p-2.5 rounded-sm border-l-2 relative group cursor-pointer hover:scale-[1.02] transition-all duration-200 ${
                          ev.type === 'Parade' ? 'bg-ncc-red/10 border-ncc-red text-red-300 hover:bg-ncc-red/15' : 
                          ev.type === 'Theory' ? 'bg-ncc-sky/10 border-ncc-sky text-sky-300 hover:bg-ncc-sky/15' : 
                          ev.type === 'Camp' ? 'bg-purple-900/30 border-purple-400 text-purple-300 hover:bg-purple-900/40' :
                          'bg-emerald-900/30 border-emerald-400 text-emerald-300 hover:bg-emerald-900/40'
                        }`}
                      >
                        <div className="font-bold truncate">{ev.title}</div>
                        <div className="opacity-75 text-xs mt-0.5 font-mono">{ev.startTime} - {ev.endTime}</div>

                        {/* Personal Attendance Indicator */}
                        {attRecord ? (
                          <span className={`hud-badge mt-1.5 ${
                            attRecord.status === 'Present' ? 'hud-badge-approved' :
                            attRecord.status === 'Absent' ? 'hud-badge-rejected' :
                            'hud-badge-pending'
                          }`}>
                            <i className={`fas ${attRecord.status === 'Present' ? 'fa-check' : 'fa-times'} text-[7px]`}></i>
                            {attRecord.status}
                          </span>
                        ) : approvedLeave ? (
                          <span className="hud-badge hud-badge-forwarded mt-1.5">
                            <i className="fas fa-plane-departure text-[7px]"></i> Leave
                          </span>
                        ) : null}

                        {/* Rank Holder Action */}
                        {isRankHolder && (
                          <div onClick={(e) => { e.stopPropagation(); launchRegister(ev); }}
                            className={`mt-2 text-center py-1 rounded-sm cursor-pointer font-bold transition-all text-[10px] font-sans uppercase tracking-widest ${status.status === 'open' ? 'bg-emerald-600/30 text-emerald-300 border border-emerald-500/40 animate-pulse' : 'bg-black/35 text-ncc-olive/50 border border-ncc-olive/20 hover:border-ncc-gold/40 hover:text-ncc-gold'}`}>
                            {status.status === 'open' ? 'Mark Attendance' : 'Closed'}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  if (showRegister && registerEvent) {
    const groupedData: { [key: string]: any[] } = { '3rd Year': [], '2nd Year': [], '1st Year': [], 'Others': [] };
    sheetData.forEach(stud => {
      const label = getYearLabel(stud.batchYear);
      groupedData[label] = groupedData[label] || [];
      groupedData[label].push(stud);
    });
    return (
      <div className="fixed inset-0 bg-black/75 z-50 flex flex-col items-center justify-center p-4 backdrop-blur-md">
        <div className="w-full max-w-4xl max-h-[90vh] rounded-xl shadow-2xl flex flex-col overflow-hidden tac-card-gold">
          <div className="bg-black/60 text-white p-6 flex justify-between items-center relative border-b border-ncc-gold/20">
            <div className="tricolor-bar absolute top-0 left-0 right-0"></div>
            <div>
              <h2 className="font-heading text-xl font-bold uppercase tracking-widest text-ncc-gold">Attendance Register</h2>
              <div className="text-xs font-sans text-ncc-olive/80 flex gap-4 mt-1">
                <span><i className="far fa-calendar-check mr-2 text-ncc-gold"></i> {registerEvent.title}</span>
                <span><i className="far fa-clock mr-2 text-ncc-gold"></i> {registerEvent.startTime} - {registerEvent.endTime}</span>
              </div>
            </div>
            <button onClick={() => setShowRegister(false)} className="text-ncc-olive/60 hover:text-ncc-gold transition-colors">
              <i className="fas fa-times text-xl"></i>
            </button>
          </div>
          <div className="flex-1 overflow-y-auto p-6 bg-black/40">
            {confirmStep === 1 ? (
              <div className="text-center py-12 max-w-md mx-auto font-sans">
                <div className="w-16 h-16 bg-ncc-gold/10 rounded-full flex items-center justify-center text-3xl text-ncc-gold mb-6 mx-auto border border-ncc-gold/30 shadow-[0_0_20px_rgba(212,175,55,0.15)]">
                  <i className="fas fa-exclamation-triangle"></i>
                </div>
                <h3 className="font-heading text-xl font-bold text-white mb-2 uppercase tracking-wider">Confirm Submission?</h3>
                <p className="text-gray-300 text-sm mb-8">You are about to submit the attendance register for {sheetData.length} cadets. This register will become the official record.</p>
                <div className="flex justify-center gap-4">
                  <button onClick={() => setConfirmStep(0)} className="px-6 py-2.5 rounded-md border border-ncc-olive/30 bg-black/30 hover:bg-ncc-olive/10 font-semibold text-gray-300 transition-colors text-sm">Go Back</button>
                  <button onClick={() => { finalSubmitAttendance(); playTacClick('confirm'); }} className="px-6 py-2.5 rounded-md bg-emerald-600/80 hover:bg-emerald-600 font-semibold text-white shadow-lg shadow-emerald-600/20 transition-all text-sm border border-emerald-500/40">Confirm &amp; Submit</button>
                </div>
              </div>
            ) : (
              Object.entries(groupedData).map(([year, students]) => students.length > 0 && (
                <div key={year} className="mb-8 last:mb-0">
                  <h3 className="text-xs font-bold uppercase text-ncc-olive/60 border-b border-ncc-olive/15 pb-2 mb-4 sticky top-0 bg-[#080b06] z-10 tracking-widest font-sans">{year}</h3>
                  <div className="space-y-2">
                    {students.map(stud => (
                       <div key={stud.id} className="tac-card p-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <div className="flex items-center gap-3 w-64">
                          <div className="w-10 h-10 rounded-sm flex items-center justify-center text-sm font-bold font-heading bg-ncc-gold/10 text-ncc-gold border border-ncc-gold/25">{stud.name.charAt(0)}</div>
                          <div>
                            <div className="font-bold text-sm text-gray-200 leading-tight font-sans">{stud.name}</div>
                            <div className="text-xs text-ncc-sky font-bold uppercase tracking-wider mt-0.5 font-sans">{stud.rank}</div>
                          </div>
                        </div>
                        {stud.autoPermission ? (
                          <div className="flex-1 bg-blue-900/20 border border-blue-500/30 text-blue-300 px-4 py-2.5 rounded-sm text-xs font-bold flex items-center justify-center gap-2 font-sans">
                            <i className="fas fa-file-signature text-sm"></i>
                            <span>Approved Leave ({stud.permissionType})</span>
                          </div>
                        ) : (
                          <div className="flex-1 grid grid-cols-4 gap-1.5 font-sans">
                             {['Present', 'Absent', 'Late', 'Permission'].map(status => {
                              const isActive = attendanceMarks[stud.id] === status;
                              const btnColor = status === 'Present' ? 'bg-emerald-600/30 text-emerald-300 border border-emerald-500/50 shadow-[0_0_8px_rgba(16,185,129,0.15)]' :
                                               status === 'Absent' ? 'bg-ncc-red/20 text-red-300 border border-ncc-red/50 shadow-[0_0_8px_rgba(210,16,52,0.15)]' :
                                               status === 'Late' ? 'bg-amber-600/30 text-amber-300 border border-amber-500/50 shadow-[0_0_8px_rgba(245,158,11,0.15)]' :
                                               'bg-ncc-sky/20 text-sky-300 border border-sky-500/40';
                              return (
                                <button
                                  key={status}
                                  onClick={() => { setAttendanceMarks(prev => ({ ...prev, [stud.id]: status })); playTacClick(); }}
                                  className={`py-2 rounded-sm text-xs font-bold border transition-all ${
                                    isActive ? btnColor : 'bg-black/30 text-ncc-olive/60 border-ncc-olive/20 hover:border-ncc-olive/40 hover:text-gray-300'
                                  }`}
                                >
                                  {status}
                                </button>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              ))
            )}
          </div>
          {confirmStep === 0 && (
            <div className="bg-black/50 p-5 border-t border-ncc-olive/15 flex justify-end gap-3 z-10">
              <button onClick={() => setShowRegister(false)} className="px-6 py-2.5 rounded-md border border-ncc-olive/25 bg-black/30 hover:bg-ncc-olive/10 font-sans font-semibold text-gray-400 transition-colors text-xs">Cancel</button>
              <button onClick={() => { setConfirmStep(1); playTacClick(); }} className="px-8 py-2.5 rounded-md bg-ncc-gold/15 border border-ncc-gold/40 hover:bg-ncc-gold/25 text-ncc-gold font-sans font-bold shadow-[0_0_15px_rgba(212,175,55,0.1)] transition-all text-xs uppercase tracking-widest">Review Submission</button>
            </div>
          )}
        </div>
      </div>
    );
  }

  const isManager = data.permissionManagerId === user?.id;
  const pendingRequests = data.permissions.filter(p => p.status === 'PENDING_REVIEW' || p.status === 'PENDING_SUO');
  const pastApprovals = data.permissions.filter(p => !['PENDING_REVIEW', 'PENDING_SUO'].includes(p.status) && (p.suoComment || p.status.includes('BY_SUO') || p.status.includes('FORWARDED')));
  
  const attMyRecords = (data.attendance || [])
    .filter((a: Attendance) => a.userId === user?.id)
    .map((a: Attendance) => ({ ...a, event: data.events.find(e => e.id === a.eventId) }))
    .filter(r => r.event)
    .sort((a, b) => new Date((b.event as Event).date).getTime() - new Date((a.event as Event).date).getTime()) as (Attendance & { event: Event })[];
  const attParades = attMyRecords.filter(r => r.event.type === 'Parade');
  const attEvents  = attMyRecords.filter(r => r.event.type === 'Event' || r.event.type === 'Camp');
  const attOthers  = attMyRecords.filter(r => r.event.type === 'Theory');
  const attFiltered = attFilter === 'all' ? attMyRecords : attFilter === 'parade' ? attParades : attFilter === 'event' ? attEvents : attOthers;
  
  const attPct = (recs: typeof attMyRecords) => {
    if (!recs.length) return null;
    return Math.round(recs.filter(r => r.status === 'Present' || r.status === 'Late').length / recs.length * 100);
  };

  const now = currentTime || new Date();
  const futureEvents = (data.events || []).filter(ev => {
    const eventTimeStr = ev.startTime ? `${ev.date}T${ev.startTime}` : `${ev.date}T00:00:00`;
    const endTimeStr = ev.endTime ? `${ev.date}T${ev.endTime}` : `${ev.date}T23:59:59`;
    const eventEndTime = new Date(endTimeStr);
    return eventEndTime.getTime() >= now.getTime();
  });
  futureEvents.sort((a, b) => {
    const timeA = new Date(a.startTime ? `${a.date}T${a.startTime}` : `${a.date}T00:00:00`).getTime();
    const timeB = new Date(b.startTime ? `${b.date}T${b.startTime}` : `${b.date}T00:00:00`).getTime();
    return timeA - timeB;
  });
  const upcomingEvent = futureEvents[0] || null;

  return (
    <div className="min-h-screen tacops-dark-bg flex font-body relative overflow-x-hidden">
      {/* TacOps Background */}
      <div className="fixed inset-0 z-0 pointer-events-none opacity-60">
        <TacticalBattleMap />
      </div>
      <div className="hud-scanner z-30" />
      <TargetCursor />
      
      {/* ── SIDEBAR NAVIGATION ── */}
      <aside className="w-64 tac-sidebar text-white fixed h-full hidden md:flex flex-col z-40">
        {/* Brand Header */}
        <div className="p-6 border-b border-ncc-olive/20 relative">
          <div className="tricolor-bar absolute top-0 left-0 right-0"></div>
          <div className="flex items-center gap-3 mt-1">
            <img src="/assets/images/ncc_logo.png" alt="NCC" className="h-9 animate-float" />
            <div>
              <h2 className="font-heading text-xl font-bold tracking-widest leading-none text-white uppercase">SASTRA NCC</h2>
              <p className="text-xs text-ncc-gold font-sans font-bold tracking-[0.1em] uppercase mt-1">Cadet Portal</p>
            </div>
          </div>
        </div>

        {/* Navigation Links */}
        <nav className="p-3 space-y-1 flex-grow">
          {[
            { id: 'home', label: 'Home', icon: 'home' },
            { id: 'schedule', label: 'Schedule', icon: 'calendar-alt' },
            { id: 'permissions', label: 'Permissions', icon: 'file-signature' },
            { id: 'achievements', label: 'Achievements', icon: 'medal' },
            { id: 'attendance', label: 'Attendance', icon: 'chart-bar' }
          ].map((item) => {
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => { setActiveTab(item.id); playTacClick('confirm'); }}
                onMouseEnter={() => playTacClick('hover')}
                className={`w-full text-left px-4 py-2.5 rounded-sm transition-all flex items-center gap-3 font-sans text-sm font-semibold uppercase tracking-wider relative ${
                  isActive 
                    ? 'tac-nav-active' 
                    : 'text-ncc-olive/60 hover:bg-ncc-olive/8 hover:text-gray-300 border border-transparent'
                }`}
              >
                {isActive && <div className="absolute left-0 top-2 bottom-2 w-0.5 bg-ncc-gold rounded-r-sm"></div>}
                <i className={`fas fa-${item.icon} w-4 text-center text-xs ${isActive ? 'text-ncc-gold' : 'text-ncc-olive/60'}`}></i>
                <span>{item.label}</span>
              </button>
            );
          })}
          {isManager && (
            <button
              onClick={() => { setActiveTab('approvals'); playTacClick('confirm'); }}
              onMouseEnter={() => playTacClick('hover')}
              className={`w-full text-left px-4 py-2.5 rounded-sm transition-all flex items-center gap-3 font-sans text-sm font-semibold uppercase tracking-wider relative mt-3 pt-3 border-t border-ncc-olive/15 ${
                activeTab === 'approvals'
                  ? 'tac-nav-active'
                  : 'text-ncc-olive/60 hover:bg-ncc-olive/8 hover:text-gray-300 border-transparent'
              }`}
            >
              {activeTab === 'approvals' && <div className="absolute left-0 top-2 bottom-2 w-0.5 bg-ncc-gold rounded-r-sm"></div>}
              <i className="fas fa-check-double w-4 text-center text-xs text-emerald-400"></i>
              <span>Approvals</span>
              {pendingRequests.length > 0 && (
                <span className="text-xs bg-ncc-red/20 border border-ncc-red/40 text-ncc-red px-1.5 py-0.5 rounded-sm ml-auto font-bold font-sans animate-pulse">
                  {pendingRequests.length}
                </span>
              )}
            </button>
          )}
        </nav>

        {/* User Profile Footer */}
        <div className="p-4 border-t border-ncc-olive/15">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-9 h-9 rounded-sm bg-ncc-gold/12 text-ncc-gold flex items-center justify-center font-bold text-base border border-ncc-gold/25">
              {user.name.charAt(0)}
            </div>
            <div className="overflow-hidden">
              <div className="text-white font-bold text-xs leading-tight truncate font-sans">{user.name}</div>
              <div className="text-ncc-sky text-xs font-sans font-bold uppercase tracking-wider mt-0.5">{user.rank} {user.regimentalNumber}</div>
              <div className="text-ncc-olive/60 text-[10px] font-sans mt-0.5">Batch {user.batchYear}</div>
            </div>
          </div>
          <button
            onClick={() => { playTacClick(); localStorage.removeItem('user'); localStorage.removeItem('access_token'); router.push('/'); }}
            className="w-full py-2 rounded-sm border border-ncc-olive/20 text-xs font-sans hover:bg-ncc-red/10 hover:border-ncc-red/30 hover:text-ncc-red text-ncc-olive/50 font-semibold transition-all flex items-center justify-center gap-2 uppercase tracking-widest"
          >
            <i className="fas fa-sign-out-alt"></i>
            <span>Sign Out</span>
          </button>
        </div>
      </aside>

      {/* ── MAIN CONTENT AREA ── */}
      <main className="md:ml-64 flex-1 min-w-0 p-6 md:p-10 overflow-x-hidden min-h-screen flex flex-col relative z-10">
        {message && (
          <div className="fixed top-5 right-5 bg-emerald-900/60 border border-emerald-500/40 text-emerald-300 px-4 py-3 rounded-md z-50 animate-fade-in shadow-xl flex items-center gap-3 backdrop-blur-sm font-sans text-xs">
            <i className="fas fa-check-circle text-emerald-400"></i>
            <span>{message}</span>
            <button onClick={() => setMessage('')} className="ml-4 text-emerald-500/60 hover:text-emerald-300 transition-colors">
              <i className="fas fa-times"></i>
            </button>
          </div>
        )}

        {/* Sticky Top Header */}
        <header className="flex justify-between items-center mb-8 pb-5 border-b border-ncc-olive/20">
          <div>
            <div className="text-xs font-mono text-ncc-olive/60 uppercase tracking-widest mb-1">// cadet.ops.console</div>
            <h1 className="text-2xl font-heading font-bold text-white uppercase tracking-widest">{activeTab}</h1>
          </div>
          <div className="flex gap-2">
            <span className="hud-badge hud-badge-rejected flex items-center gap-1.5 py-1 px-3">
              <i className="fas fa-crown"></i> {user?.rank || 'Cadet'}
            </span>
            {isManager && (
              <span className="hud-badge hud-badge-forwarded flex items-center gap-1.5 py-1 px-3">
                <i className="fas fa-shield-alt"></i> Permission Manager
              </span>
            )}
            {isRankHolder && (
              <span className="hud-badge hud-badge-verified flex items-center gap-1.5 py-1 px-3">
                <i className="fas fa-star"></i> Rank Holder
              </span>
            )}
          </div>
        </header>

        {/* ── TAB CONTENT ── */}

        {/* 1. HOME TAB */}
        {activeTab === 'home' && (
          <div className="space-y-8 animate-fade-in flex-grow">
            {/* Stats Overview */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              
              <div className="tac-card-sky p-5 relative overflow-hidden group">
                <CornerBrackets colorClass="border-ncc-sky/60" />
                <div className="text-xs text-ncc-olive/60 font-sans font-semibold uppercase tracking-wider mb-1">Personal Attendance</div>
                <div className="flex items-baseline gap-2 mt-2">
                  <span className="text-4xl font-heading font-bold text-ncc-sky">
                    {attPct(attMyRecords) !== null ? `${attPct(attMyRecords)}%` : '100%'}
                  </span>
                </div>
                <div className="w-full bg-ncc-olive/10 h-1 mt-4 rounded-full overflow-hidden">
                  <div 
                    className="neon-bar-fill-sky h-full rounded-full transition-all duration-500"
                    style={{ width: `${attPct(attMyRecords) !== null ? attPct(attMyRecords) : 100}%` }}
                  ></div>
                </div>
              </div>

              <div className="tac-card-red p-5 relative overflow-hidden group">
                <CornerBrackets colorClass="border-ncc-red/60" />
                <div className="text-xs text-ncc-olive/60 font-sans font-semibold uppercase tracking-wider mb-1">Pending Permissions</div>
                <div className="text-4xl font-heading font-bold text-ncc-red mt-2">
                  {data.permissions.filter(p => p.cadetId === user.id && p.status.includes('PENDING')).length}
                </div>
              </div>

              <div className="tac-card-gold p-5 relative overflow-hidden group">
                <CornerBrackets colorClass="border-ncc-gold/60" />
                <div className="text-xs text-ncc-olive/60 font-sans font-semibold uppercase tracking-wider mb-1">Total Achievements</div>
                <div className="text-4xl font-heading font-bold text-ncc-gold mt-2">
                  {data.achievements.filter(a => a.cadetId === user.id).length}
                </div>
              </div>

            </div>

            {/* SUO Call to Action */}
            {isSUO && pendingRequests.length > 0 && (
              <div className="tac-card-sky p-5 flex justify-between items-center animate-fade-in">
                <div>
                  <h3 className="text-ncc-sky font-sans font-bold mb-1 text-sm flex items-center gap-2">
                    <i className="fas fa-info-circle"></i> ENDORSEMENT REQUIRED
                  </h3>
                  <p className="text-gray-400 text-xs font-sans">{pendingRequests.length} cadet permission request(s) awaiting your endorsement.</p>
                </div>
                <button onClick={() => { setActiveTab('approvals'); playTacClick('confirm'); }} className="bg-ncc-sky/15 border border-ncc-sky/40 text-ncc-sky px-5 py-2 rounded-sm font-sans font-bold text-xs hover:bg-ncc-sky/25 transition-colors uppercase tracking-widest">
                  Review
                </button>
              </div>
            )}

            {/* Upcoming Event Hero card */}
            {upcomingEvent ? (
              <div className="tac-card-red p-6 flex flex-col md:flex-row justify-between items-center gap-6 relative overflow-hidden">
                <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-ncc-red/70 to-transparent"></div>
                <div className="z-10">
                  <div className="flex items-center gap-2 mb-3">
                    <span className="hud-badge hud-badge-rejected"><i className="fas fa-broadcast-tower text-[10px]"></i> NEXT MISSION</span>
                    <span className="text-ncc-olive/60 text-xs font-sans uppercase tracking-wider">Mandatory Attendance</span>
                  </div>
                  <h2 className="text-2xl font-heading font-bold text-white leading-tight uppercase tracking-wider">{upcomingEvent.title}</h2>
                  <div className="flex flex-wrap gap-4 mt-4 text-xs font-sans text-gray-300">
                    <span className="flex items-center gap-1.5">
                      <i className="far fa-calendar text-ncc-red"></i> 
                      {new Date(upcomingEvent.date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                    </span>
                    <span className="flex items-center gap-1.5 font-mono">
                      <i className="far fa-clock text-ncc-red"></i> 
                      {upcomingEvent.startTime}
                    </span>
                    <span className="flex items-center gap-1.5">
                      <i className="fas fa-map-marker-alt text-ncc-red"></i> 
                      {upcomingEvent.location}
                    </span>
                  </div>
                </div>
                <div className="flex gap-3 z-10">
                  <button onClick={() => { setActiveTab('schedule'); playTacClick(); }} className="px-5 py-2.5 bg-black/30 border border-ncc-red/30 hover:border-ncc-red/60 text-ncc-red font-sans font-bold rounded-sm transition-all text-xs uppercase tracking-widest">
                    View Schedule
                  </button>
                </div>
              </div>
            ) : (
              <div className="tac-card p-6 flex flex-col md:flex-row justify-between items-center gap-6">
                <div className="z-10">
                  <div className="flex items-center gap-2 mb-3">
                    <span className="hud-badge hud-badge-draft">No Upcoming Events</span>
                  </div>
                  <h2 className="text-xl font-heading font-bold text-ncc-olive/50 leading-none uppercase">No training events scheduled currently</h2>
                </div>
                <div className="flex gap-3 z-10">
                  <button onClick={() => { setActiveTab('schedule'); playTacClick(); }} className="px-5 py-2.5 bg-black/30 border border-ncc-olive/20 hover:border-ncc-olive/40 text-ncc-olive/60 font-sans font-bold rounded-sm transition-all text-xs uppercase tracking-widest">
                    View Schedule
                  </button>
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* News Feed Widget */}
              <div className="tac-card p-5 overflow-hidden">
                <ArmyNewsFeed />
              </div>
              {/* Discipline card */}
              <div className="tac-card-gold p-6 flex flex-col justify-center text-center">
                <div className="w-14 h-14 bg-ncc-gold/10 text-ncc-gold border border-ncc-gold/25 rounded-sm flex items-center justify-center text-2xl mx-auto mb-4 animate-float shadow-[0_0_15px_rgba(212,175,55,0.1)]">
                  <i className="fas fa-shield-halved"></i>
                </div>
                <h3 className="font-heading text-base font-bold text-ncc-gold uppercase tracking-widest">Unity &amp; Discipline</h3>
                <p className="text-gray-400 text-xs font-sans max-w-sm mx-auto mt-2 leading-relaxed tracking-wide">Mark attendance registers on time and submit achievements for verification to your Captain ANO Officer.</p>
              </div>
            </div>
          </div>
        )}

        {/* 2. APPROVALS TAB */}
        {activeTab === 'approvals' && isManager && (
          <div className="animate-fade-in space-y-6 flex-grow">
            <div className="tac-card p-5">
              <h2 className="font-heading text-base font-bold text-white uppercase tracking-widest">Cadet Request Registry</h2>
              <p className="text-ncc-olive/60 text-xs font-sans mt-0.5">Review, endorse, or forward incoming permission requests.</p>
            </div>
            <div className="space-y-4">
              <h3 className="font-sans text-xs font-bold text-ncc-olive/50 uppercase tracking-widest border-b border-ncc-olive/15 pb-2">Pending Endorsements ({pendingRequests.length})</h3>
              {pendingRequests.map(p => (
                <div key={p.id} className="tac-card-gold p-5 flex flex-col gap-4">
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="font-heading text-base font-bold text-white uppercase tracking-wider leading-none">{p.cadetName}</h3>
                      <div className="text-xs text-ncc-olive/60 mt-2 flex items-center gap-2 font-mono">
                        <i className="far fa-calendar-alt text-ncc-red"></i> {p.startDate} → {p.endDate}
                      </div>
                    </div>
                    {p.evidenceUrl && (
                      <a href={p.evidenceUrl} target="_blank" rel="noopener noreferrer" className="hud-badge hud-badge-forwarded flex items-center gap-1.5 py-1.5 px-3 hover:border-ncc-sky/60 transition-colors">
                        <i className="fas fa-paperclip"></i> Evidence
                      </a>
                    )}
                  </div>
                  <div className="bg-black/30 border border-ncc-olive/15 p-4 rounded-sm text-gray-300 text-xs font-sans">
                    <strong className="block text-xs font-bold text-ncc-olive/60 uppercase tracking-widest mb-1 font-sans">Reason for Leave</strong>
                    {p.reason}
                  </div>
                  <form className="flex flex-col md:flex-row gap-3 items-stretch md:items-end border-t border-ncc-olive/10 pt-4 mt-1">
                    <div className="flex-1">
                      <label className="text-xs font-sans font-bold text-ncc-olive/60 uppercase tracking-widest mb-1.5 block">Review Comments</label>
                      <input id={`comment-${p.id}`} name="comment" className="hud-input" placeholder="e.g. Verified medical certificate. Recommended." required />
                    </div>
                    <div className="flex gap-2">
                      <button type="button" onClick={() => {
                        const input = document.getElementById(`comment-${p.id}`) as HTMLInputElement;
                        if (!input.value) { alert('Please add a comment'); return; }
                        handleSuoAction(p.id, 'FORWARD', input.value); playTacClick('confirm');
                      }} className="bg-emerald-600/20 border border-emerald-500/40 text-emerald-400 px-4 py-2.5 rounded-sm font-sans font-bold text-xs uppercase tracking-wider hover:bg-emerald-600/30 transition-colors flex items-center gap-1.5">
                        <i className="fas fa-check"></i> Forward
                      </button>
                      <button type="button" onClick={() => {
                        const input = document.getElementById(`comment-${p.id}`) as HTMLInputElement;
                        if (!input.value) { alert('Please add a comment'); return; }
                        handleSuoAction(p.id, 'REJECT', input.value); playTacClick('error');
                      }} className="bg-ncc-red/15 text-ncc-red border border-ncc-red/35 px-4 py-2.5 rounded-sm font-sans font-bold text-xs uppercase tracking-wider hover:bg-ncc-red/25 transition-colors flex items-center gap-1.5">
                        <i className="fas fa-times"></i> Reject
                      </button>
                    </div>
                  </form>
                </div>
              ))}
              {pendingRequests.length === 0 && (
                <div className="flex flex-col items-center justify-center text-center py-12 tac-card border border-dashed border-ncc-olive/20 text-ncc-olive/80 text-xs font-sans gap-3">
                  <i className="fas fa-check-circle text-3xl text-ncc-olive/40 animate-pulse"></i>
                  <span>No new requests pending your endorsement.</span>
                </div>
              )}
            </div>
            
            <div className="space-y-4 pt-2">
              <h3 className="font-sans text-xs font-bold text-ncc-olive/50 uppercase tracking-widest border-b border-ncc-olive/15 pb-2">History</h3>
              <div className="space-y-3">
                {pastApprovals.map(p => (
                  <div key={p.id} className="tac-card p-5">
                    <div className="flex justify-between items-start gap-4">
                      <div className="space-y-2 flex-grow">
                        <div className="font-bold text-gray-200 text-sm leading-snug">{p.reason}</div>
                        <div className="text-xs text-ncc-olive/50 font-mono">{p.startDate} to {p.endDate}</div>

                        {p.suoComment && (
                          <div className="text-xs bg-black/30 p-2.5 rounded-sm border border-ncc-olive/15 mt-2 font-sans">
                            <strong className="text-ncc-olive/60 block mb-0.5 font-sans">// SUO Comment:</strong> {p.suoComment}
                          </div>
                        )}
                        {p.anoComment && (
                          <div className="text-xs bg-black/30 p-2.5 rounded-sm border border-ncc-olive/15 mt-1 font-sans">
                            <strong className="text-ncc-olive/60 block mb-0.5 font-sans">// ANO Comment:</strong> {p.anoComment}
                          </div>
                        )}
                        
                        {p.status === 'MEET_ANO' && (
                          <div className="bg-amber-900/20 border-l-2 border-amber-500 p-3 text-amber-300 text-xs rounded-r-sm mt-3 flex items-start gap-2 font-sans">
                            <i className="fas fa-exclamation-triangle text-amber-500 mt-0.5"></i>
                            <div>
                              <div className="font-bold">ANO Action Required</div>
                              <p className="mt-0.5 opacity-80">Report to the ANO office in person.</p>
                            </div>
                          </div>
                        )}
                      </div>
                      <div className="flex flex-col items-end gap-2 flex-shrink-0">
                        <span className={`hud-badge ${
                          p.status === 'APPROVED' ? 'hud-badge-approved' :
                          p.status.includes('REJECTED') || p.status.includes('DECLINED') ? 'hud-badge-rejected' :
                          p.status === 'MEET_ANO' ? 'hud-badge-pending' :
                          'hud-badge-forwarded'
                        }`}>
                          {p.status.replace(/_/g, ' ')}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
                {pastApprovals.length === 0 && (
                  <div className="text-center py-6 text-gray-400 text-sm">No action history found.</div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* 3. SCHEDULE TAB */}
        {activeTab === 'schedule' && (
          <div className="space-y-6 animate-fade-in flex-grow">
            <CalendarView />
            {isRankHolder && (
              <div className="tac-card-gold p-5 flex items-center justify-between">
                <div>
                  <h3 className="font-sans text-xs font-bold text-ncc-gold flex items-center gap-2 uppercase tracking-widest">
                    <i className="fas fa-clipboard-check"></i> Attendance Marking Authorized
                  </h3>
                  <p className="text-xs text-ncc-olive/60 font-sans mt-1.5">Submit the bulk attendance register for cadets from your rank panel.</p>
                </div>
                <button onClick={() => { launchRegister(); playTacClick('confirm'); }} className="bg-ncc-gold/15 border border-ncc-gold/40 text-ncc-gold px-5 py-2.5 rounded-sm font-sans font-bold text-xs uppercase tracking-widest hover:bg-ncc-gold/25 transition-all shadow-[0_0_12px_rgba(212,175,55,0.1)]">
                  Launch Register
                </button>
              </div>
            )}
          </div>
        )}

        {/* 4. PERMISSIONS TAB */}
        {activeTab === 'permissions' && (
          <div className="grid md:grid-cols-2 gap-6 animate-fade-in flex-grow">
            
            {/* Form */}
            <div className="tac-card-gold p-6 h-fit">
              <h3 className="font-heading text-base font-bold text-ncc-gold uppercase tracking-widest mb-5 border-b border-ncc-gold/15 pb-4">New Leave Request</h3>
              <form action={async (fd) => { fd.append('cadetId', user.id); fd.append('cadetName', `${user.rank} ${user.name}`); await submitPermission(fd); setMessage('Permission Submitted Successfully!'); setLeavePrefill(null); refreshData(); playTacClick('confirm'); }} className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-sans font-bold uppercase text-ncc-olive/60 mb-1.5 tracking-widest">From Date</label>
                    <input 
                      name="startDate" 
                      type="date" 
                      className="hud-input" 
                      defaultValue={leavePrefill?.startDate || ''} 
                      key={leavePrefill ? `prefill-start-${leavePrefill.startDate}` : 'normal-start'} 
                      required 
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-sans font-bold uppercase text-ncc-olive/60 mb-1.5 tracking-widest">To Date</label>
                    <input 
                      name="endDate" 
                      type="date" 
                      className="hud-input" 
                      defaultValue={leavePrefill?.endDate || ''} 
                      key={leavePrefill ? `prefill-end-${leavePrefill.endDate}` : 'normal-end'} 
                      required 
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-sans font-bold uppercase text-ncc-olive/60 mb-1.5 tracking-widest">Reason Detailed</label>
                  <textarea 
                    name="reason" 
                    className="hud-input h-28 py-2" 
                    defaultValue={leavePrefill?.reason || ''} 
                    key={leavePrefill ? `prefill-reason-${leavePrefill.reason}` : 'normal-reason'} 
                    placeholder="Provide detailed explanation..." 
                    required
                  ></textarea>
                </div>
                <div>
                  <label className="block text-xs font-sans font-bold uppercase text-ncc-olive/60 mb-1.5 tracking-widest">Evidence Document (Optional)</label>
                  <input type="file" name="evidence" className="w-full text-xs text-ncc-olive/60 font-sans file:mr-3 file:py-2 file:px-3 file:rounded-sm file:border file:border-ncc-olive/25 file:text-xs file:font-sans file:bg-black/40 file:text-ncc-olive/70 hover:file:bg-ncc-olive/10 file:transition-all cursor-pointer" />
                </div>
                <button className="w-full bg-ncc-gold/15 border border-ncc-gold/40 hover:bg-ncc-gold/25 text-ncc-gold py-3 rounded-sm font-sans font-bold text-xs uppercase tracking-widest shadow-[0_0_15px_rgba(212,175,55,0.1)] transition-all hover:shadow-[0_0_20px_rgba(212,175,55,0.18)]">
                  Submit Request
                </button>
              </form>
            </div>

            {/* History */}
            <div className="space-y-4">
              <h3 className="font-sans text-xs font-bold text-ncc-olive/50 uppercase tracking-widest border-b border-ncc-olive/15 pb-2">My Request History</h3>
              <div className="space-y-3">
                {data.permissions.filter(p => p.cadetId === user.id).map(p => (
                  <div key={p.id} className="tac-card p-4">
                    <div className="flex justify-between items-start gap-4">
                      <div className="space-y-2 flex-grow">
                        <div className="font-bold text-gray-200 text-xs leading-snug">{p.reason}</div>
                        <div className="text-xs text-ncc-olive/50 font-mono">{p.startDate} → {p.endDate}</div>

                        {p.suoComment && (
                          <div className="text-xs bg-black/30 p-2.5 rounded-sm border border-ncc-olive/15 mt-2 font-sans">
                            <strong className="text-ncc-olive/60 block mb-0.5">// SUO:</strong> {p.suoComment}
                          </div>
                        )}
                        {p.anoComment && (
                          <div className="text-xs bg-black/30 p-2.5 rounded-sm border border-ncc-olive/15 mt-1 font-sans">
                            <strong className="text-ncc-olive/60 block mb-0.5">// ANO:</strong> {p.anoComment}
                          </div>
                        )}
                        {p.aiStatus && (
                          <div className={`text-xs p-2.5 rounded-sm border mt-1 flex flex-col gap-1 font-sans ${
                            p.aiStatus === 'VERIFIED' ? 'bg-emerald-900/15 border-emerald-500/25 text-emerald-300' :
                            p.aiStatus === 'FLAGGED' ? 'bg-amber-900/15 border-amber-500/25 text-amber-300' :
                            p.aiStatus === 'ERROR' ? 'bg-ncc-red/10 border-ncc-red/25 text-red-400' :
                            'bg-black/30 border-ncc-olive/15 text-gray-400'
                          }`}>
                            <div className="flex items-center gap-1 font-bold text-xs uppercase tracking-widest">
                              <i className="fas fa-robot text-xs"></i> AI Audit
                            </div>
                            <div>{p.aiRemarks}</div>
                          </div>
                        )}

                        {p.status === 'MEET_ANO' && (
                          <div className="bg-amber-900/20 border-l-2 border-amber-500 p-2.5 text-amber-300 text-xs rounded-r-sm mt-2 flex items-start gap-2 font-sans animate-pulse">
                            <i className="fas fa-exclamation-triangle text-amber-400 mt-0.5"></i>
                            <div>
                              <div className="font-bold">ANO Action Required</div>
                              <p className="mt-0.5 opacity-80">Report to the ANO office in person.</p>
                            </div>
                          </div>
                        )}
                      </div>

                      <div className="flex flex-col items-end gap-2 flex-shrink-0">
                        <span className={`hud-badge ${
                          p.status === 'APPROVED' ? 'hud-badge-approved' :
                          p.status.includes('REJECTED') || p.status.includes('DECLINED') ? 'hud-badge-rejected' :
                          p.status === 'MEET_ANO' ? 'hud-badge-pending' :
                          'hud-badge-forwarded'
                        }`}>
                          {p.status.replace(/_/g, ' ')}
                        </span>

                        {/* Withdraw option */}
                        {(p.status === 'PENDING_REVIEW' || p.status === 'PENDING_SUO') && (
                          <form action={async (fd) => {
                            if (confirm('Are you sure you want to withdraw this request?')) {
                              fd.append('id', p.id);
                              await deletePermission(fd);
                              refreshData();
                            }
                          }}>
                            <button className="text-xs text-ncc-red/70 hover:text-ncc-red font-sans font-semibold transition-colors uppercase tracking-widest">
                              [Withdraw]
                            </button>
                          </form>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
                {data.permissions.filter(p => p.cadetId === user.id).length === 0 && (
                  <div className="flex flex-col items-center justify-center text-center py-12 tac-card border border-dashed border-ncc-olive/15 text-ncc-olive/80 text-xs font-sans gap-3">
                    <i className="fas fa-history text-3xl text-ncc-olive/40"></i>
                    <span>No request history found.</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* 5. ACHIEVEMENTS TAB */}
        {activeTab === 'achievements' && (
          <div className="grid md:grid-cols-3 gap-6 animate-fade-in flex-grow">
            
            {/* List */}
            <div className="md:col-span-2 space-y-5">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {data.achievements.filter(a => a.cadetId === user.id).length === 0 && (
                  <div className="sm:col-span-2 p-10 flex flex-col items-center justify-center text-center text-ncc-olive/80 tac-card border-dashed font-sans text-xs gap-3">
                    <i className="fas fa-medal text-3xl text-ncc-gold/50 animate-pulse"></i>
                    <span>No achievements logged yet. Use the form on the right to log your first accolade!</span>
                  </div>
                )}
                {data.achievements.filter(a => a.cadetId === user.id).map(ach => (
                  <div key={ach.id} className="tac-card p-5 relative group">
                    {(ach.status === 'DRAFT' || ach.status === 'REJECTED') && (
                      <button
                        onClick={() => { setEditingAch(ach); setAchCategory(ach.category); playTacClick(); }}
                        className="absolute top-3 right-3 text-ncc-olive/40 hover:text-ncc-gold bg-black/30 border border-ncc-olive/20 p-2 rounded-sm hidden group-hover:block transition-all"
                      >
                        <i className="fas fa-edit text-xs"></i>
                      </button>
                    )}

                    {/* Status Badge */}
                    <div className="mb-3">
                      {(!ach.status || ach.status === 'DRAFT') && <span className="hud-badge hud-badge-draft">Draft</span>}
                      {ach.status === 'PENDING' && <span className="hud-badge hud-badge-pending">Pending Verification</span>}
                      {ach.status === 'VERIFIED' && <span className="hud-badge hud-badge-verified"><i className="fas fa-check-circle mr-1"></i>Verified</span>}
                      {ach.status === 'REJECTED' && <span className="hud-badge hud-badge-rejected"><i className="fas fa-times-circle mr-1"></i>Rejected</span>}
                    </div>

                    <h4 className="font-heading text-base font-bold text-white mb-1 leading-snug uppercase">{ach.title}</h4>
                    {ach.location && (
                      <div className="text-xs text-ncc-olive/60 font-sans mb-1 flex items-center gap-1">
                        <i className="fas fa-map-marker-alt text-ncc-red/60"></i> {ach.location}
                      </div>
                    )}
                    <p className="text-xs text-ncc-olive/50 font-mono mb-4">{ach.date} {ach.endDate && `→ ${ach.endDate}`}</p>

                    {/* Submit Button */}
                    {(ach.status === 'DRAFT' || ach.status === 'REJECTED' || !ach.status) && (
                      <form action={async (fd) => {
                        if (confirm('Submit this achievement for verification? You will strictly NOT be able to edit it once submitted.')) {
                          fd.append('id', ach.id);
                          await submitAchievementForVerification(fd);
                          setMessage('Achievement Submitted for Verification');
                          refreshData(); playTacClick('confirm');
                        }
                      }}>
                        <button className="w-full text-center bg-ncc-gold/10 hover:bg-ncc-gold/18 text-ncc-gold border border-ncc-gold/30 py-2 rounded-sm text-xs font-sans font-bold transition-all flex items-center justify-center gap-1.5">
                          <i className="fas fa-paper-plane text-xs"></i> Submit for Verification
                        </button>
                      </form>
                    )}
                    {ach.anoComment && ach.status === 'REJECTED' && (
                      <div className="mt-2 text-xs text-red-400 bg-ncc-red/10 p-2.5 rounded-sm border border-ncc-red/25 font-sans">
                        <strong>// ANO Feedback:</strong> {ach.anoComment}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Form */}
            <div className="tac-card-gold p-5 h-fit">
              <div className="flex justify-between items-center mb-5 border-b border-ncc-gold/15 pb-4">
                <h3 className="font-heading text-sm font-bold text-ncc-gold uppercase tracking-widest">{editingAch ? 'Edit Achievement' : 'Add Achievement'}</h3>
                {editingAch && (
                  <button onClick={() => setEditingAch(null)} className="text-xs text-ncc-olive/50 hover:text-ncc-red font-sans transition-colors">
                    Cancel
                  </button>
                )}
              </div>
              <form key={editingAch ? editingAch.id : 'new'} action={async (fd) => {
                fd.append('cadetId', user.id);
                if (editingAch) fd.append('id', editingAch.id);
                await submitAchievement(fd);
                setMessage(editingAch ? 'Achievement Updated!' : 'Achievement Added!');
                setEditingAch(null);
                refreshData(); playTacClick('confirm');
              }} className="space-y-4">

                <div>
                  <label className="text-xs font-sans font-bold uppercase text-ncc-olive/60 mb-1.5 block tracking-widest">Title / Honor</label>
                  <input name="title" defaultValue={editingAch?.title} className="hud-input" placeholder="e.g. Best Shooter Award" required />
                </div>

                <div>
                  <label className="text-xs font-sans font-bold uppercase text-ncc-olive/60 mb-1.5 block tracking-widest">Category</label>
                  <select name="category" className="hud-input py-2" onChange={(e) => setAchCategory(e.target.value)} value={achCategory}>
                    <option value="Camp">Camp / Drill</option>
                    <option value="Sports">Sports / Firing</option>
                    <option value="Cultural">Cultural / NI</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs font-sans font-bold uppercase text-ncc-olive/60 mb-1.5 block tracking-widest">Location / Venue</label>
                  <input name="location" defaultValue={editingAch?.location} className="hud-input" placeholder="e.g. Perambalur, Trichy, New Delhi" />
                </div>

                {achCategory === 'Camp' ? (
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-xs font-sans font-bold uppercase text-ncc-olive/60 mb-1.5 block tracking-widest">Start Date</label>
                      <input name="date" type="date" defaultValue={editingAch?.date} className="hud-input" required />
                    </div>
                    <div>
                      <label className="text-xs font-sans font-bold uppercase text-ncc-olive/60 mb-1.5 block tracking-widest">End Date</label>
                      <input name="endDate" type="date" defaultValue={editingAch?.endDate} className="hud-input" required />
                    </div>
                  </div>
                ) : (
                  <div>
                    <label className="text-xs font-sans font-bold uppercase text-ncc-olive/60 mb-1.5 block tracking-widest">Date</label>
                    <input name="date" type="date" defaultValue={editingAch?.date} className="hud-input" required />
                  </div>
                )}

                <div>
                  <label className="text-xs font-sans font-bold uppercase text-ncc-olive/60 mb-1.5 block tracking-widest">Detailed Description</label>
                  <textarea name="description" defaultValue={editingAch?.description} className="hud-input h-24 py-2" placeholder="Provide extra description about this achievement..." required></textarea>
                </div>

                <div className="flex gap-2 pt-1">
                  <button className="w-full bg-ncc-gold/15 border border-ncc-gold/40 hover:bg-ncc-gold/25 text-ncc-gold py-2.5 rounded-sm font-sans font-bold text-xs uppercase tracking-widest transition-all">
                    {editingAch ? 'Update Record' : 'Save As Draft'}
                  </button>
                  {editingAch && (
                    <button type="button" onClick={async () => {
                      if (confirm('Are you sure you want to delete this achievement? This cannot be undone.')) {
                        const fd = new FormData();
                        fd.append('id', editingAch.id);
                        await deleteAchievement(fd);
                        setMessage('Achievement Deleted');
                        setEditingAch(null);
                        refreshData();
                      }
                    }} className="px-4 py-2.5 bg-ncc-red/15 text-ncc-red rounded-sm font-sans text-sm hover:bg-ncc-red/25 border border-ncc-red/30 transition-colors">
                      <i className="fas fa-trash"></i>
                    </button>
                  )}
                </div>
              </form>
            </div>
          </div>
        )}

        {/* 6. ATTENDANCE LOGS TAB */}
        {activeTab === 'attendance' && (
          <div className="space-y-6 animate-fade-in flex-grow">
            {/* Summary counters */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {[
                { label: 'Parades', val: attPct(attParades),    total: attParades.length,   cls: 'tac-card-red', bar: 'neon-bar-fill-red', textColor: 'text-ncc-red' },
                { label: 'Events & Camps',  val: attPct(attEvents),     total: attEvents.length,    cls: 'tac-card-sky', bar: 'neon-bar-fill-sky', textColor: 'text-ncc-sky' },
                { label: 'Others (Theory)',  val: attPct(attOthers),     total: attOthers.length,    cls: 'tac-card-gold', bar: 'neon-bar-fill-gold', textColor: 'text-ncc-gold' },
              ].map(({ label, val, total, cls, bar, textColor }) => (
                <div key={label} className={`${cls} p-5 relative overflow-hidden`}>
                  <div className="text-xs font-sans font-bold uppercase text-ncc-olive/60 tracking-widest">{label}</div>
                  {total === 0 ? (
                    <div className="text-2xl font-bold text-ncc-olive/30 mt-3">—</div>
                  ) : (
                    <>
                      <div className={`text-3xl font-heading font-bold mt-2 ${textColor}`}>
                        {val}%
                      </div>
                      <div className="w-full bg-ncc-olive/10 h-1 rounded-full mt-4 overflow-hidden">
                        <div className={`h-full rounded-full ${bar}`}
                          style={{ width: `${val}%` }} />
                      </div>
                      <div className="text-xs text-ncc-olive/50 mt-2 font-sans uppercase tracking-wider">{total} session{total !== 1 ? 's' : ''} logged</div>
                    </>
                  )}
                </div>
              ))}
            </div>

            {/* Filters */}
            <div className="flex gap-2 flex-wrap">
              {([
                { key: 'all',    label: 'All Logs', count: attMyRecords.length },
                { key: 'parade', label: 'Parades',        count: attParades.length },
                { key: 'event',  label: 'Events & Camps', count: attEvents.length },
                { key: 'other',  label: 'Other', count: attOthers.length },
              ] as const).map(({ key, label, count }) => (
                <button
                  key={key}
                  onClick={() => { setAttFilter(key); playTacClick(); }}
                  className={`px-3.5 py-1.5 rounded-sm text-xs font-sans font-bold uppercase tracking-widest border transition-all ${
                    attFilter === key 
                      ? 'bg-ncc-gold/15 border-ncc-gold/50 text-ncc-gold' 
                      : 'bg-transparent border-ncc-olive/20 text-ncc-olive/60 hover:border-ncc-olive/40 hover:text-gray-300'
                  }`}
                >
                  {label}
                  <span className={`ml-2 text-xs px-1.5 py-0.5 rounded-sm font-mono ${attFilter === key ? 'bg-ncc-gold/20 text-ncc-gold' : 'bg-ncc-olive/10 text-ncc-olive/50'}`}>{count}</span>
                </button>
              ))}
            </div>

            {/* Grid Table */}
            {attFiltered.length === 0 ? (
              <div className="flex flex-col items-center justify-center text-center py-16 tac-card border border-dashed border-ncc-olive/15 text-ncc-olive/80 font-sans text-xs gap-3">
                <i className="fas fa-calendar-times text-4xl text-ncc-olive/40"></i>
                <span>No attendance logs found for this category.</span>
              </div>
            ) : (
              <div className="tac-card overflow-hidden">
                <table className="w-full text-sm border-collapse">
                  <thead className="border-b border-ncc-olive/15 text-xs font-sans font-bold text-ncc-olive/60 uppercase tracking-widest text-left bg-black/30">
                    <tr>
                      <th className="px-5 py-3">Date</th>
                      <th className="px-5 py-3">Activity</th>
                      <th className="px-5 py-3 hidden md:table-cell">Type</th>
                      <th className="px-5 py-3 hidden md:table-cell">Time</th>
                      <th className="px-5 py-3 text-center">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-ncc-olive/8">
                    {attFiltered.map((r, i) => {
                      const ev = r.event!;
                      const [h] = ev.startTime.split(':').map(Number);
                      const session = ev.type === 'Parade' ? (h < 12 ? 'Morning' : 'Evening') : null;
                      const statusBadgeClass: Record<string, string> = { Present: 'hud-badge-approved', Late: 'hud-badge-pending', Permission: 'hud-badge-forwarded', Absent: 'hud-badge-rejected' };
                      const statusIcon: Record<string, string>  = { Present: 'fa-check-circle', Late: 'fa-clock', Permission: 'fa-file-signature', Absent: 'fa-times-circle' };
                      return (
                        <tr key={i} className="odd:bg-black/20 even:bg-transparent hover:bg-ncc-olive/5 transition-all duration-150 border-b border-ncc-olive/10" onMouseEnter={() => playTacClick('hover')}>
                          <td className="px-5 py-3 font-mono text-xs text-ncc-olive/60 whitespace-nowrap">
                            {new Date(ev.date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                          </td>
                          <td className="px-5 py-3">
                            <div className="font-bold text-gray-200 text-xs leading-tight">{ev.title}</div>
                            <div className="text-xs text-ncc-olive/50 font-sans mt-0.5">{ev.location}</div>
                          </td>
                          <td className="px-5 py-3 hidden md:table-cell">
                            <span className={`hud-badge ${
                              ev.type === 'Parade' ? 'hud-badge-rejected' :
                              ev.type === 'Event' ? 'hud-badge-approved' :
                              ev.type === 'Camp' ? 'hud-badge-verified' :
                              'hud-badge-draft'
                            }`}>
                              {ev.type}
                            </span>
                          </td>
                          <td className="px-5 py-3 hidden md:table-cell text-xs text-ncc-olive/60 font-mono">
                            {session ? (
                              <span className={`flex items-center gap-1.5 font-bold ${session === 'Morning' ? 'text-amber-400' : 'text-ncc-sky'}`}>
                                <i className={`fas fa-${session === 'Morning' ? 'sun' : 'moon'} text-[9px]`}></i> {session}
                              </span>
                            ) : <span>{ev.startTime} – {ev.endTime}</span>}
                          </td>
                          <td className="px-5 py-3 text-center">
                            <span className={`hud-badge ${statusBadgeClass[r.status] || 'hud-badge-draft'}`}>
                              <i className={`fas ${statusIcon[r.status] || 'fa-question-circle'}`}></i>
                              {r.status}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
        {/* Event Detail Modal */}
        {selectedEvent && (() => {
          const ev = selectedEvent;
          const attRecord = data.attendance.find(a => a.eventId === ev.id && a.userId === user.id);
          const approvedLeave = data.permissions.find(p => 
            p.cadetId === user.id && 
            p.status.includes('APPROVED') && 
            ev.date >= p.startDate && ev.date <= p.endDate
          );
          
          // Calculate relative countdown/status
          let countdownText = '';
          const now = currentTime || new Date();
          const startDateTime = new Date(`${ev.date}T${ev.startTime}`);
          const endDateTime = new Date(`${ev.date}T${ev.endTime}`);
          
          if (now < startDateTime) {
            const diffMs = startDateTime.getTime() - now.getTime();
            const diffHrs = Math.floor(diffMs / (1000 * 60 * 60));
            const diffMins = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
            if (diffHrs > 24) {
              countdownText = `Starts in ${Math.round(diffHrs / 24)} days`;
            } else if (diffHrs > 0) {
              countdownText = `Starts in ${diffHrs}h ${diffMins}m`;
            } else {
              countdownText = `Starts in ${diffMins} mins`;
            }
          } else if (now >= startDateTime && now <= endDateTime) {
            countdownText = 'Ongoing';
          } else {
            countdownText = 'Completed';
          }

          // Google Calendar Sync URL
          const formatCalDate = (dStr: string, tStr: string) => {
            return `${dStr.replace(/-/g, '')}T${tStr.replace(/:/g, '')}00`;
          };
          const startCal = formatCalDate(ev.date, ev.startTime);
          const endCal = formatCalDate(ev.date, ev.endTime);
          const gCalUrl = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(ev.title)}&dates=${startCal}/${endCal}&details=Location:+${encodeURIComponent(ev.location)}&sf=true&output=xml`;

          return (
            <div className="fixed inset-0 bg-black/75 z-50 flex items-center justify-center p-4 backdrop-blur-md animate-fade-in">
              <div className="w-full max-w-md rounded-xl shadow-2xl overflow-hidden tac-card-gold relative">
                <div className="tricolor-bar absolute top-0 left-0 right-0"></div>
                
                <div className="p-6 mt-1">
                  {/* Header */}
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <span className={`hud-badge ${
                        ev.type === 'Parade' ? 'hud-badge-rejected' :
                        ev.type === 'Theory' ? 'hud-badge-forwarded' :
                        ev.type === 'Camp' ? 'hud-badge-verified' :
                        'hud-badge-approved'
                      }`}>
                        {ev.type}
                      </span>
                      <h3 className="font-heading text-base font-bold text-white mt-2 leading-snug uppercase tracking-wider">{ev.title}</h3>
                    </div>
                    <button onClick={() => { setSelectedEvent(null); playTacClick(); }} className="text-ncc-olive/50 hover:text-ncc-gold transition-colors p-1">
                      <i className="fas fa-times text-lg"></i>
                    </button>
                  </div>

                  {/* Details list */}
                  <div className="space-y-3 my-5 text-sm text-gray-400 font-sans">
                    <div className="flex items-center gap-3">
                      <div className="w-7 h-7 rounded-sm bg-ncc-red/10 border border-ncc-red/25 flex items-center justify-center text-ncc-red text-xs">
                        <i className="far fa-calendar-alt"></i>
                      </div>
                      <div>
                        <div className="text-xs text-ncc-olive/60 font-sans uppercase tracking-widest">Date</div>
                        <div className="text-xs text-gray-200">
                          {new Date(ev.date).toLocaleDateString('default', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <div className="w-7 h-7 rounded-sm bg-ncc-gold/10 border border-ncc-gold/25 flex items-center justify-center text-ncc-gold text-xs">
                        <i className="far fa-clock"></i>
                      </div>
                      <div>
                        <div className="text-xs text-ncc-olive/60 font-sans uppercase tracking-widest">Time</div>
                        <div className="text-xs text-gray-200">{ev.startTime} — {ev.endTime}</div>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <div className="w-7 h-7 rounded-sm bg-ncc-sky/10 border border-ncc-sky/25 flex items-center justify-center text-ncc-sky text-xs">
                        <i className="fas fa-map-marker-alt"></i>
                      </div>
                      <div>
                        <div className="text-xs text-ncc-olive/60 font-sans uppercase tracking-widest">Location</div>
                        <div className="text-xs text-gray-200">{ev.location}</div>
                      </div>
                    </div>

                    {/* Countdown */}
                    <div className="flex items-center gap-3">
                      <div className="w-7 h-7 rounded-sm bg-ncc-olive/10 border border-ncc-olive/25 flex items-center justify-center text-ncc-olive/70 text-xs">
                        <i className="fas fa-hourglass-half"></i>
                      </div>
                      <div>
                        <div className="text-xs text-ncc-olive/60 font-sans uppercase tracking-widest">Status</div>
                        <div className="text-xs text-gray-200 flex items-center gap-1.5">
                          <span className={`w-1.5 h-1.5 rounded-full ${countdownText === 'Ongoing' ? 'bg-emerald-400 animate-pulse' : countdownText === 'Completed' ? 'bg-ncc-olive/30' : 'bg-ncc-sky'}`}></span>
                          {countdownText}
                        </div>
                      </div>
                    </div>

                    {/* Attendance Card */}
                    <div className="border border-ncc-olive/15 rounded-sm p-3 bg-black/30">
                      <div className="text-xs font-sans font-bold uppercase tracking-widest text-ncc-olive/60 mb-2">My Attendance</div>
                      {attRecord ? (
                        <div className="flex items-center justify-between">
                          <span className="text-xs text-ncc-olive/60 font-sans">Marked Status:</span>
                          <span className={`hud-badge ${
                            attRecord.status === 'Present' ? 'hud-badge-approved' :
                            attRecord.status === 'Absent' ? 'hud-badge-rejected' :
                            'hud-badge-pending'
                          }`}>
                            <i className={`fas ${attRecord.status === 'Present' ? 'fa-check-circle' : 'fa-times-circle'}`}></i>
                            {attRecord.status}
                          </span>
                        </div>
                      ) : approvedLeave ? (
                        <div className="flex items-center justify-between">
                          <span className="text-xs text-ncc-olive/60 font-sans">Duty Leave:</span>
                          <span className="hud-badge hud-badge-forwarded">
                            <i className="fas fa-check-circle"></i>
                            Approved Leave
                          </span>
                        </div>
                      ) : (
                        <div className="text-xs text-ncc-olive/40 font-sans italic">No attendance record logged.</div>
                      )}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex gap-3 mt-5">
                    {/* Google Calendar Sync */}
                    <a 
                      href={gCalUrl} 
                      target="_blank" 
                      rel="noopener noreferrer" 
                      className="flex-1 border border-ncc-olive/25 hover:border-ncc-olive/40 text-ncc-olive/60 hover:text-gray-300 font-sans font-bold rounded-sm transition-all py-2.5 text-xs uppercase tracking-widest text-center flex items-center justify-center gap-1.5"
                    >
                      <i className="fab fa-google"></i> Calendar
                    </a>

                    {/* Apply leave */}
                    {now < startDateTime && !approvedLeave && (
                      <button
                        onClick={() => {
                          setLeavePrefill({
                            startDate: ev.date,
                            endDate: ev.date,
                            reason: `Applying for leave from ${ev.type} training session: "${ev.title}" on ${ev.date}.`
                          });
                          setActiveTab('permissions');
                          setSelectedEvent(null);
                          playTacClick('confirm');
                        }}
                        className="flex-[2] bg-ncc-gold/15 border border-ncc-gold/40 hover:bg-ncc-gold/25 text-ncc-gold font-sans font-bold rounded-sm transition-all py-2.5 text-xs uppercase tracking-widest text-center flex items-center justify-center gap-1.5"
                      >
                        <i className="fas fa-file-signature"></i> Request Leave
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          );
        })()}

      </main>
    </div>
  );
}
