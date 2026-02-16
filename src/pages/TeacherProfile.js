import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ref, get, update, onValue } from "firebase/database";
import { db } from "../utils/firebase";
import { ArrowLeft } from "lucide-react";
import ProfileEditor from "../components/ProfileEditorNew";

export default function TeacherProfile() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [teacher, setTeacher] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchTeacher = async () => {
      try {
        const teacherRef = ref(db, `teachers/${id}`);
        const snapshot = await get(teacherRef);
        if (snapshot.exists()) {
          setTeacher(snapshot.val());
        } else {
          console.log("No teacher data found");
        }
      } catch (err) {
        console.error("Error fetching teacher:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchTeacher();
  }, [id]);

  async function saveProfile(data) {
    try {
      await update(ref(db, `teachers/${id}`), data);
      setTeacher(data);
    } catch (err) {
      console.error("Error updating teacher:", err);
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

  if (!teacher) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center">
        <p className="text-red-500 mb-4">Teacher not found</p>
        <button
          onClick={() => navigate("/teachers")}
          className="flex items-center text-blue-600 hover:text-blue-800"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Teachers List
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
            onClick={() => navigate("/teachers")}
            className="flex items-center text-gray-600 hover:text-gray-900"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Teachers List
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
                  e.target.src = "https://ui-avatars.com/api/?name=" + encodeURIComponent(teacher.firstName + " " + teacher.surname);
                }}
              />
            </div>
            <div>
              <h1 className="text-2xl font-bold">
                {teacher.firstName} {teacher.middleName} {teacher.surname}
              </h1>
              <p className="text-blue-100">Teacher — {teacher.subject}</p>
              <p className="text-blue-200 text-sm">
                {teacher.registrationNumber}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Profile Editor */}
      <ProfileEditor
        initialData={teacher}
        onSave={saveProfile}
      />

      <button
        onClick={() => navigate("/teachers")}
        className="mt-4 bg-gray-300 px-4 py-2 rounded"
      >
        Back to Teachers
      </button>

      {/* Assignment Management Section */}
      <TeacherAssignments teacherId={id} teacherData={teacher} />
    </div>
  );
}

function TeacherAssignments({ teacherId, teacherData }) {
  const [classes, setClasses] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [assignedClasses, setAssignedClasses] = useState({});
  const [assignedSubjects, setAssignedSubjects] = useState({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    // Load available options
    const classRef = ref(db, "classes");
    const subjectRef = ref(db, "subjects");

    onValue(classRef, (snap) => {
      if (snap.exists()) {
        const data = snap.val();
        setClasses(Object.keys(data).map(key => ({ id: key, name: data[key].name || key })));
      }
    });

    onValue(subjectRef, (snap) => {
      if (snap.exists()) {
        const data = snap.val();
        setSubjects(Object.keys(data).map(key => ({ id: key, name: key })));
      }
    });
  }, []);

  useEffect(() => {
    if (teacherData) {
      setAssignedClasses(teacherData.assignedClasses || {});
      setAssignedSubjects(teacherData.assignedSubjects || {});
    }
  }, [teacherData]);

  const toggleClass = (classId) => {
    setAssignedClasses(prev => {
      const next = { ...prev };
      if (next[classId]) delete next[classId];
      else next[classId] = true;
      return next;
    });
  };

  const toggleSubject = (subjectId) => {
    setAssignedSubjects(prev => {
      const next = { ...prev };
      if (next[subjectId]) delete next[subjectId];
      else next[subjectId] = true;
      return next;
    });
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await update(ref(db, `teachers/${teacherId}`), {
        assignedClasses,
        assignedSubjects
      });
      alert("Assignments updated successfully!");
    } catch (err) {
      console.error(err);
      alert("Failed to update assignments");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 mt-8 mb-12">
      <div className="bg-white rounded-xl shadow p-6 border-t-4 border-indigo-600">
        <h2 className="text-xl font-bold text-gray-800 mb-6">Class & Subject Assignments</h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Classes */}
          <div>
            <h3 className="font-semibold text-gray-700 mb-3 border-b pb-2">Assigned Classes</h3>
            <div className="space-y-2 max-h-60 overflow-y-auto pr-2">
              {classes.map(cls => (
                <label key={cls.id} className="flex items-center space-x-3 p-2 hover:bg-gray-50 rounded cursor-pointer">
                  <input
                    type="checkbox"
                    checked={!!assignedClasses[cls.id]}
                    onChange={() => toggleClass(cls.id)}
                    className="rounded text-indigo-600 focus:ring-indigo-500"
                  />
                  <span>{cls.name}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Subjects */}
          <div>
            <h3 className="font-semibold text-gray-700 mb-3 border-b pb-2">Assigned Subjects</h3>
            <div className="space-y-2 max-h-60 overflow-y-auto pr-2">
              {subjects.map(sub => (
                <label key={sub.id} className="flex items-center space-x-3 p-2 hover:bg-gray-50 rounded cursor-pointer">
                  <input
                    type="checkbox"
                    checked={!!assignedSubjects[sub.id]}
                    onChange={() => toggleSubject(sub.id)}
                    className="rounded text-indigo-600 focus:ring-indigo-500"
                  />
                  <span>{sub.name}</span>
                </label>
              ))}
            </div>
          </div>
        </div>

        <div className="mt-8 flex justify-end">
          <button
            onClick={handleSave}
            disabled={saving}
            className="bg-indigo-600 text-white px-6 py-2 rounded-lg hover:bg-indigo-700 transition shadow-sm font-medium"
          >
            {saving ? "Saving..." : "Save Assignments"}
          </button>
        </div>
      </div>
    </div>
  );
}
