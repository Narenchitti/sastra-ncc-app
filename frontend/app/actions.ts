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

// --- HELPER: FILE UPLOAD ---
async function saveFile(file: File, folder: string): Promise<string | undefined> {
    if (!file || file.size === 0) return undefined;
    
    let token: string | null = null;
    try {
        const { cookies } = await import('next/headers');
        const cookieStore = cookies();
        token = cookieStore.get('access_token')?.value || null;
    } catch (e) {
        console.error("Token retrieval failed in saveFile", e);
    }
    
    const formData = new FormData();
    formData.append('file', file);
    
    const headers: Record<string, string> = {};
    if (token) {
        headers['Authorization'] = `Bearer ${token}`;
    }
    
    const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8000/api';
    
    try {
        const res = await fetch(`${API_URL}/upload`, {
            method: 'POST',
            body: formData,
            headers,
        });
        if (!res.ok) {
            throw new Error(`Upload failed with status: ${res.status}`);
        }
        const data = await res.json();
        return data.url;
    } catch (error) {
        console.error("File upload error:", error);
        return undefined;
    }
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
    if (evidenceFile && evidenceFile.size > 0) {
        evidenceUrl = await saveFile(evidenceFile, 'uploads');
    }

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
    if (certFile && certFile.size > 0) {
        certificateUrl = await saveFile(certFile, 'uploads');
    }

    let finalCertUrl = certificateUrl;
    let currentStatus: any = 'DRAFT';

    if (id) {
        const achs = await apiClient.get('/achievements');
        const existing = achs.find((a: any) => a.id === id);
        if (existing) {
            if (!finalCertUrl) finalCertUrl = existing.certificateUrl;
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
    ach.isVerified = (status === 'VERIFIED');
    ach.anoComment = comment;

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
    if (role === 'SUO') p.suoComment = comment;
    if (role === 'ANO') p.anoComment = comment;

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


// --- COMMAND CENTER ACTION ---
export async function runNaturalLanguageQuery(query: string) {
    try {
        const result = await apiClient.post('/query', { query });
        if (result.success === false) {
            return { success: false, ...result, message: result.explanation || 'Query execution failed' };
        }
        return { success: true, ...result };
    } catch (error: any) {
        return { success: false, message: error.message || 'Query execution failed' };
    }
}


// --- SYLLABUS SCHEDULER ACTIONS ---
export async function generateSchedulePlan(query: string) {
    try {
        const result = await apiClient.post('/schedule/plan', { query });
        if (result.success === false) {
            return { success: false, ...result, message: result.explanation || 'Schedule generation failed' };
        }
        return { success: true, ...result };
    } catch (error: any) {
        return { success: false, message: error.message || 'Schedule generation failed' };
    }
}

export async function publishBulkEvents(events: Array<any>) {
    try {
        const result = await apiClient.post('/events/bulk', { events });
        return { success: true, ...result };
    } catch (error: any) {
        return { success: false, message: error.message || 'Bulk publication failed' };
    }
}

export async function getTelemetryTraces() {
    try {
        return await apiClient.get('/telemetry/traces');
    } catch (error: any) {
        console.error("Telemetry Fetch Error:", error);
        return [];
    }
}


// --- CADET SIGNUP & APPROVAL ACTIONS ---

export async function signupAction(formData: FormData) {
    const name = formData.get('name') as string;
    const email = formData.get('email') as string;
    const password = formData.get('password') as string;
    const rank = formData.get('rank') as string;
    const regimentalNumber = formData.get('regimentalNumber') as string;
    const registrationNumber = formData.get('registrationNumber') as string;
    const dob = formData.get('dob') as string;
    const yearBranch = formData.get('yearBranch') as string;
    const hostelInfo = formData.get('hostelInfo') as string;
    const batchYear = parseInt(formData.get('batchYear') as string || '2026', 10);

    try {
        const result = await apiClient.post('/auth/signup', {
            name,
            email,
            password,
            rank,
            regimentalNumber,
            registrationNumber,
            dob,
            yearBranch,
            hostelInfo,
            batchYear
        });
        return result;
    } catch (error: any) {
        return { success: false, message: error.message || 'Registration failed' };
    }
}

export async function getPendingUsers() {
    try {
        return await apiClient.get('/users/pending');
    } catch (error: any) {
        console.error("Failed to fetch pending signups:", error);
        return [];
    }
}

export async function approveUserAction(userId: string, status: 'APPROVED' | 'REJECTED') {
    try {
        const result = await apiClient.put(`/users/${userId}/approve`, { status });
        revalidatePath('/dashboard');
        return result;
    } catch (error: any) {
        return { success: false, message: error.message || 'Failed to update user status' };
    }
}

// --- PUBLIC INQUIRIES & BROADCAST ALERTS ACTIONS ---

export async function submitInquiryAction(formData: FormData) {
    const name = formData.get('name') as string;
    const email = formData.get('email') as string;
    const message = formData.get('message') as string;
    const subscribed = formData.get('subscribed') !== 'false';

    try {
        const result = await apiClient.post('/inquiries', {
            name,
            email,
            message,
            subscribed
        });
        return result;
    } catch (error: any) {
        return { success: false, message: error.message || 'Submission failed' };
    }
}

export async function getInquiriesAction() {
    try {
        return await apiClient.get('/inquiries');
    } catch (error: any) {
        console.error("Failed to fetch public inquiries:", error);
        return [];
    }
}

export async function replyToInquiryAction(inquiryId: string, replyMessage: string) {
    try {
        const result = await apiClient.post(`/inquiries/${inquiryId}/reply`, { replyMessage });
        revalidatePath('/dashboard');
        return result;
    } catch (error: any) {
        return { success: false, message: error.message || 'Failed to submit reply' };
    }
}

export async function broadcastAlertAction(subject: string, message: string) {
    try {
        const result = await apiClient.post('/inquiries/broadcast', { subject, message });
        revalidatePath('/dashboard');
        return result;
    } catch (error: any) {
        return { success: false, message: error.message || 'Failed to send broadcast alert' };
    }
}




