// test-rules.js
// Runs client-side reads against the RTDB emulator as three signed-in users (admin, teacher, student)
// Usage: node test-rules.js

const { initializeApp } = require('firebase/app');
const { getDatabase, ref, get, connectDatabaseEmulator } = require('firebase/database');
const { getAuth, signInWithEmailAndPassword, createUserWithEmailAndPassword, connectAuthEmulator } = require('firebase/auth');

async function run() {
  const firebaseConfig = {
    apiKey: 'fake-api-key',
    authDomain: 'localhost',
    databaseURL: 'http://localhost:9000?ns=emulator-test',
    projectId: 'emulator-test'
  };

  const app = initializeApp(firebaseConfig);
  const db = getDatabase(app);
  const auth = getAuth(app);

  connectDatabaseEmulator(db, 'localhost', 9000);
  connectAuthEmulator(auth, 'http://localhost:9099', { disableWarnings: true });

  async function signIn(email, password) {
    try {
      await createUserWithEmailAndPassword(auth, email, password);
    } catch (e) {
      // user may already exist
    }
    const credential = await signInWithEmailAndPassword(auth, email, password);
    return credential.user;
  }

  // Sign in the three users we seeded earlier; the seed script created these accounts
  const adminUser = await signIn('admin@example.test', 'password123');
  const teacherUser = await signIn('teacher@example.test', 'password123');
  const studentUser = await signIn('student@example.test', 'password123');

  console.log('Signed-in UIDs:', { admin: adminUser.uid, teacher: teacherUser.uid, student: studentUser.uid });

  async function tryRead(path, label) {
    try {
      const s = await get(ref(db, path));
      if (s.exists()) {
        console.log(`[OK] ${label} read ${path} =>`, JSON.stringify(s.val()));
      } else {
        console.log(`[OK] ${label} read ${path} => <empty>`);
      }
    } catch (e) {
      console.log(`[DENIED] ${label} read ${path} =>`, e && e.message ? e.message : e);
    }
  }

  // Tests
  await tryRead('students', 'admin');
  await tryRead('students', 'teacher');
  await tryRead('students/basic7', 'teacher-class');
  await tryRead('students/basic7/studentA', 'studentA (public child)');
  await tryRead('teachers', 'admin');
  await tryRead('scores', 'admin');
  await tryRead('classTeacherRecords/basic7', 'teacher-class');
  await tryRead(`notificationReadsByUser/${studentUser.uid}`, 'student (notificationReads)');

  try { await auth.signOut(); } catch (e) {}
  process.exit(0);
}

run().catch(e => {
  console.error('Test run failed:', e);
  process.exit(1);
});
