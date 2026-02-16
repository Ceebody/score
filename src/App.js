// (updated) App.js — add teacher class-level midterm route so teachers can open entire-class midterm records
import { BrowserRouter as Router, Routes, Route, Navigate, useParams } from "react-router-dom";
import { useState, useEffect, Suspense, lazy } from "react";
import { getAuth, onAuthStateChanged } from "firebase/auth";
import { getDatabase, ref, get } from "firebase/database";

// Admin pages
const Dashboard = lazy(() => import("./pages/Dashboard"));
const Students = lazy(() => import("./pages/Students"));
const Teachers = lazy(() => import("./pages/Teachers"));
const Parents = lazy(() => import("./pages/Parents"));
const StudentProfile = lazy(() => import("./pages/StudentProfile"));
const TeacherProfile = lazy(() => import("./pages/TeacherProfile"));
const ParentProfile = lazy(() => import("./pages/ParentProfile"));
const RegisterTeacher = lazy(() => import("./pages/admin/RegisterTeacher"));
const RegisterParent = lazy(() => import("./pages/admin/RegisterParent"));
const RegisterStudent = lazy(() => import("./pages/admin/RegisterStudent"));
const StudentReport = lazy(() => import("./pages/admin/StudentReport"));
const EditStudent = lazy(() => import("./pages/admin/EditStudent"));
const Reports = lazy(() => import("./pages/admin/Reports"));
const SendNotification = lazy(() => import("./pages/admin/SendNotification"));
const NotificationsArchive = lazy(() => import("./pages/admin/NotificationsArchive"));
const MyProfile = lazy(() => import("./pages/MyProfile"));
const PublishControls = lazy(() => import("./pages/admin/PublishControls"));
const ParentDashboard = lazy(() => import("./pages/ParentDashboard"));
const StudentMidtermView = lazy(() => import("./pages/StudentMidtermView"));
const ResetPassword = lazy(() => import("./pages/ResetPassword"));

const BackupsByYear = lazy(() => import("./pages/admin/BackupsByYear"));
const BackupView = lazy(() => import("./pages/admin/BackupView"));
const MyBackups = lazy(() => import("./pages/MyBackups"));
const MyBackupView = lazy(() => import("./pages/MyBackupView"));
const MyNotifications = lazy(() => import("./pages/MyNotifications"));

// Teacher pages
const TeacherDashboard = lazy(() => import("./pages/teacher/TeacherDashboard"));
const SBAForm = lazy(() => import("./pages/teacher/SBAForm"));
const EnterScores = lazy(() => import("./pages/teacher/EnterScore"));
const ClassRecords = lazy(() => import("./pages/teacher/ClassRecords"));
const StudentMasterSheet = lazy(() => import("./pages/teacher/StudentMasterSheet"));

const TeacherCommentManager = lazy(() => import("./pages/teacher/TeacherCommentManager")); // New Component
const MidtermScoresViewer = lazy(() => import("./pages/admin/MidtermScoresViewer")); // reused viewer

// Student pages
const ChangePassword = lazy(() => import("./pages/ChangePassword"));
const StudentDashboard = lazy(() => import("./pages/StudentDashboard"));
const StudentReportView = lazy(() => import("./pages/StudentReportView"));
const ReportPage = lazy(() => import("./pages/admin/ReportPage"));
const MidtermScoresPage = lazy(() => import("./pages/teacher/MidtermScoresPage"));
const ClassRecordsIndex = lazy(() => import("./pages/teacher/ClassRecordsIndex"));
const StudentAttendance = lazy(() => import("./pages/StudentAttendance"));
const StudentTimetable = lazy(() => import("./pages/StudentTimetable"));
const TeacherAttendance = lazy(() => import("./pages/teacher/TeacherAttendance"));
const AdminTimetableManager = lazy(() => import("./pages/admin/AdminTimetableManager"));
const StudentSBARecords = lazy(() => import("./pages/teacher/StudentSBARecords"));
const SBARecordsBySubject = lazy(() => import("./pages/teacher/SBARecordsBySubject"));
const ModernBackupManager = lazy(() => import("./pages/admin/ModernBackupManager"));
const AdminCommentManager = lazy(() => import("./pages/admin/AdminCommentManager"));

