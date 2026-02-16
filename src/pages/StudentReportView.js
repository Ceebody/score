import React, { useEffect, useState, useRef } from "react";
import { useParams } from "react-router-dom";
import { db } from "../utils/firebase";
import { ref, get, onValue } from "firebase/database";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell, RadialBarChart, RadialBar } from 'recharts';
import logo from "../assets/logo.png"; // Assuming logo exists, consistent with MidtermView
import config from "../config";

// Subject ordering by department
const PRIMARY_SUBJECTS = [
  "Numeracy",
  "Science",
  "English Language",
  "Religious and Moral Education",
  "Computing",
  "History",
  "Creative Arts and Design",
  "French",
  "Ghanaian Language"
];

const JHS_SUBJECTS = [
  "Mathematics",
  "Science",
  "English Language",
  "Religious and Moral Education",
  "Computing",
  "Social Studies",
  "Creative Arts and Design",
  "Career Technology",
  "French",
  "Ghanaian Language"
];

// Professional color palette
const SUBJECT_COLORS = {
  "Mathematics": "#1F2937", // Gray 800
  "Numeracy": "#1F2937",
  "Science": "#059669", // Emerald 600
  "English Language": "#2563EB", // Blue 600
  "Religious and Moral Education": "#D97706", // Amber 600
  "Computing": "#7C3AED", // Violet 600
  "History": "#9333EA", // Purple 600
  "Creative Arts and Design": "#DB2777", // Pink 600
  "Social Studies": "#0891B2", // Cyan 600
  "Career Technology": "#4F46E5", // Indigo 600
  "French": "#EA580C", // Orange 600
  "Ghanaian Language": "#BE123C" // Rose 700
};

function getSubjectDisplayName(subject) {
  const displayNames = {
    "Mathematics": "Math",
    "Numeracy": "Math",
    "English Language": "English",
    "Religious and Moral Education": "RME",
    "Creative Arts and Design": "Arts",
    "Career Technology": "C.Tech",
    "Ghanaian Language": "GL",
    "Social Studies": "Social",
  };
  return displayNames[subject] || subject;
}

const GRADE_COLORS = {
  "A": "#10B981", // Green 500
  "B": "#3B82F6", // Blue 500
  "C": "#F59E0B", // Amber 500
  "D": "#EF4444", // Red 500
  "E": "#EF4444", // Red 500
  "N/A": "#9CA3AF" // Gray 400
};

// Simple Progress Ring
const ProgressRing = ({ progress, size = 100, strokeWidth = 8 }) => {
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const strokeDasharray = `${circumference} ${circumference}`;
  const strokeDashoffset = circumference - (progress / 100) * circumference;

  return (
    <div className="relative inline-flex items-center justify-center">
      <svg width={size} height={size} className="transform -rotate-90">
        <circle cx={size / 2} cy={size / 2} r={radius} stroke="#E5E7EB" strokeWidth={strokeWidth} fill="transparent" />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="#CA8A04" // Yellow-600
          strokeWidth={strokeWidth}
          fill="transparent"
          strokeDasharray={strokeDasharray}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
          className="transition-all duration-1000 ease-out"
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        <span className="text-xl font-bold text-gray-800">{progress}%</span>
      </div>
    </div>
  );
};

