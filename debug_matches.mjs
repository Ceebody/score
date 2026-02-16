import { initializeApp } from "firebase/app";
import { getDatabase, ref, get } from "firebase/database";

const firebaseConfig = {
    apiKey: "dummy",
    authDomain: "dummy",
    databaseURL: "https://tracha-6a2bd-default-rtdb.firebaseio.com",
    projectId: "tracha-6a2bd",
    storageBucket: "dummy",
    messagingSenderId: "dummy",
    appId: "dummy"
};

const app = initializeApp(firebaseConfig);
const db = getDatabase(app);

async function checkMatches() {
    console.log("=== CHECKING MATCHES ===");

    let classes = {};
    let studentKeys = [];

    // 1. Get Classes
    try {
        const snap = await get(ref(db, 'classes'));
        if (snap.exists()) {
            classes = snap.val();
            console.log(`\n[CLASSES] Found ${Object.keys(classes).length} classes.`);
        } else {
            console.log("\n[CLASSES] Not found.");
        }
    } catch (e) {
        console.error("Error fetching classes:", e.message);
    }

    // 2. Get Student Keys
    try {
        // Fetch valid keys shallowly
        // Note: shallow=true not supported by helper, checking full node might be heavy but necessary
        // Assuming not too big
        const snap = await get(ref(db, 'students'));
        if (snap.exists()) {
            const data = snap.val();
            studentKeys = Object.keys(data);
            console.log(`\n[STUDENTS] Found students for ${studentKeys.length} classes.`);
        } else {
            console.log("\n[STUDENTS] Not found.");
        }
    } catch (e) {
        console.error("Error fetching students:", e.message);
    }

    // 3. Compare
    console.log("\n--- COMPARISON ---");
    const classIds = Object.keys(classes);

    // Check which classes have students
    classIds.forEach(clsId => {
        const clsName = classes[clsId].name;
        const hasStudents = studentKeys.includes(clsId);

        // Also check if name is used as key
        const nameAsKeyMatch = studentKeys.includes(clsName);

        console.log(`Class ID: "${clsId}" | Name: "${clsName}"`);
        if (hasStudents) {
            console.log(`   -> MATCH! Found students under ID.`);
        } else if (nameAsKeyMatch) {
            console.log(`   -> WARNING! Found students under NAME "${clsName}", but ID is "${clsId}".`);
        } else {
            console.log(`   -> No students found.`);
        }
    });

    // Check for orphan student groups
    console.log("\n--- ORPHAN STUDENT GROUPS ---");
    studentKeys.forEach(sKey => {
        if (!classIds.includes(sKey)) {
            // Check if it matches a name
            const matchesName = Object.values(classes).find(c => c.name === sKey);
            if (matchesName) {
                console.log(`Student Key "${sKey}" matches a CLASS NAME, not ID.`);
            } else {
                console.log(`Student Key "${sKey}" matches NOTHING in classes.`);
            }
        }
    });

    process.exit();
}

checkMatches();
