const { initializeApp } = require("firebase/app");
const { getDatabase, ref, get } = require("firebase/database");

// Hardcoded config for debug
const firebaseConfig = {
    apiKey: "dummy",
    authDomain: "dummy",
    databaseURL: "https://school-management-system-ec9c7-default-rtdb.firebaseio.com",
    projectId: "school-management-system-ec9c7",
    storageBucket: "dummy",
    messagingSenderId: "dummy",
    appId: "dummy"
};

const app = initializeApp(firebaseConfig);
const db = getDatabase(app);

async function checkPaths() {
    console.log("--- Checking Database Paths ---");

    // 1. Classes
    try {
        const classesSnap = await get(ref(db, 'classes'));
        if (classesSnap.exists()) {
            console.log("\n[CLASSES] Keys found:");
            console.log(Object.keys(classesSnap.val()).join(", "));
        } else {
            console.log("\n[CLASSES] Node empty or not found.");
        }
    } catch (e) {
        console.error("Error fetching classes:", e.message);
    }

    // 2. Students
    try {
        const studentsSnap = await get(ref(db, 'students'));
        if (studentsSnap.exists()) {
            console.log("\n[STUDENTS] Class Keys found in Students node:");
            console.log(Object.keys(studentsSnap.val()).join(", "));
        } else {
            console.log("\n[STUDENTS] Node empty or not found.");
        }
    } catch (e) {
        console.error("Error fetching students:", e.message);
    }

    process.exit();
}

checkPaths();
