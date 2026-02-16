import React, { useEffect, useState } from "react";
import { getDatabase, ref, onValue, get } from "firebase/database";
import { useAuth } from "../context/AuthContext";
import { Link, useNavigate } from "react-router-dom";

export default function StudentDashboard() {
  const { currentUser } = useAuth();
  const navigate = useNavigate();

  const [studentData, setStudentData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [reportsPublished, setReportsPublished] = useState(false);
  const [midtermsPublished, setMidtermsPublished] = useState(false);
  const [backupOptions, setBackupOptions] = useState([]);
  const [selectedYear, setSelectedYear] = useState("");
  const [selectedTermKey, setSelectedTermKey] = useState("");

  // helper to normalize academic year display, e.g. 2024/25 -> 2024/2025
  function formatYearDisplay(y) {
    if (!y) return y;
    const m = (y || "").match(/^(\d{4})\/(\d{2,4})$/);
    if (!m) return y;
    const a = m[1];
    const b = m[2].length === 2 ? a.slice(0, 2) + m[2] : m[2];
    return `${a}/${b}`;
  }

  useEffect(() => {
    if (!currentUser) return;

    const db = getDatabase();
    const studentRef = ref(db, "students");

    const unsubscribe = onValue(studentRef, (snapshot) => {
      let found = null;
      if (snapshot.exists()) {
        const data = snapshot.val();

        // Case A: flat structure - try both UID and studentId lookup
        if (data[currentUser.uid]) {
          found = { ...data[currentUser.uid], class: data[currentUser.uid].class || "" };
        } else {
          // Try looking up by studentId in flat structure
          Object.keys(data).forEach((key) => {
            if (data[key] && data[key].uid === currentUser.uid) {
              found = { ...data[key], class: data[key].class || "" };
            }
          });

          // Case B: nested by class lookup if still not found
          if (!found) {
            Object.keys(data).forEach((cls) => {
              const classData = data[cls];
              if (classData) {
                // Try both UID and studentId in nested structure
                Object.keys(classData).forEach((sid) => {
                  if (classData[sid].uid === currentUser.uid || sid === currentUser.uid) {
                    found = { ...classData[sid], class: cls };
                  }
                });
              }
            });
          }
        }
      }

      setStudentData(found);
      setLoading(false);
    });

    return () => {
      if (typeof unsubscribe === "function") unsubscribe();
    };
  }, [currentUser]);

  // Load available backups (stable) for quick access on dashboard
  useEffect(() => {
    async function loadBackups() {
      try {
        const db = getDatabase();
        const snap = await get(ref(db, "backups/stable"));
        if (!snap.exists()) return setBackupOptions([]);
        const data = snap.val();
        const map = {};
        Object.keys(data).forEach((termKey) => {
          const parts = termKey.split("-");
          const year = parts[0] || "unknown";
          const termName = parts.slice(1).join("-") || termKey;
          if (!map[year]) map[year] = [];
          const node = data[termKey] || {};
          const versions = node.versions ? Object.keys(node.versions).sort((a, b) => b - a) : [];
          const latest = node.latest || (versions.length ? versions[0] : null);
          map[year].push({ termKey, termName, latest });
        });
        // sort years desc and terms natural order
        const years = Object.keys(map).sort((a, b) => a < b ? 1 : -1);
        const opts = [];
        years.forEach((y) => {
          const terms = map[y].sort((a, b) => {
            const ma = (a.termName || "").match(/(\d+)/); const mb = (b.termName || "").match(/(\d+)/);
            const na = ma ? Number(ma[1]) : 99; const nb = mb ? Number(mb[1]) : 99; return na - nb;
          });
          terms.forEach((t) => opts.push({ year: y, termKey: t.termKey, termName: t.termName, latest: t.latest }));
        });
        setBackupOptions(opts);
        if (opts.length) {
          setSelectedYear(opts[0].year);
        }
      } catch (err) {
        console.error('Failed to load backups for dashboard:', err);
      }
    }
    loadBackups();
  }, [currentUser]);

  // check publish flags for current term once we have studentData
  useEffect(() => {
    if (!studentData) return;
    async function checkFlags() {
      try {
        const db = getDatabase();
        const termSnap = await get(ref(db, "terms/current"));
        if (!termSnap.exists()) return;
        const term = termSnap.val();
        const termKey = `${term.year}-${term.name}`;

        const rSnap = await get(ref(db, `reportsPublished/${studentData.class}/${termKey}`));
        setReportsPublished(rSnap.exists() && rSnap.val() === true);

        const mSnap = await get(ref(db, `midtermsPublished/${term.year}/${term.name}/${studentData.class}`));
        setMidtermsPublished(mSnap.exists() && mSnap.val() === true);
      } catch (err) {
        console.error("Failed to check publish flags:", err);
      }
    }
    checkFlags();
  }, [studentData]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-gradient-to-br from-yellow-200 to-yellow-50">
        <p className="text-lg font-semibold text-yellow-800">
          Loading your dashboard...
        </p>
      </div>
    );
  }

  if (!studentData) {
    return (
      <div className="flex items-center justify-center h-screen bg-gradient-to-br from-yellow-200 to-yellow-50">
        <p className="text-lg font-semibold text-red-600">
          No student record found for your account.
        </p>
      </div>
    );
  }

  return (
    <div className="bg-gradient-to-br from-yellow-100 via-white to-yellow-200 p-4 md:p-6 min-h-full">
      <div className="max-w-3xl mx-auto bg-white border-4 border-yellow-600 rounded-2xl shadow-2xl p-6 md:p-8">
        <h1 className="text-3xl md:text-4xl font-bold text-center text-yellow-700 mb-4 md:mb-6">
          Welcome, {studentData.firstName} {studentData.lastName} 🎓
        </h1>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="p-4 md:p-6 bg-yellow-50 border-2 border-yellow-400 rounded-xl shadow">
            <h2 className="text-lg md:text-xl font-semibold text-yellow-800 mb-2">Profile</h2>
            <p className="text-sm md:text-base"><strong>Email:</strong> {studentData.email}</p>
            <p className="text-sm md:text-base"><strong>Class:</strong> {studentData.class}</p>
          </div>

          <div className="p-4 md:p-6 bg-yellow-50 border-2 border-yellow-400 rounded-xl shadow">
            <h2 className="text-lg md:text-xl font-semibold text-yellow-800 mb-2">Performance</h2>
            <p className="text-sm md:text-base">Your test & exam results will appear here once uploaded by your teachers.</p>
          </div>
        </div>

        {/* Quick Backups selector for students */}
        <div className="mt-6 bg-white p-4 rounded-lg border">
          <h3 className="text-md font-semibold mb-2">View archived results</h3>
          <p className="text-sm text-gray-600 mb-3">Quickly open archived term snapshots (backups) for your year/term.</p>
          <div className="flex flex-col sm:flex-row gap-2 items-start">
            <select value={selectedYear} onChange={(e) => setSelectedYear(e.target.value)} className="border rounded p-2">
              {Array.from(new Set(backupOptions.map(o => o.year))).map((y) => (
                <option key={y} value={y}>{formatYearDisplay(y)}</option>
              ))}
            </select>

            <select value={selectedTermKey} onChange={(e) => setSelectedTermKey(e.target.value)} className="border rounded p-2">
              <option value="">Select term</option>
              {backupOptions.filter(o => !selectedYear || o.year === selectedYear).map((o) => (
                <option key={o.termKey} value={o.termKey}>{o.termName}</option>
              ))}
            </select>

            <div>
              <button onClick={() => {
                if (!selectedTermKey) return;
                const picked = backupOptions.find(o => o.termKey === selectedTermKey);
                const version = picked?.latest || 'none';
                navigate(`/my/backup-view/${encodeURIComponent(selectedTermKey)}/${version}/reports`);
              }} className="px-4 py-2 bg-yellow-600 text-white rounded">Open Backup</button>
            </div>
          </div>
        </div>

        <div className="mt-6 text-center">
          {reportsPublished ? (
            <Link to={`/student/report/${studentData.class}/${currentUser.uid}`} className="block md:inline-block w-full md:w-auto px-6 py-2 bg-yellow-600 hover:bg-yellow-700 text-white rounded-lg shadow-lg">
              View Report Card
            </Link>
          ) : (
            <div className="text-sm text-gray-600">Report card not published yet. Please check back later.</div>
          )}

          <div className="mt-4">
            {midtermsPublished ? (
              <Link to={`/student/midterm/${studentData.class}/${currentUser.uid}`} className="block md:inline-block w-full md:w-auto px-6 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg shadow-lg">
                View Midterm Results
              </Link>
            ) : (
              <div className="text-sm text-gray-600">Midterm results not published yet.</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}