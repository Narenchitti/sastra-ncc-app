export type Rank = 'Cadet' | 'Lance Corporal' | 'Corporal' | 'Sergeant' | 'CSM' | 'CUO' | 'SUO';
export type Role = 'CADET' | 'ANO';
export type PermissionStatus = 'PENDING_SUO' | 'FORWARDED_TO_ANO' | 'REJECTED_BY_SUO' | 'APPROVED' | 'DECLINED_BY_ANO' | 'MEET_ANO';

export interface User {
    id: string;
    name: string;
    email: string;
    password?: string;
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
    date: string;
    startTime: string;
    endTime: string;
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
