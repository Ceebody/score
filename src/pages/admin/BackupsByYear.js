import React, { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { db } from "../../utils/firebase";
import { ref, get } from "firebase/database";
import BackButton from "../../components/BackButton";

export default function BackupsByYear() {
  const { year } = useParams();
  const [terms, setTerms] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        const snap = await get(ref(db, "backups/stable"));
        if (!snap.exists()) return setTerms([]);
        const data = snap.val();
        const list = Object.keys(data)
          .filter((key) => key.startsWith(`${year}-`))
          .map((key) => {
            const node = data[key] || {};
            const versions = node.versions ? Object.keys(node.versions).sort((a,b) => b - a) : [];
            const latest = node.latest || (versions.length ? versions[0] : null);
            return { key, termName: key.split(`${year}-`)[1], versions, latest };
          });
        setTerms(list);
      } catch (err) {
        console.error(err);
        setTerms([]);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [year]);

  if (loading) return <div className="p-6">Loading backups...</div>;

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <BackButton />
      <h2 className="text-2xl font-bold mb-4">Backups for {year}</h2>
      {terms.length === 0 ? (
        <p>No backups found for that year.</p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {terms.map((t) => (
            <div key={t.key} className="p-4 border rounded bg-white">
                <h3 className="font-semibold mb-2">{t.termName}</h3>
                <div className="space-x-2 mb-2">
                  {t.latest ? (
                    <>
                      <Link to={`/admin/backup-view/${encodeURIComponent(t.key)}/${t.latest}/reports`} className="px-3 py-1 bg-blue-600 text-white rounded">Reports (Latest)</Link>
                      <Link to={`/admin/backup-view/${encodeURIComponent(t.key)}/${t.latest}/midterms`} className="px-3 py-1 bg-green-600 text-white rounded">Midterms (Latest)</Link>
                    </>
                  ) : (
                    <>
                      <Link to={`/admin/backup-view/${encodeURIComponent(t.key)}/none/reports`} className="px-3 py-1 bg-blue-600 text-white rounded">Reports</Link>
                      <Link to={`/admin/backup-view/${encodeURIComponent(t.key)}/none/midterms`} className="px-3 py-1 bg-green-600 text-white rounded">Midterms</Link>
                    </>
                  )}
                </div>
                {t.versions && t.versions.length > 0 && (
                  <div className="text-sm text-gray-600">
                    <div className="mb-1">Versions:</div>
                    <div className="flex flex-wrap gap-2">
                      {t.versions.map((v) => (
                        <Link key={v} to={`/admin/backup-view/${encodeURIComponent(t.key)}/${v}/reports`} className="px-2 py-1 border rounded text-xs">{new Date(Number(v)).toLocaleString()}</Link>
                      ))}
                    </div>
                  </div>
                )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
