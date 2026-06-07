'use server';

import { revalidatePath } from 'next/cache';
import { apiClient } from '@/lib/api-client';
import crypto from 'crypto';

// --- NEWS ACTION ---
export async function getArmyNews() {
    try {
        return await apiClient.get('/news');
    } catch (error) {
        console.error("News Fetch Error:", error);
        return [];
    }
}

// --- PUBLIC EVENTS ACTION ---
export async function getPublicEvents() {
    try {
        return await apiClient.get('/events/public');
    } catch (error) {
        console.error("Public Events Fetch Error:", error);
        return [];
    }
}

// --- HELPER: FILE UPLOAD (Mocked/Placeholder for now as Storage needs backend handling) ---
// In a real 2026 standard, file uploads would go through a backend endpoint with signed URLs
async function saveFile(file: File, folder: string): Promise<string | undefined> {
    // For now, keeping it as is but it should eventually be moved to backend
    // Since we removed supabase from frontend, this will need a backend endpoint
    // For the initial shift, we'll mark this as a TODO or implement a simple backend upload
    console.warn("File upload needs backend implementation for full decoupling");
    return undefined;
}

// --- AUTH ---
export async function loginAction(formData: FormData) {
    const email = formData.get('email') as string;
    const password = formData.get('password') as string;

    try {
        const result = await apiClient.post('/auth/login', { email, password });
        if (result.success && result.accessToken) {
            const { cookies } = await import('next/headers');
            cookies().set('access_token', result.accessToken, {
                httpOnly: true,
                secure: process.env.NODE_ENV === 'production',
                sameSite: 'lax',
                path: '/',
            });
        }
        return result;
    } catch (error: any) {
        return { success: false, message: error.message || 'Invalid Credentials' };
    }
}

// --- DASHBOARD DATA ---
export async function getDashboardData() {
    try {
        const data = await apiClient.get('/dashboard');
        return data;
    } catch (error: any) {
        console.error("Dashboard Data Fetch Error:", error);
        return { events: [], permissions: [], achievements: [], attendance: [], users: [], permissionManagerId: null, fetchError: error.message || 'Unknown fetch error' };
    }
}

// --- UNIT CONFIG: Assign Permission Manager (ANO only) ---
export async function updatePermissionManager(formData: FormData) {
    const managerId = formData.get('managerId') as string;
    if (!managerId) return { success: false, message: 'No manager selected' };
    try {
        await apiClient.put('/unit-config', { permissionManagerId: managerId });
        return { success: true };
    } catch (error: any) {
        return { success: false, message: error.message || 'Failed to update manager' };
    }
}

