import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ref, get, set } from "firebase/database";
import { db } from "../../utils/firebase";
import { useAuth } from "../../context/AuthContext";
import BackButton from "../../components/BackButton";
import { motion } from "framer-motion";
import { BookOpen } from "lucide-react";

export default function MidtermScoresPage() {
  const { classId, studentId } = useParams();
  const navigate = useNavigate();
  const { currentUser } = useAuth();

  const [studentName, setStudentName] = useState("");
  const [assignedSubjects, setAssignedSubjects] = useState([]);
  const [selectedSubject, setSelectedSubject] = useState("");
  const [score, setScore] = useState("");
  const [loading, setLoading] = useState(true);

  const [termInfo, setTermInfo] = useState({ name: "", year: "" });
  const [allStudents, setAllStudents] = useState([]); // Store all student IDs for navigation

  // ✅ Fetch current term & year
  useEffect(() => {
    const termRef = ref(db, "terms/current");
    get(termRef).then((snap) => {
      if (snap.exists()) {
        const data = snap.val();
        setTermInfo({
          name: data.name || "Term 1",
          year: data.year || new Date().getFullYear().toString(),
        });
      } else {
        console.warn("⚠️ No current term found. Please set it in Firebase.");
      }
    });
  }, []);

  // ✅ Fetch student name and all students for navigation
  useEffect(() => {
    const fetchStudent = async () => {
      const studentRef = ref(db, `students/${classId}/${studentId}`);
      const snapshot = await get(studentRef);
      if (snapshot.exists()) {
        const s = snapshot.val();
        setStudentName(`${s.firstName || ""} ${s.lastName || ""}`.trim());
      }
    };
    fetchStudent();

    // Fetch all students in class for navigation
    const classRef = ref(db, `students/${classId}`);
    get(classRef).then((snap) => {
      if (snap.exists()) {
        const data = snap.val();
        setAllStudents(Object.keys(data));
      }
    });
  }, [classId, studentId]);

  // ✅ Fetch teacher’s assigned subjects
  useEffect(() => {
    const fetchSubjects = async () => {
      if (!currentUser) return;
      const teacherRef = ref(db, `teachers/${currentUser.uid}`);
      const snapshot = await get(teacherRef);
      if (snapshot.exists()) {
        const data = snapshot.val();
        if (data.assignedSubjects) {
          setAssignedSubjects(Object.keys(data.assignedSubjects));
        } else {
          setAssignedSubjects([]);
        }
      }
      setLoading(false);
    };
    fetchSubjects();
  }, [currentUser]);

  // ✅ Fetch existing score when subject is selected
  useEffect(() => {
    if (selectedSubject && termInfo.year && termInfo.name) {
      const path = `midtermScores/${termInfo.year}/${termInfo.name}/${classId}/${selectedSubject}/${studentId}`;
      get(ref(db, path)).then((snap) => {
        if (snap.exists()) {
          setScore(snap.val().score.toString());
        } else {
          setScore("");
        }
      });
    }
  }, [selectedSubject, termInfo, classId, studentId]);

  // ✅ Handle Submit
  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!selectedSubject || score === "") {
      return alert("Please select a subject and enter a score.");
    }

    const numericScore = parseFloat(score);
    if (numericScore < 0 || numericScore > 100) {
      return alert("Score must be between 0 and 100.");
    }

    if (!termInfo.name || !termInfo.year) {
      return alert("Term information missing — please set the current term.");
    }

    try {
      const { year, name } = termInfo;
      const path = `midtermScores/${year}/${name}/${classId}/${selectedSubject}/${studentId}`;
      const scoreRef = ref(db, path);

      await set(scoreRef, {
        studentId,
        studentName,
        classId,
        subject: selectedSubject,
        score: numericScore,
        enteredBy: currentUser?.uid || "unknown",
        teacherName: currentUser?.displayName || "Teacher",
        year,
        term: name,
        timestamp: new Date().toISOString(),
      });

      alert("✅ Midterm score saved successfully! Select another subject.");
      setSelectedSubject("");
      setScore("");
    } catch (error) {
      console.error("Error saving score:", error);
      alert("❌ Failed to save midterm score.");
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
    navigate(`/teacher/midterm-scores/${classId}/${nextId}`);
  };

  if (loading)
    return (
      <div className="flex justify-center items-center h-screen bg-gray-50">
        <p className="text-gray-600 animate-pulse">Loading...</p>
      </div>
    );

  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-white to-indigo-100 p-6"
    >
      <div className="w-full max-w-lg bg-white rounded-2xl shadow-xl p-8 relative border-t-8 border-blue-600">
        <BackButton position="top-right" />

        {/* Header */}
        <div className="text-center mb-6">
          <div className="flex justify-center items-center gap-2 mb-2">
            <BookOpen className="text-blue-600 w-8 h-8" />
            <h2 className="text-2xl font-bold text-blue-800">
              Enter Midterm Score
            </h2>
          </div>
          <p className="text-gray-600 text-sm">
            Record midterm results for the current academic term
          </p>
        </div>

        {/* Student Info */}
        <div className="bg-blue-50 rounded-lg p-4 mb-6 border border-blue-200">
          <p className="text-gray-700">
            <strong>Student:</strong> {studentName || "Loading..."}
          </p>
          <p className="text-gray-700">
            <strong>Class:</strong> {classId}
          </p>
          <p className="text-gray-700">
            <strong>Term:</strong> {termInfo.name} - {termInfo.year}
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Subject */}
          <div>
            <label className="block font-medium mb-1 text-gray-700">
              Select Subject
            </label>
            <select
              value={selectedSubject}
              onChange={(e) => setSelectedSubject(e.target.value)}
              className="w-full border border-gray-300 rounded-lg p-2 focus:ring-2 focus:ring-blue-400 focus:outline-none"
              required
            >
              <option value="">-- Choose Subject --</option>
              {assignedSubjects.map((subj, idx) => (
                <option key={idx} value={subj}>
                  {subj}
                </option>
              ))}
            </select>
          </div>

          {/* Score */}
          <div>
            <label className="block font-medium mb-1 text-gray-700">
              Enter Score (0 - 100)
            </label>
            <input
              type="number"
              min="0"
              max="100"
              value={score}
              onChange={(e) => setScore(e.target.value)}
              className="w-full border border-gray-300 rounded-lg p-2 focus:ring-2 focus:ring-blue-400 focus:outline-none"
              placeholder="e.g. 75"
              required
            />
          </div>

          {/* Submit */}
          <button
            type="submit"
            className="w-full bg-blue-600 text-white font-semibold py-2 rounded-lg hover:bg-blue-700 transition-all"
          >
            Save Midterm Score
          </button>

          <div className="flex justify-between gap-4 mt-4">
            <button
              type="button"
              onClick={() => navigate(-1)}
              className="flex-1 bg-gray-500 text-white py-2 rounded-lg hover:bg-gray-600 transition-all"
            >
              Back
            </button>
            <button
              type="button"
              onClick={handleNextStudent}
              className="flex-1 bg-indigo-600 text-white font-semibold py-2 rounded-lg hover:bg-indigo-700 transition-all"
            >
              Next Student →
            </button>
          </div>
        </form>
      </div>
    </motion.div>
  );
}
