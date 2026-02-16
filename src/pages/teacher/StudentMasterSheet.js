import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { db } from "../../utils/firebase";
import { ref, get } from "firebase/database";

// helper to format ordinal positions (1 -> 1ST, 2 -> 2ND, ...)
function ordinal(n) {
  if (!n && n !== 0) return "";
  const j = n % 10;
  const k = n % 100;
  if (k >= 11 && k <= 13) return `${n}TH`;
  if (j === 1) return `${n}ST`;
  if (j === 2) return `${n}ND`;
  if (j === 3) return `${n}RD`;
  return `${n}TH`;
}

export default function StudentMasterSheet() {
  const { classId, studentId } = useParams();
  const navigate = useNavigate();

  const [className, setClassName] = useState(classId || "");
  const [student, setStudent] = useState(null);
  const [records, setRecords] = useState([]); // per-subject breakdown for selected student
  const [studentsList, setStudentsList] = useState([]); // simple list of students for class view
  const [studentsRecords, setStudentsRecords] = useState([]); // detailed per-student records for class view
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!classId) return;

    async function fetchAll() {
      setLoading(true);
      try {
        // Fetch class metadata (optional)
        try {
          const classSnap = await get(ref(db, `classes/${classId}`));
          if (classSnap.exists()) setClassName(classSnap.val().name || classId);
        } catch (err) {
          // ignore
        }

        // Fetch students
        const studentsSnap = await get(ref(db, `students/${classId}`));
        const studentsData = studentsSnap.exists() ? studentsSnap.val() : {};

        // Fetch scores (subject -> student -> score)
        const scoresSnap = await get(ref(db, `scores/${classId}`));
        const scoresData = scoresSnap.exists() ? scoresSnap.val() : {};

        // Build a simple student list for class-level view (no aggregated class/exam sums)
        const sList = Object.keys(studentsData).map((sid) => ({
          studentId: sid,
          firstName: studentsData[sid].firstName || "",
          lastName: studentsData[sid].lastName || "",
          attendance: (studentsData[sid].records && studentsData[sid].records.attendance) || "N/A",
        }));
        setStudentsList(sList);

        // Build detailed records per student for class view: for each subject compute student's entry and POS
        const subjects = Object.keys(scoresData || {});
        // precompute ranks per subject
        const ranksPerSubject = {};
        subjects.forEach((subject) => {
          const subjectData = scoresData[subject] || {};
          const ranks = Object.keys(subjectData)
            .map((sid) => ({ sid, total: Number(subjectData[sid]?.total) || 0 }))
            .sort((a, b) => b.total - a.total);
          ranksPerSubject[subject] = ranks;
        });

        const detailed = Object.keys(studentsData).map((sid) => {
          const recs = subjects.map((subject) => {
            const subjectData = scoresData[subject] || {};
            const entry = subjectData[sid] || null;
            const ranks = ranksPerSubject[subject] || [];
            const posIndex = ranks.findIndex((r) => r.sid === sid);
            const pos = posIndex >= 0 ? posIndex + 1 : null;
            return { subject, data: entry, position: pos };
          });
          const totals = recs.map((r) => Number(r.data?.total) || 0);
          const avg = totals.reduce((a, b) => a + b, 0) / (totals.length || 1);
          return {
            studentId: sid,
            firstName: studentsData[sid].firstName || "",
            lastName: studentsData[sid].lastName || "",
            attendance: (studentsData[sid].records && studentsData[sid].records.attendance) || "N/A",
            records: recs,
            avg: isNaN(avg) ? null : avg,
          };
        });
        setStudentsRecords(detailed);

        // If a specific studentId was provided, fetch that student's info and breakdown
        if (studentId) {
          const studentSnap = await get(ref(db, `students/${classId}/${studentId}`));
          if (studentSnap.exists()) setStudent(studentSnap.val());
          else setStudent(null);

          // Build per-subject breakdown and compute position (POS) per subject
          const breakdown = [];
          Object.keys(scoresData).forEach((subject) => {
            const subjectData = scoresData[subject] || {};
            const subjEntry = subjectData[studentId] || null;
            // compute ranking for this subject
            const ranks = Object.keys(subjectData)
              .map((sid) => ({ sid, total: Number(subjectData[sid]?.total) || 0 }))
              .sort((a, b) => b.total - a.total);

            const posIndex = ranks.findIndex((r) => r.sid === studentId);
            const pos = posIndex >= 0 ? posIndex + 1 : null;

            breakdown.push({
              subject,
              data: subjEntry,
              position: pos,
            });
          });
          setRecords(breakdown);
        } else {
          setStudent(null);
          setRecords([]);
        }
      } catch (err) {
        console.error("Failed to fetch master sheet:", err);
      } finally {
        setLoading(false);
      }
    }

    fetchAll();
  }, [classId, studentId]);

  // Export displayed data to CSV (Excel-friendly)
  function exportToCSV() {
    try {
      // Determine subjects order: union of subjects across studentsRecords or records
      let subjects = [];
      if (studentId && records.length > 0) {
        subjects = records.map((r) => r.subject);
      } else if (studentsRecords.length > 0) {
        const set = new Set();
        studentsRecords.forEach((s) => s.records.forEach((r) => set.add(r.subject)));
        subjects = Array.from(set);
      }

      // Build header
      const header = ["NAME"];
      subjects.forEach((sub) => {
        header.push(`${sub} CS`, `${sub} ES`, `${sub} TT`, `${sub} POS`);
      });
      header.push("AVG", "Attendance");

      const rows = [header];

      if (studentId && student) {
        const row = [];
        row.push(`${student.firstName || ""} ${student.lastName || ""}`);
        subjects.forEach((sub) => {
          const r = records.find((x) => x.subject === sub) || {};
          const d = r.data || {};
          row.push(d.classScore50 ?? d.classScore ?? "");
          row.push(d.examHalf ?? d.exam ?? "");
          row.push(d.total ?? "");
          row.push(r.position ? ordinal(r.position) : "");
        });
        const avg = records.length ? (records.map((r) => Number(r.data?.total) || 0).reduce((a, b) => a + b, 0) / records.length) : null;
        row.push(isNaN(avg) ? "" : avg.toFixed(1));
        row.push(student.records?.attendance ?? student.attendance ?? "");
        rows.push(row);
      } else {
        studentsRecords.forEach((srec) => {
          const row = [];
          row.push(`${srec.firstName || ""} ${srec.lastName || ""}`);
          subjects.forEach((sub) => {
            const r = srec.records.find((x) => x.subject === sub) || {};
            const d = r.data || {};
            row.push(d.classScore50 ?? d.classScore ?? "");
            row.push(d.examHalf ?? d.exam ?? "");
            row.push(d.total ?? "");
            row.push(r.position ? ordinal(r.position) : "");
          });
          row.push(srec.avg ? srec.avg.toFixed(1) : "");
          row.push(srec.attendance ?? "");
          rows.push(row);
        });
      }

      // Convert rows to CSV string
      const csvContent = rows.map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(",")).join("\r\n");
      const bom = '\uFEFF';
      const blob = new Blob([bom + csvContent], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      const date = new Date().toISOString().slice(0, 10);
      a.download = `master-sheet-${classId || "class"}-${date}.csv`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error("Export failed:", err);
      alert("Failed to export CSV. See console for details.");
    }
  }

  return (
    <div className="min-h-screen master-sheet-root bg-gradient-to-br from-indigo-50 via-white to-blue-100 p-6">
      <div className="max-w-6xl mx-auto bg-white rounded-3xl shadow-2xl p-6 border-t-8 border-indigo-600">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-indigo-800">Class Master Sheet</h1>
            <p className="text-gray-600">Class: {className}</p>
            {student && (
              <p className="text-sm text-gray-600">Selected: {student.firstName} {student.lastName}</p>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button onClick={() => navigate(-1)} className="px-4 py-2 rounded bg-gray-200">Back</button>
            <button onClick={() => window.print()} className="px-4 py-2 rounded bg-indigo-600 text-white hover:bg-indigo-700">Print</button>
            <button onClick={() => exportToCSV()} className="px-4 py-2 rounded bg-emerald-600 text-white hover:bg-emerald-700">Export CSV</button>
          </div>
        </div>

        {loading ? (
          <p className="text-center text-gray-500 italic">Loading master sheet...</p>
        ) : (
          <div className="space-y-6">
            <div className="overflow-x-auto">
              {/* If a specific student is selected, render the per-student subject breakdown table */}
              {studentId && student ? (
                <table className="min-w-full border text-sm">
                  <thead>
                    <tr className="bg-gray-200 text-center">
                      <th className="border p-2">NAME</th>
                      {records.length > 0 ? (
                        records.map((r) => (
                          <th key={r.subject} className="border p-2">{r.subject}</th>
                        ))
                      ) : (
                        <th className="border p-2">(no subjects)</th>
                      )}
                      <th className="border p-2">AVG</th>
                    </tr>
                  </thead>
                  <tbody>
                    {records.length === 0 ? (
                      <tr>
                        <td className="border p-2 font-semibold">{student.firstName} {student.lastName}</td>
                        <td className="border p-2" colSpan={2}>No subject scores found for this student.</td>
                      </tr>
                    ) : (
                      <>
                        {/* CS row */}
                        <tr className="text-center">
                          <td className="border p-2 font-semibold" rowSpan={4}>
                            {student.firstName} {student.lastName}
                          </td>
                          {records.map((r) => (
                            <td key={`cs-${r.subject}`} className="border p-2">CS= {r.data ? (r.data.classScore50 ?? r.data.classScore ?? "—") : "—"}</td>
                          ))}
                          <td className="border p-2 font-bold" rowSpan={4}>
                            {(() => {
                              const totals = records.map((r) => Number(r.data?.total) || 0);
                              const avg = totals.reduce((a, b) => a + b, 0) / (totals.length || 1);
                              return isNaN(avg) ? "—" : avg.toFixed(1);
                            })()}
                          </td>
                        </tr>

                        {/* ES row */}
                        <tr className="text-center">
                          {records.map((r) => (
                            <td key={`es-${r.subject}`} className="border p-2">ES= {r.data ? (r.data.examHalf ?? r.data.exam ?? "—") : "—"}</td>
                          ))}
                        </tr>

                        {/* TT row */}
                        <tr className="text-center">
                          {records.map((r) => (
                            <td key={`tt-${r.subject}`} className="border p-2">TT= {r.data ? (r.data.total ?? "—") : "—"}</td>
                          ))}
                        </tr>

                        {/* POS row */}
                        <tr className="text-center">
                          {records.map((r) => (
                            <td key={`pos-${r.subject}`} className="border p-2">{r.position ? `POS. ${ordinal(r.position)}` : "POS."}</td>
                          ))}
                        </tr>
                      </>
                    )}
                  </tbody>
                </table>
              ) : (
                // Class-level detailed view: render each student's subject breakdown (CS, ES, TT, POS) and attendance
                <div className="students-grid grid grid-cols-1 md:grid-cols-2 gap-6">
                  {studentsRecords.length === 0 ? (
                    <p className="text-center text-gray-600 italic">No students or scores found for this class.</p>
                  ) : (
                    studentsRecords.map((srec) => (
                      <div key={srec.studentId} className="student-card bg-gradient-to-tr from-indigo-50 to-blue-50 p-4 rounded-lg border border-indigo-200 shadow-sm">
                        <div className="flex items-start justify-between mb-3">
                          <div>
                            <h4 className="font-semibold text-indigo-800">{srec.firstName} {srec.lastName}</h4>
                            <p className="text-sm text-gray-600">Attendance: {srec.attendance}</p>
                          </div>
                          <div>
                            <button
                              onClick={() => navigate(`/teacher/master-sheet/${classId}/${srec.studentId}`)}
                              className="px-3 py-1 rounded bg-indigo-600 text-white hover:bg-indigo-700"
                            >
                              View
                            </button>
                          </div>
                        </div>

                        <div className="overflow-x-auto">
                          <table className="min-w-full border text-sm">
                            <thead>
                              <tr className="bg-gray-200 text-center">
                                <th className="border p-2">NAME</th>
                                {srec.records.map((r) => (
                                  <th key={r.subject} className="border p-2">{r.subject}</th>
                                ))}
                                <th className="border p-2">AVG</th>
                              </tr>
                            </thead>
                            <tbody>
                                <tr className="text-center">
                                  <td className="border p-2 font-semibold" rowSpan={4}>{srec.firstName} {srec.lastName}</td>
                                  {srec.records.map((r) => (
                                    <td key={`cs-${srec.studentId}-${r.subject}`} className="border p-2">CS= {r.data ? (r.data.classScore50 ?? r.data.classScore ?? "—") : "—"}</td>
                                  ))}
                                  <td className="border p-2 font-bold" rowSpan={4}>{srec.avg ? srec.avg.toFixed(1) : "—"}</td>
                                </tr>
                                <tr className="text-center">
                                  {srec.records.map((r) => (
                                    <td key={`es-${srec.studentId}-${r.subject}`} className="border p-2">ES= {r.data ? (r.data.examHalf ?? r.data.exam ?? "—") : "—"}</td>
                                  ))}
                                </tr>
                                <tr className="text-center">
                                  {srec.records.map((r) => (
                                    <td key={`tt-${srec.studentId}-${r.subject}`} className="border p-2">TT= {r.data ? (r.data.total ?? "—") : "—"}</td>
                                  ))}
                                </tr>
                                <tr className="text-center">
                                  {srec.records.map((r) => (
                                    <td key={`pos-${srec.studentId}-${r.subject}`} className="border p-2">{r.position ? `POS. ${ordinal(r.position)}` : "POS."}</td>
                                  ))}
                                </tr>
                            </tbody>
                          </table>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Print styles to make 6 cards/A4: reduced font, tighter paddings, 2 columns x 3 rows per page */}
      <style>{`
        @media print {
          .master-sheet-root { font-size: 10px !important; }
          .master-sheet-root .student-card { padding: 6px !important; border-width: 1px !important; box-shadow: none !important; }
          .master-sheet-root .students-grid { display: grid !important; grid-template-columns: repeat(2, 1fr) !important; gap: 6px !important; }
          .master-sheet-root .student-card { page-break-inside: avoid; }
          .master-sheet-root .student-card:nth-child(6n) { page-break-after: always; }
          .master-sheet-root table { font-size: 9px !important; }
          .master-sheet-root th, .master-sheet-root td { padding: 4px !important; }
          /* Hide interactive buttons when printing */
          .master-sheet-root button { display: none !important; }
        }
      `}</style>
    </div>
  );
}