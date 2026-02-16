import React, { useEffect, useState } from "react";
import { db } from "../utils/firebase";
import { ref, get } from "firebase/database";
import { useAuth } from "../context/AuthContext";
import { Link, useNavigate } from "react-router-dom";

// NOTE: This resolves the parent's ward by scanning students across classes when needed.
export default function ParentDashboard() {
  const { currentUser } = useAuth();
  const navigate = useNavigate();

  const [parent, setParent] = useState(null);
  const [wards, setWards] = useState([]);
  const [loading, setLoading] = useState(true);
  const [term, setTerm] = useState({ name: "", year: "" });
  const [publishedMap, setPublishedMap] = useState({});

  useEffect(() => {
    if (!currentUser) return;
    async function load() {
      setLoading(true);
      const pSnap = await get(ref(db, `parents/${currentUser.uid}`));
      if (pSnap.exists()) {
        const p = pSnap.val();
        setParent(p);
        // support single ward id or array
        const wardList = Array.isArray(p.ward) ? p.ward : p.ward ? [p.ward] : [];

        // fetch students node and resolve wards to class + name
        const studentsSnap = await get(ref(db, "students"));
        const found = [];
        if (studentsSnap.exists()) {
          const data = studentsSnap.val();
          Object.keys(data).forEach((classId) => {
            const classData = data[classId] || {};
            wardList.forEach((wardId) => {
              if (classData[wardId]) {
                found.push({ studentId: wardId, classId, info: classData[wardId] });
              }
            });
          });
        }
        setWards(found);
      }

      const termSnap = await get(ref(db, "terms/current"));
      if (termSnap.exists()) setTerm(termSnap.val());

      setLoading(false);
    }
    load();
  }, [currentUser]);

  useEffect(() => {
    if (!term.name || wards.length === 0) return;
    async function check() {
      const map = {};
      const termKey = `${term.year}-${term.name}`;
      for (const w of wards) {
        const rSnap = await get(ref(db, `reportsPublished/${w.classId}/${termKey}`));
        const mSnap = await get(ref(db, `midtermsPublished/${term.year}/${term.name}/${w.classId}`));
        map[w.studentId] = {
          reports: rSnap.exists() && rSnap.val() === true,
          midterms: mSnap.exists() && mSnap.val() === true,
        };
      }
      setPublishedMap(map);
    }
    check();
  }, [term, wards]);

  if (loading) return <div className="p-6">Loading parent dashboard...</div>;
  if (!parent) return <div className="p-6">Parent record not found.</div>;

  return (
    <div className="p-4 md:p-6">
      <h2 className="text-2xl font-bold mb-4">Welcome, {parent.name}</h2>

      {wards.length === 0 ? (
        <div className="p-4 bg-yellow-50 rounded">No wards found for your account.</div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-1 md:grid-cols-2 gap-4">
          {wards.map((w) => (
            <div key={w.studentId} className="p-4 border rounded-lg bg-white shadow">
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="font-semibold text-lg">{w.info.firstName} {w.info.lastName}</h3>
                  <p className="text-sm text-gray-600">Class: {w.classId}</p>
                </div>
              </div>

              <div className="mt-3 flex flex-col sm:flex-row gap-2">
                {publishedMap[w.studentId] && publishedMap[w.studentId].reports ? (
                  <Link to={`/student/report/${w.classId}/${w.studentId}`} className="px-3 py-2 bg-blue-600 text-white rounded text-center w-full sm:w-auto">
                    View Report
                  </Link>
                ) : (
                  <span className="px-3 py-2 bg-gray-100 rounded text-sm text-center w-full sm:w-auto">Report not published</span>
                )}

                {publishedMap[w.studentId] && publishedMap[w.studentId].midterms ? (
                  <Link to={`/student/midterm/${w.classId}/${w.studentId}`} className="px-3 py-2 bg-green-600 text-white rounded text-center w-full sm:w-auto">
                    View Midterm
                  </Link>
                ) : (
                  <span className="px-3 py-2 bg-gray-100 rounded text-sm text-center w-full sm:w-auto">Midterm not published</span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}