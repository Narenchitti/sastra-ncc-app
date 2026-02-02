'use server';

import {
    getUsers,
    getEvents,
    getPermissions,
    getAchievements,
    savePermission,
    saveAchievement,
    Permission,
    Achievement,
    User,
    getAttendance,
    markAttendance,
    saveEvent,
    Event,
    Attendance
} from '@/lib/db';
import { revalidatePath } from 'next/cache';
import { supabase } from '@/lib/supabase'; // Direct access for deletions
import crypto from 'crypto';

// --- HELPER: FILE UPLOAD (Unchanged) ---
// --- HELPER: FILE UPLOAD (Supabase Storage) ---
async function saveFile(file: File, folder: string): Promise<string | undefined> {
    try {
        if (!file || file.size === 0) return undefined;

        const bytes = await file.arrayBuffer();
        const buffer = Buffer.from(bytes);

        // Sanitize filename
        const fileName = `${Date.now()}-${file.name.replace(/[^a-zA-Z0-9.]/g, '_')}`;

        // Upload to Supabase Storage
        // Note: User must create 'uploads' and 'certificates' buckets in Supabase Dashboard
        const bucketName = folder === 'certificates' ? 'certificates' : 'uploads';

        const { data, error } = await supabase.storage
            .from(bucketName)
            .upload(fileName, buffer, {
                contentType: file.type,
                upsert: false
            });

        if (error) {
            console.error('Supabase Upload Error:', error);
            return undefined;
        }

        const { data: publicUrlData } = supabase.storage
            .from(bucketName)
            .getPublicUrl(fileName);

        return publicUrlData.publicUrl;

    } catch (e) {
        console.error('File save error:', e);
        return undefined;
    }
}

// --- AUTH ---
export async function loginAction(formData: FormData) {
    const email = formData.get('email') as string;
    const password = formData.get('password') as string;

    const users = await getUsers();
    const user = users.find(u => u.email === email && u.password === password);
    if (!user) return { success: false, message: 'Invalid Credentials' };

    return { success: true, user: user };
}

// --- DASHBOARD DATA ---
export async function getDashboardData() {
    const [events, permissions, achievements, attendance, users] = await Promise.all([
        getEvents(),
        getPermissions(),
        getAchievements(),
        getAttendance(),
        getUsers()
    ]);
    return { events, permissions, achievements, attendance, users };
}

// --- ATTENDANCE REGISTER LOGIC ---
export async function getAttendanceSheet(eventId: string, dateStr: string) {
    const [allUsers, permissions, attendanceList, allEvents] = await Promise.all([
        getUsers(),
        getPermissions(),
        getAttendance(),
        getEvents()
    ]);

    const users = allUsers.filter(u => u.role === 'CADET');
    const attendance = attendanceList.filter(a => a.eventId === eventId);
    const event = allEvents.find(e => e.id === eventId);

    // Merge Data
    const sheet = users.map(u => {
        const hasPerm = permissions.find(p =>
            p.cadetId === u.id &&
            p.status.includes('APPROVED') &&
            dateStr >= p.startDate && dateStr <= p.endDate
        );
        const marked = attendance.find(a => a.userId === u.id);

        return {
            ...u,
            existingStatus: marked?.status,
            permissionType: hasPerm ? hasPerm.reason : null,
            autoPermission: !!hasPerm
        };
    });

    return { sheet, event };
}

export async function submitBulkAttendance(eventId: string, records: { userId: string, status: string }[], markedBy: string) {
    await Promise.all(records.map(r =>
        markAttendance({
            eventId,
            userId: r.userId,
            status: r.status as any,
            markedBy
        })
    ));
    revalidatePath('/dashboard');
    return { success: true };
}

// --- SUBMIT PERMISSION ---
export async function submitPermission(formData: FormData) {
    const cadetId = formData.get('cadetId') as string;
    const cadetName = formData.get('cadetName') as string;
    const reason = formData.get('reason') as string;
    const startDate = formData.get('startDate') as string;
    const endDate = formData.get('endDate') as string;
    const evidenceFile = formData.get('evidence') as File | null;

    let evidenceUrl = undefined;
    if (evidenceFile && evidenceFile.size > 0) {
        evidenceUrl = await saveFile(evidenceFile, 'uploads');
    }

    // Determine Status based on User Role (SUO Bypass)
    const users = await getUsers();
    const requester = users.find(u => u.id === cadetId);
    const isSuo = requester?.rank === 'SUO' || requester?.rank === 'CUO';

    // If SUO, go straight to ANO (FORWARDED implies SUO approved/passed it)
    // If Normal Cadet, go to PENDING_SUO
    const initialStatus = isSuo ? 'FORWARDED_TO_ANO' : 'PENDING_SUO';

    const newPermission: Permission = {
        id: crypto.randomUUID(),
        cadetId,
        cadetName,
        startDate,
        endDate,
        reason,
        evidenceUrl,
        status: initialStatus,
        createdAt: new Date().toISOString()
    };

    await savePermission(newPermission);
    revalidatePath('/dashboard');
    return { success: true, message: 'Permission Request Submitted' };
}

