import React, { useEffect, useState } from "react";
import { getDatabase, ref, get } from "firebase/database";
import { useAuth } from "../../context/AuthContext";
import { useNavigate } from "react-router-dom";
import BackButton from "../../components/BackButton";

/*
  Updated ClassRecordsIndex:
  - Fetches students and scores for each assigned class.
  - Computes per-student per-subject records and positions (POS) using the same logic as StudentMasterSheet.
  - When a class is expanded it shows the "master-sheet" style student cards (CS, ES, TT, POS, AVG, Attendance).
  - Keeps original search behavior and navigation to individual record pages.
*/

export default function ClassRecordsIndex() {
  const { currentUser } = useAuth();
  const db = getDatabase();
  const navigate = useNavigate();

  const [classes, setClasses] = useState([]);
  const [studentsMap, setStudentsMap] = useState({}); // raw students data per class
  const [scoresMap, setScoresMap] = useState({}); // raw scores data per class (subject -> student -> data)
  const [studentsRecordsMap, setStudentsRecordsMap] = useState({}); // computed detailed records per class
  const [expanded, setExpanded] = useState({});
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    if (!currentUser) return;
    async function load() {
      setLoading(true);
      try {
        const teacherSnap = await get(ref(db, `teachers/${currentUser.uid}`));
        const classesSnap = await get(ref(db, `classes`));
        const studentsSnap = await get(ref(db, `students`));
        const scoresSnap = await get(ref(db, `scores`));

        let assigned = [];
        if (teacherSnap.exists()) {
          const t = teacherSnap.val();
          if (Array.isArray(t.assignedClasses)) assigned = t.assignedClasses.filter(Boolean);
          else if (t.assignedClasses && typeof t.assignedClasses === 'object') assigned = Object.keys(t.assignedClasses);
        }

        const classesData = classesSnap.exists() ? classesSnap.val() : {};
        const studentsData = studentsSnap.exists() ? studentsSnap.val() : {};
        const scoresData = scoresSnap.exists() ? scoresSnap.val() : {};

        const cls = assigned.map((cid) => ({ classId: cid, className: classesData[cid]?.name || cid }));
        setClasses(cls);

        const rawStudentsMap = {};
        assigned.forEach((cid) => {
          const classStudents = studentsData[cid] || {};
          rawStudentsMap[cid] = classStudents; // keep raw object for reference
        });
        setStudentsMap(rawStudentsMap);

        const rawScoresMap = {};
        assigned.forEach((cid) => {
          rawScoresMap[cid] = scoresData[cid] || {}; // could be {} when no scores yet
        });
        setScoresMap(rawScoresMap);

        // compute detailed per-student records per class (reuse the same algorithm as StudentMasterSheet)
        const computed = {};
        assigned.forEach((cid) => {
          const classStudents = rawStudentsMap[cid] || {};
          const classScores = rawScoresMap[cid] || {};
          const subjects = Object.keys(classScores || {});
          const ranksPerSubject = {};
          subjects.forEach((subject) => {
            const subjectData = classScores[subject] || {};
            const ranks = Object.keys(subjectData)
              .map((sid) => ({ sid, total: Number(subjectData[sid]?.total) || 0 }))
              .sort((a, b) => b.total - a.total);
            ranksPerSubject[subject] = ranks;
          });

          const detailed = Object.keys(classStudents).map((sid) => {
            const recs = subjects.map((subject) => {
              const subjectData = classScores[subject] || {};
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
              firstName: classStudents[sid]?.firstName || "",
              lastName: classStudents[sid]?.lastName || "",
              attendance: (classStudents[sid]?.records && classStudents[sid].records.attendance) || "N/A",
              records: recs,
              avg: isNaN(avg) ? null : avg,
            };
          });

          computed[cid] = { subjects, detailed };
        });

        setStudentsRecordsMap(computed);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [currentUser, db]);

  // when searchQuery changes, auto-expand classes that have matches; collapse when query cleared
  useEffect(() => {
    const q = (searchQuery || "").trim().toLowerCase();
    if (!q) {
      setExpanded({});
      return;
    }

    const toExpand = {};
    classes.forEach((c) => {
      const list = (studentsRecordsMap[c.classId]?.detailed) || [];
      const has = list.some((s) => {
        const full = `${s.firstName || ""} ${s.lastName || ""}`.toLowerCase();
        const sid = (s.studentId || "").toLowerCase();
        return full.includes(q) || sid.includes(q);
      });
      if (has) toExpand[c.classId] = true;
    });
    setExpanded((prev) => ({ ...prev, ...toExpand }));
  }, [searchQuery, studentsRecordsMap, classes]);

  if (loading) return <div className="p-6">Loading class records...</div>;

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <BackButton />
      <h2 className="text-2xl font-bold mb-4">Class Records</h2>
      <div className="mb-4">
        <input
          type="text"
          placeholder="Search students by name or ID across your classes..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full border p-2 rounded-lg focus:ring-2 focus:ring-indigo-400"
        />
      </div>
      {classes.length === 0 ? (
        <p className="text-sm text-gray-600">You have no assigned classes.</p>
      ) : (
        <div className="space-y-6">
          {classes.map((c) => {
            const classDetailed = studentsRecordsMap[c.classId]?.detailed || [];
            const subjects = studentsRecordsMap[c.classId]?.subjects || [];
            return (
              <div key={c.classId} className="p-4 border rounded bg-white">
                <div className="flex items-center justify-between mb-3">
                  <button
                    onClick={() => setExpanded((p) => ({ ...p, [c.classId]: !p[c.classId] }))}
                    className="text-left w-full flex items-center justify-between"
                  >
                    <div>
                      <h3 className="font-semibold">{c.className}</h3>
                      <p className="text-sm text-gray-500">Class ID: {c.classId}</p>
                    </div>
                    <div className="text-sm text-gray-500">Students: {classDetailed.length}</div>
                  </button>
                </div>

                {expanded[c.classId] ? (
                  <>
                    <div className="mb-3 flex gap-2">
                      <button
                        onClick={() => navigate(`/teacher/master-sheet/${c.classId}`)}
                        className="px-3 py-1 rounded bg-indigo-600 text-white hover:bg-indigo-700"
                      >
                        Open Master Sheet (Class)
                      </button>
                      <button
                        onClick={() => navigate(`/teacher/class-records/${c.classId}`)}
                        className="px-3 py-1 rounded bg-gray-200"
                      >
                        Open Class Student Index
                      </button>
                    </div>

                    {classDetailed.length === 0 ? (
                      <p className="text-sm text-gray-600 italic">No students or scores found for this class.</p>
                    ) : (
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                        {classDetailed.map((srec) => (
                          <div
                            key={srec.studentId}
                            className="p-3 border rounded hover:shadow cursor-pointer bg-gradient-to-tr from-indigo-50 to-blue-50"
                          >
                            <div className="flex items-start justify-between mb-2">
                              <div>
                                <div className="font-medium">{srec.firstName} {srec.lastName}</div>
                                <div className="text-xs text-gray-500">{srec.studentId}</div>
                                <div className="text-xs text-gray-500">Attendance: {srec.attendance}</div>
                              </div>
                              <div className="flex flex-col gap-2">
                                <button
                                  className="px-2 py-1 rounded bg-indigo-600 text-white text-sm"
                                  onClick={() => navigate(`/teacher/master-sheet/${c.classId}/${srec.studentId}`)}
                                >
                                  View Master
                                </button>
                                <button
                                  className="px-2 py-1 rounded bg-gray-200 text-sm"
                                  onClick={() => navigate(`/teacher/class-records/${c.classId}/${srec.studentId}`)}
                                >
                                  Open Record
                                </button>
                              </div>
                            </div>

                            {/* small table preview */}
                            <div className="overflow-x-auto">
                              <table className="w-full text-sm border">
                                <thead>
                                  <tr className="bg-gray-100 text-center">
                                    <th className="border p-1">SUB</th>
                                    <th className="border p-1">CS</th>
                                    <th className="border p-1">ES</th>
                                    <th className="border p-1">TT</th>
                                    <th className="border p-1">POS</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {srec.records.length === 0 ? (
                                    <tr>
                                      <td className="border p-1" colSpan={5}>No scores</td>
                                    </tr>
                                  ) : (
                                    srec.records.map((r) => (
                                      <tr key={`${srec.studentId}-${r.subject}`} className="text-center">
                                        <td className="border p-1">{r.subject}</td>
                                        <td className="border p-1">{r.data ? (r.data.classScore50 ?? r.data.classScore ?? "—") : "—"}</td>
                                        <td className="border p-1">{r.data ? (r.data.examHalf ?? r.data.exam ?? "—") : "—"}</td>
                                        <td className="border p-1">{r.data ? (r.data.total ?? "—") : "—"}</td>
                                        <td className="border p-1">{r.position ? `#${r.position}` : "-"}</td>
                                      </tr>
                                    ))
                                  )}
                                </tbody>
                              </table>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </>
                ) : (
                  <div className="text-sm text-gray-500 italic">Click the class name to expand students and view master-sheet data</div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}