const TeacherAssignmentManager = lazy(() => import("./pages/admin/TeacherAssignmentManager"));
const TeacherAssignments = lazy(() => import("./pages/teacher/TeacherAssignments"));
const FridayTestEntry = lazy(() => import("./pages/teacher/FridayTestEntry"));
const AdminAssignments = lazy(() => import("./pages/admin/AdminAssignments"));
const WeeklyTestReport = lazy(() => import("./pages/admin/WeeklyTestReport"));

// Auth
const Login = lazy(() => import("./pages/login"));

// Layout
import Layout from "./components/Layout";
import SirSagoeTour from "./components/SirSagoeTour";
import TrialGuard from "./components/TrialGuard";

/* ---------- Wrappers with useParams ---------- */
function SBAFormWrapper() {
  const { classId, studentId, subject } = useParams();
  return <SBAForm classId={classId} studentId={studentId} subject={subject} />;
}

function EnterScoresWrapper() {
  const { classId, studentId } = useParams();
  return <EnterScores classId={classId} studentId={studentId} />;
}

function ClassRecordsWrapper() {
  const { classId, studentId } = useParams();
  return <ClassRecords classId={classId} studentId={studentId} />;
}

function App() {
  const [user, setUser] = useState(null);
  const [role, setRole] = useState(null);
  const [mustChangePassword, setMustChangePassword] = useState(false);
  const [loading, setLoading] = useState(true);

  const auth = getAuth();
  const db = getDatabase();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (currentUser) {
        setUser(currentUser);
        try {
          const snap = await get(ref(db, `users/${currentUser.uid}`));
          if (snap.exists()) {
            const data = snap.val();
            setRole(data.role || null);
            setMustChangePassword(data.mustChangePassword || false);
          }
        } catch (err) {
          console.error("Failed to fetch role:", err);
        }
      } else {
        setUser(null);
        setRole(null);
        setMustChangePassword(false);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, [auth, db]);

  if (loading) return <div className="p-6 text-lg">Loading...</div>;

  return (
    <Router>
      {/* <SirSagoeTour /> */}
      <TrialGuard>
        <Suspense fallback={<div className="p-6 text-lg text-center">Loading...</div>}>
          <Routes>
            {/* Public route */}
            <Route path="/login" element={<Login />} />
            <Route path="/reset-password" element={<ResetPassword />} />

            {/* Authenticated Routes Wrapped in Layout */}
            <Route element={user ? <Layout role={role} /> : <Navigate to="/login" />}>

              {/* Change password */}
              <Route
                path="/change-password"
                element={
                  user && role !== "admin" ? (
                    <ChangePassword />
                  ) : (
                    <Navigate to="/login" replace />
                  )
                }
              />

              {/* Student dashboard */}
              <Route
                path="/student-dashboard"
                element={
                  user && role === "student" && !mustChangePassword ? (
                    <StudentDashboard />
                  ) : (
                    <Navigate to="/login" />
                  )
                }
              />

              {/* Admin Routes */}
              <Route
                path="/admin-dashboard"
                element={user && role === "admin" ? <Dashboard /> : <Navigate to="/login" />}
              />
              <Route
                path="/register-teacher"
                element={user && role === "admin" ? <RegisterTeacher /> : <Navigate to="/login" />}
              />
              <Route path="/admin/backups/:year" element={user && role === "admin" ? <BackupsByYear /> : <Navigate to="/login" />} />
              <Route path="/admin/backup-view/:termKey/:version/:type" element={user && role === "admin" ? <BackupView /> : <Navigate to="/login" />} />
              <Route
                path="/register-parent"
                element={user && role === "admin" ? <RegisterParent /> : <Navigate to="/login" />}
              />
              <Route
                path="/register-student"
                element={user && role === "admin" ? <RegisterStudent /> : <Navigate to="/login" />}
              />
              <Route
                path="/admin/send-notification"
                element={user && role === "admin" ? <SendNotification /> : <Navigate to="/login" />}
              />
              <Route
                path="/admin/notifications"
                element={user && role === "admin" ? <NotificationsArchive /> : <Navigate to="/login" />}
              />
              <Route
                path="/admin/publish-controls"
                element={user && role === "admin" ? <PublishControls /> : <Navigate to="/login" />}
              />
              <Route
                path="/admin/backup-manager"
                element={user && role === "admin" ? <ModernBackupManager /> : <Navigate to="/login" />}
              />
              <Route
                path="/admin/timetable"
                element={user && role === "admin" ? <AdminTimetableManager /> : <Navigate to="/login" />}
              />
              <Route
                path="/students"
                element={user && role === "admin" ? <Students /> : <Navigate to="/login" />}
              />
              <Route
                path="/edit-student/:classId/:studentId"
                element={user && role === "admin" ? <EditStudent /> : <Navigate to="/login" />}
              />
              <Route
                path="/student-report/:classId/:studentId"
                element={user && role === "admin" ? <StudentReport /> : <Navigate to="/login" />}
              />
              <Route
                path="/student/report/:classId/:studentId"
                element={user && (role === "student" || role === "admin") ? <StudentReportView /> : <Navigate to="/login" />}
              />
              <Route
                path="/teachers"
                element={user && role === "admin" ? <Teachers /> : <Navigate to="/login" />}
              />
              <Route
                path="/parents"
                element={user && role === "admin" ? <Parents /> : <Navigate to="/login" />}
              />
              <Route
                path="/students/:id"
                element={user && role === "admin" ? <StudentProfile /> : <Navigate to="/login" />}
              />
              <Route
                path="/teachers/:id"
                element={user && role === "admin" ? <TeacherProfile /> : <Navigate to="/login" />}
              />
              <Route
                path="/parents/:id"
                element={user && role === "admin" ? <ParentProfile /> : <Navigate to="/login" />}
              />
              <Route
                path="/reports"
                element={user && role === "admin" ? <Reports user={{ role }} /> : <Navigate to="/login" />}
              />
              <Route
                path="/report/:studentId"
                element={user && role === "admin" ? <ReportPage /> : <Navigate to="/login" />}
              />
              <Route
                path="/admin/comments"
                element={user && role === "admin" ? <AdminCommentManager /> : <Navigate to="/login" />}
              />

              {/* Teacher Routes */}
              <Route
                path="/teacher/dashboard"
                element={user && role === "teacher" ? <TeacherDashboard /> : <Navigate to="/login" />}
              />
              <Route
                path="/teacher/attendance"
                element={user && role === "teacher" ? <TeacherAttendance /> : <Navigate to="/login" />}
              />
              <Route
                path="/teacher/midterm-scores/:classId"
                element={user && role === "teacher" ? <MidtermScoresViewer /> : <Navigate to="/login" />}
              />
              <Route
                path="/teacher/enter-scores/:classId/:studentId"
                element={user && role === "teacher" ? <EnterScoresWrapper /> : <Navigate to="/login" />}
              />

              <Route
                path="/teacher/class-records/:classId/:studentId"
                element={user && role === "teacher" ? <ClassRecordsWrapper /> : <Navigate to="/login" />}
              />
              <Route
                path="/teacher/class-records"
                element={user && role === "teacher" ? <ClassRecordsIndex /> : <Navigate to="/login" />}
              />
              <Route
                path="/teacher/sba/:classId/:studentId/:subject"
                element={user && role === "teacher" ? <SBAFormWrapper /> : <Navigate to="/login" />}
              />
              <Route
                path="/teacher/master-sheet/:classId/:studentId"
                element={user && role === "teacher" ? <StudentMasterSheet /> : <Navigate to="/login" />}
              />
              <Route
                path="/teacher/master-sheet/:classId"
                element={user && role === "teacher" ? <StudentMasterSheet /> : <Navigate to="/login" />}
              />
              <Route
                path="/teacher/sba-records/:classId/:studentId"
                element={user && role === "teacher" ? <StudentSBARecords /> : <Navigate to="/login" />}
              />
              <Route
                path="/teacher/sba-records"
                element={user && role === "teacher" ? <SBARecordsBySubject /> : <Navigate to="/login" />}
              />
              <Route
                path="/teacher/comments"
                element={user && role === "teacher" ? <TeacherCommentManager /> : <Navigate to="/login" />}
              />
              <Route
                path="/teacher/assignments"
                element={user && role === "teacher" ? <TeacherAssignments /> : <Navigate to="/login" />}
              />
              <Route
                path="/teacher/friday-tests"
                element={user && role === "teacher" ? <FridayTestEntry /> : <Navigate to="/login" />}
              />
              <Route
                path="/admin/teacher-assignments"
                element={user && role === "admin" ? <TeacherAssignmentManager /> : <Navigate to="/login" />}
              />
              <Route
                path="/admin/assignments"
                element={user && role === "admin" ? <AdminAssignments /> : <Navigate to="/login" />}
              />
              <Route
                path="/admin/weekly-reports"
                element={user && role === "admin" ? <WeeklyTestReport /> : <Navigate to="/login" />}
              />

              {/* Shared Routes */}
              <Route
                path="/profile"
                element={user ? <MyProfile /> : <Navigate to="/login" />}
              />
              <Route path="/my/backups" element={user && (role === "teacher" || role === "student" || role === "parent") ? <MyBackups /> : <Navigate to="/login" />} />
              <Route path="/my/backup-view/:termKey/:version/:type" element={user && (role === "teacher" || role === "student" || role === "parent" || role === "admin") ? <MyBackupView /> : <Navigate to="/login" />} />
              <Route path="/notifications" element={user ? <MyNotifications /> : <Navigate to="/login" />} />

              {/* Parent Dashboard */}
              <Route
                path="/parent-dashboard"
                element={user && role === "parent" ? <ParentDashboard /> : <Navigate to="/login" />}
              />

              {/* Student/Parent Shared */}
              <Route
                path="/student/report/:classId/:studentId"
                element={user && (role === "student" || role === "parent" || role === "teacher" || role === "admin") ? <StudentReport /> : <Navigate to="/login" />}
              />
              <Route
                path="/student/midterm/:classId/:studentId"
                element={user && (role === "student" || role === "parent" || role === "teacher" || role === "admin") ? <StudentMidtermView /> : <Navigate to="/login" />}
              />
              <Route
                path="/teacher/midterm-scores/:classId/:studentId"
                element={<MidtermScoresPage />}
              />
              <Route path="/midterm-scores-viewer" element={<MidtermScoresViewer />} />

              <Route
                path="/student/attendance"
                element={user && (role === "student" || role === "parent") ? <StudentAttendance /> : <Navigate to="/login" />}
              />
              <Route
                path="/student/timetable"
                element={user && (role === "student" || role === "parent") ? <StudentTimetable /> : <Navigate to="/login" />}
              />
            </Route>

            {/* Default Redirect */}
            <Route
              path="/"
              element={
                user ? (
                  role === "admin" ? (
                    <Navigate to="/admin-dashboard" replace />
                  ) : role === "teacher" ? (
                    <Navigate to="/teacher/dashboard" replace />
                  ) : role === "student" ? (
                    mustChangePassword ? (
                      <Navigate to="/change-password" replace />
                    ) : (
                      <Navigate to="/student-dashboard" replace />
                    )
                  ) : (
                    <div className="p-6">No dashboard available for this role.</div>
                  )
                ) : (
                  <Navigate to="/login" replace />
                )
              }
            />

            {/* Catch-all */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Suspense>
      </TrialGuard>
    </Router>
  );
}

export default App;