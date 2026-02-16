import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ref, get, update } from "firebase/database";
import ProfileEditor from "../components/ProfileEditorNew";
import { db } from "../utils/firebase";
import { ArrowLeft } from "lucide-react";

export default function StudentProfile() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [student, setStudent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [studentPath, setStudentPath] = useState(null); // full DB path where student was found

  useEffect(() => {
    const fetchStudent = async () => {
      try {
        // First try direct lookup (flat structure)
        let snapshot = await get(ref(db, `students/${id}`));
        if (snapshot.exists()) {
          setStudent(snapshot.val());
          setStudentPath(`students/${id}`);
          return;
        }

        // If not found, attempt to locate student under classes (students/{classId}/{studentId})
        const classesSnap = await get(ref(db, `classes`));
        if (classesSnap.exists()) {
          const classKeys = Object.keys(classesSnap.val());
          for (const classKey of classKeys) {
            const sSnap = await get(ref(db, `students/${classKey}/${id}`));
            if (sSnap.exists()) {
              setStudent(sSnap.val());
              setStudentPath(`students/${classKey}/${id}`);
              return;
            }
          }
        }

        console.log("No student data found for id:", id);
      } catch (err) {
        console.error("Error fetching student:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchStudent();
  }, [id]);

  async function saveProfile(data) {
    try {
      const path = studentPath || `students/${id}`;
      await update(ref(db, path), data);
      setStudent(data);
    } catch (err) {
      console.error("Error updating student:", err);
      throw err;
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-pulse text-gray-500">Loading...</div>
      </div>
    );
  }

  if (!student) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center">
        <p className="text-red-500 mb-4">Student not found</p>
        <button
          onClick={() => navigate("/students")}
          className="flex items-center text-blue-600 hover:text-blue-800"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Students List
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      {/* Header */}
      <div className="max-w-4xl mx-auto px-4 mb-8">
        <div className="flex items-center justify-between">
          <button
            onClick={() => navigate("/students")}
            className="flex items-center text-gray-600 hover:text-gray-900"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Students List
          </button>
        </div>
      </div>

      {/* Profile Header */}
      <div className="max-w-4xl mx-auto px-4 mb-8">
        <div className="bg-gradient-to-r from-blue-600 to-blue-800 rounded-xl p-6 text-white">
          <div className="flex items-center">
            <div className="w-20 h-20 bg-white rounded-full flex items-center justify-center mr-6">
              <img
                src="/default-avatar.png"
                alt="Profile"
                className="w-16 h-16 rounded-full"
                onError={(e) => {
                  e.target.onerror = null;
                  e.target.src = "https://ui-avatars.com/api/?name=" + encodeURIComponent(student.firstName + " " + student.surname);
                }}
              />
            </div>
            <div>
              <h1 className="text-2xl font-bold">
                {student.firstName} {student.middleName} {student.surname}
              </h1>
              <p className="text-blue-100">
                {student.programme} — Level {student.level}
              </p>
              <p className="text-blue-200 text-sm">
                {student.registrationNumber}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Profile Editor */}
      <ProfileEditor
        initialData={student}
        onSave={saveProfile}
      />

      <button
        onClick={() => navigate("/students")}
        className="mt-4 bg-gray-300 px-4 py-2 rounded"
      >
        Back to Students
      </button>
    </div>
  );
}
