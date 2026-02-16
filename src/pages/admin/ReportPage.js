// src/pages/admin/ReportPage.js
import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { FaArrowLeft, FaUser, FaGraduationCap, FaChartLine, FaPrint, FaDownload } from "react-icons/fa";
import { db } from "../../utils/firebase";
import { ref, onValue, get } from "firebase/database";

export default function ReportPage() {
  const { classId, studentUID } = useParams();
  const navigate = useNavigate();

  const [studentData, setStudentData] = useState(null);
  const [scores, setScores] = useState({});
  const [progress, setProgress] = useState(0);
  const [currentTerm, setCurrentTerm] = useState({ year: "", name: "" });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const getTotalSubjects = (classId) => {
    const match = classId.match(/\d+/);
    if (!match) return 9;
    const level = parseInt(match[0], 10);
    return level <= 6 ? 9 : 10;
  };

  const getGradeColor = (grade) => {
    if (!grade) return "text-gray-500";
    const gradeUpper = grade.toUpperCase();
    if (gradeUpper === "A") return "text-green-600 bg-green-50 border-green-200";
    if (gradeUpper === "B") return "text-blue-600 bg-blue-50 border-blue-200";
    if (gradeUpper === "C") return "text-yellow-600 bg-yellow-50 border-yellow-200";
    if (gradeUpper === "D") return "text-orange-600 bg-orange-50 border-orange-200";
    if (gradeUpper === "F") return "text-red-600 bg-red-50 border-red-200";
    return "text-gray-600 bg-gray-50 border-gray-200";
  };

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        setError("");

        // Get current term
        const termRef = ref(db, "terms/current");
        const termSnapshot = await get(termRef);
        if (termSnapshot.exists()) {
          setCurrentTerm(termSnapshot.val());
        }

        // Get student data
        const studentRef = ref(db, `students/${classId}/${studentUID}`);
        onValue(studentRef, (snapshot) => {
          if (snapshot.exists()) {
            setStudentData(snapshot.val());
          } else {
            setError("Student not found");
          }
        });

        // Get scores for current term
        const scoresRef = ref(db, `scores/${classId}`);
        onValue(scoresRef, (snapshot) => {
          const data = snapshot.val() || {};
          const studentScores = {};
          
          Object.keys(data).forEach((subject) => {
            if (data[subject] && data[subject][studentUID]) {
              studentScores[subject] = data[subject][studentUID];
            }
          });
          
          setScores(studentScores);

          const totalSubjects = getTotalSubjects(classId);
          const completed = Object.keys(studentScores).length;
          setProgress(completed > 0 ? Math.round((completed / totalSubjects) * 100) : 0);
        });

      } catch (err) {
        console.error("Error fetching report data:", err);
        setError("Failed to load report data");
      } finally {
        setLoading(false);
      }
    };

    if (classId && studentUID) {
      fetchData();
    }
  }, [classId, studentUID]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-cyan-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-20 w-20 border-4 border-indigo-200 border-t-indigo-600 mx-auto mb-6"></div>
          <p className="text-gray-600 font-medium text-lg">Loading student report...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-cyan-50 flex items-center justify-center">
        <div className="text-center bg-white p-8 rounded-2xl shadow-xl border border-red-200">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <span className="text-red-600 text-2xl">⚠</span>
          </div>
          <p className="text-red-600 font-medium mb-6 text-lg">{error}</p>
          <button
            onClick={() => navigate(-1)}
            className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white px-8 py-3 rounded-xl hover:from-indigo-700 hover:to-purple-700 transition-all duration-300 shadow-lg hover:shadow-xl font-medium"
          >
            Go Back
          </button>
        </div>
      </div>
    );
  }

  if (!studentData) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-cyan-50 flex items-center justify-center">
        <div className="text-center bg-white p-8 rounded-2xl shadow-xl">
          <p className="text-gray-600 font-medium mb-6 text-lg">Student not found</p>
          <button
            onClick={() => navigate(-1)}
            className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white px-8 py-3 rounded-xl hover:from-indigo-700 hover:to-purple-700 transition-all duration-300 shadow-lg hover:shadow-xl font-medium"
          >
            Go Back
          </button>
        </div>
      </div>
    );
  }

  const hasScores = Object.keys(scores).length > 0;

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-cyan-50">
      {/* Top Navigation Bar with Back Button */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="sticky top-0 z-50 bg-white/80 backdrop-blur-lg border-b border-gray-200 shadow-sm"
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <button
              onClick={() => navigate(-1)}
              className="flex items-center space-x-2 bg-gradient-to-r from-indigo-600 to-purple-600 text-white px-6 py-2.5 rounded-xl hover:from-indigo-700 hover:to-purple-700 transition-all duration-300 shadow-lg hover:shadow-xl font-medium"
            >
              <FaArrowLeft className="text-sm" />
              <span>Back to Dashboard</span>
            </button>
            
            <div className="flex items-center space-x-3">
              <button className="flex items-center space-x-2 bg-white text-gray-700 px-4 py-2.5 rounded-xl border border-gray-200 hover:bg-gray-50 transition-all duration-300 shadow-sm hover:shadow-md font-medium">
                <FaPrint className="text-sm" />
                <span className="hidden sm:inline">Print</span>
              </button>
              <button className="flex items-center space-x-2 bg-white text-gray-700 px-4 py-2.5 rounded-xl border border-gray-200 hover:bg-gray-50 transition-all duration-300 shadow-sm hover:shadow-md font-medium">
                <FaDownload className="text-sm" />
                <span className="hidden sm:inline">Export</span>
              </button>
            </div>
          </div>
        </div>
      </motion.div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="text-center mb-10"
        >
          <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-2xl mb-6 shadow-lg">
            <FaUser className="text-white text-2xl" />
          </div>
          <h1 className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent mb-4">
            Academic Report
          </h1>
          <p className="text-gray-600 text-lg max-w-2xl mx-auto">
            Comprehensive performance overview for {currentTerm.year} - {currentTerm.name}
          </p>
        </motion.div>

        {/* Student Info Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.1 }}
          className="bg-white/70 backdrop-blur-lg rounded-3xl shadow-xl p-8 mb-8 border border-white/20"
        >
          <div className="flex flex-col lg:flex-row items-center lg:items-start space-y-6 lg:space-y-0 lg:space-x-8">
            <div className="flex-shrink-0">
              <div className="w-24 h-24 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-2xl flex items-center justify-center shadow-lg">
                <FaUser className="text-white text-3xl" />
              </div>
            </div>
            
            <div className="flex-1 text-center lg:text-left">
              <h2 className="text-3xl font-bold text-gray-800 mb-2">
                {studentData.firstName} {studentData.lastName}
              </h2>
              <p className="text-gray-600 mb-6 text-lg">Student ID: {studentData.studentID}</p>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-white/50 rounded-2xl p-4 border border-white/30">
                  <div className="flex items-center justify-center lg:justify-start space-x-3">
                    <FaGraduationCap className="text-indigo-600 text-xl" />
                    <div>
                      <p className="text-sm text-gray-500 font-medium">Class</p>
                      <p className="font-bold text-gray-800 text-lg">{classId}</p>
                    </div>
                  </div>
                </div>
                
                <div className="bg-white/50 rounded-2xl p-4 border border-white/30">
                  <div className="flex items-center justify-center lg:justify-start space-x-3">
                    <FaChartLine className="text-indigo-600 text-xl" />
                    <div>
                      <p className="text-sm text-gray-500 font-medium">Progress</p>
                      <p className="font-bold text-gray-800 text-lg">{progress}%</p>
                    </div>
                  </div>
                </div>
                
                <div className="bg-white/50 rounded-2xl p-4 border border-white/30">
                  <div className="flex items-center justify-center lg:justify-start space-x-3">
                    <div className="w-6 h-6 bg-gradient-to-r from-green-400 to-blue-500 rounded-full"></div>
                    <div>
                      <p className="text-sm text-gray-500 font-medium">Subjects</p>
                      <p className="font-bold text-gray-800 text-lg">
                        {Object.keys(scores).length}/{getTotalSubjects(classId)}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Progress Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="bg-white/70 backdrop-blur-lg rounded-3xl shadow-xl p-8 mb-8 border border-white/20"
        >
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-2xl font-bold text-gray-800 flex items-center">
              <FaChartLine className="mr-3 text-indigo-600" />
              Academic Progress
            </h3>
            <div className="text-right">
              <div className="text-3xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
                {progress}%
              </div>
              <p className="text-sm text-gray-500">Completion Rate</p>
            </div>
          </div>
          
          <div className="relative">
            <div className="w-full bg-gray-200 rounded-full h-6 overflow-hidden shadow-inner">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${progress}%` }}
                transition={{ duration: 1.5, delay: 0.5, ease: "easeOut" }}
                className="bg-gradient-to-r from-indigo-500 to-purple-600 h-6 rounded-full shadow-lg relative"
              >
                <div className="absolute inset-0 bg-white/20 rounded-full animate-pulse"></div>
              </motion.div>
            </div>
            <p className="text-sm text-gray-600 mt-3 text-center">
              {Object.keys(scores).length} out of {getTotalSubjects(classId)} subjects completed
            </p>
          </div>
        </motion.div>

        {/* Scores Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.3 }}
          className="bg-white/70 backdrop-blur-lg rounded-3xl shadow-xl border border-white/20 overflow-hidden"
        >
          <div className="p-8 border-b border-gray-100">
            <h3 className="text-2xl font-bold text-gray-800 mb-2">Subject Performance</h3>
            <p className="text-gray-600">
              {hasScores 
                ? "Detailed academic performance across all subjects" 
                : "No scores available for the current term yet"
              }
            </p>
          </div>

          {hasScores ? (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gradient-to-r from-indigo-50 to-purple-50">
                  <tr>
                    <th className="px-8 py-6 text-left text-sm font-bold text-gray-700 uppercase tracking-wider">
                      Subject
                    </th>
                    <th className="px-8 py-6 text-center text-sm font-bold text-gray-700 uppercase tracking-wider">
                      Total Score
                    </th>
                    <th className="px-8 py-6 text-center text-sm font-bold text-gray-700 uppercase tracking-wider">
                      Grade
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {Object.keys(scores).map((subject, idx) => (
                    <motion.tr
                      key={idx}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ duration: 0.4, delay: 0.1 * idx }}
                      className="hover:bg-white/50 transition-all duration-300"
                    >
                      <td className="px-8 py-6 whitespace-nowrap">
                        <div className="font-semibold text-gray-800 text-lg">{subject}</div>
                      </td>
                      <td className="px-8 py-6 whitespace-nowrap text-center">
                        <span className="text-xl font-bold text-gray-800 bg-gray-50 px-4 py-2 rounded-xl">
                          {scores[subject].total || "—"}
                        </span>
                      </td>
                      <td className="px-8 py-6 whitespace-nowrap text-center">
                        <span className={`text-xl font-bold px-4 py-2 rounded-xl border-2 ${getGradeColor(scores[subject].grade)}`}>
                          {scores[subject].grade || "—"}
                        </span>
                      </td>
                    </motion.tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="p-16 text-center">
              <div className="w-32 h-32 bg-gradient-to-br from-indigo-100 to-purple-100 rounded-full flex items-center justify-center mx-auto mb-6">
                <FaChartLine className="text-indigo-400 text-4xl" />
              </div>
              <h4 className="text-2xl font-bold text-gray-700 mb-4">No Scores Available</h4>
              <p className="text-gray-500 max-w-lg mx-auto text-lg leading-relaxed">
                This student doesn't have any recorded scores for the current term ({currentTerm.year} - {currentTerm.name}). 
                Scores will appear here once they are entered by teachers.
              </p>
            </div>
          )}
        </motion.div>
      </div>
    </div>
  );
}