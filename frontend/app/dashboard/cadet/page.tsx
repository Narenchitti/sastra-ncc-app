'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { getDashboardData, submitPermission, submitAchievement, deleteAchievement, submitAchievementForVerification, getAttendanceSheet, submitBulkAttendance, updatePermissionStatus, deletePermission } from '@/app/actions';
import { User, Event, Permission, Achievement, Attendance } from '@/lib/types';
import ArmyNewsFeed from '@/components/ArmyNewsFeed';

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
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        {/* Header */}
        <div className="p-6 border-b border-gray-50 flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 bg-slate-50/50">
          <div>
            <h3 className="font-heading text-xl font-bold text-gray-800">Weekly Training Schedule</h3>
            <p className="text-ncc-red font-bold uppercase text-[10px] tracking-widest mt-0.5">{rangeLabel}</p>
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
              className="w-8 h-8 rounded-lg border border-gray-200 flex items-center justify-center hover:bg-slate-50 transition-colors text-gray-500"
              title="Previous Week"
            >
              <i className="fas fa-chevron-left text-xs"></i>
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
              className="px-3 h-8 rounded-lg border border-gray-200 text-xs font-semibold hover:bg-slate-50 transition-colors text-gray-600"
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
              className="w-8 h-8 rounded-lg border border-gray-200 flex items-center justify-center hover:bg-slate-50 transition-colors text-gray-500"
              title="Next Week"
            >
              <i className="fas fa-chevron-right text-xs"></i>
            </button>
          </div>
        </div>

        {/* Filter Pills */}
        <div className="flex gap-2 p-4 bg-slate-50/20 border-b border-gray-50 overflow-x-auto">
          {(['All', 'Parade', 'Theory', 'Camp', 'Event'] as const).map(f => {
            const isActive = scheduleFilter === f;
            const label = f === 'Theory' ? 'Theory Classes' : f === 'Event' ? 'Other Events' : f === 'All' ? 'All Events' : `${f}s`;
            return (
              <button
                key={f}
                onClick={() => setScheduleFilter(f)}
                className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all border ${
                  isActive 
                    ? 'bg-ncc-navy border-ncc-navy text-white shadow-sm' 
                    : 'bg-white border-gray-200 text-gray-500 hover:bg-gray-50'
                }`}
              >
                {label}
              </button>
            );
          })}
        </div>

        {/* Calendar Grid */}
        <div className="grid grid-cols-1 md:grid-cols-7 gap-px bg-gray-100 border-b border-gray-100">
          {weekDates.map((dateObj, i) => {
            const dateStr = dateObj.toISOString().split('T')[0];
            const dayName = dateObj.toLocaleDateString('default', { weekday: 'short' });
            const dayNum = dateObj.getDate();
            const daysEvents = filteredEvents.filter(e => e.date === dateStr);
            const isToday = currentTime 
              ? dateStr === currentTime.toISOString().split('T')[0]
              : dateStr === new Date().toISOString().split('T')[0];

            return (
              <div key={i} className={`min-h-[140px] bg-white p-3 flex flex-col gap-2 transition-colors ${isToday ? 'bg-blue-50/20' : ''}`}>
                <div className="text-center mb-1">
                  <span className="block text-[10px] uppercase font-bold text-gray-400 tracking-wider">{dayName}</span>
                  <span className={`text-base font-bold leading-none ${isToday ? 'text-ncc-red' : 'text-gray-700'}`}>{dayNum}</span>
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
                        onClick={() => setSelectedEvent(ev)}
                        className={`text-[10px] p-2.5 rounded-lg border-l-2 shadow-sm relative group cursor-pointer hover:shadow-md hover:scale-[1.02] transition-all duration-200 ${
                          ev.type === 'Parade' ? 'bg-red-50/70 border-red-500 text-red-800 hover:bg-red-50' : 
                          ev.type === 'Theory' ? 'bg-blue-50/70 border-blue-500 text-blue-800 hover:bg-blue-50' : 
                          ev.type === 'Camp' ? 'bg-purple-50/70 border-purple-500 text-purple-800 hover:bg-purple-50' :
                          'bg-emerald-50/70 border-emerald-500 text-emerald-800 hover:bg-emerald-50'
                        }`}
                      >
                        <div className="font-bold truncate">{ev.title}</div>
                        <div className="opacity-75 text-[9px] mt-0.5">{ev.startTime} - {ev.endTime}</div>

                        {/* Personal Attendance Indicator */}
                        {attRecord ? (
                          <span className={`inline-flex items-center gap-1 text-[8px] font-bold px-1.5 py-0.5 rounded mt-1.5 ${
                            attRecord.status === 'Present' ? 'bg-green-100 text-green-700' :
                            attRecord.status === 'Absent' ? 'bg-red-100 text-red-700' :
                            'bg-amber-100 text-amber-700'
                          }`}>
                            <i className={`fas ${attRecord.status === 'Present' ? 'fa-check' : 'fa-times'} text-[7px]`}></i>
                            {attRecord.status}
                          </span>
                        ) : approvedLeave ? (
                          <span className="inline-flex items-center gap-1 text-[8px] font-bold px-1.5 py-0.5 rounded mt-1.5 bg-blue-100 text-blue-700">
                            <i className="fas fa-plane-departure text-[7px]"></i> Leave
                          </span>
                        ) : null}

                        {/* Rank Holder Action */}
                        {isRankHolder && (
                          <div onClick={(e) => { e.stopPropagation(); launchRegister(ev); }}
                            className={`mt-2 text-center py-1 rounded-md cursor-pointer font-bold transition-all text-[9px] ${status.status === 'open' ? 'bg-green-600 text-white animate-pulse' : 'bg-gray-100 text-gray-400 hover:bg-gray-200'}`}>
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
      <div className="fixed inset-0 bg-black/60 z-50 flex flex-col items-center justify-center p-4 backdrop-blur-sm">
        <div className="bg-white w-full max-w-4xl max-h-[90vh] rounded-2xl shadow-2xl flex flex-col overflow-hidden border border-gray-100">
          <div className="bg-ncc-navy text-white p-6 flex justify-between items-center relative">
            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-ncc-red via-ncc-gold to-ncc-sky"></div>
            <div>
              <h2 className="font-heading text-xl font-bold uppercase tracking-wider">Attendance Register</h2>
              <div className="text-xs opacity-80 flex gap-4 mt-1">
                <span><i className="far fa-calendar-check mr-2 text-ncc-gold"></i> {registerEvent.title}</span>
                <span><i className="far fa-clock mr-2 text-ncc-gold"></i> {registerEvent.startTime} - {registerEvent.endTime}</span>
              </div>
            </div>
            <button onClick={() => setShowRegister(false)} className="text-white/60 hover:text-white transition-colors">
              <i className="fas fa-times text-2xl"></i>
            </button>
          </div>
          <div className="flex-1 overflow-y-auto p-6 bg-slate-50">
            {confirmStep === 1 ? (
              <div className="text-center py-12 max-w-md mx-auto">
                <div className="w-16 h-16 bg-amber-50 rounded-full flex items-center justify-center text-3xl text-amber-500 mb-6 mx-auto border border-amber-200">
                  <i className="fas fa-exclamation-triangle"></i>
                </div>
                <h3 className="font-heading text-xl font-bold text-gray-800 mb-2">Confirm Submission?</h3>
                <p className="text-gray-500 text-sm mb-8">You are about to submit the attendance register for {sheetData.length} cadets. This register will become the official record.</p>
                <div className="flex justify-center gap-4">
                  <button onClick={() => setConfirmStep(0)} className="px-6 py-2.5 rounded-lg border border-gray-200 bg-white hover:bg-gray-50 font-semibold text-gray-700 transition-colors text-sm">Go Back</button>
                  <button onClick={finalSubmitAttendance} className="px-6 py-2.5 rounded-lg bg-green-600 hover:bg-green-700 font-semibold text-white shadow-lg shadow-green-600/20 transition-all text-sm">Confirm & Submit</button>
                </div>
              </div>
            ) : (
              Object.entries(groupedData).map(([year, students]) => students.length > 0 && (
                <div key={year} className="mb-8 last:mb-0">
                  <h3 className="text-xs font-bold uppercase text-gray-400 border-b pb-2 mb-4 sticky top-0 bg-slate-50 z-10 tracking-widest">{year}</h3>
                  <div className="space-y-2">
                    {students.map(stud => (
                      <div key={stud.id} className="bg-white p-4 rounded-xl border border-gray-100 flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-sm hover:shadow transition-shadow">
                        <div className="flex items-center gap-3 w-64">
                          <div className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold font-heading bg-ncc-navy/5 text-ncc-navy border border-ncc-navy/10">{stud.name.charAt(0)}</div>
                          <div>
                            <div className="font-bold text-sm text-gray-800 leading-tight">{stud.name}</div>
                            <div className="text-[10px] text-ncc-sky font-semibold uppercase tracking-wider mt-0.5">{stud.rank}</div>
                          </div>
                        </div>
                        {stud.autoPermission ? (
                          <div className="flex-1 bg-blue-50/50 border border-blue-200 text-blue-700 px-4 py-2.5 rounded-lg text-xs font-bold flex items-center justify-center gap-2">
                            <i className="fas fa-file-signature text-sm"></i>
                            <span>Approved Leave ({stud.permissionType})</span>
                          </div>
                        ) : (
                          <div className="flex-1 grid grid-cols-4 gap-1.5">
                            {['Present', 'Absent', 'Late', 'Permission'].map(status => {
                              const isActive = attendanceMarks[stud.id] === status;
                              const btnColor = status === 'Present' ? 'bg-green-600 text-white border-green-600 shadow-sm shadow-green-600/10' :
                                               status === 'Absent' ? 'bg-red-600 text-white border-red-600 shadow-sm shadow-red-600/10' :
                                               status === 'Late' ? 'bg-amber-500 text-white border-amber-500 shadow-sm shadow-amber-500/10' :
                                               'bg-blue-600 text-white border-blue-600 shadow-sm shadow-blue-600/10';
                              return (
                                <button
                                  key={status}
                                  onClick={() => setAttendanceMarks(prev => ({ ...prev, [stud.id]: status }))}
                                  className={`py-2 rounded-lg text-xs font-bold border transition-all ${
                                    isActive ? btnColor : 'bg-white text-gray-500 border-gray-200 hover:bg-slate-50'
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
            <div className="bg-white p-5 border-t border-gray-100 flex justify-end gap-3 shadow-lg z-10">
              <button onClick={() => setShowRegister(false)} className="px-6 py-2.5 rounded-lg border border-gray-200 bg-white hover:bg-gray-50 font-semibold text-gray-500 transition-colors text-sm">Cancel</button>
              <button onClick={() => setConfirmStep(1)} className="px-8 py-2.5 rounded-lg bg-ncc-navy hover:bg-ncc-navy/90 text-white font-semibold shadow-lg shadow-ncc-navy/20 transition-all text-sm">Review Submission</button>
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
    <div className="min-h-screen bg-slate-50 flex font-body">
      
      {/* ── SIDEBAR NAVIGATION ── */}
      <aside className="w-72 bg-gradient-to-b from-ncc-navy to-[#051122] text-white fixed h-full hidden md:flex flex-col border-r border-white/5">
        {/* Brand Header */}
        <div className="p-8 border-b border-white/5 relative">
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-ncc-red via-ncc-gold to-ncc-sky"></div>
          <div className="flex items-center gap-3">
            <img src="/assets/images/ncc_logo.png" alt="NCC" className="h-10 animate-float" />
            <div>
              <h2 className="font-heading text-2xl font-bold tracking-tight leading-none">SASTRA NCC</h2>
              <p className="text-[10px] text-ncc-sky font-bold tracking-[0.2em] uppercase mt-1">Cadet Portal</p>
            </div>
          </div>
        </div>

        {/* Navigation Links */}
        <nav className="p-4 space-y-1.5 flex-grow">
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
              </button>
            );
          })}
          {isManager && (
            <button
              onClick={() => setActiveTab('approvals')}
              className={`w-full text-left px-5 py-3 rounded-xl transition-all flex items-center gap-3.5 font-semibold text-sm relative mt-4 pt-4 border-t border-white/5 ${
                activeTab === 'approvals'
                  ? 'bg-ncc-red text-white shadow-lg shadow-ncc-red/15'
                  : 'text-gray-400 hover:bg-white/5 hover:text-white'
              }`}
            >
              {activeTab === 'approvals' && <div className="absolute left-0 top-3 bottom-3 w-1 bg-white rounded-r-md"></div>}
              <i className="fas fa-check-double w-5 text-center text-sm text-green-400"></i>
              <span>Approvals</span>
              {pendingRequests.length > 0 && (
                <span className="text-[10px] bg-ncc-red border border-white/20 px-2 py-0.5 rounded-full ml-auto font-bold animate-pulse">
                  {pendingRequests.length}
                </span>
              )}
            </button>
          )}
        </nav>

        {/* User Profile Footer */}
        <div className="p-6 bg-black/20 border-t border-white/5">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-xl bg-ncc-gold/15 text-ncc-gold flex items-center justify-center font-bold text-lg border border-ncc-gold/20 shadow-inner">
              {user.name.charAt(0)}
            </div>
            <div className="overflow-hidden">
              <div className="text-white font-bold text-sm leading-tight truncate">{user.name}</div>
              <div className="text-ncc-sky text-[9px] font-bold uppercase tracking-wider mt-0.5">{user.rank}</div>
              <div className="text-gray-500 text-[9px] mt-0.5">{getYearLabel(user.batchYear)} • Batch {user.batchYear}</div>
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

      {/* ── MAIN CONTENT AREA ── */}
      <main className="md:ml-72 w-full p-8 md:p-12 overflow-x-hidden min-h-screen flex flex-col">
        {message && (
          <div className="fixed top-5 right-5 bg-emerald-50 border border-emerald-200 text-emerald-800 px-4 py-3.5 rounded-xl z-50 animate-fade-in shadow-xl flex items-center gap-3">
            <i className="fas fa-check-circle text-emerald-600 text-lg"></i>
            <span className="text-sm font-semibold">{message}</span>
            <button onClick={() => setMessage('')} className="ml-4 text-emerald-400 hover:text-emerald-600 transition-colors">
              <i className="fas fa-times"></i>
            </button>
          </div>
        )}

        {/* Sticky Top Header */}
        <header className="flex justify-between items-center mb-8 pb-6 border-b border-gray-200/60">
          <div>
            <h1 className="text-3xl font-heading font-bold text-ncc-navy uppercase tracking-wider">{activeTab}</h1>
            <p className="text-gray-400 text-xs mt-1">Manage your NCC activities, logs, and attendance registers</p>
          </div>
          <div className="flex gap-2">
            {isManager && (
              <span className="bg-amber-50 text-amber-800 border border-amber-200 px-4 py-1.5 rounded-full font-bold text-[10px] uppercase tracking-wider shadow-sm flex items-center gap-1.5">
                <i className="fas fa-shield-alt"></i> Permission Manager
              </span>
            )}
            {isRankHolder && (
              <span className="bg-gradient-to-r from-ncc-gold to-yellow-600 text-white px-4 py-1.5 rounded-full font-bold text-[10px] uppercase tracking-wider shadow-md flex items-center gap-1.5">
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
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              
              <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm relative overflow-hidden group">
                <div className="absolute top-0 left-0 bottom-0 w-1.5 bg-ncc-navy"></div>
                <h3 className="text-gray-400 text-xs font-bold uppercase tracking-wider">Personal Attendance</h3>
                <div className="flex items-baseline gap-2 mt-3">
                  <span className="text-4xl font-heading font-bold text-gray-800">
                    {attPct(attMyRecords) !== null ? `${attPct(attMyRecords)}%` : '100%'}
                  </span>
                </div>
                <div className="w-full bg-gray-100 h-1.5 mt-5 rounded-full overflow-hidden">
                  <div 
                    className="bg-ncc-navy h-full rounded-full transition-all duration-500"
                    style={{ width: `${attPct(attMyRecords) !== null ? attPct(attMyRecords) : 100}%` }}
                  ></div>
                </div>
              </div>

              <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm relative overflow-hidden group">
                <div className="absolute top-0 left-0 bottom-0 w-1.5 bg-ncc-red"></div>
                <h3 className="text-gray-400 text-xs font-bold uppercase tracking-wider">Pending Permissions</h3>
                <div className="text-4xl font-heading font-bold text-gray-800 mt-3">
                  {data.permissions.filter(p => p.cadetId === user.id && p.status.includes('PENDING')).length}
                </div>
              </div>

              <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm relative overflow-hidden group">
                <div className="absolute top-0 left-0 bottom-0 w-1.5 bg-ncc-gold"></div>
                <h3 className="text-gray-400 text-xs font-bold uppercase tracking-wider">Total Achievements</h3>
                <div className="text-4xl font-heading font-bold text-gray-800 mt-3">
                  {data.achievements.filter(a => a.cadetId === user.id).length}
                </div>
              </div>

            </div>

            {/* SUO Call to Action */}
            {isSUO && pendingRequests.length > 0 && (
              <div className="bg-indigo-50 border border-indigo-100 p-6 rounded-2xl flex justify-between items-center animate-fade-in shadow-sm">
                <div>
                  <h3 className="text-indigo-950 font-bold mb-1 text-sm md:text-base flex items-center gap-2">
                    <i className="fas fa-info-circle text-indigo-600"></i> Review Required
                  </h3>
                  <p className="text-indigo-700/80 text-xs md:text-sm">You have {pendingRequests.length} cadet permission requests waiting for your endorsement.</p>
                </div>
                <button onClick={() => setActiveTab('approvals')} className="bg-indigo-600 text-white px-6 py-2.5 rounded-xl font-bold text-xs shadow hover:bg-indigo-700 transition-colors uppercase tracking-wider">
                  Review
                </button>
              </div>
            )}

            {/* Upcoming Event Hero card */}
            {upcomingEvent ? (
              <div className="bg-white border border-gray-200/70 text-gray-800 p-8 rounded-2xl shadow-sm flex flex-col md:flex-row justify-between items-center gap-6 relative overflow-hidden group hover:border-ncc-red/30 transition-all duration-300">
                <div className="absolute top-0 left-0 right-0 h-1.5 bg-ncc-red"></div>
                <div className="z-10">
                  <div className="flex items-center gap-2 mb-3">
                    <span className="bg-red-100 text-ncc-red px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider">Upcoming</span>
                    <span className="text-gray-400 text-[10px] font-bold uppercase tracking-widest">Mandatory Attendance</span>
                  </div>
                  <h2 className="text-3xl font-heading font-bold text-ncc-navy leading-none">{upcomingEvent.title}</h2>
                  <div className="flex gap-5 mt-4 text-xs font-semibold text-gray-500">
                    <span className="flex items-center gap-1.5">
                      <i className="far fa-calendar text-ncc-red"></i> 
                      {new Date(upcomingEvent.date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                    </span>
                    <span className="flex items-center gap-1.5">
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
                  <button onClick={() => setActiveTab('schedule')} className="px-6 py-3 bg-slate-50 border border-slate-200 hover:bg-slate-100 text-gray-700 font-heading font-bold rounded-xl transition-all text-xs uppercase tracking-wider">
                    Schedule
                  </button>
                </div>
              </div>
            ) : (
              <div className="bg-white border border-gray-200/70 text-gray-800 p-8 rounded-2xl shadow-sm flex flex-col md:flex-row justify-between items-center gap-6 relative overflow-hidden group transition-all duration-300">
                <div className="absolute top-0 left-0 right-0 h-1.5 bg-gray-300"></div>
                <div className="z-10">
                  <div className="flex items-center gap-2 mb-3">
                    <span className="bg-gray-100 text-gray-500 px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider">No Upcoming Events</span>
                  </div>
                  <h2 className="text-2xl font-heading font-bold text-gray-400 leading-none">No training events scheduled currently</h2>
                </div>
                <div className="flex gap-3 z-10">
                  <button onClick={() => setActiveTab('schedule')} className="px-6 py-3 bg-slate-50 border border-slate-200 hover:bg-slate-100 text-gray-700 font-heading font-bold rounded-xl transition-all text-xs uppercase tracking-wider">
                    View Schedule
                  </button>
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {/* News Feed Widget */}
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 overflow-hidden">
                <ArmyNewsFeed />
              </div>
              {/* Achievements widget or general info */}
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 flex flex-col justify-center text-center">
                <div className="w-16 h-16 bg-ncc-navy/5 text-ncc-navy border border-ncc-navy/10 rounded-full flex items-center justify-center text-2xl mx-auto mb-4 animate-float">
                  <i className="fas fa-shield-halved"></i>
                </div>
                <h3 className="font-heading text-lg font-bold text-ncc-navy uppercase">Unity and Discipline</h3>
                <p className="text-gray-400 text-xs max-w-sm mx-auto mt-2 leading-relaxed">Ensure you mark your attendance registers on time and submit achievements for verification to Captain ANO Officer.</p>
              </div>
            </div>
          </div>
        )}

        {/* 2. APPROVALS TAB */}
        {activeTab === 'approvals' && isManager && (
          <div className="animate-fade-in space-y-8 flex-grow">
            <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
              <h2 className="font-heading text-lg font-bold text-ncc-navy uppercase">Cadet Request Registry</h2>
              <p className="text-gray-400 text-xs mt-0.5">Approve, reject, or forward permission requests for review.</p>
            </div>
            <div className="space-y-4">
              <h3 className="font-heading text-xs font-bold text-gray-400 uppercase tracking-widest border-b pb-2">Pending Endorsements ({pendingRequests.length})</h3>
              {pendingRequests.map(p => (
                <div key={p.id} className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm flex flex-col gap-4">
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="font-heading text-lg font-bold text-ncc-navy leading-none">{p.cadetName}</h3>
                      <div className="text-xs text-gray-500 mt-2 flex items-center gap-2">
                        <span className="bg-slate-100 border border-slate-200/50 px-2.5 py-1 rounded-md text-[10px] font-mono"><i className="far fa-calendar-alt mr-1 text-ncc-red"></i> {p.startDate} to {p.endDate}</span>
                      </div>
                    </div>
                    {p.evidenceUrl && (
                      <a href={p.evidenceUrl} target="_blank" rel="noopener noreferrer" className="bg-blue-50 text-blue-600 px-3.5 py-2 rounded-xl text-xs font-bold hover:bg-blue-100 border border-blue-200 transition-colors flex items-center gap-1.5">
                        <i className="fas fa-paperclip"></i> View Evidence
                      </a>
                    )}
                  </div>
                  <div className="bg-slate-50 border border-slate-100 p-4 rounded-xl text-gray-700 text-sm">
                    <strong className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Reason for Leave</strong>
                    {p.reason}
                  </div>
                  <form className="flex flex-col md:flex-row gap-3 items-stretch md:items-end border-t border-gray-50 pt-4 mt-2">
                    <div className="flex-1">
                      <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1.5 block">Review Comments</label>
                      <input id={`comment-${p.id}`} name="comment" className="military-input" placeholder="e.g. Verified medical certificate. Recommended." required />
                    </div>
                    <div className="flex gap-2">
                      <button type="button" onClick={() => {
                        const input = document.getElementById(`comment-${p.id}`) as HTMLInputElement;
                        if (!input.value) { alert('Please add a comment'); return; }
                        handleSuoAction(p.id, 'FORWARD', input.value);
                      }} className="bg-green-600 text-white px-5 py-3 rounded-lg font-heading font-bold text-xs uppercase tracking-wider hover:bg-green-700 transition-colors shadow-lg shadow-green-600/10 flex items-center gap-1.5">
                        <i className="fas fa-check"></i> Forward
                      </button>
                      <button type="button" onClick={() => {
                        const input = document.getElementById(`comment-${p.id}`) as HTMLInputElement;
                        if (!input.value) { alert('Please add a comment'); return; }
                        handleSuoAction(p.id, 'REJECT', input.value);
                      }} className="bg-red-50 text-red-600 border border-red-200 px-5 py-3 rounded-lg font-heading font-bold text-xs uppercase tracking-wider hover:bg-red-100 transition-colors flex items-center gap-1.5">
                        <i className="fas fa-times"></i> Reject
                      </button>
                    </div>
                  </form>
                </div>
              ))}
              {pendingRequests.length === 0 && (
                <div className="text-center py-12 bg-white rounded-2xl border border-dashed border-gray-200 text-gray-400 text-sm">
                  <i className="fas fa-check-circle text-2xl mb-2 block opacity-30"></i>
                  No new requests pending your endorsement.
                </div>
              )}
            </div>
            
            <div className="space-y-4 pt-4">
              <h3 className="font-heading text-xs font-bold text-gray-400 uppercase tracking-widest border-b pb-2">History</h3>
              <div className="space-y-3">
                {pastApprovals.map(p => (
                  <div key={p.id} className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm">
                    <div className="flex justify-between items-start gap-4">
                      <div className="space-y-2 flex-grow">
                        <div className="font-bold text-gray-800 text-sm leading-snug">{p.reason}</div>
                        <div className="text-[10px] text-gray-400 font-mono">{p.startDate} to {p.endDate}</div>

                        {p.suoComment && (
                          <div className="text-[10px] bg-slate-50 p-2.5 rounded-lg border border-slate-100 mt-2">
                            <strong className="text-gray-500 block mb-0.5">SUO Comment:</strong> {p.suoComment}
                          </div>
                        )}
                        {p.anoComment && (
                          <div className="text-[10px] bg-slate-50 p-2.5 rounded-lg border border-slate-100 mt-1">
                            <strong className="text-gray-500 block mb-0.5">ANO Comment:</strong> {p.anoComment}
                          </div>
                        )}
                        
                        {p.status === 'MEET_ANO' && (
                          <div className="bg-amber-50 border-l-4 border-amber-500 p-3 text-amber-800 text-xs rounded-r-md mt-3 flex items-start gap-2 shadow-inner">
                            <i className="fas fa-exclamation-triangle text-amber-600 mt-0.5"></i>
                            <div>
                              <div className="font-bold">ANO Action Required</div>
                              <p className="mt-0.5 opacity-90">Please report to the ANO office in person regarding this request.</p>
                            </div>
                          </div>
                        )}
                      </div>
                      <div className="flex flex-col items-end gap-2 flex-shrink-0">
                        <span className={`badge-status ${
                          p.status === 'APPROVED' ? 'badge-approved' :
                          p.status.includes('REJECTED') || p.status.includes('DECLINED') ? 'badge-rejected' :
                          p.status === 'MEET_ANO' ? 'bg-amber-50 text-amber-700 border-amber-200' :
                          'badge-forwarded'
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
              <div className="bg-gradient-to-r from-amber-50 to-orange-50/50 border border-amber-200/60 p-6 rounded-2xl flex items-center justify-between shadow-sm">
                <div>
                  <h3 className="font-heading text-sm font-bold text-amber-900 flex items-center gap-2">
                    <i className="fas fa-clipboard-check"></i> Attendance marking authorized
                  </h3>
                  <p className="text-xs text-amber-700/80 mt-1">Submit the bulk attendance register for cadets from your rank dashboard.</p>
                </div>
                <button onClick={() => launchRegister()} className="bg-amber-600 text-white px-6 py-2.5 rounded-xl font-heading font-bold text-xs uppercase tracking-wider hover:bg-amber-700 shadow shadow-amber-600/10 transition-all">
                  Launch Register
                </button>
              </div>
            )}
          </div>
        )}

        {/* 4. PERMISSIONS TAB */}
        {activeTab === 'permissions' && (
          <div className="grid md:grid-cols-2 gap-8 animate-fade-in flex-grow">
            
            {/* Form */}
            <div className="bg-white p-8 rounded-2xl border border-gray-100 shadow-sm h-fit">
              <h3 className="font-heading text-lg font-bold text-ncc-navy uppercase mb-6 border-b border-gray-50 pb-4">New Leave Request</h3>
              <form action={async (fd) => { fd.append('cadetId', user.id); fd.append('cadetName', `${user.rank} ${user.name}`); await submitPermission(fd); setMessage('Permission Submitted Successfully!'); setLeavePrefill(null); refreshData(); }} className="space-y-5">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] font-bold uppercase text-gray-400 mb-1.5 tracking-wider">From Date</label>
                    <input 
                      name="startDate" 
                      type="date" 
                      className="military-input" 
                      defaultValue={leavePrefill?.startDate || ''} 
                      key={leavePrefill ? `prefill-start-${leavePrefill.startDate}` : 'normal-start'} 
                      required 
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold uppercase text-gray-400 mb-1.5 tracking-wider">To Date</label>
                    <input 
                      name="endDate" 
                      type="date" 
                      className="military-input" 
                      defaultValue={leavePrefill?.endDate || ''} 
                      key={leavePrefill ? `prefill-end-${leavePrefill.endDate}` : 'normal-end'} 
                      required 
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-[10px] font-bold uppercase text-gray-400 mb-1.5 tracking-wider">Reason Detailed</label>
                  <textarea 
                    name="reason" 
                    className="military-input h-32 py-2" 
                    defaultValue={leavePrefill?.reason || ''} 
                    key={leavePrefill ? `prefill-reason-${leavePrefill.reason}` : 'normal-reason'} 
                    placeholder="Provide detailed explanation..." 
                    required
                  ></textarea>
                </div>
                <div>
                  <label className="block text-[10px] font-bold uppercase text-gray-400 mb-1.5 tracking-wider">Evidence Document (Optional)</label>
                  <input type="file" name="evidence" className="w-full text-xs text-gray-400 file:mr-4 file:py-2.5 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-ncc-navy/5 file:text-ncc-navy hover:file:bg-ncc-navy/10 file:transition-all cursor-pointer" />
                </div>
                <button className="w-full bg-ncc-navy hover:bg-ncc-navy/90 text-white py-3.5 rounded-xl font-heading font-bold text-xs uppercase tracking-widest shadow-lg shadow-ncc-navy/10 transition-all">
                  Submit Request
                </button>
              </form>
            </div>

            {/* History */}
            <div className="space-y-4">
              <h3 className="font-heading text-xs font-bold text-gray-400 uppercase tracking-widest border-b pb-2">My Request History</h3>
              <div className="space-y-3">
                {data.permissions.filter(p => p.cadetId === user.id).map(p => (
                  <div key={p.id} className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm">
                    <div className="flex justify-between items-start gap-4">
                      <div className="space-y-2 flex-grow">
                        <div className="font-bold text-gray-800 text-sm leading-snug">{p.reason}</div>
                        <div className="text-[10px] text-gray-400 font-mono">{p.startDate} to {p.endDate}</div>

                        {p.suoComment && (
                          <div className="text-[10px] bg-slate-50 p-2.5 rounded-lg border border-slate-100 mt-2">
                            <strong className="text-gray-500 block mb-0.5">SUO Comment:</strong> {p.suoComment}
                          </div>
                        )}
                        {p.anoComment && (
                          <div className="text-[10px] bg-slate-50 p-2.5 rounded-lg border border-slate-100 mt-1">
                            <strong className="text-gray-500 block mb-0.5">ANO Comment:</strong> {p.anoComment}
                          </div>
                        )}

                        {p.status === 'MEET_ANO' && (
                          <div className="bg-amber-50 border-l-4 border-amber-500 p-3 text-amber-800 text-xs rounded-r-md mt-3 flex items-start gap-2 shadow-inner animate-pulse">
                            <i className="fas fa-exclamation-triangle text-amber-600 mt-0.5"></i>
                            <div>
                              <div className="font-bold">ANO Action Required</div>
                              <p className="mt-0.5 opacity-90">Please report to the ANO office in person regarding this request.</p>
                            </div>
                          </div>
                        )}
                      </div>

                      <div className="flex flex-col items-end gap-2 flex-shrink-0">
                        <span className={`badge-status ${
                          p.status === 'APPROVED' ? 'badge-approved' :
                          p.status.includes('REJECTED') || p.status.includes('DECLINED') ? 'badge-rejected' :
                          p.status === 'MEET_ANO' ? 'bg-amber-50 text-amber-700 border-amber-200' :
                          'badge-pending'
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
                            <button className="text-[10px] text-red-500 hover:text-red-700 underline font-semibold transition-colors">
                              Withdraw
                            </button>
                          </form>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
                {data.permissions.filter(p => p.cadetId === user.id).length === 0 && (
                  <div className="text-center text-gray-400 py-12 bg-white rounded-2xl border border-dashed border-gray-200 text-sm">
                    No request history found.
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* 5. ACHIEVEMENTS TAB */}
        {activeTab === 'achievements' && (
          <div className="grid md:grid-cols-3 gap-8 animate-fade-in flex-grow">
            
            {/* List */}
            <div className="md:col-span-2 space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {data.achievements.filter(a => a.cadetId === user.id).map(ach => (
                  <div key={ach.id} className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm relative group hover:shadow-md transition-shadow">
                    {(ach.status === 'DRAFT' || ach.status === 'REJECTED') && (
                      <button
                        onClick={() => { setEditingAch(ach); setAchCategory(ach.category); }}
                        className="absolute top-3 right-3 text-gray-400 hover:text-ncc-navy bg-slate-50 border border-gray-100 p-2 rounded-xl shadow-sm hidden group-hover:block transition-all"
                      >
                        <i className="fas fa-edit text-xs"></i>
                      </button>
                    )}

                    {/* Status Badge */}
                    <div className="mb-3">
                      {(!ach.status || ach.status === 'DRAFT') && <span className="badge-status badge-draft">Draft</span>}
                      {ach.status === 'PENDING' && <span className="badge-status badge-pending">Pending Verification</span>}
                      {ach.status === 'VERIFIED' && <span className="badge-status badge-approved"><i className="fas fa-check-circle mr-1"></i>Verified</span>}
                      {ach.status === 'REJECTED' && <span className="badge-status badge-rejected"><i className="fas fa-times-circle mr-1"></i>Rejected</span>}
                    </div>

                    <h4 className="font-heading text-lg font-bold text-gray-800 mb-1 leading-snug">{ach.title}</h4>
                    {ach.location && (
                      <div className="text-xs text-gray-400 font-semibold mb-2 flex items-center gap-1">
                        <i className="fas fa-map-marker-alt text-ncc-red"></i> {ach.location}
                      </div>
                    )}
                    <p className="text-[10px] text-gray-400 font-mono mb-4">{ach.date} {ach.endDate && `to ${ach.endDate}`}</p>

                    {/* Submit Button */}
                    {(ach.status === 'DRAFT' || ach.status === 'REJECTED' || !ach.status) && (
                      <form action={async (fd) => {
                        if (confirm('Submit this achievement for verification? You will strictly NOT be able to edit it once submitted.')) {
                          fd.append('id', ach.id);
                          await submitAchievementForVerification(fd);
                          setMessage('Achievement Submitted for Verification');
                          refreshData();
                        }
                      }}>
                        <button className="w-full text-center bg-ncc-navy/5 hover:bg-ncc-navy/10 text-ncc-navy border border-ncc-navy/10 py-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5">
                          <i className="fas fa-paper-plane"></i> Submit for verification
                        </button>
                      </form>
                    )}
                    {ach.anoComment && ach.status === 'REJECTED' && (
                      <div className="mt-3 text-[10px] text-red-600 bg-red-50 p-2.5 rounded-lg border border-red-100">
                        <strong>ANO Feedback:</strong> {ach.anoComment}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Form */}
            <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm h-fit">
              <div className="flex justify-between items-center mb-6 border-b border-gray-50 pb-4">
                <h3 className="font-heading text-lg font-bold text-ncc-navy uppercase">{editingAch ? 'Edit Achievement' : 'Add Achievement'}</h3>
                {editingAch && (
                  <button onClick={() => setEditingAch(null)} className="text-xs text-gray-400 hover:text-red-500 font-semibold transition-colors">
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
                refreshData();
              }} className="space-y-4">

                <div>
                  <label className="text-[10px] font-bold uppercase text-gray-400 mb-1.5 block tracking-wider">Title / Honor</label>
                  <input name="title" defaultValue={editingAch?.title} className="military-input" placeholder="e.g. Best Shooter Award" required />
                </div>

                <div>
                  <label className="text-[10px] font-bold uppercase text-gray-400 mb-1.5 block tracking-wider">Category</label>
                  <select name="category" className="military-input py-2.5" onChange={(e) => setAchCategory(e.target.value)} value={achCategory}>
                    <option value="Camp">Camp / Drill</option>
                    <option value="Sports">Sports / Firing</option>
                    <option value="Cultural">Cultural / NI</option>
                  </select>
                </div>

                <div>
                  <label className="text-[10px] font-bold uppercase text-gray-400 mb-1.5 block tracking-wider">Location / Venue</label>
                  <input name="location" defaultValue={editingAch?.location} className="military-input" placeholder="e.g. Perambalur, Trichy, New Delhi" />
                </div>

                {achCategory === 'Camp' ? (
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-[10px] font-bold uppercase text-gray-400 mb-1.5 block tracking-wider">Start Date</label>
                      <input name="date" type="date" defaultValue={editingAch?.date} className="military-input" required />
                    </div>
                    <div>
                      <label className="text-[10px] font-bold uppercase text-gray-400 mb-1.5 block tracking-wider">End Date</label>
                      <input name="endDate" type="date" defaultValue={editingAch?.endDate} className="military-input" required />
                    </div>
                  </div>
                ) : (
                  <div>
                    <label className="text-[10px] font-bold uppercase text-gray-400 mb-1.5 block tracking-wider">Date</label>
                    <input name="date" type="date" defaultValue={editingAch?.date} className="military-input" required />
                  </div>
                )}

                <div>
                  <label className="text-[10px] font-bold uppercase text-gray-400 mb-1.5 block tracking-wider">Detailed Description</label>
                  <textarea name="description" defaultValue={editingAch?.description} className="military-input h-24 py-2" placeholder="Provide extra description about this achievement..." required></textarea>
                </div>

                <div className="flex gap-2 pt-2">
                  <button className="w-full bg-ncc-navy hover:bg-ncc-navy/90 text-white py-3 rounded-xl font-heading font-bold text-xs uppercase tracking-wider shadow-lg shadow-ncc-navy/10 transition-all">
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
                    }} className="px-4 py-3 bg-red-50 text-red-600 rounded-xl font-bold text-sm hover:bg-red-100 border border-red-200 transition-colors">
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
          <div className="space-y-8 animate-fade-in flex-grow">
            {/* Summary counters */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
              {[
                { label: 'Parades', val: attPct(attParades),    total: attParades.length,   color: 'bg-ncc-red' },
                { label: 'Events & Camps',  val: attPct(attEvents),     total: attEvents.length,    color: 'bg-ncc-sky' },
                { label: 'Others (Theory)',  val: attPct(attOthers),     total: attOthers.length,    color: 'bg-ncc-gold' },
              ].map(({ label, val, total, color }) => (
                <div key={label} className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm relative overflow-hidden group">
                  <div className={`absolute top-0 left-0 bottom-0 w-1.5 ${color}`}></div>
                  <div className="text-xs font-bold uppercase text-gray-400 tracking-wider">{label}</div>
                  {total === 0 ? (
                    <div className="text-2xl font-bold text-gray-300 mt-3">—</div>
                  ) : (
                    <>
                      <div className={`text-3xl font-heading font-bold mt-3 ${(val ?? 0) >= 75 ? 'text-green-600' : (val ?? 0) >= 50 ? 'text-amber-500' : 'text-red-600'}`}>
                        {val}%
                      </div>
                      <div className="w-full bg-gray-100 h-1.5 rounded-full mt-4 overflow-hidden">
                        <div className={`h-full rounded-full ${(val ?? 0) >= 75 ? 'bg-green-500' : (val ?? 0) >= 50 ? 'bg-amber-400' : 'bg-red-500'}`}
                          style={{ width: `${val}%` }} />
                      </div>
                      <div className="text-[10px] text-gray-400 mt-2 font-semibold uppercase tracking-wider">{total} session{total !== 1 ? 's' : ''} logged</div>
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
                  onClick={() => setAttFilter(key)}
                  className={`px-4 py-2 rounded-xl text-xs font-heading font-bold uppercase tracking-wider border transition-all ${
                    attFilter === key 
                      ? 'bg-ncc-navy text-white border-ncc-navy shadow-sm' 
                      : 'bg-white text-gray-500 border-gray-200 hover:border-ncc-navy hover:text-ncc-navy'
                  }`}
                >
                  {label}
                  <span className={`ml-2 text-[9px] px-1.5 py-0.5 rounded-full font-bold ${attFilter === key ? 'bg-white/20 text-white' : 'bg-gray-100 text-gray-400'}`}>{count}</span>
                </button>
              ))}
            </div>

            {/* Grid Table */}
            {attFiltered.length === 0 ? (
              <div className="text-center py-16 bg-white rounded-2xl border border-dashed border-gray-200 text-gray-400">
                <i className="fas fa-calendar-times text-4xl mb-3 block opacity-30"></i>
                No attendance logs found for this category.
              </div>
            ) : (
              <div className="bg-white rounded-2xl shadow-sm overflow-hidden border border-gray-100">
                <table className="w-full text-sm border-collapse">
                  <thead className="bg-slate-50 border-b border-gray-100 text-[10px] font-bold text-gray-400 uppercase tracking-widest text-left">
                    <tr>
                      <th className="px-6 py-4">Date</th>
                      <th className="px-6 py-4">Activity Title</th>
                      <th className="px-6 py-4 hidden md:table-cell">Type</th>
                      <th className="px-6 py-4 hidden md:table-cell">Time Slot</th>
                      <th className="px-6 py-4 text-center">Mark</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {attFiltered.map((r, i) => {
                      const ev = r.event!;
                      const [h] = ev.startTime.split(':').map(Number);
                      const session = ev.type === 'Parade' ? (h < 12 ? 'Morning' : 'Evening') : null;
                      const statusStyle: Record<string, string> = { Present: 'bg-green-50 text-green-700 border-green-200', Late: 'bg-amber-50 text-amber-700 border-amber-200', Permission: 'bg-blue-50 text-blue-700 border-blue-200', Absent: 'bg-red-50 text-red-700 border-red-200' };
                      const statusIcon: Record<string, string>  = { Present: 'fa-check-circle', Late: 'fa-clock', Permission: 'fa-file-signature', Absent: 'fa-times-circle' };
                      return (
                        <tr key={i} className="hover:bg-slate-50/50 transition-colors">
                          <td className="px-6 py-4 font-mono text-xs text-gray-500 whitespace-nowrap">
                            {new Date(ev.date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                          </td>
                          <td className="px-6 py-4">
                            <div className="font-bold text-gray-800 leading-tight">{ev.title}</div>
                            <div className="text-[10px] text-gray-400 mt-0.5">{ev.location}</div>
                          </td>
                          <td className="px-6 py-4 hidden md:table-cell">
                            <span className={`text-[9px] font-bold px-2.5 py-1 rounded-lg uppercase tracking-wider ${
                              ev.type === 'Parade' ? 'bg-red-50 text-red-600 border border-red-100' :
                              ev.type === 'Event' ? 'bg-purple-50 text-purple-600 border border-purple-100' :
                              ev.type === 'Camp' ? 'bg-indigo-50 text-indigo-600 border border-indigo-100' :
                              'bg-slate-50 text-slate-600 border border-slate-100'
                            }`}>
                              {ev.type}
                            </span>
                          </td>
                          <td className="px-6 py-4 hidden md:table-cell text-xs text-gray-500 font-medium">
                            {session ? (
                              <span className={`flex items-center gap-1.5 font-bold ${session === 'Morning' ? 'text-orange-500' : 'text-indigo-500'}`}>
                                <i className={`fas fa-${session === 'Morning' ? 'sun' : 'moon'} text-[10px]`}></i> {session}
                              </span>
                            ) : <span>{ev.startTime} – {ev.endTime}</span>}
                          </td>
                          <td className="px-6 py-4 text-center">
                            <span className={`badge-status ${statusStyle[r.status] || 'bg-slate-100 text-slate-600'}`}>
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
            <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm animate-fade-in">
              <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl overflow-hidden border border-gray-100 relative">
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

                    {/* Countdown / Current state */}
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-slate-50 flex items-center justify-center text-slate-500">
                        <i className="fas fa-hourglass-half"></i>
                      </div>
                      <div>
                        <div className="font-bold text-gray-700">Status</div>
                        <div className="text-xs text-gray-500 flex items-center gap-1.5">
                          <span className={`w-2 h-2 rounded-full ${countdownText === 'Ongoing' ? 'bg-green-500 animate-pulse' : countdownText === 'Completed' ? 'bg-gray-400' : 'bg-blue-500'}`}></span>
                          {countdownText}
                        </div>
                      </div>
                    </div>

                    {/* Attendance Card */}
                    <div className="border border-slate-100 rounded-xl p-4 bg-slate-50/50">
                      <div className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-2">My Attendance</div>
                      {attRecord ? (
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-gray-700">Marked Status:</span>
                          <span className={`inline-flex items-center gap-1.5 text-xs font-bold px-2.5 py-1 rounded-full ${
                            attRecord.status === 'Present' ? 'bg-green-100 text-green-800' :
                            attRecord.status === 'Absent' ? 'bg-red-100 text-red-800' :
                            'bg-amber-100 text-amber-800'
                          }`}>
                            <i className={`fas ${attRecord.status === 'Present' ? 'fa-check-circle' : 'fa-times-circle'}`}></i>
                            {attRecord.status}
                          </span>
                        </div>
                      ) : approvedLeave ? (
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-gray-700">Duty Leave:</span>
                          <span className="inline-flex items-center gap-1.5 text-xs font-bold px-2.5 py-1 rounded-full bg-blue-100 text-blue-800">
                            <i className="fas fa-check-circle"></i>
                            Approved Leave
                          </span>
                        </div>
                      ) : (
                        <div className="text-xs text-gray-500 italic">No attendance record logged for this event.</div>
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

                    {/* Apply leave if event is upcoming and not already leave-approved */}
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
                        }}
                        className="flex-[2] bg-ncc-navy hover:bg-ncc-navy/90 text-white font-heading font-bold rounded-xl transition-all py-3 text-xs uppercase tracking-widest text-center flex items-center justify-center gap-1.5"
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
