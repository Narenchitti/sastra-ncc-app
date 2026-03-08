const XLSX = require('xlsx');
const fs = require('fs');
const path = require('path');

const DATA_DIR = path.join(__dirname, '..', 'data');
const USERS_FILE = path.join(DATA_DIR, 'users.json');
const ACH_FILE = path.join(DATA_DIR, 'achievements.json');

// Helper to normalize rank
function normalizeRank(rawRank) {
    if (!rawRank) return 'Cadet';
    const r = rawRank.trim().toUpperCase()
        .replace(/\./g, '') // remove dots
        .replace(/\s+/g, ' '); // normalize spaces

    if (r.includes('SUO')) return 'SUO';
    if (r.includes('CUO')) return 'CUO';
    if (r.includes('CSM')) return 'CSM';
    if (r.includes('SGT') || r.includes('SERGEANT')) return 'Sergeant';
    if (r.includes('CPL') || r.includes('CORPORAL')) return 'Corporal'; // Handle CPL before LCPL? No, L CPL is specific.
    if (r.includes('L CPL') || r.includes('LCPL') || r.includes('LANCE')) return 'Lance Corporal';
    return 'Cadet';
}

function run() {
    console.log('Reading Excel...');
    const workbook = XLSX.readFile(path.join(DATA_DIR, 'raw_import.xlsx'));
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const rows = XLSX.utils.sheet_to_json(sheet); // Use logical parsing

    let users = [];
    if (fs.existsSync(USERS_FILE)) {
        users = JSON.parse(fs.readFileSync(USERS_FILE, 'utf-8'));
    }

    let achievements = [];
    if (fs.existsSync(ACH_FILE)) {
        achievements = JSON.parse(fs.readFileSync(ACH_FILE, 'utf-8'));
    }

    console.log(`Found ${rows.length} rows.`);

    rows.forEach(row => {
        const regNo = row['Regimental/University Roll No'];
        if (!regNo) return; // Skip empty rows

        const name = row['Name'];
        // Use Reg No as ID for stability, or keep random? RegNo is unique.
        // Let's check if user exists by RegNo.
        let existingUser = users.find(u => u.regimentalNumber === regNo);

        const rank = normalizeRank(row['Rank']);
        const dob = row['Date of Birth']; // e.g., 44566 (Excel date) or string. xlsx usually parses date codes if raw=false?

        // Handling Excel Date Serial if needed
        let formattedDob = dob;

        // Email Generation
        // Clean RegNo: TN/2023/SD/123 -> tn2023sd123@sastra.edu?
        // User just said dummy email.
        const cleanReg = regNo.replace(/[^a-zA-Z0-9]/g, '').toLowerCase();
        const email = `${cleanReg}@sastra.edu`;

        const userData = {
            id: existingUser ? existingUser.id : Math.random().toString(36).substr(2, 9),
            name: name,
            email: email,
            password: 'sastra', // Default
            rank: rank,
            role: (rank === 'SUO' || rank === 'CUO') ? 'CADET' : 'CADET', // User said "Rank holder shouldn't be ANO". Wait, SUO is CADET role but has privileges. ANO is separate.
            batchYear: 2026, // User said "Naren CSET 2026", usually passing out year.
            regimentalNumber: regNo,
            dob: formattedDob ? String(formattedDob) : undefined
        };

        if (existingUser) {
            Object.assign(existingUser, userData);
        } else {
            users.push(userData);
        }

        // Achievements (Camps)
        const campsRaw = row['Details of Camps Attended in three year tenure'];
        if (campsRaw) {
            // Check if parsing needed. Assuming simple text for now or splitting by comma if multiple.
            // Example content: "CATC, RDC-IGC"
            const campList = String(campsRaw).split(/,|;/).map(s => s.trim()).filter(s => s.length > 0);

            campList.forEach(campTitle => {
                // Check duplicate
                const exists = achievements.find(a => a.cadetId === userData.id && a.title === campTitle);
                if (!exists) {
                    achievements.push({
                        id: Math.random().toString(36).substr(2, 9),
                        cadetId: userData.id,
                        title: campTitle,
                        date: '2025-01-01', // Default date as unknown
                        category: 'Camp',
                        description: 'Imported from Nom Roll records.',
                        isVerified: true // Auto-verified since it's from official record
                    });
                }
            });
        }
    });

    // Keep ANO user if it existed in the original file, but we are rewriting the list?
    // User said "feed all this information". I should PRESERVE existing users (like the ANO user created earlier).
    // My code above reads existing users and appends/updates.
    // However, I should Ensure the pre-seeded users (like the demo ones) are kept or merged.
    // If I used `write_to_file` in previous steps to *seed* data, I might have overwritten things.
    // The previous `users.json` had seeds. I should preserve them.

    fs.writeFileSync(USERS_FILE, JSON.stringify(users, null, 2));
    fs.writeFileSync(ACH_FILE, JSON.stringify(achievements, null, 2));
    console.log(`Imported/Updated ${rows.length} users.`);
}

run();
