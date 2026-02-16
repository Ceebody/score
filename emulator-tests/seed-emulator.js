// seed-emulator.js
// Creates auth users in the Auth emulator and seeds the Realtime DB with matching user UIDs.
// Usage: node seed-emulator.js

process.env.FIREBASE_AUTH_EMULATOR_HOST = process.env.FIREBASE_AUTH_EMULATOR_HOST || "localhost:9099";
process.env.FIREBASE_DATABASE_EMULATOR_HOST = process.env.FIREBASE_DATABASE_EMULATOR_HOST || "localhost:9000";

const admin = require("firebase-admin");

// Initialize Admin SDK pointing to emulator
admin.initializeApp({
  projectId: 'emulator-test',
  databaseURL: 'http://localhost:9000?ns=emulator-test'
});

async function createIfMissing(email, password, displayName) {
  try {
    const userRecord = await admin.auth().getUserByEmail(email);
    return userRecord;
  } catch (e) {
    // create
    return admin.auth().createUser({ email, password, displayName });
  }
}

async function seed() {
  const db = admin.database();

  // Create three auth users
  const adminUser = await createIfMissing('admin@example.test', 'password123', 'Admin User');
  const teacherUser = await createIfMissing('teacher@example.test', 'password123', 'Teacher User');
  const studentUser = await createIfMissing('student@example.test', 'password123', 'Student User');

  console.log('Auth UIDs:', { admin: adminUser.uid, teacher: teacherUser.uid, student: studentUser.uid });

  // Seed users node with roles matching the created UIDs
  await db.ref(`users/${adminUser.uid}`).set({ role: 'admin', classId: null, studentId: null });
  await db.ref(`users/${teacherUser.uid}`).set({ role: 'teacher', classId: 'basic7', studentId: null });
  await db.ref(`users/${studentUser.uid}`).set({ role: 'student', classId: 'basic7', studentId: 'S123' });

  // Teachers and parents nodes
  await db.ref(`teachers/${teacherUser.uid}`).set({ name: 'Ms Teacher', assignedClasses: { basic7: true } });
  await db.ref(`parents/parent1`).set({ name: 'Mr Parent' });

  // Students under a class (basic7) -- use studentUser.uid as uid
  await db.ref('students/basic7/studentA').set({ uid: studentUser.uid, firstName: 'Ada', lastName: 'Lovelace', studentID: 'S123' });
  await db.ref('students/basic7/studentB').set({ uid: 'studentX', firstName: 'Ben', lastName: 'Bit' });

  // Class teacher records
  await db.ref('classTeacherRecords/basic7/studentA').set({ filled: true });

  // Scores example: scores/<classId>/<subject>/<studentKey>
  await db.ref('scores/basic7/Mathematics/studentA').set({ total: 88 });
  await db.ref('scores/basic7/Science/studentA').set({ total: 78 });

  // terms and current
  await db.ref('terms/current').set({ year: '2025/26', name: 'Term 1' });

  // notificationReadsByUser for student
  await db.ref(`notificationReadsByUser/${studentUser.uid}`).set({ notif1: true });

  console.log('Seeding complete.');
  process.exit(0);
}

seed().catch((e) => {
  console.error('Seeding failed:', e);
  process.exit(1);
});
