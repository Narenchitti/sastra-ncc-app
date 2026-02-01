const fs = require('fs');
const path = require('path');

const DATA_DIR = path.join(__dirname, '..', 'data');
const USERS_FILE = path.join(DATA_DIR, 'users.json');
const ACH_FILE = path.join(DATA_DIR, 'achievements.json');

// User Input Data (Raw)
const rawInput = [
    "IUC RDC,Govt College for Women,Kumbakonam,(24/08/2024 to 02/09/2024)",
    "RDC IGC Training 1,Shree Vee College, Dindigul,(13/09/2024 to 22/09/2024)",
    "RDC IGC Training 2,Boiler Plant GHSS, Trichy,(29/09/2024 to 08/10/2024)",
    "RDC IGC,NTA, Idayapatti, Madurai,(12/10/2024 to 21/10/2024)",
    "RDC IDC Training 1,NTA, Idayapatti, Madurai,(22/10/2024 to 31/10/2024)",
    "RDC IDC Training 2,NTA, Idayapatti, Madurai,(11/11/2024 to 20/11/2024)",
    "RDC IDC Training 3,NTA, Idayapatti, Madurai,(21/10/2024 to 30/10/2024)",
    "RDC Launch 1 & Launch 2,NTA, Idayapatti, Madurai,(20/12/2024 to 29/12/2024)",
    "RDC,New Delhi, (27/12/2024 to 30/01/2025)",
    "CATC CUM TSC DTE TRG 1, NTA IDAYAPATTI , MADURAI (1.08.25 to 10.08.25)"
];

// Helper to convert DD/MM/YYYY to YYYY-MM-DD
function parseDate(dateStr) {
    if (!dateStr) return '';
    const clean = dateStr.trim().replace(/\./g, '/'); // Handle 1.08.25
    const parts = clean.split('/');
    if (parts.length < 3) return clean;

    let y = parts[2];
    if (y.length === 2) y = '20' + y; // Handle 25 -> 2025

    const m = parts[1].padStart(2, '0');
    const d = parts[0].padStart(2, '0');
    return `${y}-${m}-${d}`;
}

function run() {
    const users = JSON.parse(fs.readFileSync(USERS_FILE, 'utf-8'));
    const allAchievements = JSON.parse(fs.readFileSync(ACH_FILE, 'utf-8'));

    // 1. Find the User
    const targetUser = users.find(u => u.regimentalNumber === 'TN2023SDA023581');
    if (!targetUser) {
        console.error('User TN2023SDA023581 not found!');
        return;
    }
    console.log(`Found User: ${targetUser.name} (${targetUser.id})`);

    // 2. Remove EXISTING achievements for this user
    let cleanList = allAchievements.filter(a => a.cadetId !== targetUser.id);
    console.log(`Removed old achievements for ${targetUser.name}`);

    // 3. Add NEW achievements
    rawInput.forEach(line => {
        // Parse "Title, Location, (Dates)"
        // Flexible regex to capture: [TitleAndLoc] ( [Start] to [End] )
        const match = line.match(/(.*)\((.*) to (.*)\)/);

        let title = '';
        let location = '';
        let start = '';
        let end = '';

        if (match) {
            const titleLocPart = match[1].trim().replace(/,$/, ''); // Remove trailing comma
            start = parseDate(match[2]);
            end = parseDate(match[3]);

            // Split title/loc by first comma?
            // "IUC RDC,Govt College for Women,Kumbakonam"
            const firstComma = titleLocPart.indexOf(',');
            if (firstComma > -1) {
                title = titleLocPart.substring(0, firstComma).trim();
                location = titleLocPart.substring(firstComma + 1).trim().replace(/^,/, '');
            } else {
                title = titleLocPart;
            }
        } else {
            title = line; // Fallback
        }

        cleanList.push({
            id: Math.random().toString(36).substr(2, 9),
            cadetId: targetUser.id,
            title: title,
            date: start,
            endDate: end,
            category: 'Camp',
            description: `Location: ${location}`,
            certificateUrl: undefined, // Nocert for imported
            isVerified: true
        });
    });

    // 4. Save
    fs.writeFileSync(ACH_FILE, JSON.stringify(cleanList, null, 2));
    console.log('Update Complete.');
}

run();
