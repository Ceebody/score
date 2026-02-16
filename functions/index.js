const functions = require('firebase-functions');
const admin = require('firebase-admin');

admin.initializeApp();
const db = admin.database();

exports.adminResetStudentPassword = functions.https.onCall(async (data, context) => {
  // Security: only allow authenticated admins to call this
  if (!context.auth) {
    return { success: false, message: 'Unauthenticated' };
  }
  const callerUid = context.auth.uid;

  // check role
  try {
    const userSnap = await db.ref(`users/${callerUid}`).get();
    if (!userSnap.exists() || userSnap.val().role !== 'admin') {
      return { success: false, message: 'Permission denied' };
    }
  } catch (err) {
    console.error('Failed to read caller role', err);
    return { success: false, message: 'Server error' };
  }

  const { classId, studentId, newPassword } = data || {};
  if (!newPassword) return { success: false, message: 'Missing newPassword' };

  try {
    let targetUid = null;
    if (classId && studentId) {
      const snap = await db.ref(`students/${classId}/${studentId}`).get();
      if (snap.exists()) {
        const val = snap.val();
        targetUid = val.uid || null;
      }
    }

    // If we couldn't resolve via classId/studentId, assume studentId is a uid
    if (!targetUid) {
      targetUid = studentId;
    }

    if (!targetUid) return { success: false, message: 'Could not resolve student uid' };

    await admin.auth().updateUser(targetUid, { password: newPassword });

    return { success: true };
  } catch (err) {
    console.error('adminResetStudentPassword error', err);
    return { success: false, message: err.message || 'Error' };
  }
});
