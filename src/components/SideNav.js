import React, { useEffect, useState } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { getDatabase, ref, onValue } from "firebase/database";
import { Home, User, Bell, LogOut, ClipboardCheck, UserPlus, Users, FileText, Database, Send, GraduationCap, BookOpen, Calendar } from "lucide-react";

export default function SideNav({ role = "teacher", mobile = false, onItemClick }) {
  const { currentUser, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [studentData, setStudentData] = useState(null);

  useEffect(() => {
    if (role === 'student' && currentUser) {
      const db = getDatabase();
      const studentRef = ref(db, "students");

      const unsubscribe = onValue(studentRef, (snapshot) => {
        if (snapshot.exists()) {
          const data = snapshot.val();
          let found = null;
          // Try direct lookup
          if (data[currentUser.uid]) {
            found = { ...data[currentUser.uid], class: data[currentUser.uid].class || "" };
          } else {
            // Try nested lookup
            Object.keys(data).forEach(cls => {
              if (data[cls] && typeof data[cls] === 'object') {
                if (data[cls][currentUser.uid]) {
                  found = { ...data[cls][currentUser.uid], class: cls };
                } else {
                  Object.values(data[cls]).forEach(s => {
                    if (s.uid === currentUser.uid) found = { ...s, class: cls };
                  });
                }
              }
            });
          }
          setStudentData(found);
        }
      });
      return () => unsubscribe();
    }
  }, [role, currentUser]);

  async function handleLogout(e) {
    e.preventDefault();
    try {
      if (onItemClick) onItemClick();
      await logout();
      navigate("/login");
    } catch (err) {
      console.error("Logout failed:", err);
    }
  }

  const isActive = (path) => location.pathname === path;

  const linkClass = (path) => `flex items-center gap-3 px-3 py-2 rounded transition-colors ${isActive(path) ? 'bg-indigo-100 text-indigo-700 font-semibold' : 'hover:bg-indigo-50 text-gray-700'}`;

  return (
    <aside className={`${mobile ? 'w-full h-full' : 'w-64 h-screen sticky top-0 border-r border-gray-100'} bg-white flex flex-col ${!mobile && 'hidden md:flex'} p-6`}>
      {!mobile && (
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-indigo-700 flex items-center gap-2">
            <GraduationCap className="h-8 w-8" />
            Academia
          </h2>
          <p className="text-xs text-gray-500 mt-2 truncate">{currentUser?.email}</p>
        </div>
      )}

      <nav id="sidebar-nav" className="flex-1 overflow-y-auto">
        <ul className="space-y-2">
          <li>
            <Link
              to={role === "admin" ? "/admin-dashboard" : role === "teacher" ? "/teacher/dashboard" : role === "parent" ? "/parent-dashboard" : "/student-dashboard"}
              className={linkClass(role === "admin" ? "/admin-dashboard" : role === "teacher" ? "/teacher/dashboard" : role === "parent" ? "/parent-dashboard" : "/student-dashboard")}
              onClick={onItemClick}
            >
              <Home className="h-4 w-4" />
              <span className="text-sm font-medium">Dashboard</span>
            </Link>
          </li>

          <li>
            <Link to="/profile" className={linkClass("/profile")} onClick={onItemClick}>
              <User className="h-4 w-4" />
              <span className="text-sm font-medium">Profile</span>
            </Link>
          </li>

          {role === 'student' && studentData && (
            <li>
              <Link to={`/student/report/${studentData.class}/${currentUser.uid}`} className={linkClass(`/student/report/${studentData.class}/${currentUser.uid}`)} onClick={onItemClick}>
                <FileText className="h-4 w-4" />
                <span className="text-sm font-medium">Report Card</span>
              </Link>
            </li>
          )}

          {role && role !== 'admin' && role !== 'student' && (
            <li>
              <Link to="/change-password" className={linkClass("/change-password")} onClick={onItemClick}>
                <User className="h-4 w-4" />
                <span className="text-sm font-medium">Change Password</span>
              </Link>
            </li>
          )}

          <li>
            <Link to={role === "admin" ? "/admin/notifications" : "/notifications"} className={linkClass(role === "admin" ? "/admin/notifications" : "/notifications")} onClick={onItemClick}>
              <Bell className="h-4 w-4" />
              <span className="text-sm font-medium">Notifications</span>
            </Link>
          </li>

          {(role === "student" || role === "teacher") && (
            <li>
              <Link
                to={role === "teacher" ? "/teacher/attendance" : "/student/attendance"}
                className={linkClass(role === "teacher" ? "/teacher/attendance" : "/student/attendance")}
                onClick={onItemClick}
              >
                <ClipboardCheck className="h-4 w-4" />
                <span className="text-sm font-medium">Attendance</span>
              </Link>
            </li>
          )}

          {role === "teacher" && (
            <li>
              <Link to="/teacher/class-records" className={linkClass("/teacher/class-records")} onClick={onItemClick}>
                <ClipboardCheck className="h-4 w-4" />
                <span className="text-sm font-medium">Class Records</span>
              </Link>
            </li>
          )}

          {/* Allow teachers, students and parents to access their backups */}
          {(role === "teacher" || role === "student" || role === "parent") && (
            <li>
              <Link to="/my/backups" className={linkClass("/my/backups")} onClick={onItemClick}>
                <Database className="h-4 w-4" />
                <span className="text-sm font-medium">My Backups</span>
              </Link>
            </li>
          )}

          {/* Teacher-specific link for SBA Records */}
          {role === "teacher" && (
            <li>
              <Link to="/teacher/sba-records" className={linkClass("/teacher/sba-records")} onClick={onItemClick}>
                <ClipboardCheck className="h-4 w-4" />
                <span className="text-sm font-medium">SBA Records</span>
              </Link>
            </li>
          )}

          {role === "teacher" && (
            <li>
              <Link to="/teacher/assignments" className={linkClass("/teacher/assignments")} onClick={onItemClick}>
                <BookOpen className="h-4 w-4" />
                <span className="text-sm font-medium">Assignments</span>
              </Link>
            </li>
          )}

          {role === "teacher" && (
            <li>
              <Link to="/teacher/friday-tests" className={linkClass("/teacher/friday-tests")} onClick={onItemClick}>
                <Calendar className="h-4 w-4" />
                <span className="text-sm font-medium">Friday Tests</span>
              </Link>
            </li>
          )}

          {role === "admin" && (
            <>
              <li>
                <Link to="/reports" className={linkClass("/reports")} onClick={onItemClick}>
                  <FileText className="h-4 w-4" />
                  <span className="text-sm font-medium">Reports</span>
                </Link>
              </li>

              <li>
                <Link to="/admin/weekly-reports" className={linkClass("/admin/weekly-reports")} onClick={onItemClick}>
                  <Calendar className="h-4 w-4" />
                  <span className="text-sm font-medium">Weekly Reports</span>
                </Link>
              </li>

              <li>
                <Link to="/midterm-scores-viewer" className={linkClass("/midterm-scores-viewer")} onClick={onItemClick}>
                  <Database className="h-4 w-4" />
                  <span className="text-sm font-medium">Midterm Scores</span>
                </Link>
              </li>

              <li>
                <Link to="/admin/backup-manager" className={linkClass("/admin/backup-manager")} onClick={onItemClick}>
                  <Database className="h-4 w-4" />
                  <span className="text-sm font-medium">Backup Manager</span>
                </Link>
              </li>

              <li>
                <Link to="/admin/publish-controls" className={linkClass("/admin/publish-controls")} onClick={onItemClick}>
                  <FileText className="h-4 w-4" />
                  <span className="text-sm font-medium">Publish Controls</span>
                </Link>
              </li>

              <li>
                <Link to="/admin/comments" className={linkClass("/admin/comments")} onClick={onItemClick}>
                  <FileText className="h-4 w-4" />
                  <span className="text-sm font-medium">Comments</span>
                </Link>
              </li>
              <li>
                <Link to="/admin/teacher-assignments" className={linkClass("/admin/teacher-assignments")} onClick={onItemClick}>
                  <Users className="h-4 w-4" />
                  <span className="text-sm font-medium">Staff Allocations</span>
                </Link>
              </li>
              <li>
                <Link to="/admin/assignments" className={linkClass("/admin/assignments")} onClick={onItemClick}>
                  <BookOpen className="h-4 w-4" />
                  <span className="text-sm font-medium">Assignments</span>
                </Link>
              </li>
            </>
          )}
        </ul>
      </nav>

      <div className="mt-6 border-t border-gray-100 pt-4">
        <button onClick={handleLogout} className="w-full flex items-center gap-3 px-3 py-2 rounded bg-red-50 text-red-600 hover:bg-red-100 transition-colors">
          <LogOut className="h-4 w-4" />
          <span className="text-sm font-medium">Logout</span>
        </button>
      </div>
    </aside>
  );
}

