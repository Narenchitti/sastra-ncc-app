'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { getDashboardData, updatePermissionStatus, createEvent, verifyAchievement } from '@/app/actions';
import { User, Permission, Event, Achievement } from '@/lib/db';

export default function ANODashboard() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [activeTab, setActiveTab] = useState('overview');
  const [data, setData] = useState<{ events: Event[], permissions: Permission[], achievements: Achievement[], users: User[] }>({ events: [], permissions: [], achievements: [], users: [] });
  const [actionComment, setActionComment] = useState('');

  // Event Creation State
  const [eventType, setEventType] = useState('Parade');
  const [eventTitle, setEventTitle] = useState('Morning Drill Parade'); // Default

  useEffect(() => {
    const stored = localStorage.getItem('user');
    if (!stored) router.push('/login');
    else {
      const u = JSON.parse(stored);
      if (u.role !== 'ANO' && u.rank !== 'SUO') router.push('/dashboard/cadet');
      setUser(u);
      refreshData();
    }
  }, []);

  async function refreshData() {
    setData(await getDashboardData());
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
  const pendingApprovals = data.permissions.filter(p => p.status === 'FORWARDED_TO_ANO');
  const suoRejections = data.permissions.filter(p => p.status === 'REJECTED_BY_SUO');
  const pendingAchievements = data.achievements.filter(a => a.status === 'PENDING');
  const nextEvent = data.events.filter(e => new Date(e.date) >= new Date()).sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())[0];

  // Calendar View Component (Reused)
  // Calendar View Component (Redesigned)
  const CalendarView = () => {
    const startDate = new Date('2026-02-01'); // Keeping simulation date
    const weekDates = Array.from({ length: 7 }, (_, i) => {
      const d = new Date(startDate);
      d.setDate(startDate.getDate() + i);
      return d;
    });
    const monthName = startDate.toLocaleString('default', { month: 'long', year: 'numeric' });

    // Collect all events for this week for the Detailed Agenda
    const weekEvents = weekDates.flatMap(dateObj => {
      const dateStr = dateObj.toISOString().split('T')[0];
      return data.events
        .filter(e => e.date === dateStr)
        .map(e => ({ ...e, dateObj }));
    }).sort((a, b) => a.startTime.localeCompare(b.startTime));

    return (
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        {/* Header */}
        <div className="p-6 border-b border-gray-100 flex justify-between items-center">
          <div>
            <h3 className="font-heading text-xl font-bold text-gray-800">Weekly Schedule</h3>
            <p className="text-ncc-red font-bold uppercase text-xs tracking-widest">{monthName} | Week 1</p>
          </div>
          <div className="text-right">
            <span className="text-2xl font-bold text-gray-800">{weekEvents.length}</span>
            <span className="text-xs text-gray-500 block uppercase tracking-wider">Events</span>
          </div>
        </div>

        {/* 1. Mini Visual Grid (Quick Glance) */}
        <div className="grid grid-cols-7 gap-px bg-gray-200 border-b border-gray-200">
          {weekDates.map((dateObj, i) => {
            const dateStr = dateObj.toISOString().split('T')[0];
            const dayName = dateObj.toLocaleDateString('default', { weekday: 'short' });
            const dayNum = dateObj.getDate();
            const daysEvents = data.events.filter(e => e.date === dateStr);
            const isToday = i === 0; // Assuming start date is today for simulation

            return (
              <div key={i} className={`min-h-[80px] bg-white p-2 flex flex-col gap-1 ${isToday ? 'bg-blue-50/30' : ''}`}>
                <div className={`text-center mb-1`}>
                  <span className="block text-[10px] uppercase opacity-70">{dayName}</span>
                  <span className={`text-sm font-bold leading-none ${isToday ? 'text-ncc-red' : 'text-gray-700'}`}>{dayNum}</span>
                </div>
                {/* Dots/Small Indicators instead of full truncated text */}
                <div className="flex flex-col gap-1">
                  {daysEvents.map(ev => (
                    <div key={ev.id} className={`h-1.5 rounded-full w-full ${ev.type === 'Parade' ? 'bg-red-400' : 'bg-blue-400'}`} title={ev.title}></div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>

        {/* 2. Detailed Agenda List */}
        <div className="bg-gray-50 p-6">
          <h4 className="font-bold text-gray-400 text-xs uppercase tracking-wider mb-4">Detailed Agenda</h4>
          <div className="space-y-3">
            {weekEvents.length === 0 ? (
              <p className="text-sm text-gray-400 italic text-center py-4">No events scheduled for this week.</p>
            ) : (
              weekEvents.map(ev => (
                <div key={ev.id} className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm flex flex-col md:flex-row md:items-center gap-4 hover:border-ncc-navy transition-colors group">
                  {/* Date Badge */}
                  <div className="flex-shrink-0 w-16 text-center border-r border-gray-100 pr-4">
                    <span className="block text-xs font-bold text-gray-400 uppercase">{ev.dateObj.toLocaleDateString('default', { weekday: 'short' })}</span>
                    <span className="block text-xl font-bold text-gray-800">{ev.dateObj.getDate()}</span>
                  </div>

                  {/* Event Details */}
                  <div className="flex-grow">
                    <div className="flex items-center gap-2 mb-1">
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase tracking-wider ${ev.type === 'Parade' ? 'bg-red-100 text-red-700' :
                          ev.type === 'Theory' ? 'bg-blue-100 text-blue-700' :
                            'bg-purple-100 text-purple-700'
                        }`}>
                        {ev.type}
                      </span>
                      <h5 className="font-bold text-gray-800 text-sm">{ev.title}</h5>
                    </div>
                    <div className="flex items-center gap-4 text-xs text-gray-500">
                      <span className="flex items-center gap-1">
                        <i className="far fa-clock text-gray-400"></i> {ev.startTime} - {ev.endTime}
                      </span>
                      <span className="flex items-center gap-1">
                        <i className="fas fa-map-marker-alt text-gray-400"></i> {ev.location}
                      </span>
                    </div>
                  </div>

                  {/* Action/Edit (Placeholder for now) */}
                  <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                    <button className="text-gray-400 hover:text-ncc-navy"><i className="fas fa-ellipsis-v"></i></button>
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
    <div className="min-h-screen bg-gray-100 flex">
      {/* Sidebar */}
      <aside className="w-64 bg-gray-900 text-white fixed h-full hidden md:block">
        <div className="p-6">
          <h2 className="font-heading text-2xl font-bold">COMMAND CENTER</h2>
          <p className="text-xs text-gray-400 capitalize">{user.role === 'ANO' ? 'Associate NCC Officer' : 'Senior Under Officer'}</p>
        </div>
        <nav className="p-4 space-y-2">
          {['Overview', 'Approvals', 'Achievements', 'Schedule'].map(t => (
            <button key={t} onClick={() => setActiveTab(t.toLowerCase())} className={`w-full text-left px-4 py-3 rounded flex justify-between items-center ${activeTab === t.toLowerCase() ? 'bg-ncc-red font-bold' : 'hover:bg-white/10 text-gray-400'}`}>
              {t}
              {t === 'Approvals' && pendingApprovals.length > 0 && <span className="bg-white text-gray-900 text-xs px-2 py-0.5 rounded-full font-bold">{pendingApprovals.length}</span>}
              {t === 'Achievements' && pendingAchievements.length > 0 && <span className="bg-white text-gray-900 text-xs px-2 py-0.5 rounded-full font-bold">{pendingAchievements.length}</span>}
            </button>
          ))}
          <button onClick={() => { localStorage.removeItem('user'); router.push('/'); }} className="w-full text-left px-4 py-3 mt-10 text-red-400 hover:text-red-300">Logout</button>
        </nav>
      </aside>

      <main className="md:ml-64 w-full p-8 md:p-12">
        {activeTab === 'overview' && (
          <div className="space-y-8 animate-fade-in">
            <div><h1 className="text-3xl font-bold text-gray-800">Unit Overview</h1><p className="text-gray-500">Welcome back, {user.rank} {user.name}</p></div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <div className="bg-white p-6 rounded-lg shadow-sm border-t-4 border-ncc-navy">
                <div className="text-gray-500 text-xs font-bold uppercase tracking-wider">Total Strength</div>
                <div className="text-4xl font-bold mt-2">52</div>
                <div className="text-xs text-gray-400 mt-1">Active Cadets</div>
              </div>
              <div className="bg-white p-6 rounded-lg shadow-sm border-t-4 border-yellow-500">
                <div className="text-gray-500 text-xs font-bold uppercase tracking-wider">Action Required</div>
                <div className="text-4xl font-bold mt-2 text-yellow-600">{pendingApprovals.length}</div>
                <div className="text-xs text-gray-400 mt-1">Pending Requests</div>
              </div>
              <div className="bg-white p-6 rounded-lg shadow-sm border-t-4 border-red-500">
                <div className="text-gray-500 text-xs font-bold uppercase tracking-wider">SUO Rejections</div>
                <div className="text-4xl font-bold mt-2 text-red-600">{suoRejections.length}</div>
                <div className="text-xs text-gray-400 mt-1">Review Needed</div>
              </div>
              <div className="bg-white p-6 rounded-lg shadow-sm border-t-4 border-green-600">
                <div className="text-gray-500 text-xs font-bold uppercase tracking-wider">Next Event</div>
                <div className="text-lg font-bold mt-2 truncate">{nextEvent ? nextEvent.title : 'None'}</div>
                <div className="text-xs text-green-600 font-bold mt-1">{nextEvent ? nextEvent.date : '-'}</div>
              </div>
            </div>

            {/* Quick Actions / Recent Activity */}
            <div className="grid md:grid-cols-2 gap-8">
              <div className="bg-white p-6 rounded-lg shadow-sm">
                <div className="flex justify-between items-center mb-4"><h3 className="font-bold text-gray-800">Recent SUO Activity</h3></div>
                {data.permissions.filter(p => p.status === 'FORWARDED_TO_ANO' || p.status === 'REJECTED_BY_SUO').slice(0, 5).map(p => (
                  <div key={p.id} className="border-b last:border-0 py-3 flex justify-between items-center">
                    <div>
                      <div className="font-bold text-sm text-gray-800">{p.cadetName}</div>
                      <div className="text-xs text-gray-500">{p.reason}</div>
                    </div>
                    <span className={`text-[10px] uppercase font-bold px-2 py-1 rounded ${p.status === 'FORWARDED_TO_ANO' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                      {p.status === 'FORWARDED_TO_ANO' ? 'Forwarded' : 'Rejected'}
                    </span>
                  </div>
                ))}
                {data.permissions.length === 0 && <p className="text-sm text-gray-400 italic">No recent activity.</p>}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'approvals' && (
          <div className="space-y-6 animate-fade-in">
            <h1 className="text-3xl font-bold text-gray-800">Permission Board</h1>

            {/* 1. Pending For You (Forwarded by SUO) */}
            <div className="space-y-4">
              <h3 className="font-bold text-lg text-ncc-navy border-b pb-2">Pending Approval (Forwarded by SUO)</h3>
              {pendingApprovals.length === 0 ? (
                <div className="p-8 text-center text-gray-400 bg-white rounded border border-dashed">No pending approvals. SUO has cleared the queue.</div>
              ) : (
                pendingApprovals.map(p => (
                  <div key={p.id} className="bg-white p-6 rounded-lg shadow-sm border-l-4 border-yellow-500 flex flex-col md:flex-row gap-6">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <span className="font-bold text-lg text-gray-800">{p.cadetName}</span>
                        <span className="text-xs bg-gray-100 px-2 py-1 rounded text-gray-600">ID: {p.cadetId}</span>
                        {p.evidenceUrl && <a href={p.evidenceUrl} target="_blank" className="text-blue-600 text-xs hover:underline bg-blue-50 px-2 py-1 rounded"><i className="fas fa-paperclip"></i> View Evidence</a>}
                      </div>
                      <div className="bg-gray-50 p-3 rounded text-sm text-gray-700 mb-2">
                        <strong className="block text-[10px] uppercase text-gray-400">Reason</strong>
                        {p.reason}
                      </div>
                      <div className="text-sm text-gray-500"><i className="far fa-calendar mr-2"></i> {p.startDate} to {p.endDate}</div>
                      {p.suoComment && <div className="mt-3 bg-green-50 text-green-800 text-xs p-3 rounded border border-green-100"><strong className="block text-[10px] uppercase text-green-600 mb-1">SUO Analysis</strong> {p.suoComment}</div>}
                    </div>
                    <div className="w-full md:w-64 space-y-3">
                      <textarea onChange={(e) => setActionComment(e.target.value)} className="w-full border p-3 rounded text-sm h-24" placeholder="ANO Remarks..."></textarea>
                      <div className="grid grid-cols-2 gap-2">
                        <form action={async (fd) => { fd.append('permId', p.id); fd.append('status', 'APPROVED'); fd.append('comment', actionComment); fd.append('role', 'ANO'); await updatePermissionStatus(fd); refreshData(); }}>
                          <button className="w-full bg-green-600 text-white py-2 rounded font-bold text-xs hover:bg-green-700 shadow-sm">APPROVE</button>
                        </form>
                        <form action={async (fd) => { fd.append('permId', p.id); fd.append('status', 'DECLINED_BY_ANO'); fd.append('comment', actionComment); fd.append('role', 'ANO'); await updatePermissionStatus(fd); refreshData(); }}>
                          <button className="w-full bg-red-600 text-white py-2 rounded font-bold text-xs hover:bg-red-700 shadow-sm">DECLINE</button>
                        </form>
                        <form action={async (fd) => { fd.append('permId', p.id); fd.append('status', 'MEET_ANO'); fd.append('comment', actionComment || 'Please report to ANO office.'); fd.append('role', 'ANO'); await updatePermissionStatus(fd); refreshData(); }} className="col-span-2">
                          <button className="w-full bg-yellow-500 text-white py-2 rounded font-bold text-xs hover:bg-yellow-600 shadow-sm"><i className="fas fa-user-clock mr-1"></i> CALL FOR MEETING</button>
                        </form>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* 2. SUO Rejections (For Oversight) */}
            <div className="space-y-4 pt-8">
              <h3 className="font-bold text-lg text-gray-500 border-b pb-2">Oversight: Rejected by SUO</h3>
              {suoRejections.length === 0 ? <p className="text-sm text-gray-400">No rejections by SUO.</p> : (
                suoRejections.map(p => (
                  <div key={p.id} className="bg-gray-50 p-4 rounded border border-gray-200 opacity-75 hover:opacity-100 transition-opacity">
                    <div className="flex justify-between">
                      <div>
                        <span className="font-bold text-gray-700">{p.cadetName}</span>
                        <span className="mx-2 text-gray-400">|</span>
                        <span className="text-sm text-gray-600">{p.reason}</span>
                      </div>
                      <span className="text-xs bg-red-100 text-red-600 px-2 py-1 rounded font-bold uppercase">Rejected</span>
                    </div>
                    {p.suoComment && <div className="mt-2 text-xs text-gray-500"><strong>SUO Reason:</strong> {p.suoComment}</div>}
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {activeTab === 'achievements' && (
          <div className="space-y-6 animate-fade-in">
            <h1 className="text-3xl font-bold text-gray-800">Achievement Verification</h1>

            <div className="space-y-4">
              <h3 className="font-bold text-lg text-ncc-navy border-b pb-2">Pending Verification Queue</h3>
              {pendingAchievements.length === 0 ? (
                <div className="p-8 text-center text-gray-400 bg-white rounded border border-dashed">No pending achievements to verify.</div>
              ) : (
                pendingAchievements.map(a => {
                  const cadet = data.users.find(u => u.id === a.cadetId);
                  return (
                    <div key={a.id} className="bg-white p-6 rounded-lg shadow-sm border-l-4 border-blue-500 flex flex-col md:flex-row gap-6">
                      <div className="flex-1">
                        {/* Cadet Header */}
                        <div className="flex items-center gap-3 mb-4 border-b border-dashed border-gray-200 pb-3">
                          <div className="w-10 h-10 rounded-full bg-ncc-navy text-white flex items-center justify-center font-bold text-lg">
                            {cadet?.name.charAt(0) || '?'}
                          </div>
                          <div>
                            <div className="font-bold text-gray-800 text-sm">{cadet?.rank} {cadet?.name}</div>
                            <div className="text-xs text-gray-500 flex gap-2">
                              <span className="bg-gray-100 px-1.5 rounded">{cadet?.regimentalNumber || 'No Regt #'}</span>
                              <span>•</span>
                              <span>Batch {cadet?.batchYear}</span>
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-3 mb-2">
                          <span className="font-bold text-lg text-gray-800">{a.title}</span>
                          <span className="text-xs bg-gray-100 px-2 py-1 rounded text-gray-600 uppercase font-bold">{a.category}</span>
                          {a.certificateUrl && <a href={a.certificateUrl} target="_blank" className="text-blue-600 text-xs hover:underline bg-blue-50 px-2 py-1 rounded"><i className="fas fa-certificate"></i> View Certificate</a>}
                        </div>
                        <div className="bg-gray-50 p-3 rounded text-sm text-gray-700 mb-2">
                          {a.description}
                          {a.location && <div className="mt-1 text-xs text-gray-500 font-bold"><i className="fas fa-map-marker-alt mr-1"></i> {a.location}</div>}
                        </div>
                        <div className="text-sm text-gray-500"><i className="far fa-calendar mr-2"></i> {a.date} {a.endDate && `to ${a.endDate}`}</div>
                      </div>
                      <div className="w-full md:w-64 space-y-3">
                        <textarea onChange={(e) => setActionComment(e.target.value)} className="w-full border p-3 rounded text-sm h-24" placeholder="Rejection Reason..."></textarea>
                        <div className="grid grid-cols-2 gap-2">
                          <form action={async (fd) => { fd.append('id', a.id); fd.append('status', 'VERIFIED'); fd.append('comment', actionComment); await verifyAchievement(fd); refreshData(); }}>
                            <button className="w-full bg-green-600 text-white py-2 rounded font-bold text-xs hover:bg-green-700 shadow-sm"><i className="fas fa-check mr-1"></i> VERIFY</button>
                          </form>
                          <form action={async (fd) => { fd.append('id', a.id); fd.append('status', 'REJECTED'); fd.append('comment', actionComment); await verifyAchievement(fd); refreshData(); }}>
                            <button className="w-full bg-red-600 text-white py-2 rounded font-bold text-xs hover:bg-red-700 shadow-sm"><i className="fas fa-times mr-1"></i> REJECT</button>
                          </form>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        )}

        {activeTab === 'schedule' && (
          <div className="grid md:grid-cols-2 gap-12 animate-fade-in">
            {/* Left: Form */}
            <div>
              <h1 className="text-3xl font-bold text-gray-800 mb-6">Create Event</h1>
              <div className="bg-white p-8 rounded-lg shadow-sm border border-gray-200">
                <form action={async (fd) => { await createEvent(fd); alert('Event Published to Calendar'); refreshData(); }} className="space-y-5">

                  <div>
                    <label className="font-bold text-xs uppercase text-gray-500 mb-1.5 block">Event Type</label>
                    <select name="type" className="w-full border p-3 rounded bg-gray-50" onChange={handleTypeChange} value={eventType}>
                      <option value="Parade">Parade</option>
                      <option value="Theory">Theory Class</option>
                      <option value="Camp">Camp</option>
                      <option value="Event">Other Event</option>
                    </select>
                  </div>

                  <div>
                    <label className="font-bold text-xs uppercase text-gray-500 mb-1.5 block">Title (Auto-filled but editable)</label>
                    <input name="title" className="w-full border p-3 rounded" value={eventTitle} onChange={(e) => setEventTitle(e.target.value)} required />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div><label className="font-bold text-xs uppercase text-gray-500 mb-1.5 block">Date</label><input name="date" type="date" className="w-full border p-3 rounded" required /></div>
                    <div><label className="font-bold text-xs uppercase text-gray-500 mb-1.5 block">Location</label><input name="location" className="w-full border p-3 rounded" required /></div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div><label className="font-bold text-xs uppercase text-gray-500 mb-1.5 block">Start Time</label><input name="startTime" type="time" className="w-full border p-3 rounded" required /></div>
                    <div><label className="font-bold text-xs uppercase text-gray-500 mb-1.5 block">End Time</label><input name="endTime" type="time" className="w-full border p-3 rounded" required /></div>
                  </div>

                  <button className="w-full bg-ncc-navy text-white py-4 rounded font-bold hover:bg-black transition-colors shadow-lg">PUBLISH TO UNIT CALENDAR</button>
                </form>
              </div>
            </div>

            {/* Right: Calendar Preview */}
            <div>
              <h2 className="text-xl font-bold text-gray-400 mb-6">Live Schedule Preview</h2>
              <CalendarView />
              <div className="mt-6 bg-blue-50 p-4 rounded text-sm text-blue-800 border border-blue-100">
                <i className="fas fa-info-circle mr-2"></i> Events created here will be immediately visible to all 52 Cadets in their dashboard.
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
