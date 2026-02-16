import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { db } from "../utils/firebase";
import { ref, get } from "firebase/database";
import { useAuth } from "../context/AuthContext";
import BackButton from "../components/BackButton";

function filterForTeacher(payloadSection, assignedClasses = []) {
  if (!payloadSection) return {};
  const out = {};
  Object.keys(payloadSection).forEach((classId) => {
    if (assignedClasses.includes(classId)) {
      out[classId] = payloadSection[classId];
    }
  });
  return out;
}

function filterForStudent(payloadSection, studentId) {
  if (!payloadSection) return {};
  const out = {};
  // payloadSection is expected to be { classId: { subjectId: { studentId: ... }}}
  Object.keys(payloadSection).forEach((classId) => {
    const classNode = payloadSection[classId];
    const filteredSubjects = {};
    Object.keys(classNode || {}).forEach((subjectId) => {
      const subjectNode = classNode[subjectId] || {};
      if (subjectNode[studentId]) filteredSubjects[subjectId] = { [studentId]: subjectNode[studentId] };
    });
    if (Object.keys(filteredSubjects).length) out[classId] = filteredSubjects;
  });
  return out;
}

export default function MyBackupView() {
  const { termKey: rawTermKey, version: rawVersion, type } = useParams();
  const termKey = decodeURIComponent(rawTermKey || "");
  const version = rawVersion || "latest";
  const { currentUser, role } = useAuth();
  const [payload, setPayload] = useState(null);
  const [loading, setLoading] = useState(true);
  const [filtered, setFiltered] = useState(null);
  const [expanded, setExpanded] = useState({});

  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        // resolve the requested version
        let targetPath = `backups/stable/${termKey}`;
        if (version && version !== "none") {
          if (version === "latest") {
            const latestSnap = await get(ref(db, `backups/stable/${termKey}/latest`));
            if (!latestSnap.exists()) {
              setPayload(null);
              return;
            }
            const v = latestSnap.val();
            targetPath = `backups/stable/${termKey}/versions/${v}`;
          } else {
            targetPath = `backups/stable/${termKey}/versions/${version}`;
          }
        } else {
          // fallback try latest
          const latestSnap = await get(ref(db, `backups/stable/${termKey}/latest`));
          if (latestSnap.exists()) targetPath = `backups/stable/${termKey}/versions/${latestSnap.val()}`;
        }

        const snap = await get(ref(db, targetPath));
        if (!snap.exists()) {
          setPayload(null);
          return;
        }
        const p = snap.val();
        const section = type === "reports" ? p.scores || {} : type === "midterms" ? p.midtermScores || {} : p;
        setPayload({ raw: p, section });

        // role-based filtering
        if (role === "admin") {
          setFiltered(section);
        } else if (role === "teacher") {
          let assigned = [];

          // Helper to extract keys
          const getKeys = (tData) => {
            if (!tData || !tData.assignedClasses) return [];
            if (Array.isArray(tData.assignedClasses)) return tData.assignedClasses.filter(Boolean);
            if (typeof tData.assignedClasses === "object") return Object.keys(tData.assignedClasses);
            return [];
          };

          // Priority 1: Check historical teacher data in backup
          if (p.teachers && p.teachers[currentUser.uid]) {
            assigned = getKeys(p.teachers[currentUser.uid]);
          } else {
            // Priority 2: Fallback to live DB (legacy backups)
            const tSnap = await get(ref(db, `teachers/${currentUser.uid}`));
            if (tSnap.exists()) {
              assigned = getKeys(tSnap.val());
            }
          }
          setFiltered(filterForTeacher(section, assigned));
        } else if (role === "student") {
          // student user id should equal their studentId in backups
          const sid = currentUser.uid;
          setFiltered(filterForStudent(section, sid));
        } else if (role === "parent") {
          // read parent's ward list from live DB
          const pSnap = await get(ref(db, `parents/${currentUser.uid}`));
          let wards = [];
          if (pSnap.exists()) {
            const p = pSnap.val();
            if (Array.isArray(p.ward)) wards = p.ward.filter(Boolean);
            else if (p.ward && typeof p.ward === "object") wards = Object.values(p.ward);
          }
          // wards expected as [{ classId, studentId }, ...]
          const out = {};
          wards.forEach((w) => {
            if (!w || !w.classId || !w.studentId) return;
            const classNode = section[w.classId];
            if (!classNode) return;
            const filteredSubjects = out[w.classId] || {};
            Object.keys(classNode || {}).forEach((subjectId) => {
              const subjectNode = classNode[subjectId] || {};
              if (subjectNode[w.studentId]) filteredSubjects[subjectId] = { [w.studentId]: subjectNode[w.studentId] };
            });
            if (Object.keys(filteredSubjects).length) out[w.classId] = filteredSubjects;
          });
          setFiltered(out);
        } else {
          setFiltered({});
        }
      } catch (err) {
        console.error("Failed to load backup:", err);
        setPayload(null);
        setFiltered(null);
      } finally {
        setLoading(false);
      }
    }
    if (termKey) load();
    else setLoading(false);
  }, [termKey, type, currentUser, role]);

  // toggle expand for a student row
  function toggleExpand(classId, subjectId, studentId) {
    setExpanded((prev) => {
      const key = `${classId}||${subjectId}||${studentId}`;
      return { ...prev, [key]: !prev[key] };
    });
  }

  function exportCSV() {
    if (!filtered) return;
    const rows = [];
    // header
    rows.push(["TermKey", "Type", "ClassId", "SubjectId", "StudentId", "StudentName", "RecordJSON"]);
    Object.keys(filtered).forEach((classId) => {
      const subjects = filtered[classId] || {};
      Object.keys(subjects).forEach((subjectId) => {
        const students = subjects[subjectId] || {};
        Object.keys(students).forEach((studentId) => {
          const record = students[studentId];
          const name = (payload?.raw?.students?.[classId]?.[studentId]?.firstName || "") + " " + (payload?.raw?.students?.[classId]?.[studentId]?.lastName || "");
          rows.push([termKey, type, classId, subjectId, studentId, name.trim(), JSON.stringify(record)]);
        });
      });
    });

    const csvContent = rows.map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob(["\uFEFF" + csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${termKey.replace(/\//g, "_")}_${type}_${version || 'v'}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  if (loading) return <div className="p-6">Loading backup view...</div>;

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <BackButton />
      <h2 className="text-2xl font-bold mb-4">Backup: {termKey} — {type}</h2>

      {!payload ? (
        <p className="text-sm text-gray-600">Backup not found.</p>
      ) : (
        <>
          <div className="flex items-center justify-between mb-4">
            {role === 'admin' && (
              <p className="text-sm text-gray-600">Showing data filtered for your role: <strong>{role}</strong></p>
            )}
            <div className="flex items-center gap-2">
              <button onClick={exportCSV} className="px-3 py-1 bg-indigo-600 text-white rounded">Export CSV</button>
              <button onClick={() => window.print()} className="px-3 py-1 bg-gray-700 text-white rounded">Print</button>
            </div>
          </div>

          {!filtered || Object.keys(filtered).length === 0 ? (
            <p className="text-sm text-gray-600">No records for you in this backup section.</p>
          ) : (
            <div className="space-y-6">
              {Object.keys(filtered).map((classId) => {
                const classNode = filtered[classId] || {};
                const classMeta = payload?.raw?.classes?.[classId] || { className: classId };
                return (
                  <div key={classId} className="p-4 border rounded bg-white">
                    <div className="flex items-center justify-between mb-3">
                      <div>
                        <h3 className="font-semibold">{classMeta.className || classId}</h3>
                        <p className="text-sm text-gray-500">Class ID: {classId}</p>
                      </div>
                      <div className="text-sm text-gray-500">Subjects: {Object.keys(classNode).length}</div>
                    </div>

                    {Object.keys(classNode).map((subjectId) => {
                      const students = classNode[subjectId] || {};
                      return (
                        <div key={subjectId} className="mb-4">
                          <h4 className="font-medium mb-2">Subject: {subjectId}</h4>
                          <div className="overflow-auto border rounded">
                            <table className="min-w-full text-sm">
                              <thead className="bg-gray-50 text-left">
                                <tr>
                                  <th className="p-2">Student</th>
                                  <th className="p-2">Student ID</th>
                                  <th className="p-2">Summary</th>
                                  <th className="p-2">Actions</th>
                                </tr>
                              </thead>
                              <tbody>
                                {Object.keys(students).map((studentId) => {
                                  const record = students[studentId];
                                  const name = (payload?.raw?.students?.[classId]?.[studentId]?.firstName || "") + " " + (payload?.raw?.students?.[classId]?.[studentId]?.lastName || "");
                                  const key = `${classId}||${subjectId}||${studentId}`;
                                  return (
                                    <React.Fragment key={studentId}>
                                      <tr className="border-t">
                                        <td className="p-2 align-top">{name.trim() || "(no name)"}</td>
                                        <td className="p-2 align-top">{studentId}</td>
                                        <td className="p-2 align-top"><pre className="whitespace-pre-wrap max-w-xl">{JSON.stringify(record)}</pre></td>
                                        <td className="p-2 align-top">
                                          <button onClick={() => toggleExpand(classId, subjectId, studentId)} className="px-2 py-1 bg-yellow-500 text-white rounded text-xs">{expanded[key] ? 'Collapse' : 'Expand'}</button>
                                        </td>
                                      </tr>
                                      {expanded[key] && (
                                        <tr>
                                          <td colSpan={4} className="p-3 bg-gray-50">
                                            <pre className="whitespace-pre-wrap text-xs bg-white p-2 rounded">{JSON.stringify(record, null, 2)}</pre>
                                          </td>
                                        </tr>
                                      )}
                                    </React.Fragment>
                                  );
                                })}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}
    </div>
  );
}
