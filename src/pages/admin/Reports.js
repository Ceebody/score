// Modern Reports Page with Class-based filtering and Print functionality
import React, { useEffect, useState } from "react";
import { db } from "../../utils/firebase";
import { ref, onValue } from "firebase/database";
import { useNavigate, Navigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  Users,
  Filter,
  Search,
  Printer,
  Download,
  CheckCircle,
  AlertCircle,
  Clock,
  Eye,
  FileText,
} from "lucide-react";

export default function ModernReports({ user }) {
  const [reports, setReports] = useState([]);
  const [classes, setClasses] = useState([]);
  const [search, setSearch] = useState("");
  const [selectedClass, setSelectedClass] = useState("all");
  const [selectedProgress, setSelectedProgress] = useState("all");
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({ total: 0, completed: 0, pending: 0 });
  const navigate = useNavigate();

  useEffect(() => {
    const classesRef = ref(db, "classes");
    const studentsRef = ref(db, "students");
    const scoresRef = ref(db, "scores");
    const classTeacherRecordsRef = ref(db, "classTeacherRecords");

    onValue(classesRef, (snapshot) => {
      const classesData = snapshot.val() || {};
      const classList = Object.keys(classesData).map((id) => ({
        id,
        name: classesData[id]?.name || id,
      }));
      setClasses(classList);

      onValue(studentsRef, (studentsSnap) => {
        const studentsData = studentsSnap.val() || {};
        onValue(scoresRef, (scoresSnap) => {
          const scoresData = scoresSnap.val() || {};
          onValue(classTeacherRecordsRef, (ctrSnap) => {
            const ctrData = ctrSnap.val() || {};

            const allReports = [];
            let completedCount = 0;
            let pendingCount = 0;

            Object.keys(studentsData).forEach((classId) => {
              const className = classesData[classId]?.name || classId;

              Object.keys(studentsData[classId] || {}).forEach((studentUID) => {
                const studentInfo = studentsData[classId][studentUID] || {};
                const fullName =
                  studentInfo.firstName && studentInfo.lastName
                    ? `${studentInfo.firstName} ${studentInfo.lastName}`
                    : studentInfo.name || "N/A";
                const studentID = studentInfo.studentID || "N/A";

                // Get student scores
                const studentScores = {};
                Object.keys(scoresData[classId] || {}).forEach((subject) => {
                  if (scoresData[classId][subject][studentUID]) {
                    studentScores[subject] = scoresData[classId][subject][studentUID];
                  }
                });

                // Check if class teacher has filled records
                const classTeacherRecord = ctrData[classId]?.[studentUID] || null;

                // Total tasks (subjects + class teacher record)
                const totalTasks = ["Basic 7", "Basic 8", "Basic 9"].some((lvl) =>
                  className.startsWith(lvl)
                )
                  ? 11 // 10 subjects + class teacher record
                  : 10; // 9 subjects + class teacher record

                const completedTasks =
                  Object.keys(studentScores).length + (classTeacherRecord ? 1 : 0);

                const progress = Math.round((completedTasks / totalTasks) * 100);

                if (progress === 100) completedCount++;
                else pendingCount++;

                allReports.push({
                  classId,
                  className,
                  studentUID,
                  fullName,
                  studentID,
                  progress,
                  gender: studentInfo.gender || "N/A",
                });
              });
            });

            setReports(allReports);
            setStats({
              total: allReports.length,
              completed: completedCount,
              pending: pendingCount,
            });
            setLoading(false);
          });
        });
      });
    });
  }, []);

  // 🔐 Restrict this page to admins only
  if (user?.role !== "admin") {
    return <Navigate to="/admin-dashboard" />;
  }

  // Filtering logic
  const filteredReports = reports.filter((r) => {
    const matchesSearch =
      r.fullName.toLowerCase().includes(search.toLowerCase()) ||
      r.studentID.toLowerCase().includes(search.toLowerCase());

    const matchesClass = selectedClass === "all" || r.classId === selectedClass;

    const matchesProgress =
      selectedProgress === "all" ||
      (selectedProgress === "completed" && r.progress === 100) ||
      (selectedProgress === "pending" && r.progress < 100);

    return matchesSearch && matchesClass && matchesProgress;
  });

  // Group by class
  const groupedByClass = filteredReports.reduce((acc, report) => {
    if (!acc[report.classId]) {
      acc[report.classId] = {
        className: report.className,
        students: [],
      };
    }
    acc[report.classId].students.push(report);
    return acc;
  }, {});

  const handlePrintClass = (classId) => {
    const className = groupedByClass[classId]?.className || "Unknown Class";
    window.print();
  };

  const handlePrintAll = () => {
    window.print();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <Clock className="h-12 w-12 animate-spin text-indigo-600 mx-auto mb-4" />
          <p className="text-gray-600">Loading reports...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto space-y-6 print:p-4">
      {/* Header - Hide on Print */}
      <div className="print:hidden">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Student Reports</h1>
        <p className="text-gray-600">Manage and print student reports by class</p>
      </div>

      {/* Stats Cards - Hide on Print */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 print:hidden">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-xl shadow-sm border border-gray-200 p-6"
        >
          <div className="flex items-center gap-3 mb-2">
            <div className="h-10 w-10 rounded-lg bg-blue-100 flex items-center justify-center">
              <FileText className="h-5 w-5 text-blue-600" />
            </div>
            <h3 className="font-semibold text-gray-900">Total Reports</h3>
          </div>
          <p className="text-3xl font-bold text-gray-900">{stats.total}</p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-white rounded-xl shadow-sm border border-gray-200 p-6"
        >
          <div className="flex items-center gap-3 mb-2">
            <div className="h-10 w-10 rounded-lg bg-green-100 flex items-center justify-center">
              <CheckCircle className="h-5 w-5 text-green-600" />
            </div>
            <h3 className="font-semibold text-gray-900">Completed</h3>
          </div>
          <p className="text-3xl font-bold text-green-600">{stats.completed}</p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-white rounded-xl shadow-sm border border-gray-200 p-6"
        >
          <div className="flex items-center gap-3 mb-2">
            <div className="h-10 w-10 rounded-lg bg-yellow-100 flex items-center justify-center">
              <AlertCircle className="h-5 w-5 text-yellow-600" />
            </div>
            <h3 className="font-semibold text-gray-900">Pending</h3>
          </div>
          <p className="text-3xl font-bold text-yellow-600">{stats.pending}</p>
        </motion.div>
      </div>

      {/* Filters - Hide on Print */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 print:hidden">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search by name or ID..."
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          {/* Class Filter */}
          <div className="relative">
            <Filter className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
            <select
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              value={selectedClass}
              onChange={(e) => setSelectedClass(e.target.value)}
            >
              <option value="all">All Classes</option>
              {classes.map((cls) => (
                <option key={cls.id} value={cls.id}>
                  {cls.name}
                </option>
              ))}
            </select>
          </div>

          {/* Progress Filter */}
          <div>
            <select
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              value={selectedProgress}
              onChange={(e) => setSelectedProgress(e.target.value)}
            >
              <option value="all">All Progress</option>
              <option value="completed">Completed (100%)</option>
              <option value="pending">Pending (&lt;100%)</option>
            </select>
          </div>

          {/* Print Button */}
          <button
            onClick={handlePrintAll}
            className="flex items-center justify-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
          >
            <Printer className="h-5 w-5" />
            Print All
          </button>
        </div>
      </div>

      {/* Reports by Class */}
      <div className="space-y-6">
        {Object.keys(groupedByClass).length === 0 ? (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12 text-center">
            <FileText className="h-16 w-16 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-600">No reports found</p>
          </div>
        ) : (
          Object.keys(groupedByClass).map((classId, index) => {
            const classData = groupedByClass[classId];
            return (
              <motion.div
                key={classId}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
                className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden print:break-inside-avoid print:mb-8"
              >
                {/* Class Header */}
                <div className="px-6 py-4 bg-gradient-to-r from-indigo-600 to-purple-600 text-white flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Users className="h-6 w-6" />
                    <div>
                      <h2 className="text-xl font-bold">{classData.className}</h2>
                      <p className="text-sm text-indigo-100">
                        {classData.students.length} students
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => handlePrintClass(classId)}
                    className="print:hidden flex items-center gap-2 px-4 py-2 bg-white/20 hover:bg-white/30 rounded-lg transition-colors"
                  >
                    <Printer className="h-5 w-5" />
                    Print Class
                  </button>
                </div>

                {/* Students Table */}
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-50 border-b border-gray-200">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                          Student Name
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                          Student ID
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                          Gender
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                          Progress
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider print:hidden">
                          Action
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {classData.students.map((student, idx) => (
                        <tr key={idx} className="hover:bg-gray-50 transition-colors">
                          <td className="px-6 py-4 text-sm font-medium text-gray-900">
                            {student.fullName}
                          </td>
                          <td className="px-6 py-4 text-sm text-gray-600">
                            {student.studentID}
                          </td>
                          <td className="px-6 py-4 text-sm text-gray-600">
                            {student.gender}
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-3">
                              <div className="flex-1 bg-gray-200 rounded-full h-2 max-w-[120px]">
                                <div
                                  className={`h-2 rounded-full transition-all ${student.progress === 100
                                      ? "bg-green-500"
                                      : student.progress >= 50
                                        ? "bg-yellow-500"
                                        : "bg-red-500"
                                    }`}
                                  style={{ width: `${student.progress}%` }}
                                />
                              </div>
                              <span
                                className={`text-sm font-semibold ${student.progress === 100
                                    ? "text-green-600"
                                    : student.progress >= 50
                                      ? "text-yellow-600"
                                      : "text-red-600"
                                  }`}
                              >
                                {student.progress}%
                              </span>
                            </div>
                          </td>
                          <td className="px-6 py-4 print:hidden">
                            <button
                              onClick={() =>
                                navigate(
                                  `/student-report/${student.classId}/${student.studentUID}`
                                )
                              }
                              className="flex items-center gap-2 px-3 py-1.5 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors text-sm font-medium"
                            >
                              <Eye className="h-4 w-4" />
                              View
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </motion.div>
            );
          })
        )}
      </div>

      {/* Print Styles */}
      <style jsx>{`
        @media print {
          @page {
            margin: 1cm;
          }
          body {
            print-color-adjust: exact;
            -webkit-print-color-adjust: exact;
          }
        }
      `}</style>
    </div>
  );
}
