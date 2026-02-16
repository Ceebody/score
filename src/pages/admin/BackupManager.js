import React, { useState } from "react";
import { db } from "../../utils/firebase";
import { ref, get, set } from "firebase/database";
import { useAuth } from "../../context/AuthContext";
import BackButton from "../../components/BackButton";

// Admin UI to create stable backups and next-term templates
export default function BackupManager() {
  const { currentUser } = useAuth();
  const [running, setRunning] = useState(false);
  const [message, setMessage] = useState("");

  const snapshotPath = async () => {
    setRunning(true);
    setMessage("");
    try {
      // read current term
      const termSnap = await get(ref(db, "terms/current"));
      if (!termSnap.exists()) throw new Error("No current term set.");
      const term = termSnap.val();
      const termKey = `${term.year}-${term.name}`;

      // read main nodes to snapshot
      const [studentsSnap, scoresSnap, midtermSnap, classesSnap, teachersSnap] = await Promise.all([
        get(ref(db, "students")),
        get(ref(db, "scores")),
        get(ref(db, `midtermScores/${term.year}/${term.name}`)),
        get(ref(db, "classes")),
        get(ref(db, "teachers")),
      ]);

      const payload = {
        meta: { createdAt: new Date().toISOString(), createdBy: currentUser?.uid || "system", term },
        students: studentsSnap.exists() ? studentsSnap.val() : {},
        scores: scoresSnap.exists() ? scoresSnap.val() : {},
        midtermScores: midtermSnap.exists() ? midtermSnap.val() : {},
        classes: classesSnap.exists() ? classesSnap.val() : {},
        teachers: teachersSnap.exists() ? teachersSnap.val() : {},
      };

      // write as a versioned backup to avoid overwriting previous snapshots
      const versionId = Date.now().toString();
      await set(ref(db, `backups/stable/${termKey}/versions/${versionId}`), payload);
      // store a latest pointer
      await set(ref(db, `backups/stable/${termKey}/latest`), versionId);
      setMessage(`Stable backup created at backups/stable/${termKey}/versions/${versionId}`);
    } catch (err) {
      console.error(err);
      setMessage(`Failed: ${err.message}`);
    } finally {
      setRunning(false);
    }
  };

  const createNextTemplate = async () => {
    setRunning(true);
    setMessage("");
    try {
      // read current term & classes & students
      const termSnap = await get(ref(db, "terms/current"));
      if (!termSnap.exists()) throw new Error("No current term set.");
      const term = termSnap.val();
      // derive next term (simple heuristic)
      let nextName = "Term 1";
      let nextYear = term.year;
      if (term.name === "Term 1") nextName = "Term 2";
      else if (term.name === "Term 2") nextName = "Term 3";
      else {
        // rotate year (assumes format like 2024/25)
        try {
          const parts = term.year.split("/").map(Number);
          const next = `${parts[0] + 1}/${(parts[1] + 1).toString().slice(-2)}`;
          nextYear = next;
        } catch (e) {
          nextYear = term.year;
        }
        nextName = "Term 1";
      }
      const nextKey = `${nextYear}-${nextName}`;

      const classesSnap = await get(ref(db, "classes"));
      const studentsSnap = await get(ref(db, "students"));

      // Build a template for next term: same students & classes structure, but blank scores
      const template = { meta: { createdAt: new Date().toISOString(), createdBy: currentUser?.uid || "system", next: { year: nextYear, name: nextName } }, classes: classesSnap.exists() ? classesSnap.val() : {}, students: {} };

      if (studentsSnap.exists()) {
        const data = studentsSnap.val();
        // copy student basic info only (no records/scores)
        Object.keys(data).forEach((classId) => {
          template.students[classId] = {};
          const classData = data[classId] || {};
          Object.keys(classData).forEach((studentId) => {
            const s = classData[studentId];
            template.students[classId][studentId] = {
              firstName: s.firstName || "",
              lastName: s.lastName || "",
              gender: s.gender || "",
              // preserve class and basic profile, but remove records
              class: classId,
            };
          });
        });
      }

      await set(ref(db, `backups/next/${nextKey}`), template);
      setMessage(`Next-term template created at backups/next/${nextKey}`);
    } catch (err) {
      console.error(err);
      setMessage(`Failed: ${err.message}`);
    } finally {
      setRunning(false);
    }
  };

  return (
    <div className="p-6 max-w-3xl mx-auto">
      <BackButton />
      <h2 className="text-2xl font-bold mb-4">Backup Manager</h2>

      <p className="mb-4 text-sm text-gray-600">Create stable backups of current term data or prepare a next-term template (classes and student roster only).</p>

      <div className="space-y-3">
        <button onClick={snapshotPath} disabled={running} className="px-4 py-2 bg-indigo-600 text-white rounded">Create Stable Backup</button>
        <button onClick={createNextTemplate} disabled={running} className="px-4 py-2 bg-green-600 text-white rounded">Create Next-term Template</button>
      </div>

      {running && <p className="mt-4 text-sm text-gray-500">Working…</p>}
      {message && <p className="mt-4 text-sm">{message}</p>}
    </div>
  );
}
