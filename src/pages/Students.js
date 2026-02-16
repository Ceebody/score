import React, { useEffect, useState } from "react";
import { db } from "../utils/firebase";
import { ref, onValue, remove } from "firebase/database";
import BackButton from "../components/BackButton";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";

export default function Students() {
  const [students, setStudents] = useState([]);
  const [search, setSearch] = useState("");
  const [classFilter, setClassFilter] = useState("");
  const navigate = useNavigate();

  // Load students and extract class list
  useEffect(() => {
    const studentsRef = ref(db, "students");
    const unsubscribe = onValue(studentsRef, (snapshot) => {
      const data = snapshot.val();
      const all = [];
      if (data) {
        Object.keys(data).forEach((classId) => {
          const classStudents = data[classId];
          Object.keys(classStudents).forEach((id) => {
            const studentData = classStudents[id];
            // Filter out invalid records (must have at least a name)
            if (studentData && (studentData.firstName || studentData.lastName)) {
              all.push({ id, classId, ...studentData });
            }
          });
        });
      }
      setStudents(all);
    });
    return () => unsubscribe();
  }, []);

  const uniqueClasses = Array.from(new Set(students.map((s) => s.classId)));

  const filtered = students.filter((s) => {
    const matchesSearch = `${s.firstName || ""} ${s.lastName || ""}`
      .toLowerCase()
      .includes(search.toLowerCase());
    const matchesClass = classFilter ? s.classId === classFilter : true;
    return matchesSearch && matchesClass;
  });

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="p-6 min-h-screen bg-gray-50">
      <BackButton />
      <h2 className="text-3xl font-bold mb-4 text-center text-indigo-800">
        All Students
      </h2>
      <div className="flex flex-col md:flex-row justify-between mb-6 space-y-2 md:space-y-0 md:space-x-4">
        <input
          type="text"
          placeholder="Search by name..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="border p-2 rounded w-full md:w-1/3"
        />
        <select
          value={classFilter}
          onChange={(e) => setClassFilter(e.target.value)}
          className="border p-2 rounded w-full md:w-1/4"
        >
          <option value="">All Classes</option>
          {uniqueClasses.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
        <button
          onClick={handlePrint}
          className="px-4 py-2 bg-green-600 text-white rounded"
        >
          Print
        </button>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filtered.map((student) => (
          <motion.div
            key={student.id}
            className="bg-white rounded-lg shadow p-4"
            whileHover={{ scale: 1.02 }}
          >
            <h3 className="text-lg font-semibold mb-2">
              {student.firstName} {student.lastName}
            </h3>
            <p className="text-sm text-gray-600">Class: {student.classId}</p>
            <p className="text-sm text-gray-600">Email: {student.email}</p>
            <div className="mt-3 flex space-x-2">
              <button
                onClick={() => navigate(`/student-report/${student.classId}/${student.id}`)}
                className="px-2 py-1 bg-blue-600 text-white rounded hover:bg-blue-700"
              >
                View
              </button>
              <button
                onClick={() => navigate(`/edit-student/${student.classId}/${student.id}`)}
                className="px-2 py-1 bg-yellow-600 text-white rounded hover:bg-yellow-700"
              >
                Edit
              </button>
              <button
                onClick={() => {
                  if (window.confirm(`Are you sure you want to delete ${student.firstName} ${student.lastName}? This action cannot be undone.`)) {
                    remove(ref(db, `students/${student.classId}/${student.id}`))
                      .then(() => alert("Student deleted successfully"))
                      .catch((err) => alert("Error deleting student: " + err.message));
                  }
                }}
                className="px-2 py-1 bg-red-600 text-white rounded hover:bg-red-700"
              >
                Delete
              </button>
            </div>
          </motion.div>
        ))}
        {filtered.length === 0 && (
          <p className="col-span-full text-center text-gray-500">
            No students match the criteria.
          </p>
        )}
      </div>
    </div>
  );
}
