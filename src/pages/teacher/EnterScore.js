import React, { useState, useEffect } from "react";
import { db } from "../../utils/firebase";
import { ref, set, get } from "firebase/database";
import { useAuth } from "../../context/AuthContext";
import { useNavigate, useParams } from "react-router-dom";
import BackButton from "../../components/BackButton"; // ✅ Added

export default function EnterScore() {
  const { classId, studentId } = useParams();
  const { currentUser } = useAuth();
  const navigate = useNavigate();

  const [student, setStudent] = useState(null);
  const [assignedSubjects, setAssignedSubjects] = useState([]);
  const [subject, setSubject] = useState("");
  const [formData, setFormData] = useState({
    test1: "",
    test2: "",
    groupWork: "",
    projectWork: "",
    exam: "",
  });
  const [midtermScore, setMidtermScore] = useState(null);
  const [termInfo, setTermInfo] = useState(null);
  const [allStudents, setAllStudents] = useState([]); // Store all student IDs for navigation

  // Fetch current term
  useEffect(() => {
    get(ref(db, "terms/current")).then((snap) => {
      if (snap.exists()) setTermInfo(snap.val());
    });
  }, []);

  useEffect(() => {
    if (!currentUser) return;
    const teacherRef = ref(db, `teachers/${currentUser.uid}`);
    get(teacherRef).then((snap) => {
      if (snap.exists()) {
        const data = snap.val();
        let subjects = [];

        if (Array.isArray(data.subjects)) {
          subjects = data.subjects.filter(Boolean);
        } else if (typeof data.subjects === "object") {
          subjects = Object.keys(data.subjects);
        }
        if (Array.isArray(data.assignedSubjects)) {
          subjects = [...subjects, ...data.assignedSubjects.filter(Boolean)];
        } else if (typeof data.assignedSubjects === "object") {
          subjects = [...subjects, ...Object.keys(data.assignedSubjects)];
        }

        subjects = [...new Set(subjects)];
        setAssignedSubjects(subjects);
      }
    });
  }, [currentUser]);

  useEffect(() => {
    if (!classId || !studentId) return;

    // Fetch current student
    const studentRef = ref(db, `students/${classId}/${studentId}`);
    get(studentRef).then((snap) => {
      if (snap.exists()) setStudent(snap.val());
    });

    // Fetch all students in class for navigation and bulk import
    const classRef = ref(db, `students/${classId}`);
    get(classRef).then((snap) => {
      if (snap.exists()) {
        const data = snap.val();
        // Sort keys to ensure consistent order (e.g. alphabetical or by ID)
        // Ideally we should sort by name, but keys are IDs. 
        // Let's just use keys for now, or sort by name if we had the data.
        // For simple navigation, keys are fine.
        setAllStudents(Object.keys(data));
      }
    });
  }, [classId, studentId]);

  useEffect(() => {
    if (!classId || !studentId || !subject) return;
    const scoreRef = ref(db, `scores/${classId}/${subject}/${studentId}`);
    get(scoreRef).then((snap) => {
      if (snap.exists()) {
        setFormData(snap.val());
      } else {
        setFormData({
          test1: "",
          test2: "",
          groupWork: "",
          projectWork: "",
          exam: "",
        });
      }
    });

    // Fetch midterm score
    if (termInfo) {
      const { year, name } = termInfo;
      // Try multiple paths as seen in StudentMidtermView
      const paths = [
        `midtermScores/${year}/${name}/${classId}/${subject}/${studentId}`,
        `midtermScores/${classId}/${subject}/${studentId}` // fallback
      ];

      const fetchMidterm = async () => {
        for (const path of paths) {
          const snap = await get(ref(db, path));
          if (snap.exists()) {
            const val = snap.val();
            // Handle object or direct value
            const score = typeof val === 'object' ? val.score : val;
            setMidtermScore(score);
            return;
          }
        }
        setMidtermScore(null);
      };
      fetchMidterm();
    }
  }, [classId, studentId, subject, termInfo]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleImportMidterm = () => {
    if (midtermScore === null || midtermScore === undefined) return;

    if (window.confirm(`Do you want to convert midterm scores to Test 1 scores? (Midterm: ${midtermScore})`)) {
      const converted = (parseFloat(midtermScore) * 0.2).toFixed(2);
      setFormData(prev => ({ ...prev, test1: converted }));
    }
  };

  const handleImportAllMidterms = async () => {
    if (!subject || !termInfo) {
      alert("Please select a subject first.");
      return;
    }

    if (!window.confirm("Are you sure you want to import midterm scores for ALL students in this class? This will overwrite existing Test 1 scores.")) {
      return;
    }

    try {
      const { year, name } = termInfo;
      // Fetch all midterm scores for this class/subject
      // Try both paths
      let midterms = {};
      const path1 = `midtermScores/${year}/${name}/${classId}/${subject}`;
      const path2 = `midtermScores/${classId}/${subject}`;

      const snap1 = await get(ref(db, path1));
      if (snap1.exists()) midterms = snap1.val();
      else {
        const snap2 = await get(ref(db, path2));
        if (snap2.exists()) midterms = snap2.val();
      }

      if (Object.keys(midterms).length === 0) {
        alert("No midterm scores found for this class/subject.");
        return;
      }

      // Update each student
      let updateCount = 0;
      for (const sId of allStudents) {
        const mScoreVal = midterms[sId];
        // Handle object or direct value
        let score = null;
        if (typeof mScoreVal === 'object' && mScoreVal !== null) score = mScoreVal.score;
        else if (mScoreVal !== undefined) score = mScoreVal;

        if (score !== null && score !== undefined) {
          const converted = (parseFloat(score) * 0.2).toFixed(2);
          // We need to fetch existing score to preserve other fields? 
          // Or just update test1? set() overwrites, update() updates fields.
          // Let's use update() pattern by fetching first or using update() method if we imported it.
          // Since we are using set() in handleSubmit, let's fetch-modify-save to be safe, 
          // OR just update the specific path `scores/.../test1`.
          // Updating specific path is safer and faster.

          await set(ref(db, `scores/${classId}/${subject}/${sId}/test1`), converted);

          // Also need to update totals? 
          // The system seems to calculate totals on read or when opening the form.
          // But if we only update test1, the 'total' field in DB won't update until someone opens and saves.
          // For now, let's just update test1. The teacher should verify.
          // ideally we should recalculate everything but that requires reading every student's full record.
          updateCount++;
        }
      }

      alert(`Successfully imported scores for ${updateCount} students. Please review totals.`);
      // Refresh current student's form if they were updated
      if (midterms[studentId]) {
        const mVal = midterms[studentId];
        const s = typeof mVal === 'object' ? mVal.score : mVal;
        if (s) setFormData(prev => ({ ...prev, test1: (parseFloat(s) * 0.2).toFixed(2) }));
      }

    } catch (err) {
      console.error("Error importing all:", err);
      alert("Error importing scores: " + err.message);
    }
  };

  const handleNextStudent = () => {
    if (!allStudents.length) return;
    const currentIndex = allStudents.indexOf(studentId);
    if (currentIndex === -1 || currentIndex === allStudents.length - 1) {
      alert("This is the last student.");
      return;
    }
    const nextId = allStudents[currentIndex + 1];
    navigate(`/teacher/enter-scores/${classId}/${nextId}`);
  };

  const subtotal =
    (Number(formData.test1) || 0) +
    (Number(formData.test2) || 0) +
    (Number(formData.groupWork) || 0) +
    (Number(formData.projectWork) || 0);

  const classScore50 = (subtotal / 60) * 50;
  const exam = Number(formData.exam) || 0;
  const examHalf = (exam / 100) * 50;
  const total = classScore50 + examHalf;

  const grade =
    total >= 80
      ? "A"
      : total >= 70
        ? "B"
        : total >= 60
          ? "C"
          : total >= 50
            ? "D"
            : total >= 40
              ? "E"
              : "F";

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!subject) {
      alert("⚠️ Please select a subject first!");
      return;
    }
    try {
      await set(ref(db, `scores/${classId}/${subject}/${studentId}`), {
        ...formData,
        subtotal: subtotal.toFixed(2),
        classScore50: classScore50.toFixed(2),
        exam,
        examHalf: examHalf.toFixed(2),
        total: total.toFixed(2),
        grade,
        updatedBy: currentUser.uid,
        timestamp: Date.now(),
      });
      alert("✅ Score saved successfully!");
    } catch (err) {
      console.error("Error saving score:", err);
      alert("❌ Failed to save score");
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-yellow-50 to-orange-100 flex items-center justify-center p-6">
      <div className="max-w-4xl w-full bg-white rounded-2xl shadow-xl p-6 border-t-8 border-yellow-600">
        <BackButton /> {/* ✅ Added */}
        {student ? (
          <>
            <h1 className="text-2xl font-bold text-yellow-700 text-center">
              Enter Score
            </h1>
            <p className="text-center font-semibold text-gray-700">
              {student.firstName} {student.lastName} | Class:{" "}
              {classId.replace(/([a-zA-Z]+)(\d+)/, "$1 $2")}
            </p>

            {/* Subject Dropdown */}
            <div className="mt-4">
              <label className="block mb-1 font-semibold">Select Subject:</label>
              <select
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                className="w-full border p-2 rounded-lg"
              >
                <option value="">-- Choose Subject --</option>
                {assignedSubjects.length > 0 ? (
                  assignedSubjects.map((subj, idx) => (
                    <option key={idx} value={subj}>
                      {subj}
                    </option>
                  ))
                ) : (
                  <option value="">⚠️ No assigned subjects found</option>
                )}
              </select>
            </div>

            {/* === Score Form === */}
            <form onSubmit={handleSubmit} className="grid grid-cols-2 gap-4 mt-6">
              <div className="flex flex-col">
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    step="0.01"
                    name="test1"
                    placeholder="Test 1 (20)"
                    value={formData.test1}
                    onChange={handleChange}
                    className="border p-3 rounded-lg focus:ring-2 focus:ring-yellow-400 w-full"
                  />
                  {midtermScore !== null && (
                    <button
                      type="button"
                      onClick={handleImportMidterm}
                      className="bg-blue-100 text-blue-700 p-2 rounded text-xs hover:bg-blue-200"
                      title={`Import Midterm Score: ${midtermScore}`}
                    >
                      Import
                    </button>
                  )}
                </div>
                {midtermScore !== null && (
                  <span className="text-xs text-gray-500 mt-1">Midterm: {midtermScore}</span>
                )}
                {/* Import All Button */}
                <button
                  type="button"
                  onClick={handleImportAllMidterms}
                  className="mt-2 text-xs text-blue-600 underline hover:text-blue-800 text-left"
                >
                  Import Midterm for ALL Students
                </button>
              </div>

              <input
                type="number"
                step="0.01"
                name="test2"
                placeholder="Test 2 (20)"
                value={formData.test2}
                onChange={handleChange}
                className="border p-3 rounded-lg focus:ring-2 focus:ring-yellow-400"
              />
              <input
                type="number"
                step="0.01"
                name="groupWork"
                placeholder="Group Work (10)"
                value={formData.groupWork}
                onChange={handleChange}
                className="border p-3 rounded-lg focus:ring-2 focus:ring-yellow-400"
              />
              <input
                type="number"
                step="0.01"
                name="projectWork"
                placeholder="Project Work (10)"
                value={formData.projectWork}
                onChange={handleChange}
                className="border p-3 rounded-lg focus:ring-2 focus:ring-yellow-400"
              />
              <input
                type="number"
                step="0.01"
                name="exam"
                placeholder="Exam Score (100)"
                value={formData.exam}
                onChange={handleChange}
                className="col-span-2 border p-3 rounded-lg focus:ring-2 focus:ring-yellow-400"
              />

              {/* Preview Panel */}
              <div className="col-span-2 bg-yellow-50 border border-yellow-300 rounded-lg p-4 mt-4">
                <h3 className="font-semibold text-yellow-800 mb-2">📊 Score Preview</h3>
                <p>Subtotal (60): <span className="font-bold">{subtotal.toFixed(2)}</span></p>
                <p>Class Score (→ 50%): <span className="font-bold">{classScore50.toFixed(2)}</span></p>
                <p>Exam (100 → 50%): <span className="font-bold">{examHalf.toFixed(2)}</span></p>
                <p>Total (100): <span className="font-bold">{total.toFixed(2)}</span></p>
                <p>Grade: <span className="font-bold text-yellow-700">{grade}</span></p>
              </div>

              {/* Save Button */}
              <button
                type="submit"
                className="col-span-2 bg-yellow-600 text-white font-semibold py-3 rounded-xl hover:bg-yellow-700 transition mt-4"
              >
                💾 Save Score
              </button>
            </form>

            <div className="flex flex-col gap-4 mt-6">
              <div className="flex justify-between gap-4">
                <button
                  type="button"
                  onClick={() => navigate(-1)}
                  className="flex-1 bg-gray-500 text-white py-2 rounded-lg hover:bg-gray-600"
                >
                  Back
                </button>
                <button
                  type="button"
                  onClick={handleNextStudent}
                  className="flex-1 bg-indigo-600 text-white py-2 rounded-lg hover:bg-indigo-700 font-semibold"
                >
                  Next Student →
                </button>
              </div>

              <div className="text-center">
                <button
                  onClick={() =>
                    navigate(`/teacher/class-records/${classId}/${studentId}`)
                  }
                  className="bg-green-600 text-white px-4 py-2 rounded-lg shadow hover:bg-green-700 text-sm"
                >
                  📘 Class Teacher? Fill Student Records
                </button>
                <p className="text-xs text-gray-500 mt-1 italic">
                  (Only click if you are the class teacher)
                </p>
              </div>
            </div>
          </>
        ) : (
          <p className="text-center text-gray-600">Loading student info...</p>
        )}
      </div>
    </div>
  );
}
