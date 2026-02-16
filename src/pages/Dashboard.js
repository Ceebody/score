import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { getDatabase, ref, get } from "firebase/database";
import { Users, GraduationCap, UsersRound, FileText, TrendingUp, Bell, Clock } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { StatsWidget, ActivityWidget, PendingActionsWidget } from "../components/admin/DashboardWidgets";
import { formatTimeAgo } from "../utils/timeUtils";
import AdminTermSetupModal from "../components/admin/AdminTermSetupModal"; // New Import

const Dashboard = () => {
  const navigate = useNavigate();
  const db = getDatabase();
  const { currentUser } = useAuth();

  const [counts, setCounts] = useState({
    teachers: 0,
    students: 0,
    parents: 0,
    reports: 0,
  });
  const [loading, setLoading] = useState(true);
  const [recentActivities, setRecentActivities] = useState([]);
  const [pendingActions, setPendingActions] = useState([]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [teachersSnap, studentsSnap, parentsSnap, scoresSnap] = await Promise.all([
          get(ref(db, "teachers")),
          get(ref(db, "students")),
          get(ref(db, "parents")),
          get(ref(db, "scores"))
        ]);

        const teachersCount = teachersSnap.exists() ? Object.keys(teachersSnap.val()).length : 0;

        let studentsCount = 0;
        if (studentsSnap.exists()) {
          const studentsData = studentsSnap.val();
          Object.keys(studentsData).forEach((classId) => {
            studentsCount += Object.keys(studentsData[classId] || {}).length;
          });
        }

        const parentsCount = parentsSnap.exists() ? Object.keys(parentsSnap.val()).length : 0;

        let reportsCount = 0;
        if (scoresSnap.exists()) {
          const scoresData = scoresSnap.val();
          Object.keys(scoresData).forEach((classId) => {
            const classScores = scoresData[classId];
            Object.keys(classScores || {}).forEach((subjectId) => {
              reportsCount += Object.keys(classScores[subjectId] || {}).length;
            });
          });
        }

        setCounts({
          teachers: teachersCount,
          students: studentsCount,
          parents: parentsCount,
          reports: reportsCount,
        });

        // Mock recent activities (replace with real data)
        // Fetch Activities
        const [archiveSnap] = await Promise.all([
          get(ref(db, "notifications/archive")),
        ]);

        const activities = [];

        // 1. Notifications
        if (archiveSnap.exists()) {
          const data = archiveSnap.val();
          Object.keys(data).forEach((key) => {
            const item = data[key];
            activities.push({
              type: "notification",
              title: `Notification: ${item.title}`,
              time: item.createdAt,
              icon: Bell,
              color: "purple",
              rawDate: item.createdAt,
            });
          });
        }

        // 2. New Students
        if (studentsSnap.exists()) {
          const data = studentsSnap.val();
          Object.keys(data).forEach((classId) => {
            const classStudents = data[classId];
            Object.keys(classStudents).forEach((studentId) => {
              const s = classStudents[studentId];
              if (s.createdAt) {
                activities.push({
                  type: "student",
                  title: `New student: ${s.firstName} ${s.lastName}`,
                  time: s.createdAt,
                  icon: Users,
                  color: "blue",
                  rawDate: s.createdAt,
                });
              }
            });
          });
        }

        // 3. New Teachers
        if (teachersSnap.exists()) {
          const data = teachersSnap.val();
          Object.keys(data).forEach((uid) => {
            const t = data[uid];
            if (t.createdAt) {
              activities.push({
                type: "teacher",
                title: `New teacher: ${t.firstName} ${t.lastName}`,
                time: t.createdAt,
                icon: GraduationCap,
                color: "green",
                rawDate: t.createdAt,
              });
            }
          });
        }

        // Sort by date desc
        activities.sort((a, b) => b.rawDate - a.rawDate);

        // Take top 6
        const recent = activities.slice(0, 6).map(a => ({
          ...a,
          time: formatTimeAgo(a.rawDate)
        }));

        setRecentActivities(recent.length > 0 ? recent : [
          { icon: Clock, title: "No recent activity", time: "", color: "gray" }
        ]);

        // Mock pending actions (replace with real data)
        setPendingActions([
          { title: "Publish Term 2 Reports", description: "125 reports ready", count: 125, onClick: () => navigate("/admin/publish") },
          { title: "Review Backup Status", description: "Last backup 2 days ago", onClick: () => navigate("/admin/backup-manager") },
        ]);

      } catch (err) {
        console.error("Error fetching dashboard data:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [db, navigate]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-amber-50 to-brown-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-brown-700 mx-auto mb-4"></div>
          <p className="text-brown-800 font-medium">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto space-y-8">
      {/* Term Setup Modal */}
      <AdminTermSetupModal />

      {/* Welcome Header */}
      <div className="bg-gradient-to-r from-brown-700 to-amber-600 rounded-2xl p-6 text-white shadow-lg">
        <h1 className="text-3xl font-bold mb-2">Welcome Back! 👋</h1>
        <p className="text-amber-100">Here's what's happening with your school today.</p>
      </div>

      {/* Stats Grid */}
      <div id="dashboard-stats" className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 dashboard-stats">
        <StatsWidget
          label="Total Students"
          value={counts.students}
          icon={GraduationCap}
          trend="+12"
          trendUp={true}
          delay={0.1}
          onClick={() => navigate("/students")}
        />
        <StatsWidget
          label="Total Teachers"
          value={counts.teachers}
          icon={Users}
          delay={0.2}
          onClick={() => navigate("/teachers")}
        />
        <StatsWidget
          label="Total Parents"
          value={counts.parents}
          icon={UsersRound}
          delay={0.3}
          onClick={() => navigate("/parents")}
        />
        <StatsWidget
          label="Reports Generated"
          value={counts.reports}
          icon={FileText}
          trend="+45"
          trendUp={true}
          delay={0.4}
          onClick={() => navigate("/reports")}
        />
      </div>

      {/* Activity & Actions Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <ActivityWidget activities={recentActivities} delay={0.5} />
        <PendingActionsWidget actions={pendingActions} delay={0.6} />
      </div>

      {/* Quick Stats - School Colors Applied */}
      <div className="bg-gradient-to-br from-brown-700 to-amber-600 rounded-2xl p-8 text-white">
        <div className="flex items-center gap-3 mb-4">
          <TrendingUp className="h-8 w-8" />
          <h2 className="text-2xl font-bold">School Performance</h2>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
          <div>
            <p className="text-amber-100 text-sm mb-1">Average Attendance</p>
            <p className="text-3xl font-bold">94.5%</p>
          </div>
          <div>
            <p className="text-amber-100 text-sm mb-1">Active Classes</p>
            <p className="text-3xl font-bold">12</p>
          </div>
          <div>
            <p className="text-amber-100 text-sm mb-1">Completion Rate</p>
            <p className="text-3xl font-bold">89%</p>
          </div>
        </div>
      </div>

      {/* Quick Actions - removed since now in top nav */}
    </div>
  );
};

export default Dashboard;