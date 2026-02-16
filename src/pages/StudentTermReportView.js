import React, { useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import { db } from "../utils/firebase";
import { ref, get } from "firebase/database";
import logo from "../assets/logo.png";

export default function StudentTermReportView() {
  const { classId, studentId } = useParams();
  const [term, setTerm] = useState({ name: "", year: "" });
  const [scores, setScores] = useState({});
  const [loading, setLoading] = useState(true);
  const [studentName, setStudentName] = useState("");

  function toNumber(x) {
    const n = typeof x === "string" ? parseFloat(x) : x;
    return isNaN(n) ? 0 : n;
  }

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
    async function load() {
      setLoading(true);
      const termSnap = await get(ref(db, "terms/current"));
      if (termSnap.exists()) setTerm(termSnap.val());

      // Resolve studentId to DB key if route carries UID
      let resolvedStudentId = studentId;
      let studentObj = null;

      const sSnapDirect = await get(ref(db, `students/${classId}/${studentId}`));
      if (sSnapDirect.exists()) {
        studentObj = sSnapDirect.val();
      } else {
        const userSnap = await get(ref(db, `users/${studentId}`));
        if (userSnap.exists() && userSnap.val() && userSnap.val().studentId) {
          resolvedStudentId = userSnap.val().studentId;
          const sSnapResolved = await get(ref(db, `students/${classId}/${resolvedStudentId}`));
          if (sSnapResolved.exists()) studentObj = sSnapResolved.val();
        }
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
      } else {
        setStudentName("");
      }

      // Fetch terminal scores: try live and backups
      let found = {};
      const t = termSnap.exists() ? termSnap.val() : { name: "", year: "" };
      const termName = t.name || "";
      const termYear = t.year || "";
      const [yearA, yearB] = (termYear || "").split("/");

      const candidates = [
        `scores/${classId}`,
        yearA && yearB ? `backups/stable/${yearA}/${yearB}-${termName}/scores/${classId}` : "",
      ].filter(Boolean);

      for (const path of candidates) {
        const snap = await get(ref(db, path));
        if (!snap.exists()) continue;
        const data = snap.val() || {};
        const subjTotals = {};
        Object.keys(data).forEach((subjectKey) => {
          const subjectNode = data[subjectKey] || {};
          const record = subjectNode[resolvedStudentId];
          if (!record) return;
          // Prefer total if present, else compute
          let total = record.total;
          if (total === undefined || total === null || total === "") {
            const class50 = toNumber(record.classScore50);
            const examHalf = record.examHalf !== undefined ? toNumber(record.examHalf) : toNumber(record.exam) / 2;
            if (class50 || examHalf) total = class50 + examHalf;
          }
          if (total !== undefined && total !== null && total !== "") {
            subjTotals[subjectKey] = typeof total === "string" ? parseFloat(total) : total;
          }
        });
        if (Object.keys(subjTotals).length > 0) {
          found = subjTotals;
          break;
        }
      }

      setScores(found);
      setLoading(false);
    }
    load();
  }, [classId, studentId]);

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
    const coreSubjects = ["Mathematics", "Science", "Social Studies", "English Language"];
    const gradesBySubject = Object.fromEntries(
      Object.entries(scores).map(([k, v]) => [k, scoreToBeceGrade(v)])
    );
    const corePicked = coreSubjects
      .filter((s) => gradesBySubject[s] !== undefined)
      .map((s) => ({ subject: s, grade: gradesBySubject[s] }));
    const remaining = Object.keys(gradesBySubject)
      .filter((s) => !coreSubjects.includes(s))
      .map((s) => ({ subject: s, grade: gradesBySubject[s] }))
      .sort((a, b) => a.grade - b.grade);
    const bestTwo = remaining.slice(0, 2);
    const allPicked = [...corePicked, ...bestTwo];
    const total = allPicked.reduce((sum, r) => (typeof r.grade === "number" ? sum + r.grade : sum), 0);
    return { picks: allPicked, total };
  }, [scores]);

  if (loading) return <div className="p-6">Loading end of term...</div>;

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="bg-white shadow-xl border-t-8 border-yellow-600 rounded-xl p-5 mb-6">
        <div className="flex items-center space-x-4">
          <img src={logo} alt="School Logo" className="w-14 h-14 rounded-full" />
          <div>
            <h2 className="text-2xl font-bold text-yellow-700">End of Term Report</h2>
            <p className="text-sm text-gray-600">
              {studentName || "Student"} — Class: {classId} — Term: {term.name} {term.year}
            </p>
          </div>
        </div>
      </div>

      {Object.keys(scores).length === 0 ? (
        <div className="p-4 bg-yellow-50 rounded">No terminal scores found for this student.</div>
      ) : (
        <>
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


