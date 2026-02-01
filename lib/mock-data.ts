// lib/mock-data.ts

// Types
export type Rank = 'Cadet' | 'Lance Corporal' | 'Corporal' | 'Sergeant' | 'CSM' | 'CUO' | 'SUO';
export type Role = 'CADET' | 'ANO';

export interface User {
  id: string;
  name: string;
  email: string;
  rank: Rank;
  role: Role;
  batch: string;
}

export interface Event {
  id: string;
  title: string;
  date: string; // YYYY-MM-DD
  time: string;
  type: 'Parade' | 'Theory' | 'Camp';
  location: string;
}

export interface Permission {
  id: string;
  cadetId: string;
  cadetName: string;
  reason: string;
  date: string;
  status: 'PENDING_SUO' | 'PENDING_ANO' | 'APPROVED' | 'REJECTED';
  comments?: string;
}

// Dummy Users
export const MOCK_USERS: User[] = [
  {
    id: '1',
    name: 'Cadet Naren',
    email: 'cadet@sastra.edu',
    rank: 'Cadet',
    role: 'CADET',
    batch: '2024'
  },
  {
    id: '2',
    name: 'SUO Sharma',
    email: 'suo@sastra.edu',
    rank: 'SUO',
    role: 'CADET',
    batch: '2023'
  },
  {
    id: '3',
    name: 'Lt. Commander Officer',
    email: 'ano@sastra.edu',
    rank: 'SUO', // Techinically officer rank but keeping simple for type
    role: 'ANO',
    batch: 'N/A'
  }
];

// Mock Schedule
export const MOCK_EVENTS: Event[] = [
  {
    id: '101',
    title: 'Regular Drill Parade',
    date: '2026-02-02',
    time: '06:00 AM',
    type: 'Parade',
    location: 'OAT Ground'
  },
  {
    id: '102',
    title: 'Map Reading Theory',
    date: '2026-02-04',
    time: '05:00 PM',
    type: 'Theory',
    location: 'Vidyut Vihar'
  }
];

// Mock Permissions
export const MOCK_PERMISSIONS: Permission[] = [
  {
    id: 'p1',
    cadetId: '1',
    cadetName: 'Cadet Naren',
    reason: 'Medical Emergency (Fever)',
    date: '2026-02-02',
    status: 'PENDING_SUO'
  }
];
