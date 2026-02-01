import { supabase } from './supabase';

// Base Data Types
export type Rank = 'Cadet' | 'Lance Corporal' | 'Corporal' | 'Sergeant' | 'CSM' | 'CUO' | 'SUO';
export type Role = 'CADET' | 'ANO';
export type PermissionStatus = 'PENDING_SUO' | 'FORWARDED_TO_ANO' | 'REJECTED_BY_SUO' | 'APPROVED' | 'DECLINED_BY_ANO' | 'MEET_ANO';

export interface User {
  id: string;
  name: string;
  email: string;
  password: string;
  rank: Rank;
  role: Role;
  batchYear: number;
  regimentalNumber?: string;
  dob?: string;
  campCount?: number;
}

export interface Event {
  id: string;
  title: string;
  date: string; // YYYY-MM-DD
  startTime: string; // HH:mm (24h)
  endTime: string;   // HH:mm (24h)
  location: string;
  type: 'Parade' | 'Theory' | 'Camp' | 'Event';
}

export interface Permission {
  id: string;
  cadetId: string;
  cadetName: string;
  startDate: string;
  endDate: string;
  reason: string;
  evidenceUrl?: string;
  status: PermissionStatus;
  suoComment?: string;
  anoComment?: string;
  createdAt: string;
}

export interface Achievement {
  id: string;
  cadetId: string;
  title: string;
  date: string;
  endDate?: string;
  category: 'Camp' | 'Sports' | 'Cultural' | 'Drill' | 'Other';
  location?: string;
  description: string;
  certificateUrl?: string;
  status: 'DRAFT' | 'PENDING' | 'VERIFIED' | 'REJECTED';
  anoComment?: string;
  isVerified: boolean;
}

export interface Attendance {
  eventId: string;
  userId: string;
  status: 'Present' | 'Absent' | 'Late' | 'Permission';
  markedBy: string;
  timestamp?: string;
}

// Methods
export const getUsers = async (): Promise<User[]> => {
  const { data, error } = await supabase.from('users').select('*');
  if (error) { console.error('getUsers error', error); return []; }
  return data.map((u: any) => ({
    id: u.id,
    name: u.name,
    email: u.email,
    password: u.password,
    rank: u.rank,
    role: u.role,
    batchYear: u.batch_year,
    regimentalNumber: u.regimental_number,
    dob: u.dob,
    campCount: u.camp_count
  }));
};

export const saveUser = async (user: User) => {
  const payload = {
    id: user.id, // Supabase UUID must match if updating
    email: user.email,
    password: user.password,
    rank: user.rank,
    name: user.name,
    role: user.role,
    regimental_number: user.regimentalNumber,
    batch_year: user.batchYear,
    dob: user.dob,
    camp_count: user.campCount
  };
  // Upsert via ID if known, or Email
  const { error } = await supabase.from('users').upsert(payload, { onConflict: 'id' });
  if (error) console.error('saveUser error', error);
};

export const getEvents = async (): Promise<Event[]> => {
  const { data, error } = await supabase.from('events').select('*');
  if (error) { console.error('getEvents error', error); return []; }
  return data.map((e: any) => ({
    id: e.id,
    title: e.title,
    date: e.date,
    startTime: e.start_time,
    endTime: e.end_time,
    type: e.type,
    location: e.location
  }));
};

export const saveEvent = async (event: Event) => {
  const { error } = await supabase.from('events').upsert({
    id: event.id,
    title: event.title,
    date: event.date,
    start_time: event.startTime,
    end_time: event.endTime,
    type: event.type,
    location: event.location
  }, { onConflict: 'id' });
  if (error) console.error('saveEvent error', error);
};

export const getPermissions = async (): Promise<Permission[]> => {
  // Order by createdAt desc
  const { data, error } = await supabase.from('permissions').select('*').order('created_at', { ascending: false });
  if (error) { console.error('getPermissions error', error); return []; }
  return data.map((p: any) => ({
    id: p.id,
    cadetId: p.cadet_id,
    cadetName: p.cadet_name,
    startDate: p.start_date,
    endDate: p.end_date,
    reason: p.reason,
    evidenceUrl: p.evidence_url,
    status: p.status,
    suoComment: p.suo_comment,
    anoComment: p.ano_comment,
    createdAt: p.created_at
  }));
};

export const savePermission = async (perm: Permission) => {
  const { error } = await supabase.from('permissions').upsert({
    id: perm.id,
    cadet_id: perm.cadetId,
    cadet_name: perm.cadetName,
    start_date: perm.startDate,
    end_date: perm.endDate,
    reason: perm.reason,
    evidence_url: perm.evidenceUrl,
    status: perm.status,
    suo_comment: perm.suoComment,
    ano_comment: perm.anoComment,
    created_at: perm.createdAt
  }, { onConflict: 'id' });
  if (error) console.error('savePermission error', error);
};

export const getAchievements = async (): Promise<Achievement[]> => {
  const { data, error } = await supabase.from('achievements').select('*');
  if (error) { console.error('getAchievements error', error); return []; }
  return data.map((a: any) => ({
    id: a.id,
    cadetId: a.cadet_id,
    title: a.title,
    date: a.date,
    endDate: a.end_date, // Optional
    category: a.category,
    location: a.location,
    description: a.description,
    certificateUrl: a.certificate_url,
    status: a.status,
    isVerified: a.is_verified,
    anoComment: a.ano_comment
  }));
};

export const saveAchievement = async (ach: Achievement) => {
  const { error } = await supabase.from('achievements').upsert({
    id: ach.id,
    cadet_id: ach.cadetId,
    title: ach.title,
    date: ach.date,
    end_date: ach.endDate,
    category: ach.category,
    location: ach.location,
    description: ach.description,
    certificate_url: ach.certificateUrl,
    status: ach.status,
    is_verified: ach.isVerified,
    ano_comment: ach.anoComment
  }, { onConflict: 'id' });
  if (error) console.error('saveAchievement error', error);
};

export const getAttendance = async (): Promise<Attendance[]> => {
  const { data, error } = await supabase.from('attendance').select('*');
  if (error) { console.error('getAttendance error', error); return []; }
  return data.map((a: any) => ({
    eventId: a.event_id,
    userId: a.user_id,
    status: a.status,
    markedBy: a.marked_by,
    timestamp: a.timestamp
  }));
};

export const markAttendance = async (att: Attendance) => {
  const { error } = await supabase.from('attendance').upsert({
    event_id: att.eventId,
    user_id: att.userId,
    status: att.status,
    marked_by: att.markedBy,
    timestamp: new Date().toISOString()
  }, { onConflict: 'event_id, user_id' });
  if (error) console.error('markAttendance error', error);
};
