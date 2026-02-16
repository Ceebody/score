import React, { useEffect, useState } from "react";
import { db } from "../../utils/firebase";
import { ref, get, set, remove, push } from "firebase/database";
import { useNavigate } from "react-router-dom";

export default function PublishControls() {
  const [classes, setClasses] = useState([]);
  const [selectedClass, setSelectedClass] = useState("");
  const [term, setTerm] = useState({ name: "", year: "" });
  const [reportsPublished, setReportsPublished] = useState(false);
  const [midtermsPublished, setMidtermsPublished] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    async function load() {
      const classesSnap = await get(ref(db, "classes"));
      if (classesSnap.exists()) {
        const data = classesSnap.val();
        setClasses(Object.keys(data).map((k) => ({ id: k, name: data[k].name || k })));
      }

      const termSnap = await get(ref(db, "terms/current"));
      if (termSnap.exists()) setTerm(termSnap.val());
    }
    load();
  }, []);

  useEffect(() => {
    if (!selectedClass || !term.name) return;
    async function check() {
      const termKey = `${term.year}-${term.name}`;
      const rSnap = await get(ref(db, `reportsPublished/${selectedClass}/${termKey}`));
      setReportsPublished(rSnap.exists() && rSnap.val() === true);

      const mSnap = await get(ref(db, `midtermsPublished/${term.year}/${term.name}/${selectedClass}`));
      setMidtermsPublished(mSnap.exists() && mSnap.val() === true);
    }
    check();
  }, [selectedClass, term]);

  async function toggleReports() {
    if (!selectedClass || !term.name) return alert("Choose class and ensure current term is set.");
    const termKey = `${term.year}-${term.name}`;
    if (reportsPublished) {
      await remove(ref(db, `reportsPublished/${selectedClass}/${termKey}`));
      setReportsPublished(false);
      alert("Reports unpublished for the class.");
    } else {
      await set(ref(db, `reportsPublished/${selectedClass}/${termKey}`), true);
      setReportsPublished(true);
      // notify class
      await push(ref(db, `notifications/class/${selectedClass}`), {
        title: "Reports Published",
        body: `Terminal reports for ${term.name} ${term.year} have been published.`,
        timestamp: new Date().toISOString(),
        type: "publish",
      });
      alert("Reports published and notification sent to class.");
    }
  }

  async function toggleMidterms() {
    if (!selectedClass || !term.name) return alert("Choose class and ensure current term is set.");
    if (midtermsPublished) {
      await remove(ref(db, `midtermsPublished/${term.year}/${term.name}/${selectedClass}`));
      setMidtermsPublished(false);
      alert("Midterms unpublished for the class.");
    } else {
      await set(ref(db, `midtermsPublished/${term.year}/${term.name}/${selectedClass}`), true);
      setMidtermsPublished(true);
      // notify class
      await push(ref(db, `notifications/class/${selectedClass}`), {
        title: "Midterm Results Published",
        body: `Midterm results for ${term.name} ${term.year} are now available.`,
        timestamp: new Date().toISOString(),
        type: "publish",
      });
      alert("Midterms published and notification sent to class.");
    }
  }

  return (
    <div className="p-6">
      <h2 className="text-2xl font-bold mb-4">Publish Controls</h2>

      <div className="mb-4 max-w-md">
        <label className="block text-sm font-medium text-gray-700">Select Class</label>
        <select value={selectedClass} onChange={(e) => setSelectedClass(e.target.value)} className="w-full border rounded p-2">
          <option value="">-- choose class --</option>
          {classes.map((c) => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </select>
      </div>

      <div className="mb-6">
        <p><strong>Current term:</strong> {term.year} - {term.name}</p>
      </div>

      <div className="space-x-3">
        <button onClick={toggleReports} className={`px-4 py-2 rounded ${reportsPublished ? 'bg-red-600 text-white' : 'bg-green-600 text-white'}`}>
          {reportsPublished ? 'Unpublish Reports' : 'Publish Reports'}
        </button>

        <button onClick={toggleMidterms} className={`px-4 py-2 rounded ${midtermsPublished ? 'bg-red-600 text-white' : 'bg-green-600 text-white'}`}>
          {midtermsPublished ? 'Unpublish Midterms' : 'Publish Midterms'}
        </button>

        <button onClick={() => navigate(-1)} className="px-4 py-2 rounded bg-gray-200">Back</button>
      </div>
    </div>
  );
}
