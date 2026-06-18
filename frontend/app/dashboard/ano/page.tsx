'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { getDashboardData, updatePermissionStatus, createEvent, verifyAchievement, deleteEvent, updatePermissionManager } from '@/app/actions';
import { User, Permission, Event, Achievement, Attendance } from '@/lib/types';
import ArmyNewsFeed from '@/components/ArmyNewsFeed';

export default function ANODashboard() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [activeTab, setActiveTab] = useState('overview');
  const [data, setData] = useState<{ events: Event[], permissions: Permission[], achievements: Achievement[], users: User[], attendance: Attendance[], permissionManagerId?: string | null, fetchError?: string }>({ events: [], permissions: [], achievements: [], users: [], attendance: [] });
  const [selectedManagerId, setSelectedManagerId] = useState('');
  const [actionComment, setActionComment] = useState('');

  // Event Creation / Editing State
  const [editingId, setEditingId] = useState<string | null>(null);
  const [eventType, setEventType] = useState('Parade');
  const [eventTitle, setEventTitle] = useState('Morning Drill Parade');
  const [eventDate, setEventDate] = useState('');
  const [eventLocation, setEventLocation] = useState('');
  const [eventStart, setEventStart] = useState('');
  const [eventEnd, setEventEnd] = useState('');

  // Schedule Navigation, Filtering, and Details
  const [currentWeekStart, setCurrentWeekStart] = useState<Date>(() => {
    const today = new Date();
    const day = today.getDay();
    const diff = today.getDate() - day + (day === 0 ? -6 : 1); // Get Monday
    const monday = new Date(today.setDate(diff));
    monday.setHours(0, 0, 0, 0);
    return monday;
  });
  const [scheduleFilter, setScheduleFilter] = useState<'All' | 'Parade' | 'Theory' | 'Camp' | 'Event'>('All');
  const [selectedEvent, setSelectedEvent] = useState<any | null>(null);

  // Verified Registry State
  const [searchQuery, setSearchQuery] = useState('');

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
  }

  // Smart Title Logic
  const handleTypeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const type = e.target.value;
    setEventType(type);
    if (type === 'Parade') setEventTitle('Morning Drill Parade');
    else if (type === 'Theory') setEventTitle('Theory Session: ');
    else if (type === 'Camp') setEventTitle('Annual Training Camp');
    else setEventTitle('');
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
  const nextEvent = data.events.filter(e => new Date(e.date) >= new Date()).sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())[0];

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
      const dateStr = dateObj.toISOString().split('T')[0];
      return filteredEvents
        .filter(e => e.date === dateStr)
        .map(e => ({ ...e, dateObj }));
    }).sort((a, b) => a.startTime.localeCompare(b.startTime));

    return (
      <div className="bg-white rounded-2xl shadow-sm border border-gray-200/60 overflow-hidden">
        {/* Header */}
        <div className="p-6 border-b border-gray-100 flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 bg-slate-50/50">
          <div>
            <h3 className="font-heading text-lg font-bold text-gray-800">Weekly Schedule</h3>
            <p className="text-ncc-red font-bold uppercase text-[10px] tracking-widest mt-0.5">{rangeLabel}</p>
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
              className="w-7 h-7 rounded-lg border border-gray-200 flex items-center justify-center hover:bg-slate-50 transition-colors text-gray-500"
              title="Previous Week"
            >
              <i className="fas fa-chevron-left text-[10px]"></i>
            </button>
            <button 
              onClick={() => {
                const today = new Date();
                const day = today.getDay();
                const diff = today.getDate() - day + (day === 0 ? -6 : 1);
                const monday = new Date(today.setDate(diff));
                monday.setHours(0, 0, 0, 0);
                setCurrentWeekStart(monday);
              }}
              className="px-2.5 h-7 rounded-lg border border-gray-200 text-[10px] font-semibold hover:bg-slate-50 transition-colors text-gray-600"
            >
              Today
            </button>
            <button 
              onClick={() => {
                setCurrentWeekStart(prev => {
                  const d = new Date(prev);
                  d.setDate(d.getDate() + 7);
                  return d;
                });
              }}
              className="w-7 h-7 rounded-lg border border-gray-200 flex items-center justify-center hover:bg-slate-50 transition-colors text-gray-500"
              title="Next Week"
            >
              <i className="fas fa-chevron-right text-[10px]"></i>
            </button>
          </div>
        </div>

        {/* Filter Pills */}
        <div className="flex gap-1.5 p-3 bg-slate-50/20 border-b border-gray-100 overflow-x-auto">
          {(['All', 'Parade', 'Theory', 'Camp', 'Event'] as const).map(f => {
            const isActive = scheduleFilter === f;
            const label = f === 'Theory' ? 'Theory' : f === 'Event' ? 'Other' : f === 'All' ? 'All' : `${f}s`;
            return (
              <button
                key={f}
                onClick={() => setScheduleFilter(f)}
                className={`px-3 py-1 rounded-full text-[10px] font-bold transition-all border ${
                  isActive 
                    ? 'bg-ncc-navy border-ncc-navy text-white shadow-sm' 
                    : 'bg-white border-gray-200 text-gray-400 hover:bg-gray-50'
                }`}
              >
                {label}
              </button>
            );
          })}
        </div>

        {/* 1. Mini Visual Grid (Quick Glance) */}
        <div className="grid grid-cols-7 gap-px bg-slate-200/50 border-b border-gray-100">
          {weekDates.map((dateObj, i) => {
            const dateStr = dateObj.toISOString().split('T')[0];
            const dayName = dateObj.toLocaleDateString('default', { weekday: 'short' });
            const dayNum = dateObj.getDate();
            const daysEvents = filteredEvents.filter(e => e.date === dateStr);
            const isToday = dateStr === new Date().toISOString().split('T')[0];

            return (
              <div 
                key={i} 
                onClick={() => {
                  setEventDate(dateStr);
                  // Scroll smoothly to the form
                  const formEl = document.querySelector('form');
                  if (formEl) formEl.scrollIntoView({ behavior: 'smooth' });
                }}
                className={`min-h-[90px] bg-white p-2.5 flex flex-col gap-1.5 transition-all cursor-pointer hover:bg-slate-50/70 border-b-2 border-transparent hover:border-ncc-navy/30 ${isToday ? 'bg-blue-50/20 border-b-ncc-navy' : ''}`}
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
        <div className="bg-slate-50 p-6 space-y-3">
          <h4 className="font-heading font-bold text-gray-400 text-xs uppercase tracking-wider mb-2">Detailed Agenda</h4>
          <div className="space-y-3 max-h-[360px] overflow-y-auto pr-1">
            {weekEvents.length === 0 ? (
              <p className="text-sm text-gray-400 italic text-center py-6">No events scheduled for this week.</p>
            ) : (
              weekEvents.map(ev => (
                <div 
                  key={ev.id} 
                  onClick={() => setSelectedEvent(ev)}
                  className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm flex flex-col md:flex-row md:items-center gap-4 hover:border-ncc-navy transition-all group cursor-pointer hover:shadow"
                >
                  {/* Date Badge */}
                  <div className="flex-shrink-0 w-12 text-center border-r border-gray-100 pr-4">
                    <span className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider">{ev.dateObj.toLocaleDateString('default', { weekday: 'short' })}</span>
                    <span className="block text-xl font-heading font-bold text-gray-800 leading-none mt-1">{ev.dateObj.getDate()}</span>
                  </div>

                  {/* Event Details */}
                  <div className="flex-grow">
                    <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                      <span className={`text-[9px] font-bold px-2 py-0.5 rounded-md uppercase tracking-wider ${
                        ev.type === 'Parade' ? 'bg-red-50 border border-red-200 text-red-700' :
                        ev.type === 'Theory' ? 'bg-blue-50 border border-blue-200 text-blue-700' :
                        ev.type === 'Camp' ? 'bg-purple-50 border border-purple-200 text-purple-700' :
                        'bg-emerald-50 border border-emerald-200 text-emerald-700'
                      }`}>
                        {ev.type}
                      </span>
                      <h5 className="font-bold text-gray-800 text-sm group-hover:text-ncc-navy transition-colors">{ev.title}</h5>
                    </div>
                    <div className="flex items-center gap-4 text-xs font-semibold text-gray-400 mt-1">
                      <span className="flex items-center gap-1">
                        <i className="far fa-clock text-gray-400"></i> {ev.startTime} - {ev.endTime}
                      </span>
                      <span className="flex items-center gap-1">
                        <i className="fas fa-map-marker-alt text-gray-400"></i> {ev.location}
                      </span>
                    </div>
                  </div>

                  {/* Action/Edit (Update & Delete) */}
                  <div className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1.5 self-center" onClick={(e) => e.stopPropagation()}>
                    <button onClick={() => handleEditClick(ev)} className="text-gray-400 hover:text-blue-600 p-2 rounded-lg hover:bg-slate-50 transition-colors" title="Edit Event">
                      <i className="fas fa-edit"></i>
                    </button>
                    <form action={async (fd) => {
                      if (!confirm('Are you sure you want to delete this event?')) return;
                      fd.append('id', ev.id);
                      await deleteEvent(fd);
                      refreshData();
                    }}>
                      <button className="text-gray-400 hover:text-red-600 p-2 rounded-lg hover:bg-slate-50 transition-colors" title="Delete Event">
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

  return (
    <div className="min-h-screen bg-slate-50 flex font-body">
      {/* Sidebar */}
      <aside className="w-72 bg-gradient-to-b from-ncc-navy to-[#051122] text-white fixed h-full hidden md:flex flex-col border-r border-white/5">
        {/* Brand Header */}
        <div className="p-8 border-b border-white/5 relative">
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-ncc-red via-ncc-gold to-ncc-sky"></div>
          <div className="flex items-center gap-3">
            <img src="/assets/images/ncc_logo.png" alt="NCC" className="h-10 animate-float" />
            <div>
              <h2 className="font-heading text-2xl font-bold tracking-tight leading-none">SASTRA NCC</h2>
              <p className="text-[10px] text-ncc-sky font-bold tracking-[0.2em] uppercase mt-1">Command Center</p>
            </div>
          </div>
        </div>

        {/* Navigation Links */}
        <nav className="p-4 space-y-1.5 flex-grow">
          {[
            { id: 'overview', label: 'Overview', icon: 'th-large' },
            { id: 'approvals', label: 'Approvals', icon: 'check-double', badge: allActionRequired.length },
            { id: 'achievements', label: 'Achievements', icon: 'medal', badge: pendingAchievements.length },
            { id: 'schedule', label: 'Schedule', icon: 'calendar-alt' }
          ].map((item) => {
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={`w-full text-left px-5 py-3 rounded-xl transition-all flex items-center gap-3.5 font-semibold text-sm relative ${
                  isActive 
                    ? 'bg-ncc-red text-white shadow-lg shadow-ncc-red/15' 
                    : 'text-gray-400 hover:bg-white/5 hover:text-white'
                }`}
              >
                {isActive && <div className="absolute left-0 top-3 bottom-3 w-1 bg-white rounded-r-md"></div>}
                <i className={`fas fa-${item.icon} w-5 text-center text-sm ${isActive ? 'text-white' : 'text-gray-500'}`}></i>
                <span>{item.label}</span>
                {item.badge !== undefined && item.badge > 0 && (
                  <span className="text-[10px] bg-ncc-red border border-white/20 px-2 py-0.5 rounded-full ml-auto font-bold">
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        {/* User Profile Footer */}
        <div className="p-6 bg-black/20 border-t border-white/5">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-xl bg-ncc-gold/15 text-ncc-gold flex items-center justify-center font-bold text-lg border border-ncc-gold/20 shadow-inner">
              {user.name.charAt(0)}
            </div>
            <div className="overflow-hidden">
              <div className="text-white font-bold text-sm leading-tight truncate">{user.name}</div>
              <div className="text-ncc-sky text-[9px] font-bold uppercase tracking-wider mt-0.5">{user.rank || 'Officer'}</div>
              <div className="text-gray-500 text-[9px] mt-0.5">{user.role === 'ANO' ? 'Associate NCC Officer' : 'Command Staff'}</div>
            </div>
          </div>
          <button
            onClick={() => { localStorage.removeItem('user'); localStorage.removeItem('access_token'); router.push('/'); }}
            className="w-full py-2 rounded-lg border border-white/10 text-xs hover:bg-white/5 hover:text-white text-gray-400 font-semibold transition-all flex items-center justify-center gap-2"
          >
            <i className="fas fa-sign-out-alt"></i>
            <span>Sign Out</span>
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="md:ml-72 w-full p-8 md:p-12 overflow-x-hidden min-h-screen flex flex-col">
        {data.fetchError && (
          <div className="bg-red-50 border border-red-200 text-red-800 p-4 rounded-xl mb-6 text-sm flex items-center gap-3">
            <i className="fas fa-exclamation-circle text-red-600"></i>
            <span><strong>Error loading data:</strong> {data.fetchError}</span>
          </div>
        )}

        {/* Sticky Top Header */}
        <header className="flex justify-between items-center mb-8 pb-6 border-b border-gray-200/60">
          <div>
            <h1 className="text-3xl font-heading font-bold text-ncc-navy uppercase tracking-wider">{activeTab}</h1>
            <p className="text-gray-400 text-xs mt-1">
              {activeTab === 'overview' && "Contingent strength, key activity logs, and quick metrics"}
              {activeTab === 'approvals' && "Review and manage cadet leave permissions"}
              {activeTab === 'achievements' && "Verify achievements and view the central registry"}
              {activeTab === 'schedule' && "Manage weekly training routines and schedules"}
            </p>
          </div>
          <div className="flex gap-2">
            <span className="bg-gradient-to-r from-ncc-red to-red-700 text-white px-4 py-1.5 rounded-full font-bold text-[10px] uppercase tracking-wider shadow-md flex items-center gap-1.5">
              <i className="fas fa-crown"></i> {isANO ? 'Commanding Officer' : user.rank}
            </span>
          </div>
        </header>

        {/* --- OVERVIEW TAB --- */}
        {activeTab === 'overview' && (
          <div className="space-y-8 animate-fade-in flex-grow">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              
              <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm relative overflow-hidden group">
                <div className="absolute top-0 left-0 bottom-0 w-1.5 bg-ncc-navy"></div>
                <h3 className="text-gray-400 text-xs font-bold uppercase tracking-wider">Total Strength</h3>
                <div className="text-4xl font-heading font-bold text-gray-800 mt-3">52</div>
                <div className="text-[10px] text-gray-400 font-semibold mt-1">Active Cadets</div>
              </div>

              <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm relative overflow-hidden group">
                <div className="absolute top-0 left-0 bottom-0 w-1.5 bg-yellow-500"></div>
                <h3 className="text-gray-400 text-xs font-bold uppercase tracking-wider">Action Required</h3>
                <div className="text-4xl font-heading font-bold text-yellow-600 mt-3">{allActionRequired.length}</div>
                <div className="text-[10px] text-gray-400 font-semibold mt-1">{pendingReview.length} new · {pendingApprovals.length} forwarded</div>
              </div>

              <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm relative overflow-hidden group">
                <div className="absolute top-0 left-0 bottom-0 w-1.5 bg-red-500"></div>
                <h3 className="text-gray-400 text-xs font-bold uppercase tracking-wider">SUO Rejections</h3>
                <div className="text-4xl font-heading font-bold text-red-600 mt-3">{suoRejections.length}</div>
                <div className="text-[10px] text-gray-400 font-semibold mt-1">Review Needed</div>
              </div>

              <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm relative overflow-hidden group">
                <div className="absolute top-0 left-0 bottom-0 w-1.5 bg-green-600"></div>
                <h3 className="text-gray-400 text-xs font-bold uppercase tracking-wider">Next Event</h3>
                <div className="text-lg font-heading font-bold text-gray-800 mt-3 truncate">{nextEvent ? nextEvent.title : 'None'}</div>
                <div className="text-[10px] text-green-600 font-bold mt-1">{nextEvent ? nextEvent.date : '-'}</div>
              </div>

            </div>

            {/* Quick Actions / Recent Activity */}
            <div className="grid md:grid-cols-2 gap-8">
              {/* Army News Feed */}
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 overflow-hidden">
                <ArmyNewsFeed />
              </div>

              <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
                <h3 className="font-heading text-lg font-bold text-ncc-navy mb-4 uppercase">Recent Permission Activity</h3>
                <div className="space-y-1">
                  {data.permissions.filter(p => ['PENDING_REVIEW','FORWARDED_TO_ANO', 'REJECTED_BY_SUO'].includes(p.status)).slice(0, 5).map(p => (
                    <div key={p.id} className="border-b border-gray-100 last:border-0 py-3.5 flex justify-between items-center gap-4">
                      <div>
                        <div className="font-bold text-sm text-gray-800">{p.cadetName}</div>
                        <div className="text-xs text-gray-400 mt-0.5 line-clamp-1">{p.reason}</div>
                      </div>
                      <span className={`badge-status flex-shrink-0 ${
                        p.status === 'PENDING_REVIEW' ? 'badge-pending' :
                        p.status === 'FORWARDED_TO_ANO' ? 'badge-forwarded' : 'badge-rejected'}`}>
                        {p.status === 'PENDING_REVIEW' ? 'New' : p.status === 'FORWARDED_TO_ANO' ? 'Forwarded' : 'Rejected'}
                      </span>
                    </div>
                  ))}
                  {data.permissions.length === 0 && <p className="text-xs text-gray-400 italic text-center py-6">No recent activity.</p>}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* --- APPROVALS TAB --- */}
        {activeTab === 'approvals' && (
          <div className="space-y-8 animate-fade-in flex-grow">
            
            {/* Manager Designation Panel */}
            {isANO && (
              <div className="bg-white border border-gray-200/60 rounded-2xl shadow-sm p-6 flex flex-col md:flex-row items-start md:items-center justify-between gap-6 relative overflow-hidden group">
                <div className="absolute top-0 left-0 bottom-0 w-1.5 bg-ncc-navy"></div>
                <div>
                  <h3 className="font-heading font-bold text-ncc-navy text-lg flex items-center gap-2">
                    <i className="fas fa-user-shield text-ncc-red animate-pulse"></i> Permission Manager
                  </h3>
                  <p className="text-xs text-gray-400 mt-1 max-w-md leading-relaxed">
                    Designate a cadet to review and filter incoming permission requests before they reach you.
                    Usually the SUO/CUO, but can be any entrusted cadet.
                  </p>
                </div>
                <form action={async (formData) => {
                  const res = await updatePermissionManager(formData);
                  if (res.success) { alert('Permission Manager Assigned!'); refreshData(); }
                  else alert(res.message);
                }} className="flex items-center gap-3 w-full md:w-auto z-10">
                  <select 
                    name="managerId" 
                    className="military-input md:w-64" 
                    value={selectedManagerId || ''} 
                    onChange={(e) => setSelectedManagerId(e.target.value)}
                    required
                  >
                    <option value="" disabled>Select a Cadet...</option>
                    {data.users.filter(u => u.role?.toLowerCase() === 'cadet').sort((a,b) => a.name.localeCompare(b.name)).map(u => (
                      <option key={u.id} value={u.id}>{u.rank} {u.name} ({u.regimentalNumber || 'N/A'})</option>
                    ))}
                  </select>
                  <button 
                    type="submit" 
                    disabled={selectedManagerId === data.permissionManagerId && !!selectedManagerId}
                    className={`px-6 py-3.5 rounded-xl font-heading font-bold text-xs uppercase tracking-wider text-white transition-all shadow-md ${
                      selectedManagerId === data.permissionManagerId && !!selectedManagerId
                        ? 'bg-emerald-600 shadow-emerald-600/10 cursor-default'
                        : 'bg-ncc-navy hover:bg-ncc-navy/90 shadow-ncc-navy/10'
                    }`}
                  >
                    {selectedManagerId === data.permissionManagerId && !!selectedManagerId ? 'Assigned ✓' : 'Assign'}
                  </button>
                </form>
              </div>
            )}

            <div className="bg-amber-50/50 border border-amber-200/60 rounded-2xl p-5 text-xs text-amber-800 flex items-center gap-3.5 shadow-sm">
              <div className="w-8 h-8 rounded-xl bg-amber-500/10 flex items-center justify-center text-amber-600 flex-shrink-0">
                <i className="fas fa-crown text-sm"></i>
              </div>
              <span><strong>ANO Final Authority:</strong> You can Approve or Decline any request at any stage, overriding any Manager designation.</span>
            </div>

            {/* Reusable action panels */}
            {([
              { label: 'Pending Review', subtitle: '(New — not yet reviewed by Manager)', items: pendingReview, accent: 'border-blue-500', badge: 'badge-pending', badgeText: 'Pending Review' },
              { label: 'Forwarded by Manager', subtitle: '', items: pendingApprovals, accent: 'border-yellow-500', badge: 'badge-forwarded', badgeText: 'Forwarded' },
              { label: 'Manager Override Zone', subtitle: '(Rejected by Manager — you can still approve)', items: suoRejections, accent: 'border-red-400', badge: 'badge-rejected', badgeText: 'Rejected by Manager' },
            ] as const).map(({ label, subtitle, items, accent, badge, badgeText }) =>
              items.length > 0 && (
                <div key={label} className="space-y-4">
                  <h3 className={`font-heading text-lg font-bold border-b pb-2 flex items-center gap-2 ${
                    label === 'Pending Review' ? 'text-blue-700 border-blue-100' :
                    label === 'Manager Override Zone' ? 'text-red-600 border-red-100' : 'text-ncc-navy border-slate-100'
                  }`}>
                    {label}
                    {subtitle && <span className="text-xs font-normal text-gray-400 lowercase">{subtitle}</span>}
                  </h3>
                  {items.map(p => (
                    <div key={p.id} className={`bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex flex-col md:flex-row gap-6 relative overflow-hidden group hover:border-gray-200 transition-all`}>
                      <div className={`absolute top-0 left-0 bottom-0 w-1.5 ${
                        label === 'Pending Review' ? 'bg-blue-500' :
                        label === 'Forwarded by Manager' ? 'bg-amber-500' : 'bg-red-500'
                      }`}></div>
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-3 flex-wrap">
                          <span className="font-heading font-bold text-lg text-gray-800">{p.cadetName}</span>
                          <span className={`badge-status ${badge}`}>{badgeText}</span>
                          {p.evidenceUrl && (
                            <a href={p.evidenceUrl} target="_blank" rel="noopener noreferrer" className="bg-blue-50 text-blue-600 px-3.5 py-2 rounded-xl text-xs font-bold hover:bg-blue-100 border border-blue-200 transition-colors flex items-center gap-1.5">
                              <i className="fas fa-paperclip text-[10px]"></i> Evidence
                            </a>
                          )}
                        </div>
                        <div className="bg-slate-50 border border-slate-100 p-4 rounded-xl text-gray-700 text-sm mb-4 leading-relaxed">
                          <strong className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Reason</strong>
                          {p.reason}
                        </div>
                        <div className="text-xs font-semibold text-gray-400 flex items-center gap-2">
                          <i className="far fa-calendar text-ncc-red"></i> {p.startDate} to {p.endDate}
                        </div>
                        {p.suoComment && (
                          <div className="mt-4 bg-emerald-50 border border-emerald-100 text-emerald-800 text-xs p-3.5 rounded-xl">
                            <strong className="block text-[10px] font-bold text-emerald-600 uppercase tracking-wider mb-1">Manager Note</strong>
                            {p.suoComment}
                          </div>
                        )}
                        {p.anoComment && (
                          <div className="mt-3 bg-slate-50 border border-slate-100 text-gray-600 text-xs p-3.5 rounded-xl">
                            <strong className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Previous ANO Note</strong>
                            {p.anoComment}
                          </div>
                        )}
                      </div>
                      
                      {isANO ? (
                        <div className="w-full md:w-64 space-y-3 flex flex-col justify-between">
                          <div>
                            <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1.5 block">Remarks</label>
                            <textarea 
                              onChange={(e) => setActionComment(e.target.value)} 
                              className="military-input h-24 py-2 resize-none" 
                              placeholder="Enter remarks..."
                            ></textarea>
                          </div>
                          <div className="grid grid-cols-2 gap-2">
                            <form action={async (fd) => { fd.append('permId', p.id); fd.append('status', 'APPROVED'); fd.append('comment', actionComment); fd.append('role', 'ANO'); await updatePermissionStatus(fd); refreshData(); }}>
                              <button className="w-full bg-green-600 text-white py-2.5 rounded-lg font-heading font-bold text-xs uppercase tracking-wider hover:bg-green-700 shadow shadow-green-600/10 transition-colors">
                                Approve
                              </button>
                            </form>
                            <form action={async (fd) => { fd.append('permId', p.id); fd.append('status', 'DECLINED_BY_ANO'); fd.append('comment', actionComment); fd.append('role', 'ANO'); await updatePermissionStatus(fd); refreshData(); }}>
                              <button className="w-full bg-red-600 text-white py-2.5 rounded-lg font-heading font-bold text-xs uppercase tracking-wider hover:bg-red-700 shadow shadow-red-600/10 transition-colors">
                                Decline
                              </button>
                            </form>
                            <form action={async (fd) => { fd.append('permId', p.id); fd.append('status', 'MEET_ANO'); fd.append('comment', actionComment || 'Please report to ANO office.'); fd.append('role', 'ANO'); await updatePermissionStatus(fd); refreshData(); }} className="col-span-2">
                              <button className="w-full bg-amber-500 text-white py-2.5 rounded-lg font-heading font-bold text-xs uppercase tracking-wider hover:bg-amber-600 shadow shadow-amber-500/10 transition-colors flex items-center justify-center gap-1.5">
                                <i className="fas fa-user-clock text-xs"></i> Call for Meeting
                              </button>
                            </form>
                          </div>
                        </div>
                      ) : (
                        <div className="w-full md:w-64 text-xs font-semibold text-gray-400 italic flex items-center justify-center border border-dashed border-gray-200 p-4 rounded-xl bg-slate-50 text-center">
                          ANO review required for final decision.
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )
            )}

            {allActionRequired.length === 0 && (
              <div className="p-12 text-center text-gray-400 bg-white rounded-2xl border border-dashed border-gray-200 text-sm">
                <i className="fas fa-check-circle text-2xl mb-2 block opacity-30 text-green-600"></i>
                All clear — no active requests pending review.
              </div>
            )}

            {/* Closed requests — ANO can still override */}
            {closedPermissions.length > 0 && (
              <div className="space-y-4 pt-8 border-t border-gray-200">
                <h3 className="font-heading text-lg font-bold text-gray-500 flex items-center gap-2">
                  Closed Requests <span className="text-xs font-normal text-gray-400">(ANO can override)</span>
                </h3>
                <div className="space-y-3">
                  {closedPermissions.map(p => (
                    <div key={p.id} className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm flex flex-col md:flex-row gap-6 hover:border-gray-200 transition-all">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2 flex-wrap">
                          <span className="font-heading font-bold text-gray-800">{p.cadetName}</span>
                          <span className={`badge-status ${
                            p.status === 'APPROVED' ? 'badge-approved' :
                            p.status === 'MEET_ANO' ? 'bg-amber-50 text-amber-800 border-amber-200' : 'badge-rejected'
                          }`}>{p.status.replace(/_/g, ' ')}</span>
                        </div>
                        <div className="text-sm text-gray-600 leading-relaxed">{p.reason}</div>
                        <div className="text-xs text-gray-400 font-semibold mt-2"><i className="far fa-calendar text-ncc-red"></i> {p.startDate} to {p.endDate}</div>
                        {p.anoComment && <div className="mt-2 text-xs text-gray-500 bg-slate-50 px-3.5 py-2.5 rounded-lg border border-slate-100 leading-relaxed">ANO note: {p.anoComment}</div>}
                      </div>
                      {isANO && (
                        <div className="flex items-center gap-3 self-center w-full md:w-auto">
                          <textarea onChange={(e) => setActionComment(e.target.value)} className="military-input h-14 w-40 text-xs py-2" placeholder="Override remark..."></textarea>
                          <div className="flex flex-col gap-1 w-24">
                            <form action={async (fd) => { fd.append('permId', p.id); fd.append('status', 'APPROVED'); fd.append('comment', actionComment); fd.append('role', 'ANO'); await updatePermissionStatus(fd); refreshData(); }}>
                              <button className="bg-green-600 text-white px-3 py-2 rounded-lg font-heading font-bold text-[10px] uppercase tracking-wider hover:bg-green-700 w-full transition-colors">
                                Approve
                              </button>
                            </form>
                            <form action={async (fd) => { fd.append('permId', p.id); fd.append('status', 'DECLINED_BY_ANO'); fd.append('comment', actionComment); fd.append('role', 'ANO'); await updatePermissionStatus(fd); refreshData(); }}>
                              <button className="bg-red-600 text-white px-3 py-2 rounded-lg font-heading font-bold text-[10px] uppercase tracking-wider hover:bg-red-700 w-full transition-colors">
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
              <h3 className="font-heading text-lg font-bold text-ncc-navy border-b pb-2 uppercase tracking-wide">Pending Verification Queue</h3>
              {pendingAchievements.length === 0 ? (
                <div className="p-12 text-center text-gray-400 bg-white rounded-2xl border border-dashed border-gray-200">
                  <i className="fas fa-medal text-3xl mb-2 block opacity-30"></i>
                  No pending achievements to verify.
                </div>
              ) : (
                pendingAchievements.map(a => {
                  const cadet = data.users.find(u => u.id === a.cadetId);
                  return (
                    <div key={a.id} className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm flex flex-col md:flex-row gap-6 hover:border-gray-200 transition-all relative overflow-hidden">
                      <div className="absolute top-0 left-0 bottom-0 w-1.5 bg-blue-500"></div>
                      <div className="flex-grow">
                        {/* Cadet Header */}
                        <div className="flex items-center gap-3 mb-4 border-b border-dashed border-gray-100 pb-3">
                          <div className="w-10 h-10 rounded-xl bg-ncc-navy/5 text-ncc-navy flex items-center justify-center font-heading font-bold text-lg border border-ncc-navy/10 shadow-inner">
                            {cadet?.name.charAt(0) || '?'}
                          </div>
                          <div>
                            <div className="font-bold text-gray-800 text-sm">{cadet?.rank} {cadet?.name}</div>
                            <div className="text-[10px] text-gray-400 font-semibold flex items-center gap-2 mt-0.5">
                              <span className="bg-slate-100 px-1.5 py-0.5 rounded text-gray-500 border border-slate-200/50">{cadet?.regimentalNumber || 'No Regt #'}</span>
                              <span>•</span>
                              <span>Batch {cadet?.batchYear}</span>
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-3 mb-2 flex-wrap">
                          <span className="font-heading font-bold text-lg text-gray-800">{a.title}</span>
                          <span className="text-[10px] font-bold bg-slate-100 border border-slate-200/50 px-2 py-0.5 rounded-md text-gray-600 uppercase tracking-wider">{a.category}</span>
                          {a.certificateUrl && (
                            <a href={a.certificateUrl} target="_blank" rel="noopener noreferrer" className="bg-blue-50 text-blue-600 px-3.5 py-2 rounded-xl text-xs font-bold hover:bg-blue-100 border border-blue-200 transition-colors flex items-center gap-1.5">
                              <i className="fas fa-certificate text-[10px]"></i> View Certificate
                            </a>
                          )}
                        </div>
                        <div className="bg-slate-50 border border-slate-100 p-4 rounded-xl text-gray-700 text-sm mb-4 leading-relaxed">
                          {a.description}
                          {a.location && <div className="mt-2 text-xs text-gray-400 font-semibold"><i className="fas fa-map-marker-alt text-ncc-red mr-1"></i> {a.location}</div>}
                        </div>
                        <div className="text-xs font-semibold text-gray-400 flex items-center gap-2">
                          <i className="far fa-calendar text-ncc-red"></i> {a.date} {a.endDate && `to ${a.endDate}`}
                        </div>
                      </div>
                      
                      {isANO ? (
                        <div className="w-full md:w-64 space-y-3 flex flex-col justify-between">
                          <div>
                            <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1.5 block">Remarks</label>
                            <textarea 
                              onChange={(e) => setActionComment(e.target.value)} 
                              className="military-input h-24 py-2 resize-none" 
                              placeholder="Rejection Reason..."
                            ></textarea>
                          </div>
                          <div className="grid grid-cols-2 gap-2">
                            <form action={async (fd) => { fd.append('id', a.id); fd.append('status', 'VERIFIED'); fd.append('comment', actionComment); await verifyAchievement(fd); refreshData(); }}>
                              <button className="w-full bg-green-600 text-white py-2.5 rounded-lg font-heading font-bold text-xs uppercase tracking-wider hover:bg-green-700 shadow shadow-green-600/10 transition-colors">
                                Verify
                              </button>
                            </form>
                            <form action={async (fd) => { fd.append('id', a.id); fd.append('status', 'REJECTED'); fd.append('comment', actionComment); await verifyAchievement(fd); refreshData(); }}>
                              <button className="w-full bg-red-600 text-white py-2.5 rounded-lg font-heading font-bold text-xs uppercase tracking-wider hover:bg-red-700 shadow shadow-red-600/10 transition-colors">
                                Reject
                              </button>
                            </form>
                          </div>
                        </div>
                      ) : (
                        <div className="w-full md:w-64 text-xs font-semibold text-gray-400 italic flex items-center justify-center border border-dashed border-gray-200 p-4 rounded-xl bg-slate-50 text-center">
                          ANO verification required.
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>

            {/* 2. Verified Database Registry */}
            <div className="space-y-4 pt-12">
              <div className="flex flex-col md:flex-row justify-between items-start md:items-end border-b border-gray-200 pb-4 mb-4 gap-4">
                <div>
                  <h3 className="font-heading text-lg font-bold text-green-700 uppercase tracking-wide flex items-center gap-2">
                    <i className="fas fa-database text-green-600"></i> Verified Achievement Registry
                  </h3>
                  <p className="text-gray-400 text-xs mt-0.5">Central roster of verified achievements in the unit</p>
                </div>
                <div className="relative w-full md:w-64">
                  <input
                    type="text"
                    placeholder="Search Cadet Name..."
                    className="military-input pl-10 pr-4 py-2.5 text-xs rounded-full bg-white focus:outline-none focus:ring-2 focus:ring-green-500 w-full"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                  <i className="fas fa-search absolute left-4 top-3.5 text-xs text-gray-400"></i>
                </div>
              </div>

              <div className="space-y-6">
                {Array.from(new Set(verifiedAchievements.map(a => a.cadetId)))
                  .map(id => data.users.find(u => u.id === id))
                  .filter(u => u && (!searchQuery || u.name.toLowerCase().includes(searchQuery.toLowerCase())))
                  .map(cadet => {
                    if (!cadet) return null;
                    const cadetAchievements = verifiedAchievements.filter(a => a.cadetId === cadet.id);

                    return (
                      <div key={cadet.id} className="bg-white rounded-2xl border border-gray-200/60 shadow-sm overflow-hidden">
                        {/* Cadet Header */}
                        <div className="bg-slate-50/50 p-4 border-b border-gray-100 flex justify-between items-center">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-ncc-navy/5 text-ncc-navy flex items-center justify-center font-heading font-bold border border-ncc-navy/10 shadow-inner">
                              {cadet.name.charAt(0)}
                            </div>
                            <div>
                              <h4 className="font-heading font-bold text-gray-800 text-base">{cadet.rank} {cadet.name}</h4>
                              <div className="text-[10px] text-gray-400 font-semibold flex items-center gap-2 mt-0.5">
                                <span className="bg-white border px-1.5 py-0.5 rounded">{cadet.regimentalNumber || 'No Regt #'}</span>
                                <span>•</span>
                                <span className="text-green-700 font-bold">{cadetAchievements.length} Verified Records</span>
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* Achievements List Table */}
                        <div className="overflow-x-auto">
                          <table className="w-full text-sm text-left border-collapse">
                            <thead className="bg-slate-50 text-[10px] font-bold text-gray-400 uppercase border-b border-gray-100">
                              <tr>
                                <th className="px-6 py-3">Achievement Title</th>
                                <th className="px-6 py-3">Category</th>
                                <th className="px-6 py-3">Date</th>
                                <th className="px-6 py-3 text-right">Certificate</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-50">
                              {cadetAchievements.map(a => (
                                <tr key={a.id} className="hover:bg-slate-50/50 transition-colors">
                                  <td className="px-6 py-4">
                                    <div className="font-bold text-gray-700 text-sm">{a.title}</div>
                                    <div className="text-xs text-gray-400 mt-1 max-w-md">{a.description}</div>
                                  </td>
                                  <td className="px-6 py-4">
                                    <span className="text-[9px] font-bold bg-slate-100 border border-slate-200/50 text-gray-500 px-2 py-1 rounded uppercase tracking-wider">{a.category}</span>
                                  </td>
                                  <td className="px-6 py-4 font-semibold text-xs text-gray-500">
                                    {a.date}
                                  </td>
                                  <td className="px-6 py-4 text-right">
                                    {a.certificateUrl ? (
                                      <a href={a.certificateUrl} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:text-blue-800 hover:underline font-bold text-xs inline-flex items-center gap-1">
                                        <i className="fas fa-external-link-alt text-[10px]"></i> View
                                      </a>
                                    ) : (
                                      <span className="text-gray-300 text-xs italic">No File</span>
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
                  <div className="p-10 text-center text-gray-400 bg-white rounded-2xl border border-dashed border-gray-200">
                    <i className="fas fa-database text-3xl mb-2 block opacity-30"></i>
                    No verified achievements found in the database.
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* --- SCHEDULE TAB --- */}
        {activeTab === 'schedule' && (
          <div className="grid md:grid-cols-2 gap-12 animate-fade-in flex-grow">
            
            {/* Left: Form */}
            <div>
              <h1 className="text-3xl font-heading font-bold text-gray-800 mb-6">{editingId ? 'Update Event' : 'Create Event'}</h1>
              <div className="bg-white p-8 rounded-2xl border border-gray-200/60 shadow-sm">
                <form action={async (fd) => { await createEvent(fd); alert(editingId ? 'Event Updated' : 'Event Published'); refreshData(); resetForm(); }} className="space-y-5">
                  <input type="hidden" name="id" value={editingId || ''} />

                  <div>
                    <label className="block text-[10px] font-bold uppercase text-gray-400 mb-1.5 tracking-wider">Event Type</label>
                    <select name="type" className="military-input cursor-pointer" onChange={handleTypeChange} value={eventType}>
                      <option value="Parade">Parade</option>
                      <option value="Theory">Theory Class</option>
                      <option value="Camp">Camp</option>
                      <option value="Event">Other Event</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold uppercase text-gray-400 mb-1.5 tracking-wider">Title (Auto-filled but editable)</label>
                    <input name="title" className="military-input" value={eventTitle} onChange={(e) => setEventTitle(e.target.value)} required />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[10px] font-bold uppercase text-gray-400 mb-1.5 tracking-wider">Date</label>
                      <input name="date" type="date" className="military-input" value={eventDate} onChange={(e) => setEventDate(e.target.value)} required />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold uppercase text-gray-400 mb-1.5 tracking-wider">Location</label>
                      <input name="location" className="military-input" value={eventLocation} onChange={(e) => setEventLocation(e.target.value)} required />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[10px] font-bold uppercase text-gray-400 mb-1.5 tracking-wider">Start Time</label>
                      <input name="startTime" type="time" className="military-input" value={eventStart} onChange={(e) => setEventStart(e.target.value)} required />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold uppercase text-gray-400 mb-1.5 tracking-wider">End Time</label>
                      <input name="endTime" type="time" className="military-input" value={eventEnd} onChange={(e) => setEventEnd(e.target.value)} required />
                    </div>
                  </div>

                  <div className="flex gap-3 pt-2">
                    {editingId && (
                      <button 
                        type="button" 
                        onClick={resetForm} 
                        className="flex-1 bg-slate-50 border border-slate-200 hover:bg-slate-100 text-gray-500 font-heading font-bold rounded-xl transition-colors py-3.5 text-xs uppercase tracking-wider"
                      >
                        Cancel
                      </button>
                    )}
                    <button className="flex-[2] bg-ncc-navy hover:bg-ncc-navy/90 text-white font-heading font-bold rounded-xl transition-colors py-3.5 text-xs uppercase tracking-widest shadow-lg shadow-ncc-navy/10">
                      {editingId ? 'Update Event' : 'Publish to Unit Calendar'}
                    </button>
                  </div>
                </form>
              </div>
            </div>

            {/* Right: Calendar Preview */}
            <div>
              <h2 className="font-heading text-lg font-bold text-gray-500 mb-6 uppercase tracking-wide">Live Schedule Preview</h2>
              <CalendarView />
              <div className="mt-6 bg-blue-50/50 border border-blue-200/50 p-4 rounded-xl text-xs text-blue-800 flex items-start gap-2.5">
                <i className="fas fa-info-circle text-sm mt-0.5"></i>
                <span>Events created or modified here will be immediately visible to all 52 Cadets on their dashboards.</span>
              </div>
            </div>
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
            <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm animate-fade-in" onClick={() => setSelectedEvent(null)}>
              <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl overflow-hidden border border-gray-100 relative" onClick={(e) => e.stopPropagation()}>
                <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-ncc-red via-ncc-gold to-ncc-sky"></div>
                
                <div className="p-6">
                  {/* Header */}
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <span className={`text-[9px] font-bold px-2 py-0.5 rounded-md uppercase tracking-wider ${
                        ev.type === 'Parade' ? 'bg-red-50 border border-red-200 text-red-700' :
                        ev.type === 'Theory' ? 'bg-blue-50 border border-blue-200 text-blue-700' :
                        ev.type === 'Camp' ? 'bg-purple-50 border border-purple-200 text-purple-700' :
                        'bg-emerald-50 border border-emerald-200 text-emerald-700'
                      }`}>
                        {ev.type}
                      </span>
                      <h3 className="font-heading text-lg font-bold text-gray-800 mt-2 leading-snug">{ev.title}</h3>
                    </div>
                    <button onClick={() => setSelectedEvent(null)} className="text-gray-400 hover:text-gray-600 transition-colors p-1 rounded-lg hover:bg-slate-100">
                      <i className="fas fa-times text-lg"></i>
                    </button>
                  </div>

                  {/* Details list */}
                  <div className="space-y-4 my-6 text-sm text-gray-600">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-slate-50 flex items-center justify-center text-ncc-red">
                        <i className="far fa-calendar-alt"></i>
                      </div>
                      <div>
                        <div className="font-bold text-gray-700">Date</div>
                        <div className="text-xs text-gray-500">
                          {new Date(ev.date).toLocaleDateString('default', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-slate-50 flex items-center justify-center text-ncc-gold">
                        <i className="far fa-clock"></i>
                      </div>
                      <div>
                        <div className="font-bold text-gray-700">Time</div>
                        <div className="text-xs text-gray-500">{ev.startTime} - {ev.endTime}</div>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-slate-50 flex items-center justify-center text-ncc-sky">
                        <i className="fas fa-map-marker-alt"></i>
                      </div>
                      <div>
                        <div className="font-bold text-gray-700">Location</div>
                        <div className="text-xs text-gray-500">{ev.location}</div>
                      </div>
                    </div>

                    {/* Attendance Card */}
                    <div className="border border-slate-100 rounded-xl p-4 bg-slate-50/50">
                      <div className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-3">Unit Attendance Report</div>
                      
                      {eventAtt.length > 0 ? (
                        <div className="space-y-3">
                          {/* Progress bar */}
                          <div>
                            <div className="flex justify-between text-xs font-bold text-gray-700 mb-1">
                              <span>Attendance Rate</span>
                              <span className="text-ncc-red">{attendanceRate}%</span>
                            </div>
                            <div className="w-full bg-gray-200 h-2 rounded-full overflow-hidden">
                              <div className="bg-ncc-navy h-full rounded-full transition-all" style={{ width: `${attendanceRate}%` }}></div>
                            </div>
                          </div>

                          {/* Stats Grid */}
                          <div className="grid grid-cols-4 gap-2 pt-2 text-center">
                            <div className="bg-white p-2 rounded-lg border border-gray-100">
                              <span className="block text-sm font-bold text-green-600">{presentCount}</span>
                              <span className="text-[8px] text-gray-400 uppercase font-bold">Present</span>
                            </div>
                            <div className="bg-white p-2 rounded-lg border border-gray-100">
                              <span className="block text-sm font-bold text-red-500">{absentCount}</span>
                              <span className="text-[8px] text-gray-400 uppercase font-bold">Absent</span>
                            </div>
                            <div className="bg-white p-2 rounded-lg border border-gray-100">
                              <span className="block text-sm font-bold text-blue-500">{leaveCount}</span>
                              <span className="text-[8px] text-gray-400 uppercase font-bold">Leave/Late</span>
                            </div>
                            <div className="bg-white p-2 rounded-lg border border-gray-100">
                              <span className="block text-sm font-bold text-gray-400">{unmarkedCount}</span>
                              <span className="text-[8px] text-gray-400 uppercase font-bold">Pending</span>
                            </div>
                          </div>
                        </div>
                      ) : (
                        <div className="text-xs text-gray-500 italic text-center py-2 flex flex-col items-center gap-1">
                          <i className="fas fa-clipboard-list text-lg text-gray-300"></i>
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

      </main>
    </div>
  );
}
