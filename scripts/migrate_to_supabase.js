const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto'); // For generating UUIDs
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error('❌ Missing Credentials in .env.local');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);
const DATA_DIR = path.join(process.cwd(), 'data');

function readJson(file) {
    try {
        const raw = fs.readFileSync(path.join(DATA_DIR, file), 'utf-8');
        return JSON.parse(raw);
    } catch (e) {
        return [];
    }
}

// Maps to store Old ID -> New UUID
const userMap = {};
const eventMap = {};

async function migrate() {
    console.log('🚀 Starting Migration to Supabase (Fixing UUIDs)...');

    // Clean start? Maybe optional, but safest for this script
    // await supabase.from('attendance').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    // await supabase.from('permissions').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    // await supabase.from('achievements').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    // await supabase.from('events').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    // await supabase.from('users').delete().neq('id', '00000000-0000-0000-0000-000000000000');

    // 1. Users
    const users = readJson('users.json');
    const usersToInsert = [];

    if (users.length > 0) {
        console.log(`Processing ${users.length} Users...`);
        for (const u of users) {
            const newId = crypto.randomUUID();
            userMap[u.id] = newId;

            usersToInsert.push({
                id: newId,
                email: u.email,
                password: u.password,
                rank: u.rank,
                name: u.name,
                role: u.role,
                regimental_number: u.regimentalNumber,
                batch_year: u.batchYear,
                camp_count: u.campCount
            });
        }

        // Upsert users (Note: upserting by ID is new, but if email conflicts it might fail if we don't handle it. 
        // Ideally we check if email exists. But for clean migration, insert is fine.)
        // We handle email conflict by ignoring duplicates or just error log.
        // Actually, upsert on conflict 'email' is better if schema supports it, but our Schema has unique email constraint.
        const { error } = await supabase.from('users').upsert(usersToInsert, { onConflict: 'email', ignoreDuplicates: false });
        // IF upsert updates, we lose the mapping if we don't fetch back. 
        // For simplicity: We assume the DB is empty or we overwrite.
        if (error) console.error('Error migrating users:', error);

        // Refetch users to ensure map is correct (in case of upsert returning existing ID)
        const { data: savedUsers } = await supabase.from('users').select('id, email');
        if (savedUsers) {
            // Rebuild map based on Email match since we can't trust randomUUID if row existed
            savedUsers.forEach(su => {
                const oldUser = users.find(u => u.email === su.email);
                if (oldUser) userMap[oldUser.id] = su.id;
            });
        }
    }

    // 2. Events
    const events = readJson('events.json');
    const eventsToInsert = [];
    if (events.length > 0) {
        console.log(`Processing ${events.length} Events...`);
        for (const e of events) {
            const newId = crypto.randomUUID();
            eventMap[e.id] = newId;
            eventsToInsert.push({
                id: newId,
                title: e.title,
                date: e.date,
                start_time: e.startTime,
                end_time: e.endTime,
                type: e.type,
                location: e.location
            });
        }
        const { error } = await supabase.from('events').upsert(eventsToInsert);
        if (error) console.error('Error migrating events:', error);
    }

    // 3. Achievements
    const achievements = readJson('achievements.json');
    const achsToInsert = [];
    if (achievements.length > 0) {
        console.log(`Processing ${achievements.length} Achievements...`);
        for (const a of achievements) {
            const userId = userMap[a.cadetId];
            if (!userId) {
                console.warn(`Skipping achievement ${a.title}: Cadet ID ${a.cadetId} not found in map.`);
                continue;
            }
            achsToInsert.push({
                // id: a.id, // Leave ID blank to generate new UUID, or map it if needed. Old IDs are strings too 'e.g. 0.3323'.
                // Better generate new UUIDs for achievements
                cadet_id: userId,
                title: a.title,
                date: a.date,
                end_date: a.endDate,
                category: a.category,
                location: a.location,
                description: a.description,
                certificate_url: a.certificateUrl,
                status: a.status,
                is_verified: a.isVerified,
                ano_comment: a.anoComment
            });
        }
        const { error } = await supabase.from('achievements').insert(achsToInsert); // Insert is safer as we have no unique key other than ID
        if (error) console.error('Error migrating achievements:', error);
    }

    // 4. Permissions
    const permissions = readJson('permissions.json');
    const permsToInsert = [];
    if (permissions.length > 0) {
        console.log(`Processing ${permissions.length} Permissions...`);
        for (const p of permissions) {
            const userId = userMap[p.cadetId];
            if (!userId) {
                console.warn(`Skipping permission: Cadet ID ${p.cadetId} not found.`);
                continue;
            }
            permsToInsert.push({
                cadet_id: userId,
                cadet_name: p.cadetName,
                start_date: p.startDate,
                end_date: p.endDate,
                reason: p.reason,
                evidence_url: p.evidenceUrl,
                status: p.status,
                suo_comment: p.suoComment,
                ano_comment: p.anoComment,
                created_at: p.createdAt
            });
        }
        const { error } = await supabase.from('permissions').insert(permsToInsert);
        if (error) console.error('Error migrating permissions:', error);
    }

    // 5. Attendance
    const attendance = readJson('attendance.json');
    const attToInsert = [];
    if (attendance.length > 0) {
        console.log(`Processing ${attendance.length} Attendance Records...`);
        for (const a of attendance) {
            const eid = eventMap[a.eventId];
            const uid = userMap[a.userId];
            const markerId = userMap[a.markedBy];

            if (eid && uid) {
                attToInsert.push({
                    event_id: eid,
                    user_id: uid,
                    status: a.status,
                    marked_by: markerId, // Can be null if marker not found
                    timestamp: a.timestamp
                });
            }
        }
        const { error } = await supabase.from('attendance').upsert(attToInsert, { onConflict: 'event_id, user_id' }); // Unique constraint exists
        if (error) console.error('Error migrating attendance:', error);
    }

    console.log('✅ Migration Complete!');
}

migrate();
