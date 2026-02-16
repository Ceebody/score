import React, { useEffect, useState, useRef } from "react";
import { ref, onValue, get, remove } from "firebase/database";
import { db } from "../../utils/firebase";
import { motion } from "framer-motion";
import { GraduationCap, Printer, ArrowLeft } from "lucide-react";
import logo from "../../assets/logo.png"; // ✅ School logo
import { useAuth } from "../../context/AuthContext";
import config from "../../config";

export default function MidtermScoresViewer() {
  const { role } = useAuth();
  const [selectedYear, setSelectedYear] = useState("");
  const [terms] = useState(["Term 1", "Term 2", "Term 3"]);
  const [selectedTerm, setSelectedTerm] = useState("");
  const [classes, setClasses] = useState([]);
  const [selectedClass, setSelectedClass] = useState("");
  const [scores, setScores] = useState({});
  const [loading, setLoading] = useState(false);
  const printRef = useRef(null);

  // ✅ Load current term/year
  useEffect(() => {
    const termRef = ref(db, "terms/current");
    onValue(termRef, (snap) => {
      if (snap.exists()) {
        const data = snap.val();
        setSelectedYear(data.year);
        setSelectedTerm(data.name);
      }
    });
  }, []);

  // ✅ Load class list
  useEffect(() => {
    const classRef = ref(db, "classes");
    onValue(classRef, (snap) => {
      if (snap.exists()) {
        const data = snap.val();
        const classList = Object.keys(data).map((key) => ({
          id: key,
          name: data[key].name || key,
        }));
        setClasses(classList);
      }
    });
  }, []);

  // ✅ Fetch scores from Firebase
  useEffect(() => {
    if (!selectedClass || !selectedYear || !selectedTerm) return;
    setLoading(true);
    const path = ref(db, `midtermScores/${selectedYear}/${selectedTerm}/${selectedClass}`);
    onValue(path, (snap) => {
      if (snap.exists()) {
        setScores(snap.val());
      } else {
        setScores({});
      }
      setLoading(false);
    });
  }, [selectedYear, selectedTerm, selectedClass]);

  // ✅ Fixed subject lists by department as requested
  const isUpper =
    selectedClass.toLowerCase().includes("7") ||
    selectedClass.toLowerCase().includes("8") ||
    selectedClass.toLowerCase().includes("9");

  // Primary school subjects (fixed order)
  const primarySubjects = [
    { key: "Mathematics", short: "Num" },
    { key: "Science", short: "Sci" },
    { key: "English Language", short: "Eng" },
    { key: "Religious and Moral Education", short: "RME" },
    { key: "Computing", short: "Comp" },
    { key: "History", short: "Hist" },
    { key: "Creative Arts and Design", short: "Arts" },
    { key: "French", short: "Fr" },
    { key: "Ghanaian Language", short: "GL" },
  ];

  // JHS subjects (fixed order)
  const jhsSubjects = [
    { key: "Mathematics", short: "Num" },
    { key: "Science", short: "Sci" },
    { key: "English Language", short: "Eng" },
    { key: "Religious and Moral Education", short: "RME" },
    { key: "Computing", short: "Comp" },
    { key: "Social Studies", short: "Soc" },
    { key: "Creative Arts and Design", short: "CAD" },
    { key: "Career Technology", short: "Tech" },
    { key: "French", short: "Fr" },
    { key: "Ghanaian Language", short: "GL" },
  ];

  // Use the appropriate fixed subject list based on class level
  const subjects = isUpper ? jhsSubjects : primarySubjects;

  // ✅ Build student data
  const studentData = {};
  subjects.forEach(({ key }) => {
    const subjectScores = scores[key] || {};
    Object.entries(subjectScores).forEach(([studentId, record]) => {
      if (!studentData[studentId]) {
        studentData[studentId] = {
          name: record.studentName,
          total: 0,
          scores: {},
        };
      }
      studentData[studentId].scores[key] = record.score;
      studentData[studentId].total += record.score;
    });
  });

  // ✅ Class averages
  const classAverages = {};
  subjects.forEach(({ key }) => {
    const subjectScores = Object.values(scores[key] || {}).map((s) => s.score);
    classAverages[key] =
      subjectScores.length > 0
        ? (subjectScores.reduce((a, b) => a + b, 0) / subjectScores.length).toFixed(1)
        : "-";
  });

  const studentArray = Object.keys(studentData).map((id) => ({ id, ...studentData[id] }));
  const sortedStudentArray = studentArray.sort((a, b) => b.total - a.total);

  const overallAverage =
    subjects.length > 0
      ? (
        Object.values(classAverages)
          .filter((v) => v !== "-")
          .reduce((a, b) => parseFloat(a) + parseFloat(b), 0) / subjects.length
      ).toFixed(1)
      : "0";

  // ✅ Print handler
  const handlePrint = () => {
    const printContent = printRef.current;
    if (!printContent) return;

    const newWindow = window.open("", "_blank");
    newWindow.document.write(`
      <html>
        <head>
          <title>Midterm Report - ${selectedClass}</title>
          <style>
            body { font-family: Arial, sans-serif; padding: 20px; }
            .header { text-align: center; border-bottom: 2px solid #d97706; padding-bottom: 10px; }
            .logo { width: 60px; height: 60px; border-radius: 50%; }
            h1 { color: #d97706; margin: 5px 0; }
            h2 { color: #444; margin: 0; }
            table { width: 100%; border-collapse: collapse; margin-top: 20px; }
            th, td { border: 1px solid #999; padding: 6px; text-align: center; font-size: 12px; }
            th { background: #facc15; color: #333; }
            tr:nth-child(even) { background: #fefce8; }
            .average-row { background: #fef3c7; font-weight: bold; color: #b45309; }
            @media print { button { display: none; } .no-print { display: none !important; } }
          </style>
        </head>
        <body>
          <div class="header">
            <img src="${logo}" class="logo" alt="Logo" />
            <h1>${config.schoolName}</h1>
            <h2>Midterm Scores Report</h2>
            <p><strong>Class:</strong> ${selectedClass} | <strong>Term:</strong> ${selectedTerm} | <strong>Year:</strong> ${selectedYear}</p>
          </div>
          ${printContent.innerHTML}
        </body>
      </html>
    `);
    newWindow.document.close();
    newWindow.print();
  };

  return (
    <motion.div
      className="min-h-screen bg-gradient-to-br from-yellow-50 via-white to-yellow-100 p-6"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
    >
      <div className="max-w-7xl mx-auto">
        {/* Back Button */}
        <button
          onClick={() => window.history.back()}
          className="flex items-center mb-6 border border-yellow-400 text-yellow-700 px-4 py-2 rounded-lg hover:bg-yellow-50"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back
        </button>

        {/* Header */}
        <div className="bg-white shadow-xl border-t-8 border-yellow-600 rounded-xl p-6 mb-6">
          <div className="flex items-center space-x-4 mb-4">
            <img src={logo} alt="School Logo" className="w-16 h-16 rounded-full" />
            <div>
              <h2 className="text-3xl font-bold text-yellow-700">
                {config.schoolName}
              </h2>
              <p className="text-gray-600 text-sm">
                Midterm Scores — {selectedTerm || "—"}, {selectedYear || "—"}
              </p>
            </div>
          </div>

          {/* Filters */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Term */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Term
              </label>
              <select
                value={selectedTerm}
                onChange={(e) => setSelectedTerm(e.target.value)}
                className="w-full border border-yellow-400 rounded-lg p-2 focus:ring-2 focus:ring-yellow-600"
              >
                <option value="">Select Term</option>
                {terms.map((t) => (
                  <option key={t}>{t}</option>
                ))}
              </select>
            </div>

            {/* Class */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Class
              </label>
              <select
                value={selectedClass}
                onChange={(e) => setSelectedClass(e.target.value)}
                className="w-full border border-yellow-400 rounded-lg p-2 focus:ring-2 focus:ring-yellow-600"
              >
                <option value="">Select Class</option>
                {classes.map((cls) => (
                  <option key={cls.id} value={cls.id}>
                    {cls.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Print Button */}
        {Object.keys(studentData).length > 0 && (
          <div className="flex justify-end mb-4">
            <button
              onClick={handlePrint}
              className="flex items-center bg-yellow-600 hover:bg-yellow-700 text-white px-4 py-2 rounded-lg"
            >
              <Printer className="w-4 h-4 mr-2" />
              Print Report
            </button>
          </div>
        )}

        {/* Table */}
        <div className="overflow-x-auto bg-white shadow-lg rounded-xl p-4" ref={printRef}>
          {loading ? (
            <p className="text-center text-gray-500 py-8">Loading scores...</p>
          ) : Object.keys(studentData).length === 0 ? (
            <p className="text-center text-gray-500 py-8">
              No midterm scores found for the selected criteria.
            </p>
          ) : (
            <table className="min-w-full text-sm border border-gray-200 rounded-lg">
              <thead className="bg-yellow-100 text-yellow-800 font-semibold">
                <tr>
                  <th className="p-3 border">Pos</th>
                  <th className="p-3 border text-left">Student</th>
                  {subjects.map(({ short }) => (
                    <th key={short} className="p-3 border">
                      {short}
                    </th>
                  ))}
                  <th className="p-3 border">Total</th>
                  <th className="p-3 border no-print">Actions</th>
                </tr>
              </thead>
              <tbody>
                {/* Class Average Row */}
                <tr className="bg-yellow-50 font-semibold text-yellow-700">
                  <td className="p-3 border text-center">Avg</td>
                  <td className="p-3 border">Class Avg</td>
                  {subjects.map(({ key }) => (
                    <td key={key} className="p-3 border text-center">
                      {classAverages[key]}
                    </td>
                  ))}
                  <td className="p-3 border text-center">{overallAverage}</td>
                </tr>

                {/* Student Rows */}
                {sortedStudentArray.map((student, index) => (
                  <tr
                    key={index}
                    className={index % 2 === 0 ? "bg-white" : "bg-gray-50"}
                  >
                    <td className="p-3 border text-center">{index + 1}</td>
                    <td className="p-3 border text-left font-medium">
                      {student.name}
                    </td>
                    {subjects.map(({ key }) => (
                      <td key={key} className="p-3 border text-center">
                        {student.scores[key] ?? "-"}
                      </td>
                    ))}
                    <td className="p-3 border text-center font-semibold text-yellow-700">
                      {student.total}
                    </td>
                    <td className="p-3 border text-center no-print">
                      {role === "admin" && (
                        <button
                          onClick={async () => {
                            if (!selectedClass || !selectedYear || !selectedTerm) return;
                            if (!window.confirm(`Remove midterm data for ${student.name}? This cannot be undone.`)) return;
                            try {
                              const path = `midtermScores/${selectedYear}/${selectedTerm}/${selectedClass}`;
                              // Try direct student-keyed removal
                              await Promise.all([
                                // remove per-student node if present
                                remove(ref(db, `${path}/${student.id}`)).catch(() => { }),
                                // remove per-subject entries
                                (async () => {
                                  const snap = await get(ref(db, path));
                                  if (!snap.exists()) return;
                                  const data = snap.val();
                                  for (const subjectKey of Object.keys(data || {})) {
                                    if (data[subjectKey] && data[subjectKey][student.id] !== undefined) {
                                      await remove(ref(db, `${path}/${subjectKey}/${student.id}`)).catch(() => { });
                                    }
                                  }
                                })(),
                              ]);
                              alert('Removed midterm data for ' + student.name);
                            } catch (err) {
                              console.error('Failed to remove midterm data:', err);
                              alert('Failed to remove midterm data: ' + (err.message || err));
                            }
                          }}
                          className="px-2 py-1 bg-red-600 text-white rounded hover:bg-red-700 text-xs"
                        >
                          Remove
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </motion.div>
  );
}
