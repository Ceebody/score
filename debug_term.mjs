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

async function checkTerm() {
    console.log("Checking terms/current...");
    try {
        const snap = await get(ref(db, 'terms/current'));
        if (snap.exists()) {
            console.log("[TERMS] Found:");
            console.log(JSON.stringify(snap.val(), null, 2));
        } else {
            console.log("[TERMS] Not Found!");
        }
    } catch (e) {
        console.error("Error:", e.message);
    }
    process.exit();
}

checkTerm();
