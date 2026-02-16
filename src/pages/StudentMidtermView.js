import React, { useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import { db } from "../utils/firebase";
import { ref, get, remove } from "firebase/database";
import { useAuth } from "../context/AuthContext";
import logo from "../assets/logo.png";

export default function StudentMidtermView() {
  const { classId, studentId } = useParams();
  const [term, setTerm] = useState({ name: "", year: "" });
  const [scores, setScores] = useState({});
  const [loading, setLoading] = useState(true);
  const [studentName, setStudentName] = useState("");
  const [resolvedId, setResolvedId] = useState("");
  const { currentUser, role } = useAuth();
  const [localRole, setLocalRole] = useState(null);

  function scoreToBeceGrade(score) {
    const n = typeof score === "string" ? parseFloat(score) : score;
    if (isNaN(n)) return "-";
    if (n >= 90) return 1;
    if (n >= 80) return 2;
    if (n >= 70) return 3;
    if (n >= 60) return 4;
    if (n >= 55) return 5;
    if (n >= 50) return 6;
    if (n >= 40) return 7;
    if (n >= 35) return 8;
    return 9;
  }

  useEffect(() => {
    // fallback: if context role isn't loaded yet, try fetching user's role directly
    async function fetchRoleIfMissing() {
      if (!currentUser) return;
      if (role) {
        setLocalRole(null);
        return;
      }
      try {
        const userSnap = await get(ref(db, `users/${currentUser.uid}/role`));
        if (userSnap && userSnap.exists()) setLocalRole(userSnap.val());
      } catch (e) {
        // ignore
      }
    }
    fetchRoleIfMissing();

    async function load() {
      setLoading(true);
      const termSnap = await get(ref(db, "terms/current"));
      if (termSnap.exists()) setTerm(termSnap.val());

      // Resolve studentId: it may be a true studentId (e.g. YBSxxxx) or an auth UID
      let resolvedStudentId = studentId;
      let studentObj = null;

      // Try direct lookup first
      const sSnapDirect = await get(ref(db, `students/${classId}/${studentId}`));
      if (sSnapDirect.exists()) {
        studentObj = sSnapDirect.val();
      } else {
        // Try users/{uid} -> studentId
        const userSnap = await get(ref(db, `users/${studentId}`));
        if (userSnap.exists() && userSnap.val() && userSnap.val().studentId) {
          resolvedStudentId = userSnap.val().studentId;
          const sSnapResolved = await get(ref(db, `students/${classId}/${resolvedStudentId}`));
          if (sSnapResolved.exists()) studentObj = sSnapResolved.val();
        }

        // If still not found, scan students in class by matching uid
        if (!studentObj) {
          const classStudentsSnap = await get(ref(db, `students/${classId}`));
          if (classStudentsSnap.exists()) {
            const all = classStudentsSnap.val() || {};
            const matchKey = Object.keys(all).find((k) => all[k] && all[k].uid === studentId);
            if (matchKey) {
              resolvedStudentId = matchKey;
              studentObj = all[matchKey];
            }
          }
        }
      }

      if (studentObj) {
        setStudentName(`${studentObj.firstName || ""} ${studentObj.lastName || ""}`.trim());
        setResolvedId(resolvedStudentId);
      } else {
        setStudentName("");
      }

      if (termSnap.exists()) {
        const t = termSnap.val();

        // Build candidate paths to be resilient to schema variations
        const termName = t.name || ""; // e.g., "Term 1"
        const termYear = t.year || ""; // e.g., "2025/26"
        const [yearA, yearB] = (termYear || "").split("/"); // e.g., 2025 and 26

        const candidates = [
          // Matches your provided DB structure:
          yearA && yearB ? `midtermScores/${yearA}/${yearB}/${termName}/${classId}` : "",

          // Alternate if year is just yearA
          yearA ? `midtermScores/${yearA}/${termName}/${classId}` : "",

          // Some alternate nestings we saw earlier or might exist:
          `midtermScores/${termYear}/${termName}/${classId}`,
          `midtermScores/${termName}/${classId}`,
          `midtermScores/${classId}/${termYear}/${termName}`,
          `midtermScores/${classId}/${termName}`,
          `midtermScores/${classId}/${termYear}`,
          `midtermScores/${classId}`,

          // Backups path seen in your DB dump
          yearA && yearB ? `backups/stable/${yearA}/${yearB}-${termName}/midtermScores/${classId}` : "",
        ].filter(Boolean);

        let foundScores = {};

        // Try each candidate path until we find scores for this student
        for (const path of candidates) {
          const snap = await get(ref(db, path));
          if (!snap.exists()) continue;

          const data = snap.val();
          const subjScores = {};

          // Case A: subject -> studentId -> { score }
          Object.keys(data || {}).forEach((subjectKey) => {
            const subjectNode = data[subjectKey];
            if (
              subjectNode &&
              typeof subjectNode === "object" &&
              subjectNode[resolvedStudentId]
            ) {
              const studEntry = subjectNode[resolvedStudentId];
              if (typeof studEntry === "number") {
                subjScores[subjectKey] = studEntry;
              } else if (
                studEntry &&
                typeof studEntry === "object" &&
                (typeof studEntry.score === "number" || typeof studEntry.score === "string")
              ) {
                subjScores[subjectKey] = studEntry.score;
              }
            }
          });

          // Case B: studentId -> subject -> { score } or number
          if (Object.keys(subjScores).length === 0 && data && data[resolvedStudentId]) {
            const perStudent = data[resolvedStudentId];
            Object.keys(perStudent || {}).forEach((subjectKey) => {
              const val = perStudent[subjectKey];
              if (typeof val === "number") {
                subjScores[subjectKey] = val;
              } else if (
                val &&
                typeof val === "object" &&
                (typeof val.score === "number" || typeof val.score === "string")
              ) {
                subjScores[subjectKey] = val.score;
              }
            });
          }

          if (Object.keys(subjScores).length > 0) {
            foundScores = subjScores;
            break;
          }
        }

        setScores(foundScores);
      }

      setLoading(false);
    }
    load();
  }, [classId, studentId]);

  async function removeMidtermData() {
    // only admin can remove
    const effectiveRole = role || localRole;
    if (effectiveRole !== "admin") {
      return alert("You don't have permission to remove student data.");
    }

    if (!resolvedId) return alert("Cannot determine student key to remove.");

    if (!window.confirm(`Remove midterm data for ${studentName || resolvedId}? This cannot be undone.`)) return;

    try {
      setLoading(true);

      // compute candidate paths similar to loader
      const termSnap = await get(ref(db, "terms/current"));
      const termObj = termSnap.exists() ? termSnap.val() : { name: "", year: "" };
      const termName = termObj.name || "";
      const termYear = termObj.year || "";
      const [yearA, yearB] = (termYear || "").split("/");

      const candidates = [
        yearA && yearB ? `midtermScores/${yearA}/${yearB}/${termName}/${classId}` : "",
        yearA ? `midtermScores/${yearA}/${termName}/${classId}` : "",
        `midtermScores/${termYear}/${termName}/${classId}`,
        `midtermScores/${termName}/${classId}`,
        `midtermScores/${classId}/${termYear}/${termName}`,
        `midtermScores/${classId}/${termName}`,
        `midtermScores/${classId}/${termYear}`,
        `midtermScores/${classId}`,
        yearA && yearB ? `backups/stable/${yearA}/${yearB}-${termName}/midtermScores/${classId}` : "",
      ].filter(Boolean);

      for (const path of candidates) {
        const snap = await get(ref(db, path));
        if (!snap.exists()) continue;

        const data = snap.val();

        // If data is keyed by studentId directly, remove that node
        if (data && data[resolvedId]) {
          try {
            await remove(ref(db, `${path}/${resolvedId}`));
          } catch (e) {
            console.warn('Failed removing student node at', `${path}/${resolvedId}`, e);
          }
        }

        // Otherwise check subject -> student structure
        for (const subjectKey of Object.keys(data || {})) {
          const subjectNode = data[subjectKey];
          if (subjectNode && subjectNode[resolvedId] !== undefined) {
            try {
              await remove(ref(db, `${path}/${subjectKey}/${resolvedId}`));
            } catch (e) {
              console.warn('Failed removing student subject node at', `${path}/${subjectKey}/${resolvedId}`, e);
            }
          }
        }
      }

      alert('Midterm data removed.');
    } catch (err) {
      console.error('Failed to remove midterm data:', err);
      alert('Failed to remove midterm data: ' + (err.message || err));
    } finally {
      setLoading(false);
    }
  }

  const subjectOrder = useMemo(() => {
    const base = [
      "Mathematics",
      "Science",
      "English Language",
      "Social Studies",
      "Religious and Moral Education",
      "Computing",
      "Creative Arts and Design",
      "History",
      "French",
      "Ghanaian Language",
    ];
    const existing = Object.keys(scores);
    const ordered = base.filter((s) => existing.includes(s));
    const others = existing.filter((s) => !base.includes(s)).sort();
    return [...ordered, ...others];
  }, [scores]);

  const chartData = useMemo(() => {
    return subjectOrder.map((subj) => ({ subject: subj, score: scores[subj] }));
  }, [subjectOrder, scores]);

  const aggregate = useMemo(() => {
    // Core subjects mapping
    const coreMap = {
      Mathematics: "Num",
      Science: "Sci",
      "Social Studies": "Soc",
      "English Language": "Eng",
    };

    const gradesBySubject = Object.fromEntries(
      Object.entries(scores).map(([k, v]) => [k, scoreToBeceGrade(v)])
    );

    const coreSubjects = Object.keys(coreMap).filter((s) => gradesBySubject[s] !== undefined);
    const coreGrades = coreSubjects.map((s) => ({ subject: s, grade: gradesBySubject[s] }));

    const remaining = Object.keys(gradesBySubject)
      .filter((s) => !coreSubjects.includes(s))
      .map((s) => ({ subject: s, grade: gradesBySubject[s] }))
      .sort((a, b) => a.grade - b.grade);

    const bestTwo = remaining.slice(0, 2);
    const allPicked = [...coreGrades, ...bestTwo];
    const total = allPicked.reduce((sum, r) => (typeof r.grade === "number" ? sum + r.grade : sum), 0);
    return {
      picks: allPicked,
      total,
    };
  }, [scores]);

  if (loading) return <div className="p-6">Loading midterm...</div>;

  return (
    <div className="p-6 max-w-5xl mx-auto print:p-0 print:max-w-none">
      <div className="bg-white shadow-xl border-t-8 border-yellow-600 rounded-xl p-5 mb-6 print:shadow-none print:border-none print:mb-4">
        <div className="flex items-center space-x-4">
          <img src={logo} alt="School Logo" className="w-14 h-14 rounded-full" />
          <div>
            <h2 className="text-2xl font-bold text-yellow-700 print:text-black">Midterm Results</h2>
            <p className="text-sm text-gray-600 print:text-black">
              {studentName || "Student"} — Class: {classId} — Term: {term.name} {term.year}
            </p>
          </div>
          <div className="ml-auto flex gap-2">
            <button
              onClick={() => window.print()}
              className="px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700 print:hidden"
              title="Print this result"
            >
              🖨️ Print Result
            </button>
            {(role || localRole) === 'admin' && (
              <button
                onClick={removeMidtermData}
                className="px-3 py-1 bg-red-600 text-white rounded hover:bg-red-700 print:hidden"
                title="Remove this student's midterm data"
              >
                Remove Midterm Data
              </button>
            )}
          </div>
        </div>
      </div>

      {Object.keys(scores).length === 0 ? (
        <div className="p-4 bg-yellow-50 rounded">No midterm scores found for this student.</div>
      ) : (
        <>
          {/* Simple bar chart */}
          <div className="bg-white shadow-lg rounded-xl p-4 mb-6">
            <h3 className="font-semibold text-gray-700 mb-3">Performance Chart</h3>
            <div className="space-y-3">
              {chartData.map(({ subject, score }) => (
                <div key={subject}>
                  <div className="flex justify-between text-xs text-gray-600 mb-1">
                    <span>{subject}</span>
                    <span>{score ?? "-"}</span>
                  </div>
                  <div className="w-full bg-gray-100 rounded-md h-2 overflow-hidden">
                    <div
                      className="bg-yellow-500 h-2"
                      style={{ width: `${Math.max(0, Math.min(100, Number(score) || 0))}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Table with BECE grades */}
          <div className="bg-white shadow-lg rounded-xl p-4">
            <table className="w-full text-sm border border-gray-200 rounded-lg">
              <thead className="bg-yellow-100 text-yellow-800 font-semibold">
                <tr>
                  <th className="p-2 border text-left">Subject</th>
                  <th className="p-2 border">Score</th>
                  <th className="p-2 border">BECE Grade</th>
                </tr>
              </thead>
              <tbody>
                {subjectOrder.map((subj) => {
                  const score = scores[subj];
                  const grade = scoreToBeceGrade(score);
                  return (
                    <tr key={subj} className="odd:bg-white even:bg-gray-50">
                      <td className="p-2 border">{subj}</td>
                      <td className="p-2 border text-center">{score ?? "-"}</td>
                      <td className="p-2 border text-center font-medium">{grade}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Aggregate */}
          <div className="mt-6 bg-white shadow-lg rounded-xl p-4">
            <h3 className="font-semibold text-gray-700 mb-2">Aggregate (Core + Best Two)</h3>
            {aggregate.picks.length === 0 ? (
              <p className="text-sm text-gray-500">Not enough subjects to compute aggregate.</p>
            ) : (
              <div className="text-sm text-gray-700">
                <div className="flex flex-wrap gap-2 mb-2">
                  {aggregate.picks.map((p) => (
                    <span key={p.subject} className="px-2 py-1 bg-yellow-50 border border-yellow-200 rounded">
                      {p.subject}: <span className="font-semibold">{p.grade}</span>
                    </span>
                  ))}
                </div>
                <div>
                  <span className="font-semibold text-yellow-700">Total Aggregate:</span> {aggregate.total}
                </div>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
