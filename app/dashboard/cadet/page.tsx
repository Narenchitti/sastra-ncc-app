'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { getDashboardData, submitPermission, submitAchievement, deleteAchievement, submitAchievementForVerification, getAttendanceSheet, submitBulkAttendance, updatePermissionStatus, deletePermission } from '@/app/actions';
import { User, Event, Permission, Achievement } from '@/lib/db';
import ArmyNewsFeed from '@/components/ArmyNewsFeed';

export default function CadetDashboard() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [activeTab, setActiveTab] = useState('home');
  const [data, setData] = useState<{ events: Event[], permissions: Permission[], achievements: Achievement[] }>({ events: [], permissions: [], achievements: [] });
  const [message, setMessage] = useState('');

  // Achievement State
  const [achCategory, setAchCategory] = useState<string>('Camp');
  const [editingAch, setEditingAch] = useState<Achievement | null>(null);

  // Attendance Register State
  const [showRegister, setShowRegister] = useState(false);
  const [registerEvent, setRegisterEvent] = useState<Event | null>(null);
  const [sheetData, setSheetData] = useState<any[]>([]);
  const [attendanceMarks, setAttendanceMarks] = useState<{ [key: string]: string }>({});
  const [confirmStep, setConfirmStep] = useState(0);

  // Time Mocking (Optional: For real logic, use new Date())
  // Use real system time
  const [currentTime, setCurrentTime] = useState<Date | null>(null);

  useEffect(() => {
    // Client-side only time to avoid hydration mismatch
    setCurrentTime(new Date());
    const timer = setInterval(() => setCurrentTime(new Date()), 60000); // Update every min

    const stored = localStorage.getItem('user');
    if (!stored) router.push('/login');
    else {
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
      setMessage(action === 'FORWARD' ? 'Approved by SUO & Forwarded to ANO' : 'Rejected by SUO');
      refreshData();
    }
  }

  // --- ATTENDANCE TIME LOGIC ---
  function isRegisterOpen(event: Event) {
    if (!currentTime) return false;

    const evDate = new Date(event.date);
    const now = currentTime;

    // Check Date
    // Note: event.date is YYYY-MM-DD. We need to compare specific day.
    // We'll construct full Date objects for Start and End
    const startDateTime = new Date(`${event.date}T${event.startTime}`);
    const endDateTime = new Date(`${event.date}T${event.endTime}`);

    // 10 Minutes before start
    const openTime = new Date(startDateTime.getTime() - 10 * 60000);

    // Comparison
    return now >= openTime && now <= endDateTime;
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
    // If no specific event passed, try to find an OPEN one or Next Upcoming
    // Logic: Find first Open event. If none, find next upcoming.
    let ev = targetEvent;

    if (!ev) {
      // Auto-select: First active event
      ev = data.events.find(e => isRegisterOpen(e));
      if (!ev) {
        alert('No Attendance Registers are currently open (10 mins before start).');
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
  const isRankHolder = ['Lance Corporal', 'Corporal', 'Sergeant', 'SUO', 'CUO', 'CSM'].includes(user.rank);
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
    const startDate = new Date('2026-02-01');
    const weekDates = Array.from({ length: 7 }, (_, i) => {
      const d = new Date(startDate);
      d.setDate(startDate.getDate() + i);
      return d;
    });
    const monthName = startDate.toLocaleString('default', { month: 'long', year: 'numeric' });

    return (
      <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
        <div className="flex justify-between items-end mb-6">
          <div>
            <h3 className="font-heading text-2xl font-bold text-gray-800">Weekly Training Schedule</h3>
            <p className="text-ncc-red font-bold uppercase text-xs tracking-widest">{monthName} | Week 1</p>
          </div>
        </div>
        <div className="grid grid-cols-7 gap-px bg-gray-200 border border-gray-200 rounded-lg overflow-hidden">
          {weekDates.map((dateObj, i) => {
            const dateStr = dateObj.toISOString().split('T')[0];
            const dayName = dateObj.toLocaleDateString('default', { weekday: 'short' });
            const dayNum = dateObj.getDate();
            const daysEvents = data.events.filter(e => e.date === dateStr);
            const isToday = dateStr === '2026-02-02';
            return (
              <div key={i} className={`min-h-[140px] bg-white p-3 flex flex-col gap-2 ${isToday ? 'bg-blue-50/50' : ''}`}>
                <div className={`text-center mb-1 ${isToday ? 'text-ncc-red font-bold' : 'text-gray-500'}`}>
                  <span className="block text-xs uppercase opacity-70">{dayName}</span>
                  <span className="text-lg leading-none">{dayNum}</span>
                </div>
                {daysEvents.map(ev => {
                  const status = getRegisterStatus(ev);
                  return (
                    <div key={ev.id} className={`text-[10px] p-2 rounded border-l-2 shadow-sm relative group ${ev.type === 'Parade' ? 'bg-red-50 border-red-500 text-red-700' : 'bg-blue-50 border-blue-500 text-blue-700'}`}>
                      <div className="font-bold truncate">{ev.title}</div>
                      <div className="opacity-75">{ev.startTime} - {ev.endTime}</div>

                      {/* Rank Holder Action on Calendar Item */}
                      {isRankHolder && (
                        <div onClick={(e) => { e.stopPropagation(); launchRegister(ev); }}
                          className={`mt-1 text-center py-1 rounded cursor-pointer font-bold ${status.status === 'open' ? 'bg-green-600 text-white animate-pulse' : 'bg-gray-200 text-gray-500 hover:bg-gray-300'}`}>
                          {status.status === 'open' ? 'Mark Attendance' : 'Closed'}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  if (showRegister && registerEvent) {
    /* ... Register Modal (Same as before) ... */
    const groupedData: { [key: string]: any[] } = { '3rd Year': [], '2nd Year': [], '1st Year': [], 'Others': [] };
    sheetData.forEach(stud => {
      const label = getYearLabel(stud.batchYear);
      groupedData[label] = groupedData[label] || [];
      groupedData[label].push(stud);
    });
    return (
      <div className="fixed inset-0 bg-black/50 z-50 flex flex-col items-center justify-center p-4">
        <div className="bg-white w-full max-w-4xl max-h-[90vh] rounded-xl shadow-2xl flex flex-col overflow-hidden">
          <div className="bg-ncc-navy text-white p-6 flex justify-between items-center">
            <div><h2 className="text-xl font-bold mb-1">Attendance Register</h2><div className="text-sm opacity-80 flex gap-4"><span><i className="far fa-calendar-check mr-2"></i> {registerEvent.title}</span><span><i className="far fa-clock mr-2"></i> {registerEvent.startTime} - {registerEvent.endTime}</span></div></div>
            <button onClick={() => setShowRegister(false)} className="text-white/50 hover:text-white"><i className="fas fa-times text-2xl"></i></button>
          </div>
          <div className="flex-1 overflow-y-auto p-6 bg-gray-50">
            {confirmStep === 1 ? (
              <div className="text-center py-10">
                <i className="fas fa-exclamation-triangle text-4xl text-yellow-500 mb-4"></i>
                <h3 className="text-xl font-bold text-gray-800 mb-2">Confirm Submission?</h3>
                <p className="text-gray-600 mb-8">You are about to submit attendance for {sheetData.length} cadets.</p>
                <div className="flex justify-center gap-4">
                  <button onClick={() => setConfirmStep(0)} className="px-6 py-2 rounded bg-gray-200 hover:bg-gray-300 font-bold text-gray-700">Go Back</button>
                  <button onClick={finalSubmitAttendance} className="px-6 py-2 rounded bg-green-600 hover:bg-green-700 font-bold text-white">Confirm & Submit</button>
                </div>
              </div>
            ) : (
              Object.entries(groupedData).map(([year, students]) => students.length > 0 && (
                <div key={year} className="mb-8">
                  <h3 className="text-sm font-bold uppercase text-gray-500 border-b pb-2 mb-4 sticky top-0 bg-gray-50">{year}</h3>
                  <div className="space-y-2">
                    {students.map(stud => (
                      <div key={stud.id} className="bg-white p-3 rounded shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <div className="flex items-center gap-3 w-48"><div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold font-heading bg-gray-100`}>{stud.name.charAt(0)}</div><div><div className="font-bold text-sm text-gray-800">{stud.name}</div><div className="text-[10px] text-gray-500">{stud.rank}</div></div></div>
                        {stud.autoPermission ? (<div className="flex-1 bg-blue-50 border border-blue-200 text-blue-700 px-4 py-2 rounded text-xs font-bold flex items-center justify-center gap-2"><i className="fas fa-file-signature"></i> Approved Permission ({stud.permissionType})</div>) : (
                          <div className="flex-1 grid grid-cols-4 gap-2">
                            {['Present', 'Absent', 'Late', 'Permission'].map(status => (
                              <button key={status} onClick={() => setAttendanceMarks(prev => ({ ...prev, [stud.id]: status }))} className={`py-1.5 rounded text-xs font-bold border transition-colors ${attendanceMarks[stud.id] === status ? (status === 'Present' ? 'bg-green-600 text-white border-green-600' : 'bg-red-600 text-white border-red-600') : 'bg-white text-gray-500 border-gray-200'}`}>{status}</button>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              ))
            )}
          </div>
          {confirmStep === 0 && <div className="bg-white p-4 border-t flex justify-end gap-4 shadow-up z-10"><button onClick={() => setShowRegister(false)} className="px-6 py-3 rounded font-bold text-gray-500">Cancel</button><button onClick={() => setConfirmStep(1)} className="px-8 py-3 rounded bg-ncc-navy text-white font-bold">Review Submission</button></div>}
        </div>
      </div>
    );
  }

  /* ... Filters ... */
  const pendingRequests = data.permissions.filter(p => p.status === 'PENDING_SUO');
  const pastApprovals = data.permissions.filter(p => !['PENDING_SUO'].includes(p.status) && (p.suoComment || p.status.includes('BY_SUO') || p.status.includes('FORWARDED')));

  return (
    <div className="min-h-screen bg-gray-50 flex">
      <aside className="w-72 bg-ncc-navy text-white fixed h-full hidden md:flex flex-col">
        {/* Sidebar Content */}
        <div className="p-8 border-b border-white/10"><h2 className="font-heading text-3xl font-bold tracking-tight">SASTRA NCC</h2><p className="text-xs text-ncc-sky tracking-[0.2em] uppercase mt-1">Cadet Portal</p></div>
        <nav className="p-4 space-y-2 flex-grow">
          {['Home', 'Schedule', 'Permissions', 'Achievements'].map((item) => (
            <button key={item} onClick={() => setActiveTab(item.toLowerCase())} className={`w-full text-left px-5 py-3.5 rounded-lg transition-all flex items-center gap-3 font-medium ${activeTab === item.toLowerCase() ? 'bg-ncc-red text-white shadow-lg shadow-red-900/20' : 'hover:bg-white/5 text-gray-300'}`}><i className={`fas fa-${item === 'Home' ? 'home' : item === 'Schedule' ? 'calendar-alt' : item === 'Permissions' ? 'file-signature' : 'medal'} w-5 text-center`}></i>{item}</button>
          ))}
          {isSUO && (<button onClick={() => setActiveTab('approvals')} className={`w-full text-left px-5 py-3.5 rounded-lg transition-all flex items-center gap-3 font-medium ${activeTab === 'approvals' ? 'bg-ncc-red text-white shadow-lg shadow-red-900/20' : 'hover:bg-white/5 text-gray-300'}`}><i className="fas fa-check-double w-5 text-center text-green-400"></i> Approvals {pendingRequests.length > 0 && <span className="text-[10px] bg-red-600 px-1.5 rounded-full ml-auto">{pendingRequests.length}</span>}</button>)}
        </nav>
        <div className="p-6 bg-black/20 mt-auto"><div className="flex items-center gap-3 mb-3"><div className="w-10 h-10 rounded-full bg-ncc-gold text-ncc-navy flex items-center justify-center font-bold text-lg">{user.name.charAt(0)}</div><div><div className="text-white font-bold text-sm leading-tight">{user.rank} {user.name}</div><div className="text-ncc-sky text-[10px] uppercase font-bold tracking-wider mb-0.5">{user.regimentalNumber || 'N/A'}</div><div className="text-gray-400 text-[10px]">{getYearLabel(user.batchYear)} • Batch {user.batchYear}</div></div></div><button onClick={() => { localStorage.removeItem('user'); router.push('/'); }} className="w-full py-2 rounded border border-white/20 text-xs hover:bg-white/10 text-gray-300 transition-colors"><i className="fas fa-sign-out-alt mr-2"></i> Sign Out</button></div>
      </aside>

      <main className="md:ml-72 w-full p-8 md:p-12 overflow-x-hidden">
        {message && <div className="fixed top-5 right-5 bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded z-50 animate-bounce shadow-lg"><i className="fas fa-check-circle mr-2"></i> {message} <button onClick={() => setMessage('')} className="ml-4 opacity-50 hover:opacity-100"><i className="fas fa-times"></i></button></div>}

        <header className="flex justify-between items-center mb-8">
          <div><h1 className="text-3xl font-bold text-gray-800 capitalize mb-1">{activeTab}</h1><p className="text-gray-500 text-sm">Manage your NCC activities and records</p></div>
          {isRankHolder && <span className="bg-gradient-to-r from-ncc-gold to-yellow-600 text-white px-4 py-1.5 rounded-full font-bold text-xs uppercase shadow-md flex items-center gap-2"><i className="fas fa-star"></i> Rank Holder Access</span>}
        </header>

        {activeTab === 'home' && (
          <div className="space-y-8 animate-fade-in">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="bg-white p-6 rounded-xl shadow-sm border-l-4 border-ncc-navy"><h3 className="text-gray-400 text-xs uppercase font-bold tracking-wider">Attendance</h3><div className="flex items-baseline gap-2 mt-2"><span className="text-4xl font-bold text-gray-800">85%</span></div><div className="w-full bg-gray-100 h-1.5 mt-4 rounded-full overflow-hidden"><div className="bg-ncc-navy w-[85%] h-full"></div></div></div>
              <div className="bg-white p-6 rounded-xl shadow-sm border-l-4 border-ncc-red"><h3 className="text-gray-400 text-xs uppercase font-bold tracking-wider">Pending Permissions</h3><div className="text-4xl font-bold text-gray-800 mt-2">{data.permissions.filter(p => p.cadetId === user.id && p.status.includes('PENDING')).length}</div></div>
              <div className="bg-white p-6 rounded-xl shadow-sm border-l-4 border-ncc-sky"><h3 className="text-gray-400 text-xs uppercase font-bold tracking-wider">Total Achievements</h3><div className="text-4xl font-bold text-gray-800 mt-2">{data.achievements.filter(a => a.cadetId === user.id).length}</div></div>
            </div>
            {isSUO && pendingRequests.length > 0 && (<div className="bg-indigo-50 border border-indigo-100 p-6 rounded-xl flex justify-between items-center animate-fade-in"><div><h3 className="text-indigo-900 font-bold mb-1">Pending Approval Requests</h3><p className="text-indigo-700/80 text-sm">You have {pendingRequests.length} cadet requests waiting for review.</p></div><button onClick={() => setActiveTab('approvals')} className="bg-indigo-600 text-white px-6 py-2 rounded-lg font-bold text-sm shadow hover:bg-indigo-700">Review Now</button></div>)}
            <div className="bg-white border text-gray-800 p-8 rounded-xl shadow-sm flex flex-col md:flex-row justify-between items-center gap-6 relative overflow-hidden group">
              <div className="z-10"><div className="flex items-center gap-2 mb-2"><span className="bg-red-100 text-red-600 px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider">Upcoming</span><span className="text-gray-400 text-xs font-bold uppercase">Mandatory Attendance</span></div><h2 className="text-3xl font-bold text-ncc-navy">Morning Drill Parade</h2><div className="flex gap-4 mt-3 text-sm font-medium text-gray-600"><span><i className="far fa-calendar text-ncc-red mr-2"></i> 02 Feb 2026</span><span><i className="far fa-clock text-ncc-red mr-2"></i> 06:00 AM</span></div></div>
              <div className="flex gap-3 z-10"><button onClick={() => setActiveTab('schedule')} className="px-6 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold rounded-lg transition-colors text-sm">Full Schedule</button></div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {/* News Feed */}
              <div>
                <ArmyNewsFeed />
              </div>
              {/* Existing Widgets or spacers if needed, but for now just placing consistent with ANO */}
            </div>

            {activeTab === 'approvals' && isSUO && (
              <div className="animate-fade-in space-y-6">
                <div className="flex justify-between items-center bg-white p-6 rounded-xl shadow-sm">
                  <div><h2 className="text-xl font-bold text-gray-800">Review Requests</h2><p className="text-gray-500 text-sm">Manage permission requests and view history.</p></div>
                </div>
                <div className="space-y-4">
                  <h3 className="font-bold text-gray-700 border-b pb-2">Pending Requests ({pendingRequests.length})</h3>
                  {pendingRequests.map(p => (
                    <div key={p.id} className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                      <div className="flex justify-between items-start mb-4">
                        <div>
                          <h3 className="font-bold text-lg text-gray-800">{p.cadetName}</h3>
                          <div className="text-sm text-gray-500 flex gap-4 mt-1">
                            <span className="bg-gray-100 px-2 py-0.5 rounded"><i className="far fa-calendar-alt mr-1"></i> {p.startDate} - {p.endDate}</span>
                          </div>
                        </div>
                        {p.evidenceUrl && <a href={p.evidenceUrl} target="_blank" className="bg-blue-50 text-blue-600 px-3 py-1.5 rounded-lg text-xs font-bold hover:bg-blue-100 border border-blue-200"><i className="fas fa-paperclip mr-2"></i>View Evidence</a>}
                      </div>
                      <div className="bg-gray-50 p-4 rounded-lg text-gray-700 text-sm mb-6 border border-gray-200">
                        <strong className="block text-gray-400 text-xs uppercase mb-1">Reason</strong>{p.reason}
                      </div>
                      <form className="flex gap-4 items-end">
                        <div className="flex-1">
                          <label className="text-xs font-bold text-gray-400 uppercase mb-1 block">Your Comments</label>
                          <input id={`comment-${p.id}`} name="comment" className="w-full border p-2.5 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none" placeholder="Add a note..." required />
                        </div>
                        <button type="button" onClick={() => {
                          const input = document.getElementById(`comment-${p.id}`) as HTMLInputElement;
                          if (!input.value) { alert('Please add a comment'); return; }
                          handleSuoAction(p.id, 'FORWARD', input.value);
                        }} className="bg-green-600 text-white px-6 py-2.5 rounded-lg font-bold text-sm hover:bg-green-700 shadow-sm">
                          <i className="fas fa-check mr-2"></i> Forward to ANO
                        </button>
                        <button type="button" onClick={() => {
                          const input = document.getElementById(`comment-${p.id}`) as HTMLInputElement;
                          if (!input.value) { alert('Please add a comment'); return; }
                          handleSuoAction(p.id, 'REJECT', input.value);
                        }} className="bg-red-50 text-red-600 border border-red-200 px-6 py-2.5 rounded-lg font-bold text-sm hover:bg-red-100">
                          <i className="fas fa-times mr-2"></i> Reject
                        </button>
                      </form>
                    </div>
                  ))}
                  {pendingRequests.length === 0 && (<div className="text-center py-6 bg-white rounded-xl border border-dashed text-gray-400 text-sm">No new requests needed your attention.</div>)}
                </div>
                <div className="space-y-4 pt-4">
                  <h3 className="font-bold text-gray-700 border-b pb-2">Actions History</h3>
                  <div className="space-y-3">{pastApprovals.map(p => (
                    <div key={p.id} className="bg-white p-5 rounded-xl shadow-sm border border-gray-100">
                      {/* Status Display */}
                      <div className="flex justify-between items-start">
                        <div>
                          <div className="font-bold text-gray-800 text-sm">{p.reason}</div>
                          <div className="text-xs text-gray-500">{p.startDate} to {p.endDate}</div>

                          {/* SUO Comments */}
                          {p.suoComment && <div className="mt-2 text-[10px] bg-gray-50 p-2 rounded border border-gray-200">
                            <strong className="text-gray-600 block mb-1">SUO Remarks:</strong> {p.suoComment}
                          </div>}

                          {/* ANO Comments */}
                          {p.anoComment && <div className="mt-2 text-[10px] bg-gray-50 p-2 rounded border border-gray-200">
                            <strong className="text-gray-600 block mb-1">ANO Remarks:</strong> {p.anoComment}
                          </div>}

                          {/* ACTION: Meet ANO Alert */}
                          {p.status === 'MEET_ANO' && (
                            <div className="mt-3 bg-yellow-50 border-l-4 border-yellow-500 p-3 text-yellow-800 text-xs rounded-r shadow-sm animate-pulse">
                              <div className="font-bold flex items-center gap-2">
                                <i className="fas fa-exclamation-triangle"></i> ACTION REQUIRED
                              </div>
                              <p className="mt-1">Please report to the ANO office in person regarding this request.</p>
                            </div>
                          )}
                        </div>

                        <div className="flex flex-col items-end gap-2">
                          <span className={`text-[10px] font-bold px-2 py-1 rounded uppercase ${p.status === 'APPROVED' ? 'bg-green-100 text-green-700' :
                            p.status.includes('REJECTED') || p.status.includes('DECLINED') ? 'bg-red-100 text-red-700' :
                              p.status === 'MEET_ANO' ? 'bg-yellow-100 text-yellow-800 border border-yellow-200' :
                                'bg-blue-50 text-blue-600'
                            }`}>
                            {p.status.replace(/_/g, ' ')}
                          </span>

                          {/* ACTION: Withdraw Request (If Pending) */}
                          {p.status === 'PENDING_SUO' && (
                            <form action={async (fd) => {
                              if (confirm('Are you sure you want to withdraw this request?')) {
                                fd.append('id', p.id);
                                await deletePermission(fd);
                                refreshData();
                              }
                            }}>
                              <button className="text-[10px] text-red-400 hover:text-red-600 underline">Withdraw</button>
                            </form>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                    {pastApprovals.length === 0 && (<div className="text-center py-6 text-gray-400 text-sm">History is empty.</div>)}
                  </div>
                </div>
              </div>
            )}

            {/* UPDATED SCHEDULE TAB */}
            {activeTab === 'schedule' && (
              <div className="space-y-6 animate-fade-in">
                <CalendarView />
                {isRankHolder && (
                  <div className="bg-gradient-to-r from-yellow-50 to-orange-50 border border-yellow-200 p-6 rounded-xl flex items-center justify-between">
                    <div><h3 className="font-bold text-yellow-900 mb-1"><i className="fas fa-clipboard-check mr-2"></i> Attendance Register</h3><p className="text-sm text-yellow-800/80">Authorized access to mark unit attendance.</p></div>
                    <button onClick={() => launchRegister()} className="bg-yellow-600 text-white px-6 py-3 rounded-lg shadow-sm font-bold text-sm hover:bg-yellow-700 transition-colors">
                      Launch Register (Auto-Detect)
                    </button>
                  </div>
                )}
              </div>
            )}

            {activeTab === 'permissions' && (
              <div className="grid md:grid-cols-2 gap-8 animate-fade-in">
                <div className="bg-white p-8 rounded-xl shadow-sm h-fit">
                  <h3 className="font-bold text-lg mb-6 border-b pb-4 text-gray-800">New Permission Request</h3>
                  <form action={async (fd) => { fd.append('cadetId', user.id); fd.append('cadetName', `${user.rank} ${user.name}`); await submitPermission(fd); setMessage('Permission Submitted Successfully!'); refreshData(); }} className="space-y-5">
                    <div className="grid grid-cols-2 gap-4">
                      <div><label className="block text-xs font-bold uppercase text-gray-500 mb-1.5">From Date</label><input name="startDate" type="date" className="w-full border p-2.5 rounded-lg" required /></div>
                      <div><label className="block text-xs font-bold uppercase text-gray-500 mb-1.5">To Date</label><input name="endDate" type="date" className="w-full border p-2.5 rounded-lg" required /></div>
                    </div>
                    <div>
                      <label className="block text-xs font-bold uppercase text-gray-500 mb-1.5">Reason Detailed</label>
                      <textarea name="reason" className="w-full border p-3 rounded-lg h-32" required></textarea>
                    </div>
                    <div>
                      <label className="block text-xs font-bold uppercase text-gray-500 mb-1.5">Evidence (Optional)</label>
                      <input type="file" name="evidence" className="w-full text-xs text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-xs file:font-semibold file:bg-gray-100 file:text-gray-700 hover:file:bg-gray-200" />
                    </div>
                    <button className="w-full bg-ncc-navy text-white py-3.5 rounded-lg font-bold">SUBMIT TO SUO</button>
                  </form>
                </div>

                <div className="space-y-4">
                  <h3 className="font-bold text-lg text-gray-800">My Request History</h3>
                  {data.permissions.filter(p => p.cadetId === user.id).map(p => (
                    <div key={p.id} className="bg-white p-5 rounded-xl shadow-sm border border-gray-100">
                      <div className="flex justify-between items-start">
                        <div>
                          <div className="font-bold text-gray-800 text-sm">{p.reason}</div>
                          <div className="text-xs text-gray-500 mb-2">{p.startDate} to {p.endDate}</div>

                          {p.suoComment && <div className="mt-1 text-[10px] bg-gray-50 p-2 rounded border border-gray-200"><strong className="text-gray-600 block">SUO Note:</strong> {p.suoComment}</div>}
                          {p.anoComment && <div className="mt-1 text-[10px] bg-gray-50 p-2 rounded border border-gray-200"><strong className="text-gray-600 block">ANO Note:</strong> {p.anoComment}</div>}

                          {p.status === 'MEET_ANO' && (
                            <div className="mt-3 bg-yellow-50 border-l-4 border-yellow-500 p-3 text-yellow-800 text-xs rounded-r shadow-sm animate-pulse">
                              <div className="font-bold flex items-center gap-2"><i className="fas fa-exclamation-triangle"></i> ACTION REQUIRED</div>
                              <p className="mt-1">Please report to the ANO office in person regarding this request.</p>
                            </div>
                          )}
                        </div>

                        <div className="flex flex-col items-end gap-2">
                          <span className={`text-[10px] font-bold px-2 py-1 rounded uppercase ${p.status === 'APPROVED' ? 'bg-green-100 text-green-700' :
                            p.status.includes('REJECTED') || p.status.includes('DECLINED') ? 'bg-red-100 text-red-700' :
                              p.status === 'MEET_ANO' ? 'bg-yellow-100 text-yellow-800 border border-yellow-200' :
                                'bg-yellow-100 text-yellow-700'
                            }`}>
                            {p.status.replace(/_/g, ' ')}
                          </span>

                          {/* Withdraw Option */}
                          {p.status === 'PENDING_SUO' && (
                            <form action={async (fd) => {
                              if (confirm('Are you sure you want to withdraw this request?')) {
                                fd.append('id', p.id);
                                await deletePermission(fd);
                                refreshData();
                              }
                            }}>
                              <button className="text-[10px] text-red-400 hover:text-red-600 underline font-medium">Withdraw</button>
                            </form>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                  {data.permissions.filter(p => p.cadetId === user.id).length === 0 && <div className="text-center text-gray-400 py-10 text-sm">No requests found.</div>}
                </div>
              </div>
            )}

            {activeTab === 'achievements' && (
              <div className="grid md:grid-cols-3 gap-8 animate-fade-in">
                <div className="md:col-span-2 space-y-6">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {data.achievements.filter(a => a.cadetId === user.id).map(ach => (
                      <div key={ach.id} className="bg-white p-5 rounded-xl shadow-sm border border-gray-100 relative group">
                        {(ach.status === 'DRAFT' || ach.status === 'REJECTED') && (
                          <button
                            onClick={() => { setEditingAch(ach); setAchCategory(ach.category); }}
                            className="absolute top-2 right-2 text-gray-300 hover:text-ncc-navy bg-white p-1 rounded-full shadow hidden group-hover:block transition-all">
                            <i className="fas fa-edit"></i>
                          </button>
                        )}

                        {/* Status Badge */}
                        <div className="mb-2">
                          {(!ach.status || ach.status === 'DRAFT') && <span className="bg-gray-100 text-gray-600 px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider">Draft</span>}
                          {ach.status === 'PENDING' && <span className="bg-yellow-100 text-yellow-700 px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider">Pending Verification</span>}
                          {ach.status === 'VERIFIED' && <span className="bg-green-100 text-green-700 px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider"><i className="fas fa-check-circle mr-1"></i>Verified</span>}
                          {ach.status === 'REJECTED' && <span className="bg-red-100 text-red-700 px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider"><i className="fas fa-times-circle mr-1"></i>Rejected</span>}
                        </div>

                        <h4 className="font-bold text-base text-gray-800 mb-1">{ach.title}</h4>
                        {ach.location && <div className="text-xs text-gray-500 font-medium mb-2"><i className="fas fa-map-marker-alt mr-1"></i> {ach.location}</div>}
                        <p className="text-[10px] text-gray-400 mb-3">{ach.date} {ach.endDate && `- ${ach.endDate}`}</p>

                        {/* Submit Button for Drafts */}
                        {(ach.status === 'DRAFT' || ach.status === 'REJECTED' || !ach.status) && (
                          <form action={async (fd) => {
                            if (confirm('Submit this achievement for verification? You will strictly NOT be able to edit it once submitted.')) {
                              fd.append('id', ach.id);
                              await submitAchievementForVerification(fd);
                              setMessage('Achievement Submitted for Verification');
                              refreshData();
                            }
                          }}>
                            <button className="w-full text-center bg-gray-50 hover:bg-gray-100 text-gray-600 border border-gray-200 py-1.5 rounded text-xs font-bold transition-colors">Submit Request</button>
                          </form>
                        )}
                        {ach.anoComment && ach.status === 'REJECTED' && <div className="mt-2 text-[10px] text-red-500 bg-red-50 p-2 rounded"><strong>Reason:</strong> {ach.anoComment}</div>}
                      </div>
                    ))}
                  </div>
                </div>

                <div className="bg-white p-6 rounded-xl shadow-sm h-fit">
                  <div className="flex justify-between items-center mb-6 border-b pb-4">
                    <h3 className="font-bold text-lg text-gray-800">{editingAch ? 'Edit Achievement' : 'Add Achievement'}</h3>
                    {editingAch && <button onClick={() => setEditingAch(null)} className="text-xs text-gray-400 hover:text-red-500">Cancel</button>}
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
                      <label className="text-[10px] font-bold uppercase text-gray-400 mb-1 block">Title</label>
                      <input name="title" defaultValue={editingAch?.title} className="w-full border p-2.5 rounded-lg text-sm" placeholder="Title" required />
                    </div>

                    <div>
                      <label className="text-[10px] font-bold uppercase text-gray-400 mb-1 block">Type</label>
                      <select name="category" className="w-full border p-2.5 rounded-lg text-sm" onChange={(e) => setAchCategory(e.target.value)} value={achCategory}>
                        <option value="Camp">Camp</option>
                        <option value="Sports">Sports</option>
                        <option value="Cultural">Cultural</option>
                      </select>
                    </div>

                    {/* Optional Location */}
                    <div>
                      <label className="text-[10px] font-bold uppercase text-gray-400 mb-1 block">Location / Venue</label>
                      <input name="location" defaultValue={editingAch?.location} className="w-full border p-2.5 rounded-lg text-sm" placeholder="e.g. Perambalur, Delhi" />
                    </div>

                    {/* Dynamic Dates */}
                    {achCategory === 'Camp' ? (
                      <div className="grid grid-cols-2 gap-2">
                        <div><label className="text-[10px] font-bold uppercase text-gray-400 mb-1 block">Start Date</label><input name="date" type="date" defaultValue={editingAch?.date} className="w-full border p-2.5 rounded-lg text-sm" required /></div>
                        <div><label className="text-[10px] font-bold uppercase text-gray-400 mb-1 block">End Date</label><input name="endDate" type="date" defaultValue={editingAch?.endDate} className="w-full border p-2.5 rounded-lg text-sm" required /></div>
                      </div>
                    ) : (
                      <div><label className="text-[10px] font-bold uppercase text-gray-400 mb-1 block">Date</label><input name="date" type="date" defaultValue={editingAch?.date} className="w-full border p-2.5 rounded-lg text-sm" required /></div>
                    )}

                    <div>
                      <label className="text-[10px] font-bold uppercase text-gray-400 mb-1 block">Details</label>
                      <textarea name="description" defaultValue={editingAch?.description} className="w-full border p-2.5 rounded-lg text-sm h-24" placeholder="Description"></textarea>
                    </div>

                    <div className="flex gap-4">
                      <button className="w-full bg-ncc-navy text-white py-3 rounded-lg font-bold text-sm">{editingAch ? 'UPDATE RECORD (DRAFT)' : 'SAVE AS DRAFT'}</button>
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
                        }} className="px-4 py-3 bg-red-100 text-red-600 rounded-lg font-bold text-sm hover:bg-red-200 border border-red-200"><i className="fas fa-trash"></i></button>
                      )}
                    </div>
                  </form>
                </div>
              </div>
            )}
          </main>
    </div>
  );
}