export default function StudentReportView() {
  const { classId, studentId } = useParams();
  const [student, setStudent] = useState(null);
  const [scores, setScores] = useState({});
  const [historicalScores, setHistoricalScores] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [currentTerm, setCurrentTerm] = useState({ year: "", name: "" });
  const [subjects, setSubjects] = useState([]);
  const [progress, setProgress] = useState(0);
  const [averageScore, setAverageScore] = useState(0);
  const [gradeDistribution, setGradeDistribution] = useState([]);
  const prevScoresRef = useRef(null);

  useEffect(() => {
    let unsubScores = null;
    async function fetchData() {
      try {
        setLoading(true);
        setError("");

        // 1. Get current term
        const termRef = ref(db, "terms/current");
        const termSnapshot = await get(termRef);
        let termObj = null;
        if (termSnapshot.exists()) {
          termObj = termSnapshot.val();
          setCurrentTerm(termObj);
        }

        // Resolve student
        let resolvedKey = studentId;
        const directRef = ref(db, `students/${classId}/${studentId}`);
        const directSnap = await get(directRef);
        if (directSnap.exists()) {
          const studentData = directSnap.val();
          setStudent(studentData);
          setSubjects(classId.toLowerCase().includes('jhs') ? JHS_SUBJECTS : PRIMARY_SUBJECTS);
        } else {
          const classStudentsRef = ref(db, `students/${classId}`);
          const classSnap = await get(classStudentsRef);
          if (classSnap.exists()) {
            const classData = classSnap.val();
            const foundKey = Object.keys(classData).find(k => classData[k] && classData[k].uid === studentId);
            if (foundKey) {
              resolvedKey = foundKey;
              const studentData = classData[foundKey];
              setStudent(studentData);
              setSubjects(classId.toLowerCase().includes('jhs') ? JHS_SUBJECTS : PRIMARY_SUBJECTS);
            } else {
              setError("Student not found");
            }
          } else {
            setError("Student not found");
          }
        }
        setLoading(false);

        // 3. Get scores
        const scoresRef = ref(db, `scores/${classId}`);
        unsubScores = onValue(scoresRef, (snapshot) => {
          const data = snapshot.val() || {};
          const studentScores = {};

          Object.keys(data).forEach(subject => {
            if (data[subject] && data[subject][resolvedKey]) {
              studentScores[subject] = data[subject][resolvedKey];
            }
          });

          try {
            const prev = prevScoresRef.current;
            const prevStr = prev ? JSON.stringify(prev) : null;
            const nextStr = JSON.stringify(studentScores);
            if (prevStr !== nextStr) {
              prevScoresRef.current = studentScores;
              setScores(studentScores);

              const scoreValues = Object.values(studentScores).map(s => s.total || 0).filter(s => s > 0);
              const avg = scoreValues.length > 0 ? Math.round(scoreValues.reduce((a, b) => a + b, 0) / scoreValues.length) : 0;
              setAverageScore(avg);

              const grades = { A: 0, B: 0, C: 0, D: 0, E: 0 };
              scoreValues.forEach(score => {
                if (score >= 80) grades.A++;
                else if (score >= 70) grades.B++;
                else if (score >= 60) grades.C++;
                else if (score >= 50) grades.D++;
                else if (score > 0) grades.E++;
              });

              const gradeData = Object.entries(grades).map(([grade, count]) => ({
                name: grade,
                value: count,
                color: GRADE_COLORS[grade]
              })).filter(g => g.value > 0);

              setGradeDistribution(gradeData);
            }
          } catch (e) {
            prevScoresRef.current = studentScores;
            setScores(studentScores);
          }

          const totalSubjects = classId.toLowerCase().includes('jhs') ? 10 : 9;
          const completed = Object.keys(studentScores).length;
          setProgress(completed > 0 ? Math.round((completed / totalSubjects) * 100) : 0);
        });

        // 4. Historical data
        const historicalData = [];
        const termsRef = ref(db, "terms");
        const termsSnap = await get(termsRef);

        if (termsSnap.exists()) {
          const termsData = termsSnap.val();
          const termsList = [];
          if (termObj) termsList.push(termObj);
          if (termsData.previous) {
            const previousTerms = Object.values(termsData.previous)
              .sort((a, b) => b.year - a.year || b.name.localeCompare(a.name))
              .slice(0, 2);
            termsList.push(...previousTerms);
          }

          for (const term of termsList) {
            const termScoresRef = ref(db, `scores/${term.year}/${term.name}/${classId}`);
            const termScoresSnap = await get(termScoresRef);
            if (termScoresSnap.exists()) {
              const scoresData = termScoresSnap.val();
              const termScores = {};
              subjects.forEach(subject => {
                if (scoresData[subject] && scoresData[subject][resolvedKey]) {
                  termScores[subject] = scoresData[subject][resolvedKey].total || 0;
                } else {
                  termScores[subject] = 0;
                }
              });
              historicalData.push({ term: `${term.name} ${term.year}`, ...termScores });
            }
          }
        }
        setHistoricalScores(historicalData);
        setLoading(false);
      } catch (error) {
        console.error("Error fetching report data:", error);
        setLoading(false);
      }
    }

    if (classId && studentId) fetchData();
    return () => { if (unsubScores) unsubScores(); };
  }, [classId, studentId]);

  if (loading) return <div className="min-h-screen flex items-center justify-center bg-gray-50"><div className="text-xl font-semibold text-gray-600">Loading Report...</div></div>;
  if (!student) return <div className="min-h-screen flex items-center justify-center bg-gray-50"><div className="text-xl font-semibold text-red-600">Student Not Found</div></div>;

  const chartData = historicalScores.map(termData => {
    const data = { term: termData.term };
    subjects.forEach(subject => { data[getSubjectDisplayName(subject)] = termData[subject] || 0; });
    return data;
  });

  const radialData = subjects.map((subject, index) => ({
    name: getSubjectDisplayName(subject),
    score: scores[subject]?.total || 0,
    fill: SUBJECT_COLORS[subject] || '#6B7280'
  })).filter(item => item.score > 0);

  return (
    <div className="min-h-screen bg-gray-50 p-8 print:p-0 print:bg-white font-sans text-gray-800">
      <div className="max-w-5xl mx-auto bg-white shadow-lg rounded-xl overflow-hidden print:shadow-none print:max-w-none">

        {/* Header */}
        <div className="bg-white border-b-4 border-yellow-600 p-8 flex flex-col md:flex-row items-center justify-between gap-6 print:flex-row print:p-4 print:border-b-2">
          <div className="flex items-center gap-4">
            <img src={logo} alt="School Logo" className="w-20 h-20 object-contain" />
            <div>
              <h1 className="text-3xl font-bold text-gray-900 uppercase tracking-wide">{config.schoolName}</h1>
              <p className="text-sm text-gray-500 uppercase tracking-wider">Excellence in Education</p>
            </div>
          </div>
          <div className="text-center md:text-right print:text-right">
            <h2 className="text-2xl font-bold text-gray-800">STUDENT REPORT CARD</h2>
            <p className="text-gray-600">{currentTerm?.name} {currentTerm?.year}</p>
          </div>
          <button
            onClick={() => window.print()}
            className="print:hidden bg-blue-600 text-white px-6 py-2 rounded-lg font-medium hover:bg-blue-700 transition-colors shadow-sm flex items-center gap-2"
          >
            <span>🖨️</span> Print
          </button>
        </div>

        {/* Student Info Grid */}
        <div className="p-8 bg-gray-50 border-b border-gray-200 print:bg-white print:p-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {/* Student Details */}
            <div className="col-span-2">
              <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-4">Student Information</h3>
              <div className="grid grid-cols-2 gap-y-4 gap-x-8">
                <div>
                  <p className="text-xs text-gray-500 uppercase">Full Name</p>
                  <p className="text-lg font-bold text-gray-900">{student.firstName} {student.lastName}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 uppercase">Class</p>
                  <p className="text-lg font-medium text-gray-900">{classId}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 uppercase">Email</p>
                  <p className="text-sm font-medium text-gray-900">{student.email}</p>
                </div>
                <div className="col-span-2 print:hidden">
                  <p className="text-xs text-gray-500 uppercase">Login Password</p>
                  <p className="text-sm font-mono bg-gray-200 inline-block px-2 py-1 rounded">{student.password || "******"}</p>
                </div>
                {/* Show password in print but styled simply */}
                <div className="hidden print:block col-span-2">
                  <p className="text-xs text-gray-500 uppercase">Login Password</p>
                  <p className="text-sm font-mono text-gray-900">{student.password || "******"}</p>
                </div>
              </div>
            </div>

            {/* Summary Stats */}
            <div className="flex flex-col justify-center items-center border-l border-gray-200 pl-8 print:border-l-0 print:pl-0 print:items-end">
              <div className="text-center mb-4">
                <p className="text-xs text-gray-500 uppercase">Overall Average</p>
                <div className="text-4xl font-bold text-blue-600">{averageScore}%</div>
              </div>
              <div className="flex items-center gap-4">
                <div className="text-center">
                  <p className="text-xs text-gray-500 uppercase">Subjects</p>
                  <p className="text-xl font-bold text-gray-800">{Object.keys(scores).length}</p>
                </div>
                <div className="w-px h-8 bg-gray-300"></div>
                <div className="text-center">
                  <p className="text-xs text-gray-500 uppercase">Progress</p>
                  <ProgressRing progress={progress} size={50} strokeWidth={4} />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Scores Table */}
        <div className="p-8 print:p-4">
          <h3 className="text-lg font-bold text-gray-800 mb-6 flex items-center gap-2">
            <span className="w-2 h-6 bg-yellow-600 rounded-full"></span>
            Academic Performance
          </h3>
          <div className="overflow-hidden border border-gray-200 rounded-lg shadow-sm">
            <table className="w-full text-sm text-left text-gray-600">
              <thead className="text-xs text-gray-700 uppercase bg-gray-100 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-3 font-bold">Subject</th>
                  <th className="px-6 py-3 font-bold text-center">Score</th>
                  <th className="px-6 py-3 font-bold text-center">Grade</th>
                  <th className="px-6 py-3 font-bold">Remarks</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {subjects.map((subject) => {
                  const score = scores[subject]?.total || 0;
                  let grade = "N/A";
                  let remarks = "-";

                  if (score >= 80) { grade = "A"; remarks = "Excellent"; }
                  else if (score >= 70) { grade = "B"; remarks = "Very Good"; }
                  else if (score >= 60) { grade = "C"; remarks = "Good"; }
                  else if (score >= 50) { grade = "D"; remarks = "Pass"; }
                  else if (score > 0) { grade = "E"; remarks = "Fail"; }

                  return (
                    <tr key={subject} className="hover:bg-gray-50">
                      <td className="px-6 py-4 font-medium text-gray-900">{subject}</td>
                      <td className="px-6 py-4 text-center font-bold text-gray-800">{score || "-"}</td>
                      <td className="px-6 py-4 text-center">
                        <span className="px-2 py-1 rounded text-xs font-bold text-white" style={{ backgroundColor: GRADE_COLORS[grade] }}>
                          {grade}
                        </span>
                      </td>
                      <td className="px-6 py-4">{remarks}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Charts Section (Hidden in print if needed, or kept simple) */}
        <div className="p-8 bg-gray-50 border-t border-gray-200 print:break-before-page">
          <h3 className="text-lg font-bold text-gray-800 mb-6 flex items-center gap-2">
            <span className="w-2 h-6 bg-blue-600 rounded-full"></span>
            Performance Analytics
          </h3>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
              <h4 className="text-sm font-bold text-gray-500 uppercase mb-4 text-center">Score Distribution</h4>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
                    <XAxis dataKey="term" tick={{ fontSize: 12 }} axisLine={false} tickLine={false} />
                    <YAxis domain={[0, 100]} tick={{ fontSize: 12 }} axisLine={false} tickLine={false} />
                    <Tooltip contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' }} />
                    <Legend wrapperStyle={{ fontSize: '12px', paddingTop: '10px' }} />
                    {subjects.map((subject, i) => (
                      <Bar key={subject} dataKey={getSubjectDisplayName(subject)} fill={SUBJECT_COLORS[subject]} radius={[4, 4, 0, 0]} />
                    ))}
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
              <h4 className="text-sm font-bold text-gray-500 uppercase mb-4 text-center">Subject Proficiency</h4>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <RadialBarChart cx="50%" cy="50%" innerRadius="20%" outerRadius="100%" barSize={10} data={radialData}>
                    <RadialBar minAngle={15} background clockWise dataKey="score" cornerRadius={10} />
                    <Legend iconSize={10} layout="vertical" verticalAlign="middle" wrapperStyle={{ right: 0, fontSize: '11px' }} />
                    <Tooltip contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' }} />
                  </RadialBarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="bg-gray-800 text-white p-6 text-center print:bg-white print:text-gray-500 print:border-t print:border-gray-200">
          <p className="text-sm font-medium">{config.schoolName} &copy; {new Date().getFullYear()}</p>
          <p className="text-xs opacity-70 mt-1">This report is computer generated and requires no signature.</p>
        </div>

      </div>
    </div>
  );
}