'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { getDashboardData, updatePermissionStatus, createEvent, verifyAchievement, deleteEvent, updatePermissionManager, runNaturalLanguageQuery, generateSchedulePlan, publishBulkEvents, getTelemetryTraces, approveUserAction, getInquiriesAction, replyToInquiryAction, broadcastAlertAction } from '@/app/actions';
import { User, Permission, Event, Achievement, Attendance } from '@/lib/types';
import ArmyNewsFeed from '@/components/ArmyNewsFeed';
import TacticalBattleMap from '@/components/TacticalBattleMap';
import TargetCursor from '@/components/TargetCursor';
import CornerBrackets from '@/components/CornerBrackets';
import HudDatePicker from '@/components/HudDatePicker';
import HudTimePicker from '@/components/HudTimePicker';
import HudSelect from '@/components/HudSelect';
import HudDialog from '@/components/HudDialog';

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

export default function ANODashboard() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [activeTab, setActiveTab] = useState('overview');
  const [data, setData] = useState<{ events: Event[], permissions: Permission[], achievements: Achievement[], users: User[], attendance: Attendance[], permissionManagerId?: string | null, fetchError?: string }>({ events: [], permissions: [], achievements: [], users: [], attendance: [] });
  const [selectedManagerId, setSelectedManagerId] = useState('');
  const [actionComments, setActionComments] = useState<Record<string, string>>({});

  // Inquiries & Alerts states
  const [inquiries, setInquiries] = useState<any[]>([]);
  const [replyText, setReplyText] = useState<Record<string, string>>({});

  // Custom HUD Dialog State
  const [dialog, setDialog] = useState<{
    isOpen: boolean;
    type: 'info' | 'confirm';
    title: string;
    message: string;
    onConfirm: () => void;
    onCancel: () => void;
    confirmText?: string;
    cancelText?: string;
  }>({
    isOpen: false,
    type: 'info',
    title: '',
    message: '',
    onConfirm: () => {},
    onCancel: () => {},
  });

  const hudAlert = (message: string, title = "System Notification") => {
    return new Promise<void>((resolve) => {
      setDialog({
        isOpen: true,
        type: 'info',
        title,
        message,
        confirmText: 'Acknowledge',
        onConfirm: () => {
          setDialog(prev => ({ ...prev, isOpen: false }));
          resolve();
        },
        onCancel: () => {
          setDialog(prev => ({ ...prev, isOpen: false }));
          resolve();
        }
      });
    });
  };

  const hudConfirm = (message: string, title = "Action Confirmation", confirmText = "Proceed") => {
    return new Promise<boolean>((resolve) => {
      setDialog({
        isOpen: true,
        type: 'confirm',
        title,
        message,
        confirmText,
        cancelText: 'Cancel',
        onConfirm: () => {
          setDialog(prev => ({ ...prev, isOpen: false }));
          resolve(true);
        },
        onCancel: () => {
          setDialog(prev => ({ ...prev, isOpen: false }));
          resolve(false);
        }
      });
    });
  };
  const [broadcastSubject, setBroadcastSubject] = useState('');
  const [broadcastMessage, setBroadcastMessage] = useState('');
  const [broadcastLoading, setBroadcastLoading] = useState(false);
  const [replyLoading, setReplyLoading] = useState<Record<string, boolean>>({});

  // Event Creation / Editing State
  const [editingId, setEditingId] = useState<string | null>(null);
  const [eventType, setEventType] = useState('Parade');
  const [eventTitle, setEventTitle] = useState('Morning Drill Parade');
  const [eventDate, setEventDate] = useState('');
  const [eventLocation, setEventLocation] = useState('');
  const [eventStart, setEventStart] = useState('');
  const [eventEnd, setEventEnd] = useState('');

  // Schedule Navigation, Filtering, and Details
  const [currentWeekStart, setCurrentWeekStart] = useState<Date>(() => getMonday());
  const [scheduleFilter, setScheduleFilter] = useState<'All' | 'Parade' | 'Theory' | 'Camp' | 'Event'>('All');
  const [selectedEvent, setSelectedEvent] = useState<any | null>(null);

  // Verified Registry State
  const [searchQuery, setSearchQuery] = useState('');

  // Command Center State
  const [consoleQuery, setConsoleQuery] = useState('');
  const [queryLoading, setQueryLoading] = useState(false);
  const [queryResult, setQueryResult] = useState<any | null>(null);

  // Schedule AI Planner State
  const [scheduleMethod, setScheduleMethod] = useState<'manual' | 'ai'>('manual');
  const [aiScheduleQuery, setAiScheduleQuery] = useState('');
  const [aiScheduleLoading, setAiScheduleLoading] = useState(false);
  const [aiProposedEvents, setAiProposedEvents] = useState<any[]>([]);
  const [aiPlanningExplanation, setAiPlanningExplanation] = useState('');

  // Diagnostics Console State
  const [showDiagnostics, setShowDiagnostics] = useState(false);
  const [telemetryLogs, setTelemetryLogs] = useState<any[]>([]);
  const [expandedTraceIdx, setExpandedTraceIdx] = useState<number | null>(null);

  // Periodic polling for telemetry logs
  useEffect(() => {
    if (showDiagnostics) {
      fetchTelemetry();
      const interval = setInterval(fetchTelemetry, 3000);
      return () => clearInterval(interval);
    }
  }, [showDiagnostics]);

  async function fetchTelemetry() {
    try {
      const res = await getTelemetryTraces();
      setTelemetryLogs(res || []);
    } catch (err) {
      console.error("Telemetry failed to fetch:", err);
    }
  }

  useEffect(() => {
    const stored = localStorage.getItem('user');
    if (!stored) router.push('/login');
    else {
      const u = JSON.parse(stored);
      if (u.role !== 'ANO' && u.rank !== 'SUO' && u.rank !== 'CUO') router.push('/dashboard/cadet');
      setUser(u);
      refreshData();
    }
  }, []);

  async function refreshData() {
    const freshData = await getDashboardData();
    setData(freshData);
    if (freshData.permissionManagerId) {
      setSelectedManagerId(freshData.permissionManagerId);
    }
    
    // Fetch public inquiries
    try {
      const inq = await getInquiriesAction();
      setInquiries(inq || []);
    } catch (e) {
      console.error("Failed to refresh inquiries:", e);
    }
  }

  // Smart Title Logic
  const handleTypeChangeVal = (val: string) => {
    setEventType(val);
    if (val === 'Parade') setEventTitle('Morning Drill Parade');
    else if (val === 'Theory') setEventTitle('Theory Session: ');
    else if (val === 'Camp') setEventTitle('Annual Training Camp');
    else setEventTitle('');
  };

  const handleTypeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    handleTypeChangeVal(e.target.value);
  };

  if (!user) return null;
  const isANO = user.role === 'ANO';

  // Stats
  const pendingReview = data.permissions.filter(p => p.status === 'PENDING_REVIEW');
  const pendingApprovals = data.permissions.filter(p => p.status === 'FORWARDED_TO_ANO');
  const suoRejections = data.permissions.filter(p => p.status === 'REJECTED_BY_SUO');
  const allActionRequired = [...pendingReview, ...pendingApprovals, ...suoRejections];
  const closedPermissions = data.permissions.filter(p => ['APPROVED', 'DECLINED_BY_ANO', 'MEET_ANO'].includes(p.status));
  const pendingAchievements = data.achievements.filter(a => a.status === 'PENDING');
  const verifiedAchievements = data.achievements.filter(a => a.status === 'VERIFIED');
  const todayStr = toLocalDateStr(new Date());
  const nextEvent = data.events.filter(e => e.date >= todayStr).sort((a, b) => a.date.localeCompare(b.date))[0];

  // Form Helpers
  const resetForm = () => {
    setEditingId(null);
    setEventType('Parade');
    setEventTitle('Morning Drill Parade');
    setEventDate('');
    setEventLocation('');
    setEventStart('');
    setEventEnd('');
  }

  const handleEditClick = (e: Event) => {
    setEditingId(e.id);
    setEventType(e.type);
    setEventTitle(e.title);
    setEventDate(e.date);
    setEventLocation(e.location);
    setEventStart(e.startTime);
    setEventEnd(e.endTime);

    // Scroll to form
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  // Calendar View Component
  const CalendarView = () => {
    const weekDates = Array.from({ length: 7 }, (_, i) => {
      const d = new Date(currentWeekStart);
      d.setDate(currentWeekStart.getDate() + i);
      return d;
    });
    const weekEnd = new Date(weekDates[6]);
    const rangeLabel = `${weekDates[0].toLocaleDateString('default', { day: 'numeric', month: 'short' })} - ${weekEnd.toLocaleDateString('default', { day: 'numeric', month: 'short', year: 'numeric' })}`;

    // Filter events based on active pill
    const filteredEvents = data.events.filter(e => {
      if (scheduleFilter === 'All') return true;
      return e.type === scheduleFilter;
    });

    // Collect all events for this week for the Detailed Agenda
    const weekEvents = weekDates.flatMap(dateObj => {
      const dateStr = toLocalDateStr(dateObj);
      return filteredEvents
        .filter(e => e.date === dateStr)
        .map(e => ({ ...e, dateObj }));
    }).sort((a, b) => a.startTime.localeCompare(b.startTime));

    return (
      <div className="tac-card overflow-hidden">
        {/* Header */}
        <div className="p-5 border-b border-ncc-olive/15 flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
          <div>
            <h3 className="font-heading text-lg font-bold text-white uppercase tracking-wider">Weekly Schedule</h3>
            <p className="text-ncc-gold font-bold uppercase text-xs tracking-widest mt-0.5 font-mono">{rangeLabel}</p>
          </div>
          {/* Week Navigation */}
          <div className="flex items-center gap-1.5 self-start sm:self-auto">
            <button 
              onClick={() => {
                setCurrentWeekStart(prev => {
                  const d = new Date(prev);
                  d.setDate(d.getDate() - 7);
                  return d;
                });
              }}
              className="w-7 h-7 rounded-md border border-ncc-olive/25 flex items-center justify-center hover:border-ncc-gold/40 transition-colors text-ncc-olive/70 hover:text-ncc-gold"
              title="Previous Week"
            >
              <i className="fas fa-chevron-left text-[10px]"></i>
            </button>
            <button 
              onClick={() => {
                setCurrentWeekStart(getMonday());
              }}
              className="px-2.5 h-7 rounded-md border border-ncc-olive/25 text-xs font-sans font-semibold hover:border-ncc-gold/40 hover:text-ncc-gold transition-colors text-ncc-olive/70"
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
              className="w-7 h-7 rounded-md border border-ncc-olive/25 flex items-center justify-center hover:border-ncc-gold/40 transition-colors text-ncc-olive/70 hover:text-ncc-gold"
              title="Next Week"
            >
              <i className="fas fa-chevron-right text-xs"></i>
            </button>
          </div>
        </div>

        {/* Filter Pills */}
        <div className="flex gap-1.5 p-3 border-b border-ncc-olive/10 overflow-x-auto">
          {(['All', 'Parade', 'Theory', 'Camp', 'Event'] as const).map(f => {
            const isActive = scheduleFilter === f;
            const label = f === 'Theory' ? 'Theory' : f === 'Event' ? 'Other' : f === 'All' ? 'All' : `${f}s`;
            return (
              <button
                key={f}
                onClick={() => { setScheduleFilter(f); playTacClick(); }}
                className={`px-3 py-1 rounded-sm text-xs font-sans font-bold uppercase tracking-widest transition-all border ${
                  isActive 
                    ? 'bg-ncc-gold/15 border-ncc-gold/50 text-ncc-gold' 
                    : 'bg-transparent border-ncc-olive/20 text-ncc-olive/70 hover:border-ncc-olive/40 hover:text-gray-300'
                }`}
              >
                {label}
              </button>
            );
          })}
        </div>

        {/* 1. Mini Visual Grid (Quick Glance) */}
        <div className="grid grid-cols-7 gap-px bg-ncc-olive/10 border-b border-ncc-olive/10">
          {weekDates.map((dateObj, i) => {
            const dateStr = toLocalDateStr(dateObj);
            const dayName = dateObj.toLocaleDateString('default', { weekday: 'short' });
            const dayNum = dateObj.getDate();
            const daysEvents = filteredEvents.filter(e => e.date === dateStr);
            const isToday = dateStr === toLocalDateStr(new Date());

            return (
              <div 
                key={i} 
                onClick={() => {
                  setEventDate(dateStr);
                  const formEl = document.querySelector('form');
                  if (formEl) formEl.scrollIntoView({ behavior: 'smooth' });
                  playTacClick();
                }}
                className={`min-h-[90px] p-2.5 flex flex-col gap-1.5 transition-all cursor-pointer border-b-2 ${
                  isToday 
                    ? 'bg-ncc-gold/5 border-b-ncc-gold border border-ncc-gold/20' 
                    : 'bg-black/30 border-transparent hover:bg-white/[0.03] hover:border-b-ncc-olive/30'
                }`}
                title={`Click to schedule event on ${dateStr}`}
              >
                <div className="text-center mb-1">
                  <span className="block text-[9px] uppercase font-bold text-gray-400 tracking-wider">{dayName}</span>
                  <span className={`text-sm font-bold leading-none ${isToday ? 'text-ncc-red' : 'text-gray-700'}`}>{dayNum}</span>
                </div>
                {/* Dots/Small Indicators */}
                <div className="flex flex-col gap-1 flex-grow justify-end">
                  {daysEvents.map(ev => (
                    <div key={ev.id} className={`h-1.5 rounded-full w-full ${ev.type === 'Parade' ? 'bg-red-500' : ev.type === 'Theory' ? 'bg-blue-500' : ev.type === 'Camp' ? 'bg-purple-500' : 'bg-emerald-500'}`} title={ev.title}></div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>

        {/* 2. Detailed Agenda List */}
        <div className="p-6 border-t border-ncc-olive/15 space-y-3 bg-black/25">
          <h4 className="font-heading font-bold text-ncc-olive/60 text-xs uppercase tracking-widest mb-2 font-mono">// Detailed Agenda</h4>
          <div className="space-y-3">
            {weekEvents.length === 0 ? (
              <p className="text-xs text-ncc-olive/40 italic text-center py-6 font-sans">No events scheduled for this week.</p>
            ) : (
              weekEvents.map(ev => (
                <div 
                  key={ev.id} 
                  onClick={() => setSelectedEvent(ev)}
                  className="tac-card p-4 flex flex-col md:flex-row md:items-center gap-4 hover:border-ncc-gold/45 transition-all group cursor-pointer hover:shadow-xl"
                >
                  {/* Date Badge */}
                  <div className="flex-shrink-0 w-12 text-center border-r border-ncc-olive/15 pr-4">
                    <span className="block text-[10px] font-bold text-ncc-olive/60 uppercase tracking-widest font-mono">{ev.dateObj.toLocaleDateString('default', { weekday: 'short' })}</span>
                    <span className="block text-xl font-heading font-bold text-white leading-none mt-1">{ev.dateObj.getDate()}</span>
                  </div>

                  {/* Event Details */}
                  <div className="flex-grow">
                    <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                      <span className={`hud-badge ${
                        ev.type === 'Parade' ? 'hud-badge-rejected' :
                        ev.type === 'Theory' ? 'hud-badge-forwarded' :
                        ev.type === 'Camp' ? 'hud-badge-verified' :
                        'hud-badge-approved'
                      }`}>
                        {ev.type}
                      </span>
                      <h5 className="font-bold text-white text-sm group-hover:text-ncc-gold transition-colors uppercase tracking-wider">{ev.title}</h5>
                    </div>
                    <div className="flex items-center gap-4 text-xs font-semibold text-ncc-olive/60 mt-1 font-sans">
                      <span className="flex items-center gap-1.5">
                        <i className="far fa-clock text-ncc-olive/40"></i> {ev.startTime} - {ev.endTime}
                      </span>
                      <span className="flex items-center gap-1.5">
                        <i className="fas fa-map-marker-alt text-ncc-olive/40"></i> {ev.location}
                      </span>
                    </div>
                  </div>

                  {/* Action/Edit (Update & Delete) */}
                  <div className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1.5 self-center" onClick={(e) => e.stopPropagation()}>
                    <button onClick={() => handleEditClick(ev)} className="text-ncc-olive/50 hover:bg-ncc-olive/10 hover:text-white p-2 rounded transition-colors" title="Edit Event">
                      <i className="fas fa-edit"></i>
                    </button>
                    <form action={async (fd) => {
                      if (!(await hudConfirm('Are you sure you want to delete this event? This will permanently remove it from the unit schedules.', 'Delete Event Confirmation'))) return;
                      fd.append('id', ev.id);
                      await deleteEvent(fd);
                      refreshData();
                    }}>
                      <button className="text-ncc-olive/50 hover:bg-ncc-red/10 hover:text-ncc-red p-2 rounded transition-colors" title="Delete Event">
                        <i className="fas fa-trash-alt"></i>
                      </button>
                    </form>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    );
  };

  const cadetOptions = [
    { label: 'Select a Cadet...', value: '' },
    ...data.users
      .filter(u => u.role?.toLowerCase() === 'cadet')
      .sort((a,b) => a.name.localeCompare(b.name))
      .map(u => ({
        label: `${u.rank} ${u.name} (${u.regimentalNumber || 'N/A'})`,
        value: u.id
      }))
  ];

  return (
    <div className="min-h-screen tacops-dark-bg flex font-body relative overflow-x-hidden">
      {/* TacOps Background */}
      <div className="fixed inset-0 z-0 pointer-events-none opacity-60">
        <TacticalBattleMap />
      </div>
      <div className="hud-scanner z-30" />
      <TargetCursor />

      {/* Sidebar */}
      <aside className="w-64 tac-sidebar text-white fixed h-full hidden md:flex flex-col z-40">
        {/* Brand Header */}
        <div className="p-6 border-b border-ncc-olive/20 relative">
          <div className="tricolor-bar absolute top-0 left-0 right-0"></div>
          <div className="flex items-center gap-3 mt-1">
            <img src="/assets/images/ncc_logo.png" alt="NCC" className="h-9 animate-float" />
            <div>
              <h2 className="font-heading text-xl font-bold tracking-widest leading-none text-white uppercase">SASTRA NCC</h2>
              <p className="text-xs text-ncc-gold font-sans tracking-[0.1em] uppercase mt-1.5">Command Center</p>
            </div>
          </div>
        </div>

        {/* Navigation Links */}
        <nav className="p-3 space-y-1 flex-grow">
          {[
            { id: 'overview', label: 'Overview', icon: 'th-large' },
            { id: 'approvals', label: 'Approvals', icon: 'check-double', badge: allActionRequired.length },
            { id: 'achievements', label: 'Achievements', icon: 'medal', badge: pendingAchievements.length },
            { id: 'schedule', label: 'Schedule', icon: 'calendar-alt' },
            { id: 'inquiries', label: 'Public Queries & Alerts', icon: 'envelope-open-text' },
            { id: 'command', label: 'Command Center', icon: 'terminal' }
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
                {item.badge !== undefined && item.badge > 0 && (
                  <span className="text-xs bg-ncc-red/20 border border-ncc-red/40 text-ncc-red px-1.5 py-0.5 rounded-sm ml-auto font-bold font-sans animate-pulse">
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        {/* User Profile Footer */}
        <div className="p-4 border-t border-ncc-olive/15">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-9 h-9 rounded-sm bg-ncc-red/15 text-ncc-red flex items-center justify-center font-bold text-base border border-ncc-red/25">
              {user.name.charAt(0)}
            </div>
            <div className="overflow-hidden">
              <div className="text-white font-bold text-xs leading-tight truncate">{user.name}</div>
              {user.role === 'ANO' ? (
                <div className="text-ncc-gold text-xs font-sans font-bold uppercase tracking-wider mt-0.5">Associate NCC Officer</div>
              ) : (
                <>
                  <div className="text-ncc-sky text-xs font-sans font-bold uppercase tracking-wider mt-0.5">{user.rank} {user.regimentalNumber}</div>
                  <div className="text-ncc-olive/50 text-[10px] font-sans mt-0.5">Batch {user.batchYear}</div>
                </>
              )}
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

      {/* Main Content Area */}
      <main className="md:ml-64 flex-1 min-w-0 p-6 md:p-10 overflow-x-hidden min-h-screen flex flex-col relative z-10">
        {data.fetchError && (
          <div className="bg-ncc-red/10 border border-ncc-red/30 text-red-400 p-4 rounded-md mb-6 text-xs flex items-center gap-3 font-mono">
            <i className="fas fa-exclamation-circle text-ncc-red"></i>
            <span><strong>Error loading data:</strong> {data.fetchError}</span>
          </div>
        )}

        {/* Sticky Top Header */}
        <header className="flex justify-between items-center mb-8 pb-5 border-b border-ncc-olive/20">
          <div>
            <div className="text-xs font-mono text-ncc-olive/50 uppercase tracking-widest mb-1">// ano.command.console</div>
            <h1 className="text-2xl font-heading font-bold text-white uppercase tracking-widest">
              {activeTab === 'command' ? 'Command Center' : activeTab}
            </h1>
          </div>
          <div className="flex gap-2">
            <span className="hud-badge hud-badge-rejected flex items-center gap-1.5 py-1 px-3">
              <i className="fas fa-crown"></i> {isANO ? 'Associate NCC Officer' : user.rank}
            </span>
          </div>
        </header>

        {/* --- OVERVIEW TAB --- */}
        {activeTab === 'overview' && (
          <div className="space-y-6 animate-fade-in flex-grow">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              
              <div className="tac-card-sky p-5 relative overflow-hidden group">
                <CornerBrackets colorClass="border-ncc-sky/60" />
                <div className="text-xs text-ncc-olive/60 font-sans uppercase tracking-widest mb-1">Total Strength</div>
                <div className="text-4xl font-heading font-bold text-ncc-sky mt-2">{data.users.filter(u => u.role === 'CADET').length}</div>
                <div className="text-xs text-ncc-olive/50 font-sans mt-1.5 uppercase">Active Cadets</div>
              </div>

              <div className="tac-card-gold p-5 relative overflow-hidden group">
                <CornerBrackets colorClass="border-ncc-gold/60" />
                <div className="text-xs text-ncc-olive/60 font-sans uppercase tracking-widest mb-1">Action Required</div>
                <div className="text-4xl font-heading font-bold text-ncc-gold mt-2">{allActionRequired.length}</div>
                <div className="text-xs text-ncc-olive/50 font-sans mt-1.5 uppercase">{pendingReview.length} new · {pendingApprovals.length} forwarded</div>
              </div>

              <div className="tac-card-red p-5 relative overflow-hidden group">
                <CornerBrackets colorClass="border-ncc-red/60" />
                <div className="text-xs text-ncc-olive/60 font-sans uppercase tracking-widest mb-1">SUO Rejections</div>
                <div className="text-4xl font-heading font-bold text-ncc-red mt-2">{suoRejections.length}</div>
                <div className="text-xs text-ncc-olive/50 font-sans mt-1.5 uppercase">Review Needed</div>
              </div>

              <div className="tac-card p-5 relative overflow-hidden group">
                <CornerBrackets colorClass="border-ncc-olive/50" />
                <div className="text-xs text-ncc-olive/60 font-sans uppercase tracking-widest mb-1">Next Event</div>
                <div className="text-base font-heading font-bold text-white mt-2 truncate">{nextEvent ? nextEvent.title : 'None'}</div>
                <div className="text-xs text-emerald-400 font-mono font-bold mt-1.5 uppercase">{nextEvent ? nextEvent.date : '—'}</div>
              </div>

            </div>

            {/* Quick Actions / Recent Activity */}
            <div className="grid md:grid-cols-2 gap-6">
              {/* Army News Feed */}
              <div className="tac-card p-5 overflow-hidden">
                <ArmyNewsFeed />
              </div>

              <div className="tac-card p-5">
                <h3 className="font-heading text-sm font-bold text-ncc-gold mb-4 uppercase tracking-widest border-b border-ncc-gold/15 pb-3">Recent Permission Activity</h3>
                <div className="space-y-1">
                  {data.permissions.filter(p => ['PENDING_REVIEW','FORWARDED_TO_ANO', 'REJECTED_BY_SUO'].includes(p.status)).slice(0, 5).map(p => (
                    <div key={p.id} className="border-b border-ncc-olive/10 last:border-0 py-3 flex justify-between items-center gap-4">
                      <div>
                        <div className="font-bold text-xs text-gray-200">{p.cadetName}</div>
                        <div className="text-xs text-ncc-olive/50 mt-1 line-clamp-1 font-sans">{p.reason}</div>
                      </div>
                      <span className={`hud-badge flex-shrink-0 ${
                        p.status === 'PENDING_REVIEW' ? 'hud-badge-pending' :
                        p.status === 'FORWARDED_TO_ANO' ? 'hud-badge-forwarded' : 'hud-badge-rejected'}`}>
                        {p.status === 'PENDING_REVIEW' ? 'New' : p.status === 'FORWARDED_TO_ANO' ? 'Forwarded' : 'Rejected'}
                      </span>
                    </div>
                  ))}
                  {data.permissions.length === 0 && <p className="text-xs text-ncc-olive/40 italic text-center py-6 font-sans">No recent activity.</p>}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* --- APPROVALS TAB --- */}
        {activeTab === 'approvals' && (
          <div className="space-y-8 animate-fade-in flex-grow">

            {/* Cadet Enlistment Approvals (Signup verification) */}
            {data.users.filter(u => u.status === 'PENDING_APPROVAL').length > 0 && (
              <div className="space-y-4">
                <h3 className="font-sans text-xs font-bold text-ncc-sky border-b border-ncc-sky/20 pb-2 flex items-center gap-2 uppercase tracking-widest">
                  <i className="fas fa-user-plus"></i> Cadet Enlistment Approvals (Awaiting Verification)
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {data.users.filter(u => u.status === 'PENDING_APPROVAL').map(pendingUser => (
                    <div key={pendingUser.id} className="tac-card-sky p-5 flex flex-col justify-between gap-4 relative overflow-hidden">
                      <div>
                        <div className="flex items-center gap-2 mb-2">
                          <span className="font-heading font-bold text-sm text-white uppercase tracking-wider">{pendingUser.name}</span>
                          <span className="hud-badge hud-badge-pending text-ncc-sky border-ncc-sky/30">Enlistment Pending</span>
                        </div>
                        <div className="grid grid-cols-2 gap-2 text-xs uppercase tracking-wider text-gray-400 font-mono">
                          <div><span className="text-ncc-sky/70 font-sans">Rank:</span> {pendingUser.rank}</div>
                          <div><span className="text-ncc-sky/70 font-sans">Reg No:</span> {pendingUser.regimentalNumber || 'N/A'}</div>
                          <div><span className="text-ncc-sky/70 font-sans">Branch:</span> {pendingUser.dob || 'N/A'}</div>
                          <div><span className="text-ncc-sky/70 font-sans">Email:</span> {pendingUser.email}</div>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-3 mt-2 z-10">
                        <button
                          type="button"
                          onClick={async () => {
                            if (await hudConfirm(`Approve registration request for cadet ${pendingUser.name}?`, 'Approve Cadet Registration', 'Approve')) {
                              playTacClick('confirm');
                              const res = await approveUserAction(pendingUser.id, 'APPROVED');
                              if (res.success) {
                                await hudAlert('Cadet approved successfully!', 'Registration Authorized');
                                refreshData();
                              } else {
                                await hudAlert(res.message, 'Operation Failed');
                              }
                            }
                          }}
                          className="px-4 py-2 rounded-sm bg-emerald-600/15 border border-emerald-500/40 text-emerald-400 font-sans font-bold text-xs uppercase tracking-widest hover:bg-emerald-600/25 transition-all w-1/2 cursor-pointer"
                        >
                          Approve
                        </button>
                        <button
                          type="button"
                          onClick={async () => {
                            if (await hudConfirm(`Reject registration request for cadet ${pendingUser.name}? They will have to register again.`, 'Reject Cadet Registration', 'Reject')) {
                              playTacClick('error');
                              const res = await approveUserAction(pendingUser.id, 'REJECTED');
                              if (res.success) {
                                await hudAlert('Cadet registration rejected.', 'Registration Disapproved');
                                refreshData();
                              } else {
                                await hudAlert(res.message, 'Operation Failed');
                              }
                            }
                          }}
                          className="px-4 py-2 rounded-sm bg-ncc-red/15 border border-ncc-red/40 text-ncc-red font-sans font-bold text-xs uppercase tracking-widest hover:bg-ncc-red/25 transition-all w-1/2 cursor-pointer"
                        >
                          Reject
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
            
            {/* Manager Designation Panel */}
            {isANO && (
              <div className="tac-card-sky p-5 flex flex-col md:flex-row items-start md:items-center justify-between gap-5 relative overflow-visible">
                <div>
                  <h3 className="font-sans font-bold text-ncc-sky text-sm flex items-center gap-2 uppercase tracking-widest">
                    <i className="fas fa-user-shield text-ncc-red animate-pulse"></i> Permission Manager
                  </h3>
                  <p className="text-xs text-gray-400 mt-1.5 max-w-md leading-relaxed font-sans">
                    Designate a cadet to review and filter incoming permission requests before they reach you.
                  </p>
                </div>
                <form action={async (formData) => {
                  const res = await updatePermissionManager(formData);
                  if (res.success) { 
                    await hudAlert('Permission Manager Assigned!', 'Access Authorization'); 
                    refreshData(); 
                    playTacClick('confirm'); 
                  } else {
                    await hudAlert(res.message, 'Authorization Error');
                  }
                }} className="flex items-center gap-3 w-full md:w-auto z-10">
                  <div className="w-full md:w-64">
                    <HudSelect
                      name="managerId"
                      value={selectedManagerId || ''}
                      onChange={(val) => setSelectedManagerId(val)}
                      options={cadetOptions}
                      placeholder="Select a Cadet..."
                    />
                  </div>
                  <button 
                    type="submit" 
                    disabled={selectedManagerId === data.permissionManagerId && !!selectedManagerId}
                    className={`px-5 py-2.5 rounded-sm font-sans font-bold text-xs uppercase tracking-widest text-white transition-all border ${
                      selectedManagerId === data.permissionManagerId && !!selectedManagerId
                        ? 'bg-emerald-600/80 border-emerald-500/40 cursor-default'
                        : 'bg-ncc-sky/15 border-ncc-sky/40 hover:bg-ncc-sky/25 text-ncc-sky'
                    }`}
                  >
                    {selectedManagerId === data.permissionManagerId && !!selectedManagerId ? 'Assigned ✓' : 'Assign'}
                  </button>
                </form>
              </div>
            )}

            <div className="bg-ncc-gold/8 border border-ncc-gold/25 rounded-md p-4 text-xs text-ncc-gold/80 flex items-center gap-3 font-sans">
              <div className="w-7 h-7 rounded-sm bg-ncc-gold/10 flex items-center justify-center text-ncc-gold flex-shrink-0 border border-ncc-gold/25">
                <i className="fas fa-crown text-xs"></i>
              </div>
              <span><strong className="text-ncc-gold font-sans">ANO Final Authority:</strong> You can Approve or Decline any request at any stage, overriding any Manager designation.</span>
            </div>

            {/* Reusable action panels */}
            {([
              { label: 'Pending Review', subtitle: '(New — not yet reviewed by Manager)', items: pendingReview, accent: 'tac-card-sky', badgeCls: 'hud-badge-pending', badgeText: 'Pending Review' },
              { label: 'Forwarded by Manager', subtitle: '', items: pendingApprovals, accent: 'tac-card-gold', badgeCls: 'hud-badge-forwarded', badgeText: 'Forwarded' },
              { label: 'Manager Override Zone', subtitle: '(Rejected by Manager — you can still approve)', items: suoRejections, accent: 'tac-card-red', badgeCls: 'hud-badge-rejected', badgeText: 'Rejected by Manager' },
            ] as const).map(({ label, subtitle, items, accent, badgeCls, badgeText }) =>
              items.length > 0 && (
                <div key={label} className="space-y-4">
                  <h3 className={`font-sans text-xs font-bold border-b pb-2 flex items-center gap-2 uppercase tracking-widest ${
                    label === 'Pending Review' ? 'text-ncc-sky border-ncc-sky/20' :
                    label === 'Manager Override Zone' ? 'text-ncc-red border-ncc-red/20' : 'text-ncc-gold border-ncc-gold/20'
                  }`}>
                    {label}
                    {subtitle && <span className="text-xs font-normal text-ncc-olive/40 lowercase">{subtitle}</span>}
                  </h3>
                  {items.map(p => (
                    <div key={p.id} className={`${accent} p-5 flex flex-col md:flex-row gap-5 relative overflow-hidden`}>
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-3 flex-wrap">
                          <span className="font-heading font-bold text-sm text-white uppercase tracking-wider">{p.cadetName}</span>
                          <span className={`hud-badge ${badgeCls}`}>{badgeText}</span>
                          {p.evidenceUrl && (
                            <a href={p.evidenceUrl} target="_blank" rel="noopener noreferrer" className="hud-badge hud-badge-forwarded flex items-center gap-1.5 py-1 px-2.5 hover:border-ncc-sky/60 transition-colors font-sans">
                              <i className="fas fa-paperclip text-xs"></i> Evidence
                            </a>
                          )}
                        </div>
                        <div className="bg-black/30 border border-ncc-olive/15 p-3.5 rounded-sm text-gray-300 text-xs mb-3 leading-relaxed font-sans">
                          <strong className="block text-xs font-bold text-ncc-olive/60 uppercase tracking-widest mb-1 font-sans">Reason</strong>
                          {p.reason}
                        </div>
                        <div className="text-xs font-mono text-ncc-olive/60 flex items-center gap-2">
                          <i className="far fa-calendar text-ncc-red"></i> {p.startDate} → {p.endDate}
                        </div>
                        {p.suoComment && (
                          <div className="mt-4 bg-emerald-50 border border-emerald-100 text-emerald-800 text-xs p-3.5 rounded-xl">
                            <strong className="block text-[10px] font-bold text-emerald-600 uppercase tracking-wider mb-1">Manager Note</strong>
                            {p.suoComment}
                          </div>
                        )}
                        {p.anoComment && (
                          <div className="mt-3 bg-black/45 border border-ncc-olive/15 text-ncc-olive/70 text-xs p-3.5 rounded-md">
                            <strong className="block text-[10px] font-bold text-ncc-olive/50 uppercase tracking-wider mb-1">Previous ANO Note</strong>
                            {p.anoComment}
                          </div>
                        )}
                        {p.aiStatus && (
                          <div className={`mt-4 p-4 rounded-xl border flex flex-col gap-2.5 transition-all duration-300 ${
                            p.aiStatus === 'VERIFIED' ? 'bg-emerald-950/20 border-emerald-500/30 text-emerald-400' :
                            p.aiStatus === 'FLAGGED' ? 'bg-amber-950/20 border-amber-500/30 text-amber-400' :
                            p.aiStatus === 'ERROR' ? 'bg-red-950/20 border-red-500/30 text-red-400' :
                            'bg-black/45 border-ncc-olive/15 text-ncc-olive/60'
                          }`}>
                            <div className="flex items-center justify-between border-b pb-1.5 border-current/10">
                              <span className="text-[10px] font-bold uppercase tracking-wider flex items-center gap-1.5">
                                <i className={`fas ${
                                  p.aiStatus === 'VERIFIED' ? 'fa-user-shield text-emerald-600' :
                                  p.aiStatus === 'FLAGGED' ? 'fa-exclamation-triangle text-amber-500' :
                                  p.aiStatus === 'ERROR' ? 'fa-bug text-red-500' :
                                  'fa-info-circle text-gray-400'
                                }`}></i>
                                AI Adjutant Auditor
                              </span>
                              <span className={`text-[9px] font-extrabold px-2 py-0.5 rounded-full uppercase tracking-widest ${
                                p.aiStatus === 'VERIFIED' ? 'bg-emerald-600 text-white' :
                                p.aiStatus === 'FLAGGED' ? 'bg-amber-500 text-white animate-pulse' :
                                p.aiStatus === 'ERROR' ? 'bg-red-600 text-white' :
                                'bg-gray-200 text-gray-600'
                              }`}>
                                {p.aiStatus === 'VERIFIED' ? 'Verified' : p.aiStatus === 'FLAGGED' ? 'Flagged' : p.aiStatus === 'ERROR' ? 'Error' : 'No Doc'}
                              </span>
                            </div>
                            <div className="text-xs font-semibold leading-relaxed">
                              {p.aiRemarks}
                            </div>
                            {p.aiStatus === 'FLAGGED' && (
                              <div className="bg-amber-950/20 border border-amber-500/30 text-[10px] text-amber-400 p-2.5 rounded-lg flex items-start gap-1.5 mt-0.5 font-bold shadow-sm">
                                <i className="fas fa-exclamation-circle text-amber-500 mt-0.5 flex-shrink-0"></i>
                                <span>ANO Attention: Visual audit flagged discrepancy. Please check dates and name carefully.</span>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                      
                      {isANO ? (
                        <div className="w-full md:w-56 space-y-2.5 flex flex-col justify-between">
                          <div>
                            <label className="text-xs font-sans text-ncc-olive/60 uppercase tracking-widest mb-1 block">Remarks</label>
                            <textarea 
                              value={actionComments[p.id] || ''}
                              onChange={(e) => setActionComments(prev => ({ ...prev, [p.id]: e.target.value }))} 
                              className="hud-input h-20 py-2 resize-none text-sm font-sans" 
                              placeholder="Enter remarks..."
                            ></textarea>
                          </div>
                          <div className="grid grid-cols-2 gap-1.5">
                            <form action={async (fd) => { fd.append('permId', p.id); fd.append('status', 'APPROVED'); fd.append('comment', actionComments[p.id] || ''); fd.append('role', 'ANO'); await updatePermissionStatus(fd); playTacClick('confirm'); refreshData(); }}>
                              <button className="w-full bg-emerald-600/80 border border-emerald-500/40 text-white py-2 rounded-sm font-sans font-bold text-xs uppercase tracking-widest hover:bg-emerald-600 transition-colors">
                                Approve
                              </button>
                            </form>
                            <form action={async (fd) => { fd.append('permId', p.id); fd.append('status', 'DECLINED_BY_ANO'); fd.append('comment', actionComments[p.id] || ''); fd.append('role', 'ANO'); await updatePermissionStatus(fd); playTacClick('error'); refreshData(); }}>
                              <button className="w-full bg-ncc-red/20 border border-ncc-red/40 text-ncc-red py-2 rounded-sm font-sans font-bold text-xs uppercase tracking-widest hover:bg-ncc-red/30 transition-colors">
                                Decline
                              </button>
                            </form>
                            <form action={async (fd) => { fd.append('permId', p.id); fd.append('status', 'MEET_ANO'); fd.append('comment', actionComments[p.id] || 'Please report to ANO office.'); fd.append('role', 'ANO'); await updatePermissionStatus(fd); playTacClick(); refreshData(); }} className="col-span-2">
                              <button className="w-full bg-ncc-gold/10 border border-ncc-gold/30 text-ncc-gold py-2 rounded-sm font-sans font-bold text-xs uppercase tracking-widest hover:bg-ncc-gold/20 transition-colors flex items-center justify-center gap-1.5">
                                <i className="fas fa-user-clock text-xs"></i> Call for Meeting
                              </button>
                            </form>
                          </div>
                        </div>
                      ) : (
                        <div className="w-full md:w-56 text-xs font-sans text-ncc-olive/40 italic flex items-center justify-center border border-dashed border-ncc-olive/20 p-4 rounded-sm text-center">
                          ANO review required for final decision.
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )
            )}

            {allActionRequired.length === 0 && (
              <div className="p-10 flex flex-col items-center justify-center text-center text-ncc-olive/80 tac-card border-dashed text-xs font-sans gap-3">
                <i className="fas fa-check-circle text-3xl text-emerald-500/50"></i>
                <span>ALL CLEAR — no active requests pending review.</span>
              </div>
            )}

            {/* Closed requests — ANO can still override */}
            {closedPermissions.length > 0 && (
              <div className="space-y-3 pt-6 border-t border-ncc-olive/15">
                <h3 className="font-sans text-xs font-bold text-ncc-olive/60 flex items-center gap-2 uppercase tracking-widest">
                  Closed Requests <span className="text-[8px] font-normal text-ncc-olive/40 lowercase">(ANO can override)</span>
                </h3>
                <div className="space-y-2">
                  {closedPermissions.map(p => (
                    <div key={p.id} className="tac-card p-4 flex flex-col md:flex-row gap-4 hover:border-ncc-olive/25 transition-all">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-1.5 flex-wrap">
                          <span className="font-heading font-bold text-sm text-gray-200 uppercase tracking-wider">{p.cadetName}</span>
                          <span className={`hud-badge ${
                            p.status === 'APPROVED' ? 'hud-badge-approved' :
                            p.status === 'MEET_ANO' ? 'hud-badge-pending' : 'hud-badge-rejected'
                          }`}>{p.status.replace(/_/g, ' ')}</span>
                          {p.aiStatus && (
                            <span className={`hud-badge ${
                              p.aiStatus === 'VERIFIED' ? 'hud-badge-approved' :
                              p.aiStatus === 'FLAGGED' ? 'hud-badge-pending' :
                              p.aiStatus === 'ERROR' ? 'hud-badge-rejected' :
                              'hud-badge-draft'
                            } flex items-center gap-1`}>
                              <i className={`fas ${
                                p.aiStatus === 'VERIFIED' ? 'fa-user-shield' :
                                p.aiStatus === 'FLAGGED' ? 'fa-exclamation-triangle' :
                                p.aiStatus === 'ERROR' ? 'fa-bug' :
                                'fa-info-circle'
                              } text-[7px]`}></i>
                              AI: {p.aiStatus.replace(/_/g, ' ')}
                            </span>
                          )}
                        </div>
                        <div className="text-xs text-ncc-olive/60 font-sans leading-relaxed">{p.reason}</div>
                        <div className="text-xs font-mono text-ncc-olive/50 mt-1.5"><i className="far fa-calendar text-ncc-red mr-1"></i> {p.startDate} → {p.endDate}</div>
                        {p.anoComment && <div className="mt-1.5 text-xs text-ncc-olive/50 bg-black/30 px-3 py-2 rounded-sm border border-ncc-olive/10 font-sans leading-relaxed">ANO note: {p.anoComment}</div>}
                      </div>
                      {isANO && (
                        <div className="flex items-center gap-2 self-center w-full md:w-auto">
                          <textarea 
                            value={actionComments[p.id] || ''}
                            onChange={(e) => setActionComments(prev => ({ ...prev, [p.id]: e.target.value }))} 
                            className="hud-input h-12 w-36 text-xs font-sans py-2" 
                            placeholder="Override remark..."
                          ></textarea>
                          <div className="flex flex-col gap-1 w-20">
                            <form action={async (fd) => { fd.append('permId', p.id); fd.append('status', 'APPROVED'); fd.append('comment', actionComments[p.id] || ''); fd.append('role', 'ANO'); await updatePermissionStatus(fd); playTacClick('confirm'); refreshData(); }}>
                              <button className="bg-emerald-600/80 border border-emerald-500/40 text-white px-2 py-1.5 rounded-sm font-sans font-bold text-xs uppercase tracking-widest hover:bg-emerald-600 w-full transition-colors">
                                Approve
                              </button>
                            </form>
                            <form action={async (fd) => { fd.append('permId', p.id); fd.append('status', 'DECLINED_BY_ANO'); fd.append('comment', actionComments[p.id] || ''); fd.append('role', 'ANO'); await updatePermissionStatus(fd); playTacClick('error'); refreshData(); }}>
                              <button className="bg-ncc-red/20 border border-ncc-red/40 text-ncc-red px-2 py-1.5 rounded-sm font-sans font-bold text-xs uppercase tracking-widest hover:bg-ncc-red/30 w-full transition-colors">
                                Decline
                              </button>
                            </form>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* --- ACHIEVEMENTS TAB --- */}
        {activeTab === 'achievements' && (
          <div className="space-y-6 animate-fade-in flex-grow">
            <div className="space-y-4">
              <h3 className="font-sans text-xs font-bold text-ncc-sky border-b border-ncc-sky/20 pb-2 uppercase tracking-widest">Pending Verification Queue</h3>
              {pendingAchievements.length === 0 ? (
                <div className="p-10 flex flex-col items-center justify-center text-center text-ncc-olive/80 tac-card border-dashed font-sans text-xs gap-3">
                  <i className="fas fa-medal text-3xl text-ncc-sky/50"></i>
                  <span>No pending achievements to verify.</span>
                </div>
              ) : (
                pendingAchievements.map(a => {
                  const cadet = data.users.find(u => u.id === a.cadetId);
                  return (
                    <div key={a.id} className="tac-card-sky p-5 flex flex-col md:flex-row gap-5 relative overflow-hidden">
                      <div className="flex-grow">
                        {/* Cadet Header */}
                        <div className="flex items-center gap-3 mb-3 border-b border-ncc-olive/10 pb-3">
                          <div className="w-9 h-9 rounded-sm bg-ncc-sky/10 text-ncc-sky flex items-center justify-center font-heading font-bold text-base border border-ncc-sky/20">
                            {cadet?.name.charAt(0) || '?'}
                          </div>
                          <div>
                            <div className="font-bold text-gray-200 text-sm">{cadet?.rank} {cadet?.name}</div>
                            <div className="text-xs text-ncc-olive/50 font-mono flex items-center gap-2 mt-0.5">
                              <span className="bg-black/30 px-1.5 py-0.5 rounded-sm border border-ncc-olive/15">{cadet?.regimentalNumber || 'No Regt #'}</span>
                              <span>·</span>
                              <span className="font-sans">Batch {cadet?.batchYear}</span>
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-3 mb-2 flex-wrap">
                          <span className="font-heading font-bold text-sm text-white uppercase tracking-wider">{a.title}</span>
                          <span className="hud-badge hud-badge-draft">{a.category}</span>
                          {a.certificateUrl && (
                            <a href={a.certificateUrl} target="_blank" rel="noopener noreferrer" className="bg-ncc-sky/15 text-ncc-sky px-3 py-1.5 rounded-sm text-xs font-bold hover:bg-ncc-sky/25 border border-ncc-sky/30 transition-colors flex items-center gap-1.5 uppercase tracking-widest font-sans">
                              <i className="fas fa-certificate text-[10px]"></i> View Certificate
                            </a>
                          )}
                        </div>
                        <div className="bg-black/35 border border-ncc-olive/15 p-4 rounded-md text-gray-300 text-sm mb-4 leading-relaxed font-sans">
                          {a.description}
                          {a.location && <div className="mt-2 text-xs text-ncc-olive/60 font-sans uppercase tracking-widest flex items-center gap-1"><i className="fas fa-map-marker-alt text-ncc-red mr-1"></i> {a.location}</div>}
                        </div>
                        <div className="text-xs font-bold text-ncc-olive/60 flex items-center gap-2 font-mono uppercase tracking-wider">
                          <i className="far fa-calendar text-ncc-red"></i> {a.date} {a.endDate && `to ${a.endDate}`}
                        </div>
                      </div>
                      
                      {isANO ? (
                        <div className="w-full md:w-56 space-y-2.5 flex flex-col justify-between">
                          <div>
                            <label className="text-xs font-sans text-ncc-olive/60 uppercase tracking-widest mb-1 block">Remarks</label>
                            <textarea 
                              value={actionComments[a.id] || ''}
                              onChange={(e) => setActionComments(prev => ({ ...prev, [a.id]: e.target.value }))} 
                              className="hud-input h-20 py-2 resize-none text-sm font-sans" 
                              placeholder="Rejection Reason..."
                            ></textarea>
                          </div>
                          <div className="grid grid-cols-2 gap-1.5">
                            <form action={async (fd) => { fd.append('id', a.id); fd.append('status', 'VERIFIED'); fd.append('comment', actionComments[a.id] || ''); await verifyAchievement(fd); playTacClick('confirm'); refreshData(); }}>
                              <button className="w-full bg-emerald-600/80 border border-emerald-500/40 text-white py-2 rounded-sm font-sans font-bold text-xs uppercase tracking-widest hover:bg-emerald-600 transition-colors">
                                Verify
                              </button>
                            </form>
                            <form action={async (fd) => { fd.append('id', a.id); fd.append('status', 'REJECTED'); fd.append('comment', actionComments[a.id] || ''); await verifyAchievement(fd); playTacClick('error'); refreshData(); }}>
                              <button className="w-full bg-ncc-red/20 border border-ncc-red/40 text-ncc-red py-2 rounded-sm font-sans font-bold text-xs uppercase tracking-widest hover:bg-ncc-red/30 transition-colors">
                                Reject
                              </button>
                            </form>
                          </div>
                        </div>
                      ) : (
                        <div className="w-full md:w-56 text-xs font-sans text-ncc-olive/40 italic flex items-center justify-center border border-dashed border-ncc-olive/20 p-4 rounded-sm text-center">
                          ANO verification required.
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>

            {/* 2. Verified Database Registry */}
            <div className="space-y-4 pt-8">
              <div className="flex flex-col md:flex-row justify-between items-start md:items-end border-b border-ncc-olive/15 pb-3 mb-4 gap-4">
                <div>
                  <h3 className="font-sans text-xs font-bold text-emerald-400 uppercase tracking-widest flex items-center gap-2">
                    <i className="fas fa-database"></i> Verified Achievement Registry
                  </h3>
                  <p className="text-xs text-ncc-olive/40 font-sans mt-0.5">Central roster of verified achievements in the unit</p>
                </div>
                <div className="relative w-full md:w-56">
                  <input
                    type="text"
                    placeholder="Search Cadet Name..."
                    className="hud-input !pl-9 pr-4 py-2 text-sm w-full"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                  <i className="fas fa-search absolute left-3 top-1/2 -translate-y-1/2 text-xs text-ncc-olive/60"></i>
                </div>
              </div>

              <div className="space-y-4">
                {Array.from(new Set(verifiedAchievements.map(a => a.cadetId)))
                  .map(id => data.users.find(u => u.id === id))
                  .filter(u => u && (!searchQuery || u.name.toLowerCase().includes(searchQuery.toLowerCase())))
                  .map(cadet => {
                    if (!cadet) return null;
                    const cadetAchievements = verifiedAchievements.filter(a => a.cadetId === cadet.id);

                    return (
                      <div key={cadet.id} className="tac-card overflow-hidden">
                        {/* Cadet Header */}
                        <div className="bg-black/20 p-3.5 border-b border-ncc-olive/10 flex justify-between items-center">
                          <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-sm bg-ncc-sky/10 text-ncc-sky flex items-center justify-center font-heading font-bold border border-ncc-sky/20">
                              {cadet.name.charAt(0)}
                            </div>
                            <div>
                              <h4 className="font-heading font-bold text-gray-200 text-sm uppercase tracking-wider">{cadet.rank} {cadet.name}</h4>
                              <div className="text-xs text-ncc-olive/50 font-mono flex items-center gap-2 mt-0.5">
                                <span className="bg-black/30 border border-ncc-olive/15 px-1.5 py-0.5 rounded-sm">{cadet.regimentalNumber || 'No Regt #'}</span>
                                <span>·</span>
                                <span className="text-emerald-400 font-bold">{cadetAchievements.length} Verified Records</span>
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* Achievements List Table */}
                        <div className="overflow-x-auto">
                          <table className="w-full text-xs text-left border-collapse">
                            <thead className="bg-black/20 text-xs font-sans font-bold text-ncc-olive/60 uppercase border-b border-ncc-olive/10">
                              <tr>
                                <th className="px-5 py-3">Achievement Title</th>
                                <th className="px-5 py-3">Category</th>
                                <th className="px-5 py-3">Date</th>
                                <th className="px-5 py-3 text-right">Certificate</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-ncc-olive/10">
                              {cadetAchievements.map((a, aIdx) => (
                                <tr key={a.id} className="odd:bg-black/20 even:bg-transparent hover:bg-white/[0.03] transition-colors border-b border-ncc-olive/10" onMouseEnter={() => playTacClick('hover')}>
                                  <td className="px-5 py-3">
                                    <div className="font-bold text-gray-300 text-xs">{a.title}</div>
                                    <div className="text-xs text-ncc-olive/50 font-sans mt-0.5 max-w-xs">{a.description}</div>
                                  </td>
                                  <td className="px-5 py-3">
                                    <span className="hud-badge hud-badge-verified">{a.category}</span>
                                  </td>
                                  <td className="px-5 py-3 font-mono text-xs text-ncc-olive/60">
                                    {a.date}
                                  </td>
                                  <td className="px-5 py-3 text-right">
                                    {a.certificateUrl ? (
                                      <a href={a.certificateUrl} target="_blank" rel="noopener noreferrer" className="text-ncc-sky hover:text-ncc-sky/80 font-sans font-bold text-xs inline-flex items-center gap-1" onMouseEnter={() => playTacClick('hover')}>
                                        <i className="fas fa-external-link-alt text-xs"></i> View
                                      </a>
                                    ) : (
                                      <span className="text-ncc-olive/30 text-xs font-sans italic">No File</span>
                                    )}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    );
                  })}

                {verifiedAchievements.length === 0 && (
                  <div className="p-10 flex flex-col items-center justify-center text-center text-ncc-olive/80 tac-card border-dashed font-mono text-xs gap-3">
                    <i className="fas fa-database text-3xl text-emerald-400/50"></i>
                    <span>No verified achievements found in the database.</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* --- SCHEDULE TAB --- */}
        {activeTab === 'schedule' && (
          <div className="grid md:grid-cols-2 gap-10 animate-fade-in flex-grow">
            
            {/* Left: Form / AI Planner */}
            <div>
              {/* Method Switcher Tabs */}
              <div className="flex gap-2 mb-6">
                <button
                  type="button"
                  onClick={() => { setScheduleMethod('manual'); playTacClick(); }}
                  className={`px-4 py-2 rounded-sm text-xs font-sans font-bold uppercase tracking-widest transition-all border ${
                    scheduleMethod === 'manual'
                      ? 'bg-ncc-sky/15 border-ncc-sky/40 text-ncc-sky'
                      : 'bg-transparent border-ncc-olive/20 text-ncc-olive/60 hover:border-ncc-olive/40 hover:text-gray-300'
                  }`}
                >
                  <i className="fas fa-edit mr-1.5"></i> Manual Creator
                </button>
                <button
                  type="button"
                  onClick={() => { setScheduleMethod('ai'); playTacClick(); }}
                  className={`px-4 py-2 rounded-sm text-xs font-sans font-bold uppercase tracking-widest transition-all border flex items-center gap-1.5 ${
                    scheduleMethod === 'ai'
                      ? 'bg-ncc-gold/15 border-ncc-gold/40 text-ncc-gold'
                      : 'bg-transparent border-ncc-olive/20 text-ncc-olive/60 hover:border-ncc-olive/40 hover:text-gray-300'
                  }`}
                >
                  <i className="fas fa-magic text-ncc-gold animate-pulse"></i> AI Training Planner
                </button>
              </div>

              {scheduleMethod === 'manual' ? (
                <>
                  <h1 className="text-xl font-heading font-bold text-white mb-4 uppercase tracking-widest">{editingId ? 'Update Event' : 'Create Event'}</h1>
                  <div className="tac-card p-6">
                    <form action={async (fd) => { 
                      await createEvent(fd); 
                      await hudAlert(editingId ? 'Event Updated' : 'Event Published', 'Database Sync'); 
                      playTacClick('confirm'); 
                      refreshData(); 
                      resetForm(); 
                    }} className="space-y-4">
                      <input type="hidden" name="id" value={editingId || ''} />

                      <div>
                        <label className="block text-xs font-sans font-bold text-ncc-olive/60 uppercase tracking-widest mb-1">Event Type</label>
                        <HudSelect
                          name="type"
                          value={eventType}
                          onChange={handleTypeChangeVal}
                          options={[
                            { label: 'Parade', value: 'Parade' },
                            { label: 'Theory Class', value: 'Theory' },
                            { label: 'Camp', value: 'Camp' },
                            { label: 'Other Event', value: 'Event' }
                          ]}
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-sans font-bold text-ncc-olive/60 uppercase tracking-widest mb-1">Title (Auto-filled but editable)</label>
                        <input name="title" className="hud-input" value={eventTitle} onChange={(e) => setEventTitle(e.target.value)} required />
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-xs font-sans font-bold text-ncc-olive/60 uppercase tracking-widest mb-1">Date</label>
                          <HudDatePicker name="date" value={eventDate} onChange={setEventDate} required openUpward={true} />
                        </div>
                        <div>
                          <label className="block text-xs font-sans font-bold text-ncc-olive/60 uppercase tracking-widest mb-1">Location</label>
                          <input name="location" className="hud-input" value={eventLocation} onChange={(e) => setEventLocation(e.target.value)} required />
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-xs font-sans font-bold text-ncc-olive/60 uppercase tracking-widest mb-1">Start Time</label>
                          <HudTimePicker name="startTime" value={eventStart} onChange={setEventStart} required label="Start" />
                        </div>
                        <div>
                          <label className="block text-xs font-sans font-bold text-ncc-olive/60 uppercase tracking-widest mb-1">End Time</label>
                          <HudTimePicker name="endTime" value={eventEnd} onChange={setEventEnd} required label="End" />
                        </div>
                      </div>

                      <div className="flex gap-2 pt-1">
                        {editingId && (
                          <button 
                            type="button" 
                            onClick={() => { resetForm(); playTacClick(); }} 
                            className="flex-1 bg-transparent border border-ncc-olive/25 hover:border-ncc-olive/50 text-ncc-olive/60 hover:text-gray-300 font-sans font-bold rounded-sm transition-colors py-2.5 text-xs uppercase tracking-widest"
                          >
                            Cancel
                          </button>
                        )}
                        <button className="flex-[2] bg-ncc-sky/15 border border-ncc-sky/40 hover:bg-ncc-sky/25 text-ncc-sky font-sans font-bold rounded-sm transition-colors py-2.5 text-xs uppercase tracking-widest">
                          {editingId ? 'Update Event' : 'Publish to Unit Calendar'}
                        </button>
                      </div>
                    </form>
                  </div>
                </>
              ) : (
                <div className="space-y-5">
                  {/* AI Console Card */}
                  <div className="tac-card-gold p-5 relative overflow-hidden">
                    <h3 className="font-heading font-bold text-ncc-gold text-sm flex items-center gap-2 mb-1.5 uppercase tracking-widest">
                      <i className="fas fa-magic"></i> Autonomous Curriculum Planner
                    </h3>
                    <p className="text-xs text-ncc-olive/60 font-sans leading-relaxed mb-4">
                      Let the AI agent plan a 4-week weekend syllabus schedule. It audits recently taught events to avoid duplication and balances topic categories.
                    </p>

                    <form
                      onSubmit={async (e) => {
                        e.preventDefault();
                        if (!aiScheduleQuery.trim()) return;
                        setAiScheduleLoading(true);
                        setAiProposedEvents([]);
                        setAiPlanningExplanation('');
                        try {
                          const res = await generateSchedulePlan(aiScheduleQuery);
                          if (res.success) {
                            setAiProposedEvents(res.events || []);
                            setAiPlanningExplanation(res.explanation || '');
                          } else {
                            await hudAlert(res.message || 'Planning failed', 'AI Planning Failed');
                          }
                        } catch (err: any) {
                          await hudAlert(err.message || 'Generation error', 'AI Planning Error');
                        } finally {
                          setAiScheduleLoading(false);
                        }
                      }}
                      className="space-y-3"
                    >
                      <div className="relative">
                        <input
                          type="text"
                          placeholder="What should next month's training focus on?..."
                          className="hud-input pr-24"
                          value={aiScheduleQuery}
                          onChange={(e) => setAiScheduleQuery(e.target.value)}
                          required
                        />
                        <button
                          type="submit"
                          disabled={aiScheduleLoading}
                          onClick={() => { if (!aiScheduleLoading) playTacClick(); }}
                          className="absolute right-2 top-1.5 px-3 py-1.5 bg-ncc-gold/20 border border-ncc-gold/40 hover:bg-ncc-gold/30 text-ncc-gold font-sans font-bold text-xs uppercase tracking-widest rounded-sm transition-all disabled:opacity-40 flex items-center gap-1"
                        >
                          {aiScheduleLoading ? (
                            <><i className="fas fa-spinner animate-spin"></i> Planning</>
                          ) : (
                            <><span>Plan</span><i className="fas fa-chevron-right text-xs"></i></>
                          )}
                        </button>
                      </div>

                      {/* Presets */}
                      <div className="flex flex-wrap gap-1.5">
                        {[
                          "Focus on weapon training and rifle theory",
                          "Plan a strict drill & sizing routine",
                          "Focus on map reading bearing plotting"
                        ].map((pr, idx) => (
                          <button
                            key={idx}
                            type="button"
                            onClick={() => { setAiScheduleQuery(pr); playTacClick(); }}
                            className="px-2.5 py-1.5 bg-black/20 border border-ncc-olive/15 hover:border-ncc-gold/30 text-ncc-olive/60 hover:text-ncc-gold text-xs font-sans font-bold rounded-sm transition-colors"
                          >
                            {pr}
                          </button>
                        ))}
                      </div>
                    </form>
                  </div>

                  {/* Proposed Plan Explanation */}
                  {aiPlanningExplanation && (
                    <div className="bg-black/40 text-ncc-olive/70 border border-ncc-olive/20 p-5 rounded-sm shadow-inner text-xs font-sans leading-relaxed">
                      <div className="text-xs font-bold text-ncc-sky uppercase tracking-widest mb-1.5 font-sans flex items-center gap-1.5">
                        <i className="fas fa-clipboard-list"></i> Planning Explanation
                      </div>
                      {aiPlanningExplanation}
                    </div>
                  )}

                  {/* Proposed Draft Cards list */}
                  {aiProposedEvents.length > 0 && (
                    <div className="space-y-3">
                      <div className="flex justify-between items-center pb-2 border-b border-ncc-olive/15">
                        <h4 className="font-sans font-bold text-gray-200 text-xs uppercase tracking-widest">Proposed Draft Schedule</h4>
                        <button
                          type="button"
                          onClick={async () => {
                            if (!await hudConfirm('Publish all 4 proposed events to the active calendar?', 'AI Schedule Publish', 'Publish')) return;
                            try {
                              const res = await publishBulkEvents(aiProposedEvents);
                              if (res.success) {
                                await hudAlert(`Successfully published ${res.count} events!`, 'AI Schedule Published');
                                playTacClick('confirm');
                                refreshData();
                                setAiProposedEvents([]);
                                setAiPlanningExplanation('');
                                setScheduleMethod('manual');
                              } else {
                                await hudAlert('Failed to publish events.', 'Publication Failed');
                              }
                            } catch (err: any) {
                              await hudAlert(err.message || 'Publication failed', 'Publication Error');
                            }
                          }}
                          className="px-3 py-1.5 bg-emerald-600/80 border border-emerald-500/40 text-white font-sans font-bold text-xs uppercase tracking-widest rounded-sm transition-all flex items-center gap-1.5"
                        >
                          <i className="fas fa-calendar-check"></i> Publish Drafts
                        </button>
                      </div>

                      <div className="space-y-3">
                        {aiProposedEvents.map((evt, idx) => (
                          <div key={idx} className="tac-card p-4 relative overflow-visible">
                            
                            <div className="space-y-3">
                              {/* Title */}
                              <div>
                                <label className="block text-xs font-sans font-bold text-gray-400 uppercase tracking-widest mb-1">Title</label>
                                <input
                                  type="text"
                                  className="w-full text-xs font-bold text-gray-800 border-b border-gray-150 py-1 focus:outline-none focus:border-ncc-navy bg-transparent"
                                  value={evt.title}
                                  onChange={(e) => {
                                    const updated = [...aiProposedEvents];
                                    updated[idx].title = e.target.value;
                                    setAiProposedEvents(updated);
                                  }}
                                  required
                                />
                              </div>

                              <div className="grid grid-cols-2 gap-3">
                                {/* Date */}
                                <div>
                                  <label className="block text-xs font-sans font-bold text-gray-400 uppercase tracking-widest mb-1">Date</label>
                                  <HudDatePicker
                                    value={evt.date}
                                    onChange={(val) => {
                                      const updated = [...aiProposedEvents];
                                      updated[idx].date = val;
                                      setAiProposedEvents(updated);
                                    }}
                                    required
                                    openUpward={true}
                                  />
                                </div>
                                {/* Location */}
                                <div>
                                  <label className="block text-xs font-sans font-bold text-gray-400 uppercase tracking-widest mb-1">Location</label>
                                  <input
                                    type="text"
                                    className="w-full text-xs text-gray-600 border-b border-gray-150 py-1 focus:outline-none focus:border-ncc-navy bg-transparent"
                                    value={evt.location}
                                    onChange={(e) => {
                                      const updated = [...aiProposedEvents];
                                      updated[idx].location = e.target.value;
                                      setAiProposedEvents(updated);
                                    }}
                                    required
                                  />
                                </div>
                              </div>

                              <div className="grid grid-cols-2 gap-3">
                                {/* Start Time */}
                                <div>
                                  <label className="block text-xs font-sans font-bold text-gray-400 uppercase tracking-widest mb-1">Start Time</label>
                                  <HudTimePicker
                                    value={evt.startTime || evt.start_time}
                                    onChange={(val) => {
                                      const updated = [...aiProposedEvents];
                                      updated[idx].startTime = val;
                                      updated[idx].start_time = val;
                                      setAiProposedEvents(updated);
                                    }}
                                    required
                                    label="Start"
                                  />
                                </div>
                                {/* End Time */}
                                <div>
                                  <label className="block text-xs font-sans font-bold text-gray-400 uppercase tracking-widest mb-1">End Time</label>
                                  <HudTimePicker
                                    value={evt.endTime || evt.end_time}
                                    onChange={(val) => {
                                      const updated = [...aiProposedEvents];
                                      updated[idx].endTime = val;
                                      updated[idx].end_time = val;
                                      setAiProposedEvents(updated);
                                    }}
                                    required
                                    label="End"
                                  />
                                </div>
                              </div>

                              {/* Gear list */}
                              <div>
                                <label className="block text-xs font-sans font-bold text-gray-400 uppercase tracking-widest mb-1">Required Equipment</label>
                                <div className="flex flex-wrap gap-1 mt-1">
                                  {evt.equipment.map((eq: string, eqIdx: number) => (
                                    <span key={eqIdx} className="text-xs font-sans font-bold bg-slate-100 text-gray-500 border border-slate-200/50 px-2 py-0.5 rounded">
                                      {eq}
                                    </span>
                                  ))}
                                </div>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Right: Calendar Preview */}
            <div>
              <h2 className="font-heading text-lg font-bold text-gray-500 mb-6 uppercase tracking-wide">Live Schedule Preview</h2>
              <CalendarView />
              <div className="mt-6 bg-ncc-sky/5 border border-ncc-sky/20 p-4 rounded-md text-xs text-ncc-sky/70 flex items-start gap-2.5 font-sans">
                <i className="fas fa-broadcast-tower text-sm mt-0.5 text-ncc-sky/50"></i>
                <span>All published events are visible to cadets on their dashboards.</span>
              </div>
            </div>
          </div>
        )}

        {/* --- PUBLIC INQUIRIES & ALERTS TAB --- */}
        {activeTab === 'inquiries' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start animate-fade-in flex-grow">
            
            {/* Left: Broadcast Bulletin (ANO Only) */}
            <div className="lg:col-span-5 space-y-6">
              <div className="tac-card p-6 relative overflow-hidden">
                <CornerBrackets colorClass="border-ncc-red/40" />
                <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-ncc-red via-ncc-gold to-ncc-olive"></div>
                
                <h3 className="font-heading font-bold text-white text-lg flex items-center gap-2.5 uppercase tracking-wider mb-2">
                  <i className="fas fa-bullhorn text-ncc-red"></i> Broadcast Alerts
                </h3>
                <p className="text-xs text-ncc-olive/75 leading-relaxed font-sans mb-5">
                  Compose and dispatch an official email announcement. This broadcast will be delivered directly to all public newsletter subscribers.
                </p>

                {isANO ? (
                  <form 
                    onSubmit={async (e) => {
                      e.preventDefault();
                      if (!broadcastSubject || !broadcastMessage) return;
                      if (!await hudConfirm('Broadcast this announcement to all subscribers?', 'Broadcast Bulletin', 'Send')) return;
                      
                      setBroadcastLoading(true);
                      playTacClick('confirm');
                      try {
                        const res = await broadcastAlertAction(broadcastSubject, broadcastMessage);
                        if (res && res.success) {
                          await hudAlert(`Broadcast sent successfully to ${res.recipientCount || 0} subscribers!`, 'Broadcast Successful');
                          setBroadcastSubject('');
                          setBroadcastMessage('');
                          refreshData();
                        } else {
                          await hudAlert(res?.message || 'Failed to send broadcast', 'Broadcast Failed');
                        }
                      } catch (err) {
                        await hudAlert('Error executing broadcast', 'Broadcast Error');
                      } finally {
                        setBroadcastLoading(false);
                      }
                    }}
                    className="space-y-4 font-sans text-xs"
                  >
                    <div className="flex flex-col gap-1.5">
                      <label className="text-ncc-olive uppercase tracking-wider font-bold">Bulletin Subject</label>
                      <input 
                        type="text"
                        value={broadcastSubject}
                        onChange={e => setBroadcastSubject(e.target.value)}
                        placeholder="e.g. 2026 Cadet Enlistment Drive Now Open"
                        className="hud-input py-2 text-sm font-sans"
                        required
                        disabled={broadcastLoading}
                      />
                    </div>

                    <div className="flex flex-col gap-1.5">
                      <label className="text-ncc-olive uppercase tracking-wider font-bold">Bulletin Message Body</label>
                      <textarea
                        rows={6}
                        value={broadcastMessage}
                        onChange={e => setBroadcastMessage(e.target.value)}
                        placeholder="Write the official recruitment announcement or news updates here..."
                        className="hud-input py-2.5 text-sm font-sans resize-none"
                        required
                        disabled={broadcastLoading}
                      ></textarea>
                    </div>

                    <button
                      type="submit"
                      disabled={broadcastLoading}
                      className="w-full py-3 bg-ncc-red/15 border border-ncc-red/40 hover:bg-ncc-red/25 hover:border-ncc-red/75 text-ncc-red font-bold text-center tracking-widest uppercase transition-all duration-300 disabled:opacity-50"
                    >
                      {broadcastLoading ? "DISPATCHING BROADCAST..." : "DISPATCH BROADCAST BULLETIN"}
                    </button>
                  </form>
                ) : (
                  <div className="bg-ncc-red/5 border border-ncc-red/20 text-ncc-red p-4 rounded text-xs font-mono">
                    <i className="fas fa-exclamation-triangle mr-2"></i> SECURITY CLEARANCE REJECTED. ONLY THE ASSOCIATE NCC OFFICER (ANO) CAN DISPATCH PUBLIC BROADCASTS.
                  </div>
                )}
              </div>
              
              <div className="bg-ncc-gold/5 border border-ncc-gold/25 p-4 rounded-md text-xs text-ncc-gold/80 flex items-start gap-2.5 font-sans">
                <i className="fas fa-info-circle text-base mt-0.5 text-ncc-gold/60"></i>
                <div className="space-y-1">
                  <p className="font-bold">Subscriber Analytics:</p>
                  <p>Total subscribed email terminals: <span className="font-mono text-white font-bold">{new Set(inquiries.filter(i => i.subscribed).map(i => i.email)).size}</span> unique addresses.</p>
                </div>
              </div>
            </div>

            {/* Right: Public Inquiries List */}
            <div className="lg:col-span-7 space-y-6">
              <div className="tac-card p-6 relative overflow-hidden">
                <CornerBrackets colorClass="border-ncc-sky/40" />
                
                <div className="flex justify-between items-center border-b border-ncc-olive/15 pb-4 mb-4">
                  <div>
                    <h3 className="font-heading font-bold text-white text-lg flex items-center gap-2.5 uppercase tracking-wider">
                      <i className="fas fa-envelope-open-text text-ncc-sky"></i> Visitor Inquiries
                    </h3>
                  </div>
                  <span className="text-[10px] text-ncc-sky font-bold font-mono uppercase bg-ncc-sky/10 border border-ncc-sky/25 px-2 py-0.5 rounded">
                    Total: {inquiries.length}
                  </span>
                </div>

                <div className="space-y-4 max-h-[70vh] overflow-y-auto pr-2 custom-scrollbar">
                  {inquiries.length === 0 ? (
                    <p className="text-xs text-ncc-olive/40 italic text-center py-12 font-sans">No public queries logged in database.</p>
                  ) : (
                    inquiries.map((inq) => {
                      const isPending = inq.status === 'PENDING';
                      return (
                        <div 
                          key={inq.id}
                          className={`p-4 rounded-lg border transition-all ${
                            isPending 
                              ? 'bg-ncc-sky/5 border-ncc-sky/25 shadow-md' 
                              : 'bg-black/35 border-ncc-olive/15'
                          }`}
                        >
                          {/* Card Header */}
                          <div className="flex justify-between items-start gap-4 mb-2">
                            <div>
                              <div className="font-heading font-bold text-white text-sm uppercase tracking-wider">{inq.name}</div>
                              <div className="text-[10px] text-ncc-olive/70 font-mono mt-0.5">{inq.email}</div>
                            </div>
                            <span className={`hud-badge ${isPending ? 'hud-badge-pending' : 'hud-badge-verified'}`}>
                              {inq.status}
                            </span>
                          </div>

                          {/* Message Body */}
                          <div className="bg-black/45 border border-ncc-olive/10 p-3 rounded text-gray-300 text-xs mb-3 font-sans leading-relaxed">
                            {inq.message}
                          </div>

                          {/* Date */}
                          <div className="text-[9px] text-ncc-olive/50 font-mono flex items-center gap-1.5 mb-3">
                            <i className="far fa-clock"></i> Logged: {inq.createdAt ? new Date(inq.createdAt).toLocaleString() : 'N/A'}
                          </div>

                          {/* Reply section */}
                          {isPending ? (
                            <form 
                              onSubmit={async (e) => {
                                e.preventDefault();
                                const text = replyText[inq.id];
                                if (!text) return;
                                
                                setReplyLoading(prev => ({ ...prev, [inq.id]: true }));
                                playTacClick('confirm');
                                try {
                                  const res = await replyToInquiryAction(inq.id, text);
                                  if (res && res.success) {
                                    await hudAlert('Reply email dispatched successfully!', 'Reply Dispatched');
                                    setReplyText(prev => ({ ...prev, [inq.id]: '' }));
                                    refreshData();
                                  } else {
                                    await hudAlert(res?.message || 'Failed to send reply', 'Reply Failed');
                                  }
                                } catch (err) {
                                  await hudAlert('Error sending reply', 'Reply Error');
                                } finally {
                                  setReplyLoading(prev => ({ ...prev, [inq.id]: false }));
                                }
                              }}
                              className="border-t border-ncc-olive/10 pt-3 space-y-2 font-sans"
                            >
                              <label className="text-[10px] text-ncc-sky uppercase tracking-wider font-bold">Compose Email Reply</label>
                              <textarea
                                rows={3}
                                value={replyText[inq.id] || ''}
                                onChange={e => setReplyText(prev => ({ ...prev, [inq.id]: e.target.value }))}
                                placeholder="Type your response to the visitor's query..."
                                className="hud-input text-xs py-2"
                                required
                                disabled={replyLoading[inq.id]}
                              ></textarea>
                              <button
                                type="submit"
                                disabled={replyLoading[inq.id] || !replyText[inq.id]}
                                className="px-4 py-2 bg-ncc-sky/15 border border-ncc-sky/30 hover:bg-ncc-sky/25 hover:border-ncc-sky/60 text-ncc-sky font-bold text-[10px] uppercase tracking-widest transition-all disabled:opacity-50"
                              >
                                {replyLoading[inq.id] ? "SENDING EMAIL..." : "SEND EMAIL REPLY"}
                              </button>
                            </form>
                          ) : (
                            <div className="border-t border-ncc-olive/10 pt-3 text-xs font-sans text-gray-400">
                              <span className="text-[10px] text-ncc-olive/60 font-bold uppercase tracking-wider block mb-1">Reply Dispatched</span>
                              <p className="bg-black/20 p-2.5 rounded border border-ncc-olive/5 italic">{inq.replyMessage}</p>
                            </div>
                          )}
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            </div>
            
          </div>
        )}

        {/* --- COMMAND CENTER TAB --- */}
        {activeTab === 'command' && (
          <div className="space-y-8 animate-fade-in flex-grow">
            {/* Console Prompt Card */}
            <div className="tac-card p-8 relative overflow-hidden">
              <CornerBrackets colorClass="border-ncc-gold/40" />
              <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-ncc-navy via-ncc-red to-ncc-gold"></div>
              
              <div className="max-w-3xl mt-1">
                <h3 className="font-heading font-bold text-white text-xl flex items-center gap-2 uppercase tracking-wider">
                  <i className="fas fa-terminal text-ncc-red"></i> Secure SQL Query Console
                </h3>
                <p className="text-xs text-ncc-olive/70 mt-2 leading-relaxed font-sans">
                  Query the central NCC unit registers using natural language. The AI Adjutant compiles safety-audited, read-only SELECT queries to execute against live SQLite registers.
                </p>

                {/* Query Input */}
                <form 
                  onSubmit={async (e) => {
                    e.preventDefault();
                    if (!consoleQuery.trim()) return;
                    setQueryLoading(true);
                    setQueryResult(null);
                    try {
                      const res = await runNaturalLanguageQuery(consoleQuery);
                      setQueryResult(res);
                    } catch (err: any) {
                      setQueryResult({
                        success: false,
                        message: err.message || 'Execution failed'
                      });
                    } finally {
                      setQueryLoading(false);
                    }
                  }}
                  className="mt-6 space-y-4"
                >
                  <div className="relative">
                    <input
                      type="text"
                      placeholder="Ask a question (e.g., 'Show all cadets who are CSMs' or 'Who has pending leave requests?')..."
                      className="w-full bg-slate-900 text-slate-100 font-mono text-sm px-5 py-4 pl-12 pr-32 rounded-xl border border-slate-700 focus:outline-none focus:ring-2 focus:ring-ncc-red focus:border-transparent placeholder-slate-500 shadow-inner"
                      value={consoleQuery}
                      onChange={(e) => setConsoleQuery(e.target.value)}
                      required
                    />
                    <i className="fas fa-search absolute left-4 top-[18px] text-slate-500 text-sm"></i>
                    
                    <button
                      type="submit"
                      disabled={queryLoading}
                      className="absolute right-3 top-2.5 px-4 py-2 bg-ncc-red hover:bg-red-600 text-white font-heading font-bold text-xs uppercase tracking-wider rounded-lg transition-all disabled:bg-slate-800 disabled:text-slate-600 flex items-center gap-1.5"
                    >
                      {queryLoading ? (
                        <>
                          <i className="fas fa-spinner animate-spin"></i> Executing
                        </>
                      ) : (
                        <>
                          <span>Run Query</span>
                          <i className="fas fa-chevron-right text-xs"></i>
                        </>
                      )}
                    </button>
                  </div>

                  {/* Suggestion Pills */}
                  <div className="flex flex-wrap gap-2 pt-1">
                    {[
                      "List all active cadets",
                      "Show all 3rd-year cadets",
                      "Who has pending leave requests?",
                      "List achievements pending verification",
                      "Show recent attendance records"
                    ].map((sug, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => setConsoleQuery(sug)}
                        className="px-3 py-1.5 bg-slate-50 hover:bg-slate-100 border border-gray-200 text-gray-600 text-xs font-sans font-bold rounded-lg transition-colors"
                      >
                        {sug}
                      </button>
                    ))}
                  </div>
                </form>
              </div>
            </div>

            {/* Loading Skeleton */}
            {queryLoading && (
              <div className="space-y-4 animate-pulse">
                <div className="h-12 bg-gray-200 rounded-xl w-3/4"></div>
                <div className="h-40 bg-gray-200 rounded-xl w-full"></div>
              </div>
            )}

            {/* Results Output */}
            {queryResult && (
              <div className="space-y-6 animate-fade-in">
                {/* AI Remark Panel */}
                <div className={`p-6 rounded-2xl border flex flex-col gap-2.5 transition-all shadow-sm ${
                  queryResult.success && !queryResult.explanation?.includes('⚠️')
                    ? 'bg-slate-900 text-slate-100 border-slate-800'
                    : 'bg-red-50 border-red-200 text-red-900'
                }`}>
                  <div className="flex items-center justify-between border-b pb-2.5 border-current/10">
                    <span className="text-xs font-sans font-bold uppercase tracking-widest flex items-center gap-1.5">
                      <i className={`fas ${
                        queryResult.success && !queryResult.explanation?.includes('⚠️') ? 'fa-robot text-ncc-sky' : 'fa-exclamation-triangle text-red-500'
                      }`}></i>
                      AI Adjutant Remark
                    </span>
                    <span className={`text-xs font-sans font-extrabold px-2.5 py-0.5 rounded-full uppercase tracking-widest ${
                      queryResult.success && !queryResult.explanation?.includes('⚠️') ? 'bg-ncc-navy border border-white/10 text-ncc-sky' : 'bg-red-600 text-white'
                    }`}>
                      {queryResult.success && !queryResult.explanation?.includes('⚠️') ? 'Status OK' : 'Execution Denied'}
                    </span>
                  </div>
                  <p className="text-sm font-semibold leading-relaxed">
                    {queryResult.explanation || queryResult.message}
                  </p>
                </div>

                {/* Code Disclosure Widget */}
                {queryResult.sql && (
                  <div className="tac-card border-ncc-sky/35 overflow-hidden">
                    <details className="group">
                      <summary className="flex items-center justify-between p-4 cursor-pointer select-none bg-black/45 border-b border-ncc-olive/15">
                        <span className="text-xs font-bold text-ncc-sky uppercase tracking-widest font-sans flex items-center gap-1.5">
                          <i className="fas fa-code text-ncc-sky/60"></i> Compile Diagnostics (Generated Read-Only SQL)
                        </span>
                        <span className="text-xs text-ncc-sky group-open:rotate-180 transition-transform">
                          <i className="fas fa-chevron-down"></i>
                        </span>
                      </summary>
                      <div className="p-5 bg-black/75 border-t border-ncc-olive/15 font-mono text-xs text-ncc-sky overflow-x-auto whitespace-pre">
                        {queryResult.sql}
                      </div>
                    </details>
                  </div>
                )}

                {/* Query Results Table */}
                {queryResult.success && queryResult.data && (
                  <div className="tac-card overflow-hidden group">
                    <CornerBrackets colorClass="border-ncc-gold/60" />
                    <div className="p-5 border-b border-ncc-olive/15 flex items-center justify-between bg-black/35">
                      <div>
                        <h4 className="font-heading font-bold text-white text-sm">Query Results</h4>
                        <p className="text-xs text-ncc-gold font-bold mt-0.5 font-mono">Found {queryResult.data.length} records</p>
                      </div>
                    </div>

                    {queryResult.data.length === 0 ? (
                      <div className="p-10 text-center text-ncc-olive/40 italic text-sm">
                        No matching records found in the database.
                      </div>
                    ) : (
                      <div className="overflow-x-auto">
                        <table className="w-full text-sm text-left border-collapse">
                          <thead className="bg-black/20 text-xs font-sans font-bold text-ncc-olive/60 uppercase border-b border-ncc-olive/10">
                            <tr>
                              {Object.keys(queryResult.data[0]).map((colName) => (
                                <th key={colName} className="px-6 py-3.5 whitespace-nowrap">
                                  {colName.replace(/_/g, ' ')}
                                </th>
                              ))}
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-ncc-olive/10">
                            {queryResult.data.map((row: any, rowIdx: number) => (
                              <tr key={rowIdx} className="odd:bg-black/20 even:bg-transparent hover:bg-white/[0.03] transition-colors border-b border-ncc-olive/10" onMouseEnter={() => playTacClick('hover')}>
                                {Object.values(row).map((val: any, colIdx: number) => (
                                  <td key={colIdx} className="px-6 py-4 font-semibold text-gray-300 whitespace-nowrap max-w-xs truncate">
                                    {val === null || val === undefined ? (
                                      <span className="text-gray-500 italic text-xs">NULL</span>
                                    ) : typeof val === 'boolean' ? (
                                      val ? 'Yes' : 'No'
                                    ) : (
                                      String(val)
                                    )}
                                  </td>
                                ))}
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        )}
        {/* Event Detail Modal */}
        {selectedEvent && (() => {
          const ev = selectedEvent;
          const cadets = data.users.filter(u => u.role === 'CADET');
          const totalCadets = cadets.length || 16;
          const eventAtt = data.attendance.filter(a => a.eventId === ev.id);
          const presentCount = eventAtt.filter(a => a.status === 'Present').length;
          const absentCount = eventAtt.filter(a => a.status === 'Absent').length;
          const leaveCount = eventAtt.filter(a => a.status === 'Permission' || a.status === 'Late').length;
          const unmarkedCount = Math.max(0, totalCadets - eventAtt.length);
          const attendanceRate = eventAtt.length > 0 ? Math.round((presentCount / (presentCount + absentCount)) * 100) : 0;

          // Google Calendar Sync URL
          const formatCalDate = (dStr: string, tStr: string) => {
            return `${dStr.replace(/-/g, '')}T${tStr.replace(/:/g, '')}00`;
          };
          const startCal = formatCalDate(ev.date, ev.startTime);
          const endCal = formatCalDate(ev.date, ev.endTime);
          const gCalUrl = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(ev.title)}&dates=${startCal}/${endCal}&details=Location:+${encodeURIComponent(ev.location)}&sf=true&output=xml`;

          return (
            <div className="fixed inset-0 bg-black/75 z-50 flex items-center justify-center p-4 backdrop-blur-sm animate-fade-in" onClick={() => setSelectedEvent(null)}>
              <div className="w-full max-w-md rounded-xl shadow-2xl overflow-hidden tac-card-gold relative" onClick={(e) => e.stopPropagation()}>
                <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-ncc-red via-ncc-gold to-ncc-sky"></div>
                
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
                      <h3 className="font-heading text-lg font-bold text-white mt-2 leading-snug uppercase tracking-wider">{ev.title}</h3>
                    </div>
                    <button onClick={() => setSelectedEvent(null)} className="text-ncc-olive/50 hover:text-ncc-gold transition-colors p-1">
                      <i className="fas fa-times text-lg"></i>
                    </button>
                  </div>

                  {/* Details list */}
                  <div className="space-y-4 my-6 text-sm text-gray-300 font-sans">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-ncc-red/10 border border-ncc-red/25 flex items-center justify-center text-ncc-red">
                        <i className="far fa-calendar-alt"></i>
                      </div>
                      <div>
                        <div className="text-[10px] text-ncc-olive/60 uppercase tracking-widest font-mono">Date</div>
                        <div className="text-xs text-gray-200">
                          {new Date(ev.date).toLocaleDateString('default', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-ncc-gold/10 border border-ncc-gold/25 flex items-center justify-center text-ncc-gold">
                        <i className="far fa-clock"></i>
                      </div>
                      <div>
                        <div className="text-[10px] text-ncc-olive/60 uppercase tracking-widest font-mono">Time</div>
                        <div className="text-xs text-gray-200">{ev.startTime} - {ev.endTime}</div>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-ncc-sky/10 border border-ncc-sky/25 flex items-center justify-center text-ncc-sky">
                        <i className="fas fa-map-marker-alt"></i>
                      </div>
                      <div>
                        <div className="text-[10px] text-ncc-olive/60 uppercase tracking-widest font-mono">Location</div>
                        <div className="text-xs text-gray-200">{ev.location}</div>
                      </div>
                    </div>

                    {/* Attendance Card */}
                    <div className="border border-ncc-olive/15 rounded-xl p-4 bg-black/45">
                      <div className="text-[10px] font-bold uppercase tracking-widest text-ncc-olive/60 mb-3 font-mono">// Unit Attendance Report</div>
                      
                      {eventAtt.length > 0 ? (
                        <div className="space-y-3">
                          {/* Progress bar */}
                          <div>
                            <div className="flex justify-between text-xs font-bold text-gray-200 mb-1">
                              <span>Attendance Rate</span>
                              <span className="text-ncc-red">{attendanceRate}%</span>
                            </div>
                            <div className="w-full bg-ncc-olive/15 h-2 rounded-full overflow-hidden">
                              <div className="bg-ncc-gold h-full rounded-full transition-all" style={{ width: `${attendanceRate}%` }}></div>
                            </div>
                          </div>

                          {/* Stats Grid */}
                          <div className="grid grid-cols-4 gap-2 pt-2 text-center">
                            <div className="bg-black/35 p-2 rounded-lg border border-ncc-olive/15">
                              <span className="block text-sm font-bold text-green-400">{presentCount}</span>
                              <span className="text-[9px] text-ncc-olive/50 uppercase font-bold font-sans tracking-wider">Present</span>
                            </div>
                            <div className="bg-black/35 p-2 rounded-lg border border-ncc-olive/15">
                              <span className="block text-sm font-bold text-ncc-red">{absentCount}</span>
                              <span className="text-[9px] text-ncc-olive/50 uppercase font-bold font-sans tracking-wider">Absent</span>
                            </div>
                            <div className="bg-black/35 p-2 rounded-lg border border-ncc-olive/15">
                              <span className="block text-sm font-bold text-ncc-sky">{leaveCount}</span>
                              <span className="text-[9px] text-ncc-olive/50 uppercase font-bold font-sans tracking-wider">Leave/Late</span>
                            </div>
                            <div className="bg-black/35 p-2 rounded-lg border border-ncc-olive/15">
                              <span className="block text-sm font-bold text-ncc-olive/60">{unmarkedCount}</span>
                              <span className="text-[9px] text-ncc-olive/50 uppercase font-bold font-sans tracking-wider">Pending</span>
                            </div>
                          </div>
                        </div>
                      ) : (
                        <div className="text-xs text-ncc-olive/40 italic text-center py-2 flex flex-col items-center gap-1 font-sans">
                          <i className="fas fa-clipboard-list text-lg text-ncc-olive/20"></i>
                          No attendance data has been marked for this event yet.
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex gap-3 mt-6">
                    {/* Google Calendar Sync */}
                    <a 
                      href={gCalUrl} 
                      target="_blank" 
                      rel="noopener noreferrer" 
                      className="flex-1 border border-gray-200 hover:bg-slate-50 text-gray-600 font-heading font-bold rounded-xl transition-all py-3 text-xs uppercase tracking-wider text-center flex items-center justify-center gap-1.5"
                    >
                      <i className="fab fa-google"></i> Calendar
                    </a>

                    <button
                      onClick={() => {
                        handleEditClick(ev);
                        setSelectedEvent(null);
                      }}
                      className="flex-1 bg-ncc-navy hover:bg-ncc-navy/90 text-white font-heading font-bold rounded-xl transition-all py-3 text-xs uppercase tracking-widest text-center flex items-center justify-center gap-1.5"
                    >
                      <i className="fas fa-edit"></i> Edit Event
                    </button>
                  </div>
                </div>
              </div>
            </div>
          );
        })()}

      {/* Observability Diagnostics Panel */}
      {showDiagnostics && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex justify-end animate-fade-in" onClick={() => setShowDiagnostics(false)}>
          <div className="bg-slate-950 text-slate-100 w-full max-w-lg h-full shadow-2xl flex flex-col border-l border-slate-800 relative" onClick={(e) => e.stopPropagation()}>
            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-ncc-red via-ncc-gold to-ncc-sky"></div>
            
            {/* Header */}
            <div className="p-6 border-b border-slate-800 flex justify-between items-center bg-slate-900/50">
              <div>
                <h3 className="font-heading text-lg font-bold text-slate-100 flex items-center gap-2">
                  <i className="fas fa-chart-line text-ncc-sky"></i> Observability Telemetry
                </h3>
                <p className="text-xs text-slate-400 font-mono mt-0.5">Live API Latency & Tracing Logs</p>
              </div>
              <button onClick={() => setShowDiagnostics(false)} className="text-slate-400 hover:text-slate-200 transition-colors p-2 rounded-lg hover:bg-slate-800">
                <i className="fas fa-times text-lg"></i>
              </button>
            </div>

             {/* Performance Averages */}
            {telemetryLogs.length > 0 && (() => {
              const avgTotal = telemetryLogs.reduce((acc, l) => acc + l.durationMs, 0) / telemetryLogs.length;
              const dbTimes = telemetryLogs.flatMap(l => l.spans.filter((s: any) => s.category === 'database').map((s: any) => s.durationMs));
              const avgDb = dbTimes.length > 0 ? dbTimes.reduce((acc, t) => acc + t, 0) / dbTimes.length : 0;
              const aiTimes = telemetryLogs.flatMap(l => l.spans.filter((s: any) => s.category === 'ai').map((s: any) => s.durationMs));
              const avgAi = aiTimes.length > 0 ? aiTimes.reduce((acc, t) => acc + t, 0) / aiTimes.length : 0;

              return (
                <div className="p-6 bg-slate-900/20 border-b border-slate-800 grid grid-cols-3 gap-4 text-center">
                  <div className="bg-slate-900/40 p-3 rounded-xl border border-slate-800/80">
                    <span className="block text-xs font-sans font-bold text-slate-500 uppercase tracking-wider">Avg Latency</span>
                    <span className="block text-sm font-bold text-ncc-sky font-mono mt-1">{avgTotal.toFixed(1)}ms</span>
                  </div>
                  <div className="bg-slate-900/40 p-3 rounded-xl border border-slate-800/80">
                    <span className="block text-xs font-sans font-bold text-slate-500 uppercase tracking-wider">Avg DB Overhead</span>
                    <span className="block text-sm font-bold text-emerald-400 font-mono mt-1">{avgDb.toFixed(1)}ms</span>
                  </div>
                  <div className="bg-slate-900/40 p-3 rounded-xl border border-slate-800/80">
                    <span className="block text-xs font-sans font-bold text-slate-500 uppercase tracking-wider">Avg AI Inference</span>
                    <span className="block text-sm font-bold text-yellow-400 font-mono mt-1">{avgAi.toFixed(1)}ms</span>
                  </div>
                </div>
              );
            })()}

            {/* Traces List */}
            <div className="flex-1 overflow-y-auto p-6 space-y-4">
              {telemetryLogs.length === 0 ? (
                <div className="text-center py-12 text-slate-500 font-mono text-xs italic text-center">
                  No telemetry traces captured yet. Run queries or perform actions to see metrics.
                </div>
              ) : (
                telemetryLogs.map((trace, idx) => {
                  const isExpanded = expandedTraceIdx === idx;
                  const total = trace.durationMs || 1.0;
                  const dbSpan = trace.spans.find((s: any) => s.category === 'database');
                  const dbVal = dbSpan ? dbSpan.durationMs : 0;
                  const aiSpan = trace.spans.find((s: any) => s.category === 'ai');
                  const aiVal = aiSpan ? aiSpan.durationMs : 0;
                  const otherVal = Math.max(0, total - dbVal - aiVal);

                  const dbPct = Math.round((dbVal / total) * 100);
                  const aiPct = Math.round((aiVal / total) * 100);
                  const otherPct = 100 - dbPct - aiPct;

                  return (
                    <div key={idx} className="bg-slate-900/30 border border-slate-800 rounded-xl overflow-hidden shadow-sm hover:border-slate-700 transition-colors">
                      {/* Trace Header Summary */}
                      <div 
                        onClick={() => setExpandedTraceIdx(isExpanded ? null : idx)}
                        className="p-4 cursor-pointer select-none flex justify-between items-center hover:bg-slate-900/20"
                      >
                        <div className="flex items-center gap-2.5 overflow-hidden">
                          <span className={`text-xs font-bold px-2 py-0.5 rounded font-mono ${
                            trace.method === 'POST' ? 'bg-blue-950 text-blue-400 border border-blue-900/60' : 'bg-slate-800 text-slate-300'
                          }`}>
                            {trace.method}
                          </span>
                          <span className="text-xs font-mono font-semibold text-slate-200 truncate max-w-[180px]">
                            {trace.path}
                          </span>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className={`text-xs font-mono font-bold ${
                            trace.statusCode < 300 ? 'text-emerald-400' : 'text-red-500'
                          }`}>
                            {trace.statusCode}
                          </span>
                          <span className="text-xs font-mono font-semibold text-ncc-sky">
                            {trace.durationMs}ms
                          </span>
                          <span className="text-xs text-slate-500">
                            <i className={`fas fa-chevron-down transition-transform duration-200 ${isExpanded ? 'rotate-180 text-ncc-sky' : ''}`}></i>
                          </span>
                        </div>
                      </div>

                      {/* Expanded Trace Details */}
                      {isExpanded && (
                        <div className="p-4 border-t border-slate-800 bg-slate-950/60 space-y-4 font-mono text-xs">
                          {/* Segment bar chart */}
                          <div className="space-y-1.5">
                            <div className="flex justify-between text-slate-400">
                              <span>Latency Composition</span>
                              <span>{total}ms</span>
                            </div>
                            <div className="h-2.5 rounded-full overflow-hidden flex bg-slate-800">
                              {dbVal > 0 && (
                                <div className="bg-emerald-500 h-full" style={{ width: `${dbPct}%` }} title={`DB: ${dbVal}ms`}></div>
                              )}
                              {aiVal > 0 && (
                                <div className="bg-yellow-500 h-full" style={{ width: `${aiPct}%` }} title={`AI: ${aiVal}ms`}></div>
                              )}
                              {otherVal > 0 && (
                                <div className="bg-sky-500 h-full" style={{ width: `${otherPct}%` }} title={`Overhead: ${otherVal.toFixed(1)}ms`}></div>
                              )}
                            </div>
                            {/* Legend labels */}
                            <div className="flex justify-between text-xs text-slate-500 pt-0.5">
                              <span className="flex items-center gap-1">
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span> DB ({dbPct}%)
                              </span>
                              {aiVal > 0 && (
                                <span className="flex items-center gap-1">
                                  <span className="w-1.5 h-1.5 rounded-full bg-yellow-500"></span> AI ({aiPct}%)
                                </span>
                              )}
                              <span className="flex items-center gap-1">
                                <span className="w-1.5 h-1.5 rounded-full bg-sky-500"></span> Overhead ({otherPct}%)
                              </span>
                            </div>
                          </div>

                          {/* Trace span list */}
                          <div className="space-y-2 border-t border-slate-800 pt-3">
                            <div className="text-slate-400 uppercase tracking-widest text-xs font-sans font-bold">Span Breakdown</div>
                            
                            {trace.spans.length === 0 ? (
                              <div className="text-slate-600 italic text-xs">No sub-spans recorded.</div>
                            ) : (
                              trace.spans.map((s: any, sIdx: number) => (
                                <div key={sIdx} className="flex justify-between items-center text-slate-300 bg-slate-900/20 p-2 rounded border border-slate-800/40">
                                  <div className="flex items-center gap-1.5">
                                    <span className={`w-1 h-1 rounded-full ${
                                      s.category === 'database' ? 'bg-emerald-500' : 'bg-yellow-500'
                                    }`}></span>
                                    <span className="font-semibold">{s.name}</span>
                                  </div>
                                  <span className="font-bold text-slate-200">{s.durationMs}ms</span>
                                </div>
                              ))
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      )}

      {/* Floating Diagnostics Button */}
      <button
        onClick={() => setShowDiagnostics(true)}
        className="fixed bottom-6 right-6 w-12 h-12 rounded-full bg-slate-950 hover:bg-slate-900 text-ncc-sky border border-slate-800 hover:border-slate-700 flex items-center justify-center shadow-2xl transition-all hover:scale-105 z-40 group cursor-pointer"
        title="Open Observability Telemetry"
      >
        <i className="fas fa-chart-line text-lg animate-pulse"></i>
      </button>

      <HudDialog
        isOpen={dialog.isOpen}
        type={dialog.type}
        title={dialog.title}
        message={dialog.message}
        onConfirm={dialog.onConfirm}
        onCancel={dialog.onCancel}
        confirmText={dialog.confirmText}
        cancelText={dialog.cancelText}
      />

      </main>
    </div>
  );
}
