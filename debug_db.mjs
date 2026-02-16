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

async function checkPaths() {
    console.log("--- Checking Database Paths ---");

    // 1. Classes
    try {
        console.log("Fetching classes...");
        const classesSnap = await get(ref(db, 'classes'));
        if (classesSnap.exists()) {
            const val = classesSnap.val();
            console.log("\n[CLASSES] Count:", Object.keys(val).length);
            Object.keys(val).forEach(key => {
                console.log(` - ID: "${key}", Name: "${val[key].name}"`);
            });
        } else {
            console.log("\n[CLASSES] Node empty or not found.");
        }
    } catch (e) {
        console.error("Error fetching classes:", e.message);
    }

    // 2. Students
    try {
        console.log("\nFetching students...");
        const studentsSnap = await get(ref(db, 'students'));
        if (studentsSnap.exists()) {
            const val = studentsSnap.val();
            console.log("\n[STUDENTS] Class Keys found in Students node:");
            Object.keys(val).forEach(key => {
                const count = Object.keys(val[key]).length;
                console.log(` - ClassKey: "${key}" (contains ${count} students)`);
            });
        } else {
            console.log("\n[STUDENTS] Node empty or not found.");
        }
    } catch (e) {
        console.error("Error fetching students:", e.message);
    }

    process.exit();
}

checkPaths();