// --- SUBMIT ACHIEVEMENT ---
export async function submitAchievement(formData: FormData) {
    const cadetId = formData.get('cadetId') as string;
    const id = formData.get('id') as string | null;
    const title = formData.get('title') as string;
    const category = formData.get('category') as any;
    const description = formData.get('description') as string;
    const date = formData.get('date') as string;
    const endDate = formData.get('endDate') as string | undefined;
    const location = formData.get('location') as string | undefined;
    const certFile = formData.get('certificate') as File | null;

    let certificateUrl = undefined;
    if (certFile && certFile.size > 0) {
        certificateUrl = await saveFile(certFile, 'certificates');
    }

    // Preserve existing certificate for edits
    let finalCertUrl = certificateUrl;
    let currentStatus: any = 'DRAFT'; // Default for new

    if (id) {
        // Need to fetch individual or filter all. Filtering all is easier for now.
        const allAchs = await getAchievements();
        const existing = allAchs.find(a => a.id === id);
        if (existing) {
            if (!finalCertUrl) finalCertUrl = existing.certificateUrl;
            // If editing, it goes back to DRAFT so they have to resubmit
            currentStatus = 'DRAFT';
        }
    }

    const newAch: Achievement = {
        id: id || crypto.randomUUID(),
        cadetId,
        title,
        date,
        endDate: category === 'Camp' ? endDate : undefined,
        category,
        location,
        description,
        certificateUrl: finalCertUrl,
        isVerified: false,
        status: currentStatus
    };

    await saveAchievement(newAch);
    revalidatePath('/dashboard');
    return { success: true, message: id ? 'Achievement Updated (Draft)' : 'Achievement Saved as Draft' };
}

export async function submitAchievementForVerification(formData: FormData) {
    const id = formData.get('id') as string;
    const achs = await getAchievements();
    const ach = achs.find(a => a.id === id);
    if (!ach) return { success: false, message: 'Not found' };

    ach.status = 'PENDING';
    await saveAchievement(ach);
    revalidatePath('/dashboard');
    return { success: true, message: 'Submitted for Verification' };
}

export async function verifyAchievement(formData: FormData) {
    const id = formData.get('id') as string;
    const status = formData.get('status') as any; // VERIFIED | REJECTED
    const comment = formData.get('comment') as string;

    const achs = await getAchievements();
    const ach = achs.find(a => a.id === id);
    if (!ach) return { success: false, message: 'Not found' };

    ach.status = status;
    ach.isVerified = (status === 'VERIFIED');
    ach.anoComment = comment;

    await saveAchievement(ach);
    revalidatePath('/dashboard');
    return { success: true, message: `Achievement ${status === 'VERIFIED' ? 'Verified' : 'Rejected'}` };
}

export async function deletePermission(formData: FormData) {
    const id = formData.get('id') as string;
    // Direct Delete via Supabase
    const { error } = await supabase.from('permissions').delete().eq('id', id);
    if (error) return { success: false, message: 'Failed to delete' };

    revalidatePath('/dashboard');
    return { success: true, message: 'Permission Request Withdrawn' };
}

export async function deleteAchievement(formData: FormData) {
    const id = formData.get('id') as string;
    const { error } = await supabase.from('achievements').delete().eq('id', id);
    if (error) return { success: false, message: 'Failed to delete' };

    revalidatePath('/dashboard');
    return { success: true, message: 'Achievement Deleted' };
}

// --- ANO/SUO ACTIONS ---
export async function updatePermissionStatus(formData: FormData) {
    const permId = formData.get('permId') as string;
    const status = formData.get('status') as any;
    const comment = formData.get('comment') as string;
    const role = formData.get('role') as string;

    const perms = await getPermissions();
    const index = perms.findIndex(p => p.id === permId);
    if (index === -1) return { success: false, message: 'Permission not found' };

    const p = perms[index];
    p.status = status;
    if (role === 'SUO') p.suoComment = comment;
    if (role === 'ANO') p.anoComment = comment;

    await savePermission(p);
    revalidatePath('/dashboard');
    return { success: true };
}


export async function deleteEvent(formData: FormData) {
    const id = formData.get('id') as string;
    const { error } = await supabase.from('events').delete().eq('id', id);
    if (error) return { success: false, message: 'Failed to delete event' };

    revalidatePath('/dashboard');
    return { success: true, message: 'Event Deleted' };
}

export async function createEvent(formData: FormData) {
    const id = formData.get('id') as string | null; // Optional ID for updates
    const title = formData.get('title') as string;
    const date = formData.get('date') as string;
    const startTime = formData.get('startTime') as string;
    const endTime = formData.get('endTime') as string;
    const type = formData.get('type') as any;
    const location = formData.get('location') as string;

    await saveEvent({
        id: id || crypto.randomUUID(), // Use existing ID if provided
        title, date, startTime, endTime, type, location
    });
    revalidatePath('/dashboard');
    return { success: true, message: id ? 'Event Updated' : 'Event Created' };
}


