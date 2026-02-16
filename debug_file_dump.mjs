import { initializeApp } from "firebase/app";
import { getDatabase, ref, get } from "firebase/database";
import fs from 'fs';

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

async function dump() {
    console.log("Dumping to file...");
    const output = {};

    try {
        const cSnap = await get(ref(db, 'classes'));
        output.classes = cSnap.exists() ? cSnap.val() : "Not Found";
    } catch (e) { output.classesError = e.message; }

    try {
        // Fetch shallow copy of students to see keys
        // Can't use shallow with SDK, stick to full but trim content
        const sSnap = await get(ref(db, 'students'));
        if (sSnap.exists()) {
            const data = sSnap.val();
            output.students = {};
            Object.keys(data).forEach(k => {
                output.students[k] = Object.keys(data[k]).length + " students"; // store count only
            });
        } else {
            output.students = "Not Found";
        }
    } catch (e) { output.studentsError = e.message; }

    fs.writeFileSync('dump.json', JSON.stringify(output, null, 2));
    console.log("Done.");
    process.exit();
}

dump();