// --- ATTENDANCE REGISTER LOGIC ---
export async function getAttendanceSheet(eventId: string, dateStr: string) {
    const data = await getDashboardData();
    const { users: allUsers, permissions, attendance: attendanceList, events: allEvents } = data;

    const users = allUsers.filter((u: any) => u.role === 'CADET');
    const attendance = attendanceList.filter((a: any) => a.eventId === eventId);
    const event = allEvents.find((e: any) => e.id === eventId);

    // Merge Data
    const sheet = users.map((u: any) => {
        const hasPerm = permissions.find((p: any) =>
            p.cadetId === u.id &&
            p.status.includes('APPROVED') &&
            dateStr >= p.startDate && dateStr <= p.endDate
        );
        const marked = attendance.find((a: any) => a.userId === u.id);

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
    try {
        await apiClient.post('/attendance/bulk', { eventId, records, markedBy });
        revalidatePath('/dashboard');
        return { success: true };
    } catch (error) {
        return { success: false };
    }
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
    // TODO: Implement backend file upload
    /*
    if (evidenceFile && evidenceFile.size > 0) {
        evidenceUrl = await saveFile(evidenceFile, 'uploads');
    }
    */

    const data = await getDashboardData();
    // Always start as PENDING_REVIEW so both ANO and Manager (SUO/CUO) see it immediately
    const initialStatus = 'PENDING_REVIEW';

    const newPermission = {
        id: crypto.randomUUID(),
        cadet_id: cadetId,
        cadet_name: cadetName,
        start_date: startDate,
        end_date: endDate,
        reason,
        evidence_url: evidenceUrl,
        status: initialStatus,
        created_at: new Date().toISOString()
    };

    await apiClient.post('/permissions', newPermission);
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
    // TODO: Implement backend file upload

    let finalCertUrl = certificateUrl;
    let currentStatus: any = 'DRAFT';

    if (id) {
        const achs = await apiClient.get('/achievements');
        const existing = achs.find((a: any) => a.id === id);
        if (existing) {
            if (!finalCertUrl) finalCertUrl = existing.certificate_url;
            currentStatus = 'DRAFT';
        }
    }

    const newAch = {
        id: id || crypto.randomUUID(),
        cadet_id: cadetId,
        title,
        date,
        end_date: category === 'Camp' ? endDate : undefined,
        category,
        location,
        description,
        certificate_url: finalCertUrl,
        is_verified: false,
        status: currentStatus
    };

    await apiClient.post('/achievements', newAch);
    revalidatePath('/dashboard');
    return { success: true, message: id ? 'Achievement Updated (Draft)' : 'Achievement Saved as Draft' };
}

export async function submitAchievementForVerification(formData: FormData) {
    const id = formData.get('id') as string;
    const achs = await apiClient.get('/achievements');
    const ach = achs.find((a: any) => a.id === id);
    if (!ach) return { success: false, message: 'Not found' };

    ach.status = 'PENDING';
    await apiClient.post('/achievements', ach);
    revalidatePath('/dashboard');
    return { success: true, message: 'Submitted for Verification' };
}

export async function verifyAchievement(formData: FormData) {
    const id = formData.get('id') as string;
    const status = formData.get('status') as any;
    const comment = formData.get('comment') as string;

    const achs = await apiClient.get('/achievements');
    const ach = achs.find((a: any) => a.id === id);
    if (!ach) return { success: false, message: 'Not found' };

    ach.status = status;
    ach.is_verified = (status === 'VERIFIED');
    ach.ano_comment = comment;

    await apiClient.post('/achievements', ach);
    revalidatePath('/dashboard');
    return { success: true, message: `Achievement ${status === 'VERIFIED' ? 'Verified' : 'Rejected'}` };
}

export async function deletePermission(formData: FormData) {
    const id = formData.get('id') as string;
    try {
        await apiClient.delete(`/permissions/${id}`);
        revalidatePath('/dashboard');
        return { success: true, message: 'Permission Request Withdrawn' };
    } catch (error: any) {
        return { success: false, message: error.message || 'Failed to withdraw permission' };
    }
}

export async function deleteAchievement(formData: FormData) {
    const id = formData.get('id') as string;
    try {
        await apiClient.delete(`/achievements/${id}`);
        revalidatePath('/dashboard');
        return { success: true, message: 'Achievement Deleted' };
    } catch (error: any) {
        return { success: false, message: error.message || 'Failed to delete achievement' };
    }
}

// --- ANO/SUO ACTIONS ---
export async function updatePermissionStatus(formData: FormData) {
    const permId = formData.get('permId') as string;
    const status = formData.get('status') as any;
    const comment = formData.get('comment') as string;
    const role = formData.get('role') as string;

    const perms = await apiClient.get('/permissions');
    const index = perms.findIndex((p: any) => p.id === permId);
    if (index === -1) return { success: false, message: 'Permission not found' };

    const p = perms[index];
    p.status = status;
    if (role === 'SUO') p.suo_comment = comment;
    if (role === 'ANO') p.ano_comment = comment;

    await apiClient.post('/permissions', p);
    revalidatePath('/dashboard');
    return { success: true };
}

export async function deleteEvent(formData: FormData) {
    const id = formData.get('id') as string;
    try {
        await apiClient.delete(`/events/${id}`);
        revalidatePath('/dashboard');
        return { success: true, message: 'Event Deleted' };
    } catch (error: any) {
        return { success: false, message: error.message || 'Failed to delete event' };
    }
}

export async function createEvent(formData: FormData) {
    const id = formData.get('id') as string | null;
    const title = formData.get('title') as string;
    const date = formData.get('date') as string;
    const startTime = formData.get('startTime') as string;
    const endTime = formData.get('endTime') as string;
    const type = formData.get('type') as any;
    const location = formData.get('location') as string;

    await apiClient.post('/events', {
        id: id || crypto.randomUUID(),
        title, date, start_time: startTime, end_time: endTime, type, location
    });
    revalidatePath('/dashboard');
    return { success: true, message: id ? 'Event Updated' : 'Event Created' };
}


