import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { db } from "../utils/firebase";
import { ref, get } from "firebase/database";
import { useAuth } from "../context/AuthContext";

export default function MyBackups() {
  const { currentUser, role } = useAuth();
  const [byYear, setByYear] = useState({});
  const [loading, setLoading] = useState(true);
  const [filterYear, setFilterYear] = useState("");
  const [filterTerm, setFilterTerm] = useState("");

  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        const snap = await get(ref(db, "backups/stable"));
        if (!snap.exists()) return setByYear({});
        const data = snap.val();
        const map = {};
        Object.keys(data).forEach((termKey) => {
          // expected format: "2024/25-Term 1" or "2024/25-Term 2" etc
          const parts = termKey.split("-");
          const year = parts[0] || "unknown";
          const termName = parts.slice(1).join("-") || termKey;
          const node = data[termKey] || {};
          const versions = node.versions ? Object.keys(node.versions).sort((a,b) => b - a) : [];
          const latest = node.latest || (versions.length ? versions[0] : null);
          if (!map[year]) map[year] = [];
          map[year].push({ key: termKey, termName, versions, latest });
        });
        // sort years descending (most recent first) and terms in natural order: Term 1, Term 2, Term 3
        const sorted = {};
        Object.keys(map)
          .sort((a, b) => (a < b ? 1 : -1))
          .forEach((y) => {
            sorted[y] = map[y].sort((a, b) => termOrderValue(a.termName) - termOrderValue(b.termName));
          });
        setByYear(sorted);
      } catch (err) {
        console.error(err);
        setByYear({});
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [currentUser, role]);

  // helper to normalize academic year display, e.g. 2024/25 -> 2024/2025
  function formatYearDisplay(y) {
    if (!y) return y;
    const m = (y || "").match(/^(\d{4})\/(\d{2,4})$/);
    if (!m) return y;
    const a = m[1];
    const b = m[2].length === 2 ? a.slice(0, 2) + m[2] : m[2];
    return `${a}/${b}`;
  }

  // helper to map termName like 'Term 1' -> numeric order
  function termOrderValue(termName) {
    const m = (termName || "").match(/(\d+)/);
    return m ? Number(m[1]) : 99;
  }

  // render a single term card (extracted to avoid complex inline JSX in map)
  function renderTermCard(t, year) {
    const termNumMatch = (t.termName || "").match(/(\d+)/);
    const termNum = termNumMatch ? Number(termNumMatch[1]) : null;
    const termWords = { 1: "First Term", 2: "Second Term", 3: "Third Term" };
    const displayLabel = termNum ? `${termWords[termNum] || t.termName} - ${formatYearDisplay(year)}` : `${t.termName} - ${formatYearDisplay(year)}`;

    return (
      <div key={t.key} className="p-4 border rounded bg-white">
        <h4 className="font-medium mb-2">{displayLabel}</h4>
        <div className="space-x-2 mb-2">
          {t.latest ? (
            <>
              <Link to={`/my/backup-view/${encodeURIComponent(t.key)}/${t.latest}/reports`} className="px-3 py-1 bg-blue-600 text-white rounded">Reports (Latest)</Link>
              <Link to={`/my/backup-view/${encodeURIComponent(t.key)}/${t.latest}/midterms`} className="px-3 py-1 bg-green-600 text-white rounded">Midterms (Latest)</Link>
            </>
          ) : (
            <>
              <Link to={`/my/backup-view/${encodeURIComponent(t.key)}/none/reports`} className="px-3 py-1 bg-blue-600 text-white rounded">Reports</Link>
              <Link to={`/my/backup-view/${encodeURIComponent(t.key)}/none/midterms`} className="px-3 py-1 bg-green-600 text-white rounded">Midterms</Link>
            </>
          )}
        </div>
        {t.versions && t.versions.length > 0 && (
          <div className="text-sm text-gray-600">
            <div className="mb-1">Versions:</div>
            <div className="flex flex-wrap gap-2">
              {t.versions.map((v) => (
                <Link key={v} to={`/my/backup-view/${encodeURIComponent(t.key)}/${v}/reports`} className="px-2 py-1 border rounded text-xs">{new Date(Number(v)).toLocaleString()}</Link>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  }

  if (loading) return <div className="p-6">Loading backups...</div>;

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <h2 className="text-2xl font-bold mb-4">My Backups</h2>
      <p className="mb-4 text-sm text-gray-600">Browse archived term snapshots. You will only be able to view data relevant to you.</p>
      {/* Filter controls */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 mb-4">
        <div>
          <label className="block text-xs text-gray-600">Filter year</label>
          <select value={filterYear} onChange={(e) => { setFilterYear(e.target.value); setFilterTerm(""); }} className="border rounded p-2">
            <option value="">All years</option>
            {Object.keys(byYear).map((y) => (
              <option key={y} value={y}>{formatYearDisplay(y)}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-xs text-gray-600">Filter term</label>
          <select value={filterTerm} onChange={(e) => setFilterTerm(e.target.value)} className="border rounded p-2">
            <option value="">All terms</option>
            {filterYear ? (
              byYear[filterYear]?.map((t) => (
                <option key={t.key} value={t.termName}>{t.termName}</option>
              ))
            ) : (
              // gather unique term names across years
              Array.from(new Set(Object.values(byYear).flat().map((t) => t.termName))).map((tn) => (
                <option key={tn} value={tn}>{tn}</option>
              ))
            )}
          </select>
        </div>
        <div className="flex items-end">
          <button onClick={() => { setFilterYear(""); setFilterTerm(""); }} className="px-3 py-1 border rounded text-sm">Clear</button>
        </div>
      </div>

      {Object.keys(byYear).length === 0 ? (
        <p className="text-sm text-gray-600">No backups available.</p>
      ) : (
        // Determine which years to show based on filter
        (filterYear ? [filterYear] : Object.keys(byYear)).map((year) => (
          <div key={year} className="mb-6">
            {/* normalize year display, e.g. 2024/25 -> 2024/2025 */}
            <h3 className="font-semibold mb-3">{formatYearDisplay(year)}</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {(byYear[year] || []).map((t) => renderTermCard(t, year))}
            </div>
          </div>
        ))
      )}
    </div>
  );
}
