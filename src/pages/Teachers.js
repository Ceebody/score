import React, { useEffect, useState } from "react";
import { db } from "../utils/firebase";
import { ref, onValue, remove } from "firebase/database";
import BackButton from "../components/BackButton";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";

export default function Teachers() {
  const [teachers, setTeachers] = useState([]);
  const [search, setSearch] = useState("");
  const [classFilter, setClassFilter] = useState("");
  const navigate = useNavigate();

  // Load teachers and extract class list
  const [classesMap, setClassesMap] = useState({});

  // Load teachers and classes
  useEffect(() => {
    // 1. Get classes for name lookup
    const classesRef = ref(db, "classes");
    onValue(classesRef, (snap) => {
      if (snap.exists()) {
        const data = snap.val();
        const map = {};
        Object.keys(data).forEach(key => {
          map[key] = data[key].name || key;
        });
        setClassesMap(map);
      }
    });

    // 2. Get teachers
    const teachersRef = ref(db, "teachers");
    const unsubscribe = onValue(teachersRef, (snapshot) => {
      const data = snapshot.val();
      const list = [];
      if (data) {
        Object.keys(data).forEach((key) => {
          // Fallback: use classTeacherFor if class is missing
          const t = data[key];
          const teacherClass = t.classTeacherFor || t.class || "";
          list.push({ id: key, ...t, displayClass: teacherClass });
        });
      }
      setTeachers(list);
    });
    return () => unsubscribe();
  }, []);

  const uniqueClasses = Array.from(new Set(teachers.map((t) => t.displayClass).filter(Boolean)));

  const filtered = teachers.filter((t) => {
    const matchesSearch = `${t.name || ""}`
      .toLowerCase()
      .includes(search.toLowerCase());
    const matchesClass = classFilter ? t.displayClass === classFilter : true;
    return matchesSearch && matchesClass;
  });

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="p-6 min-h-screen bg-gray-50">
      <BackButton />
      <h2 className="text-3xl font-bold mb-4 text-center text-brown-800">
        All Teachers
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
              {classesMap[c] || c}
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
        {filtered.map((teacher) => (
          <motion.div
            key={teacher.id}
            className="bg-white rounded-lg shadow p-4"
            whileHover={{ scale: 1.02 }}
          >
            <h3 className="text-lg font-semibold mb-2">
              {teacher.firstName} {teacher.lastName}
            </h3>
            {teacher.displayClass && (
              <p className="text-sm text-indigo-600 font-medium mb-1">
                Class Teacher: {classesMap[teacher.displayClass] || teacher.displayClass}
              </p>
            )}
            <p className="text-sm text-gray-600">Email: {teacher.email}</p>
            <div className="mt-3 flex space-x-2">
              <button
                onClick={() => navigate(`/teachers/${teacher.id}`)}
                className="px-2 py-1 bg-blue-600 text-white rounded hover:bg-blue-700"
              >
                View
              </button>
              <button
                onClick={() => {
                  if (window.confirm(`Are you sure you want to delete ${teacher.name}? This action cannot be undone.`)) {
                    remove(ref(db, `teachers/${teacher.id}`))
                      .then(() => alert("Teacher deleted successfully"))
                      .catch((err) => alert("Error deleting teacher: " + err.message));
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
            No teachers match the criteria.
          </p>
        )}
      </div>
    </div>
  );
}
