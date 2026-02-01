const fs = require('fs');
const path = require('path');

const DATA_DIR = path.join(__dirname, '..', 'data');
const USERS_FILE = path.join(DATA_DIR, 'users.json');
const ACH_FILE = path.join(DATA_DIR, 'achievements.json');

// User Input Data (Raw)
const rawInput = [
    "1. CATC THRC, PERAMBALUR ( 21/12/2024 - 30/12/2024).",
    "2. CATC CUM PRE IGC TRAINING SHOOTING CAMP AT SRM TRP ENGINEERING COLLEGE, IRUNGALUR FROM (07 APR TO 16 APR 2025).",
    "3. GP FIRING TEAM TRAINING \u2013 II CAMP AT SRM TRP ENGINEERING COLLEGE, IRUNGALUR FROM (03 MAY 2025 TO 12 MAY 2025).",
    "4. GP FIRING TEAM TRAINING \u2013 III CAMP AT SRM TRP ENGINEERING COLLEGE, IRUNGALUR FROM (16 MAY 2025 TO 24 MAY 2025).",
    "5. INTER-GP SHOOTING CHAMPIONSHIP CUM SELECTION TRIALS BEING HELD AT KONGU ENGINEERING COLLEGE, PERUNDURAI FROM (26 MAY TO 04 JUNE 2025).",
    "6. IDSSC TRG-I  AT SRM TRP ENGINEERING COLLEGE, IRUNGALUR, (23 JUNE TO 02 JULY 2025), TRICHY.",
    "7. IDSSC TRG-II AT NEHRU INSTITUTE OF TECHNOLOGY, (04 JULY TO 11 JULY 2025), COIMBATORE.",
    "8. CATC CUM IDSSC TRG-III,KONGU ENGINEERING COLLEGE, PERUNDURAI,ERODE,(14 JULY TO 21 JULY 2025).",
    "9. IDSSC LAUNCH ,AT DHANALAKSHMI ENGINEERING UNIVERSITY, TRICHY,(24 JULY TO 02 AUGUST 2025).",
    "10. 50TH STATE SHOOTING COMPETITION, LAUNCH CAMP AT VCW,ERODE, (30 AUGUST TO 05 SEPTEMBER), COIMBATORE.",
    "11. 50TH STATE SHOOTING COMPETITION AT INDIAN AIR FORCE STATION , THAMBARAM,FROM (06 SEPTEMBER TO 16 SEPTEMBER 2025).",
    "12. 16TH SOUTHZONE SHOOTING COMPETITION , TRICHY RIFLE CLUB,( 21 SEPTEMBER TO 26 SEPTEMBER 2025).",
    "13. 34TH ALL INDIA G.V.MAVLANKAR SHOOTING CHAMPIONSHIP 2025,BHOPAL,(09/10/2025-15/10/2025)."
];

// Month Map
const months = {
    'JAN': '01', 'FEB': '02', 'MAR': '03', 'APR': '04', 'MAY': '05', 'JUN': '06',
    'JUL': '07', 'AUG': '08', 'SEP': '09', 'OCT': '10', 'NOV': '11', 'DEC': '12',
    'SEPTEMBER': '09', 'OCTOBER': '10', 'AUGUST': '08', 'JULY': '07', 'JUNE': '06', 'MAY': '05'
};

// Helper: Normalize Date to YYYY-MM-DD
function parseDate(dateStr, defaultYear) {
    if (!dateStr) return '';
    let clean = dateStr.trim().replace(/\./g, '/').replace(/-/, '/'); // 21/12/2024 or 21-12-2024

    // Check for "07 APR" format
    const partsSpace = clean.split(' ');
    if (partsSpace.length >= 2) {
        const day = partsSpace[0].padStart(2, '0');
        const monthStr = partsSpace[1].toUpperCase();
        let month = months[monthStr] || '01';

        let year = defaultYear || '2025';
        if (partsSpace.length > 2) year = partsSpace[2];
        if (year.length === 2) year = '20' + year;

        return `${year}-${month}-${day}`;
    }

    // Standard DD/MM/YYYY
    const parts = clean.split('/');
    if (parts.length < 2) return clean;

    let d = parts[0].padStart(2, '0');
    let m = parts[1].padStart(2, '0');
    let y = parts.length > 2 ? parts[2] : defaultYear || '2025';

    if (y.length === 2) y = '20' + y;
    return `${y}-${m}-${d}`;
}

function run() {
    const users = JSON.parse(fs.readFileSync(USERS_FILE, 'utf-8'));
    const allAchievements = JSON.parse(fs.readFileSync(ACH_FILE, 'utf-8'));

    // 1. Find CSM User
    // CSM GONAGALA CHAYA DURGA PRASAD - TN2023SDA023586
    const targetUser = users.find(u => u.regimentalNumber === 'TN2023SDA023586');
    if (!targetUser) {
        console.error('CSM User TN2023SDA023586 not found!');
        return;
    }
    console.log(`Found User: ${targetUser.name} (${targetUser.id})`);

    // 2. Remove EXISTING achievements
    let cleanList = allAchievements.filter(a => a.cadetId !== targetUser.id);
    console.log(`Removed old achievements for ${targetUser.name}`);

    // 3. Process Input
    rawInput.forEach(line => {
        // Extraction Logic
        // Most are: [Title part] ( [Start] TO/- [End] ) [Suffix]

        // Remove leading Number "1. "
        let text = line.replace(/^\d+\.\s*/, '').trim();

        // Extract Date Parens
        const dateMatch = text.match(/\((.*?)\)/);
        let start = '';
        let end = '';
        let title = text;

        if (dateMatch) {
            const dateContent = dateMatch[1]; // "21/12/2024 - 30/12/2024" or "07 APR TO 16 APR 2025"
            // Remove the parens part from title
            title = text.replace(dateMatch[0], '').trim().replace(/,$/, '').replace(/ FROM$/, '');

            // Split Date Range
            const separators = [' to ', ' - ', ' TO ', '-'];
            let rangeParts = [];
            for (const sep of separators) {
                if (dateContent.includes(sep)) {
                    rangeParts = dateContent.split(sep);
                    break;
                }
            }

            if (rangeParts.length === 2) {
                // Determine Year Context if missing
                // Usually year is in the second part
                let yearContext = '2025';
                if (rangeParts[1].match(/\d{4}/)) {
                    yearContext = rangeParts[1].match(/\d{4}/)[0];
                }

                start = parseDate(rangeParts[0], yearContext);
                end = parseDate(rangeParts[1], yearContext);
            }
        }

        // Clean Title further (remove formatting artifacts)
        title = title.replace(/,$/, '').trim();

        cleanList.push({
            id: Math.random().toString(36).substr(2, 9),
            cadetId: targetUser.id,
            title: title.substring(0, 100), // Limit length
            date: start,
            endDate: end,
            category: 'Camp', // Assume all are camps/competitions
            description: text, // Keep full text as description
            certificateUrl: undefined,
            isVerified: true
        });
    });

    // 4. Save
    fs.writeFileSync(ACH_FILE, JSON.stringify(cleanList, null, 2));
    console.log('Update Complete.');
}

run();
