// src/pages/teacher/SBAForm.js
import React, { useState, useEffect } from "react";
import { db } from "../../utils/firebase";
import { ref, set, get } from "firebase/database";
import { useAuth } from "../../context/AuthContext";

export default function SBAForm({ studentId, classId, subject }) {
  const { currentUser } = useAuth();
  const [isClassTeacher, setIsClassTeacher] = useState(false);
  const [assignedSubjects, setAssignedSubjects] = useState([]);

  const [formData, setFormData] = useState({
    test1: "",
    test2: "",
    groupWork: "",
    projectWork: "",
    exam: "",
    conduct: "",
    attitude: "",
    interest: "",
    teacherComment: "",
    vacationDate: "",
    reopeningDate: "",
    gender: "",
  });

  // ✅ Fetch teacher role and assigned subjects/classes
  useEffect(() => {
    if (!currentUser) return;

    const teacherRef = ref(db, `teachers/${currentUser.uid}`);
    get(teacherRef).then((snapshot) => {
      if (snapshot.exists()) {
        const teacherData = snapshot.val();

        if (
          teacherData.role === "class-teacher" &&
          teacherData.assignedClasses &&
          teacherData.assignedClasses[classId]
        ) {
          setIsClassTeacher(true);
        }

        if (teacherData.subjects) {
          setAssignedSubjects(Object.keys(teacherData.subjects));
        }
      }
    });
  }, [currentUser, classId]);

  // ✅ Load existing data
  useEffect(() => {
    if (!studentId || !classId || !subject) return;

    const sbaRef = ref(db, `sba/${classId}/${subject}/${studentId}`);
    get(sbaRef).then((snapshot) => {
      if (snapshot.exists()) {
        setFormData(snapshot.val());
      }
    });
  }, [studentId, classId, subject]);

  const canEditScores = assignedSubjects.includes(subject);
  const canEditSBA = isClassTeacher;

  // ✅ Handle input change
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  // ✅ Save data
  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await set(ref(db, `sba/${classId}/${subject}/${studentId}`), formData);
      alert("✅ Record saved successfully!");
    } catch (error) {
      console.error("Error saving record:", error);
      alert("❌ Failed to save record");
    }
  };

  return (
    <div className="max-w-4xl mx-auto bg-gradient-to-br from-yellow-50 to-orange-100 p-6 rounded-xl shadow-lg">
      <h2 className="text-2xl font-bold text-center text-yellow-800 mb-6">
        Student SBA & Scores
      </h2>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* === Subject Teacher Scores === */}
        <div className="bg-white p-4 rounded-lg shadow-md border border-yellow-300">
          <h3 className="text-lg font-semibold text-yellow-700 mb-3">
            Subject Scores ({subject})
          </h3>

          <div className="grid grid-cols-2 gap-4">
            <input
              type="number"
              name="test1"
              placeholder="Test 1 (20)"
              value={formData.test1}
              onChange={handleChange}
              readOnly={!canEditScores}
              className={`border p-2 rounded-lg ${
                canEditScores ? "focus:ring-2 focus:ring-yellow-400" : "bg-gray-100"
              }`}
            />
            <input
              type="number"
              name="test2"
              placeholder="Test 2 (20)"
              value={formData.test2}
              onChange={handleChange}
              readOnly={!canEditScores}
              className={`border p-2 rounded-lg ${
                canEditScores ? "focus:ring-2 focus:ring-yellow-400" : "bg-gray-100"
              }`}
            />
            <input
              type="number"
              name="groupWork"
              placeholder="Group Work (10)"
              value={formData.groupWork}
              onChange={handleChange}
              readOnly={!canEditScores}
              className={`border p-2 rounded-lg ${
                canEditScores ? "focus:ring-2 focus:ring-yellow-400" : "bg-gray-100"
              }`}
            />
            <input
              type="number"
              name="projectWork"
              placeholder="Project Work (10)"
              value={formData.projectWork}
              onChange={handleChange}
              readOnly={!canEditScores}
              className={`border p-2 rounded-lg ${
                canEditScores ? "focus:ring-2 focus:ring-yellow-400" : "bg-gray-100"
              }`}
            />
          </div>

          <div className="mt-3">
            <input
              type="number"
              name="exam"
              placeholder="Exam Score (100)"
              value={formData.exam}
              onChange={handleChange}
              readOnly={!canEditScores}
              className={`w-full border p-2 rounded-lg ${
                canEditScores ? "focus:ring-2 focus:ring-yellow-400" : "bg-gray-100"
              }`}
            />
          </div>
        </div>

        {/* === Class Teacher SBA Section === */}
        <div className="bg-white p-4 rounded-lg shadow-md border border-green-300">
          <h3 className="text-lg font-semibold text-green-700 mb-3">
            Class Teacher Records
          </h3>

          <div className="grid grid-cols-2 gap-4">
            <input
              type="text"
              name="conduct"
              placeholder="Conduct"
              value={formData.conduct}
              onChange={handleChange}
              readOnly={!canEditSBA}
              className={`border p-2 rounded-lg ${
                canEditSBA ? "focus:ring-2 focus:ring-green-400" : "bg-gray-100"
              }`}
            />
            <input
              type="text"
              name="attitude"
              placeholder="Attitude"
              value={formData.attitude}
              onChange={handleChange}
              readOnly={!canEditSBA}
              className={`border p-2 rounded-lg ${
                canEditSBA ? "focus:ring-2 focus:ring-green-400" : "bg-gray-100"
              }`}
            />
            <input
              type="text"
              name="interest"
              placeholder="Interest"
              value={formData.interest}
              onChange={handleChange}
              readOnly={!canEditSBA}
              className={`border p-2 rounded-lg ${
                canEditSBA ? "focus:ring-2 focus:ring-green-400" : "bg-gray-100"
              }`}
            />
            <select
              name="gender"
              value={formData.gender}
              onChange={handleChange}
              disabled={!canEditSBA}
              className={`border p-2 rounded-lg ${
                canEditSBA ? "focus:ring-2 focus:ring-green-400" : "bg-gray-100"
              }`}
            >
              <option value="">Select Gender</option>
              <option value="Male">👦 Male</option>
              <option value="Female">👧 Female</option>
            </select>
          </div>

          <textarea
            name="teacherComment"
            placeholder="General Comment"
            value={formData.teacherComment}
            onChange={handleChange}
            readOnly={!canEditSBA}
            className={`w-full mt-3 border p-2 rounded-lg h-20 ${
              canEditSBA ? "focus:ring-2 focus:ring-green-400" : "bg-gray-100"
            }`}
          />

          <div className="grid grid-cols-2 gap-4 mt-3">
            <input
              type="date"
              name="vacationDate"
              value={formData.vacationDate}
              onChange={handleChange}
              disabled={!canEditSBA}
              className={`border p-2 rounded-lg ${
                canEditSBA ? "focus:ring-2 focus:ring-green-400" : "bg-gray-100"
              }`}
            />
            <input
              type="date"
              name="reopeningDate"
              value={formData.reopeningDate}
              onChange={handleChange}
              disabled={!canEditSBA}
              className={`border p-2 rounded-lg ${
                canEditSBA ? "focus:ring-2 focus:ring-green-400" : "bg-gray-100"
              }`}
            />
          </div>
        </div>

        {/* Save Button */}
        {(canEditScores || canEditSBA) && (
          <button
            type="submit"
            className="w-full bg-gradient-to-r from-yellow-500 to-green-600 text-white font-bold py-3 rounded-lg shadow-md hover:from-yellow-600 hover:to-green-700 transition"
          >
            💾 Save Record
          </button>
        )}
      </form>
    </div>
  );
}
