import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { db } from "../../utils/firebase";
import { ref, get } from "firebase/database";
import BackButton from "../../components/BackButton";

export default function BackupView() {
  const { termKey, version: rawVersion, type } = useParams();
  const version = rawVersion === "latest" || rawVersion === "none" ? rawVersion : rawVersion;
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        // resolve the correct version: if version === 'latest' ask for latest id
        let targetPath = `backups/stable/${termKey}`;
        if (version && version !== "none") {
          if (version === "latest") {
            const latestSnap = await get(ref(db, `backups/stable/${termKey}/latest`));
            if (!latestSnap.exists()) return setData(null);
            const v = latestSnap.val();
            targetPath = `backups/stable/${termKey}/versions/${v}`;
          } else {
            targetPath = `backups/stable/${termKey}/versions/${version}`;
          }
        } else {
          // fallback: try latest, else top-level
          const top = await get(ref(db, `backups/stable/${termKey}/latest`));
          if (top.exists()) targetPath = `backups/stable/${termKey}/versions/${top.val()}`;
          else targetPath = `backups/stable/${termKey}`;
        }

        const snap = await get(ref(db, targetPath));
        if (!snap.exists()) {
          setData(null);
        } else {
          const payload = snap.val();
          if (type === "reports") setData(payload.scores || {});
          else if (type === "midterms") setData(payload.midtermScores || {});
          else setData(payload);
        }
      } catch (err) {
        console.error(err);
        setData(null);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [termKey, type]);

  if (loading) return <div className="p-6">Loading backup...</div>;

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <BackButton />
      <h2 className="text-2xl font-bold mb-4">Backup: {termKey} — {type}</h2>
      {!data || Object.keys(data).length === 0 ? (
        <p className="text-sm text-gray-600">No data available in this backup section.</p>
      ) : (
        <pre className="whitespace-pre-wrap bg-gray-100 p-4 rounded text-sm overflow-auto max-h-[60vh]">{JSON.stringify(data, null, 2)}</pre>
      )}
    </div>
  );
}
