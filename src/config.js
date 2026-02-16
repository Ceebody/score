// src/config.js
// Centralized configuration for the application
// Falls back to default "Yeriel Bracha" values if environment variables are not set

const config = {
    schoolName: import.meta.env.VITE_SCHOOL_NAME || "Yeriel Bracha School",
    schoolInitials: import.meta.env.VITE_SCHOOL_INITIALS || "YBS",
    schoolMotto: import.meta.env.VITE_SCHOOL_MOTTO || "HEAD HEART HAND",
    schoolEmailDomain: import.meta.env.VITE_SCHOOL_EMAIL_DOMAIN || "yerielschool.com",
    adminEmail: import.meta.env.VITE_ADMIN_EMAIL || "yerielschooldocs@gmail.com",
    studentIdPrefix: import.meta.env.VITE_STUDENT_ID_PREFIX || "YBS",

    firebase: {
        apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "AIzaSyDuBswHNvNmjt1EiFUVdcvLb3NaVUliLbc",
        authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "tracha-6a2bd.firebaseapp.com",
        databaseURL: import.meta.env.VITE_FIREBASE_DATABASE_URL || "https://tracha-6a2bd-default-rtdb.firebaseio.com",
        projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "tracha-6a2bd",
        storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "tracha-6a2bd.appspot.com",
        messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "741159612866",
        appId: import.meta.env.VITE_FIREBASE_APP_ID || "1:741159612866:web:7c35ef786caa01b550265b",
        measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID || "G-46QY8KE3C6",
    },

    trialExpiration: import.meta.env.VITE_TRIAL_EXPIRATION_DATE,
    trialContactEmail: "emmanuelsagoe776@gmail.com"
};

export default config;
