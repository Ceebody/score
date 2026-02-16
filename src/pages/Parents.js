import React, { useEffect, useState } from "react";
import { db } from "../utils/firebase";
import { ref, onValue, remove } from "firebase/database";
import BackButton from "../components/BackButton";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";

export default function Parents() {
  const [parents, setParents] = useState([]);
  const [search, setSearch] = useState("");
  const [wardFilter, setWardFilter] = useState("");
  const navigate = useNavigate();

  // Load parents and extract ward list
  useEffect(() => {
    const parentsRef = ref(db, "parents");
    const unsubscribe = onValue(parentsRef, (snapshot) => {
      const data = snapshot.val();
      const list = [];
      if (data) {
        Object.keys(data).forEach((key) => {
          list.push({ id: key, ...data[key] });
        });
      }
      setParents(list);
    });
    return () => unsubscribe();
  }, []);

  const uniqueWards = Array.from(new Set(parents.map((p) => p.ward)));

  const filtered = parents.filter((p) => {
    const matchesSearch = `${p.name || ""}`
      .toLowerCase()
      .includes(search.toLowerCase());
    const matchesWard = wardFilter ? p.ward === wardFilter : true;
    return matchesSearch && matchesWard;
  });

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="p-6 min-h-screen bg-gray-50">
      <BackButton />
      <h2 className="text-3xl font-bold mb-4 text-center text-indigo-800">
        All Parents
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
          value={wardFilter}
          onChange={(e) => setWardFilter(e.target.value)}
          className="border p-2 rounded w-full md:w-1/4"
        >
          <option value="">All Wards</option>
          {uniqueWards.map((w) => (
            <option key={w} value={w}>
              {w}
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
        {filtered.map((parent) => (
          <motion.div
            key={parent.id}
            className="bg-white rounded-lg shadow p-4"
            whileHover={{ scale: 1.02 }}
          >
            <h3 className="text-lg font-semibold mb-2">
              {parent.name}
            </h3>
            <p className="text-sm text-gray-600">Ward: {parent.ward}</p>
            <p className="text-sm text-gray-600">Email: {parent.email}</p>
            <div className="mt-3 flex space-x-2">
              <button
                onClick={() => navigate(`/parents/${parent.id}`)}
                className="px-2 py-1 bg-blue-600 text-white rounded hover:bg-blue-700"
              >
                View
              </button>
              <button
                onClick={() => {
                  if (window.confirm(`Are you sure you want to delete ${parent.name}? This action cannot be undone.`)) {
                    remove(ref(db, `parents/${parent.id}`))
                      .then(() => alert("Parent deleted successfully"))
                      .catch((err) => alert("Error deleting parent: " + err.message));
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
            No parents match the criteria.
          </p>
        )}
      </div>
    </div>
  );
}
