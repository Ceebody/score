import React, { useEffect, useState } from 'react';
import { db } from '../../utils/firebase';
import { ref, get } from 'firebase/database';
import { useAuth } from '../../context/AuthContext';

export default function NotificationsArchive() {
  const { role } = useAuth();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');

  useEffect(() => {
    if (role !== 'admin') return;
    const node = ref(db, 'notifications/archive');
    get(node)
      .then((snap) => {
        const arr = [];
        if (snap.exists()) {
          const val = snap.val();
          Object.keys(val).forEach((k) => {
            arr.push({ id: k, ...(val[k] || {}) });
          });
          // sort newest first
          arr.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
        }
        setItems(arr);
      })
      .catch((err) => {
        console.error('Failed to load archive', err);
        setItems([]);
      })
      .finally(() => setLoading(false));
  }, [role]);

  if (role !== 'admin') return <div className="p-6">Not authorized</div>;

  const filtered = items.filter((it) => {
    if (!query) return true;
    const q = query.toLowerCase();
    return (it.title || '').toLowerCase().includes(q) || (it.body || '').toLowerCase().includes(q) || (it.target || '').toLowerCase().includes(q) || (it.targetId || '').toLowerCase().includes(q);
  });

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <h2 className="text-2xl font-semibold mb-4">Notifications Archive</h2>
      <div className="mb-4">
        <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search title, body, target..." className="p-2 border rounded w-full" />
      </div>

      {loading ? (
        <div>Loading...</div>
      ) : (
        <div className="space-y-4">
          {filtered.length === 0 && <div className="text-gray-600">No notifications found.</div>}
          {filtered.map((n) => (
            <div key={n.id} className="p-4 border rounded">
              <div className="flex justify-between items-start">
                <div>
                  <div className="font-semibold">{n.title}</div>
                  <div className="text-sm text-gray-600">{n.body}</div>
                </div>
                <div className="text-xs text-gray-500">{n.status || 'sent'}</div>
              </div>
              <div className="mt-2 text-xs text-gray-600">
                Target: <strong>{n.target}</strong> {n.targetId ? ` / ${n.targetId}` : ''} • Created: {n.createdAt ? new Date(n.createdAt).toLocaleString() : '-'}
              </div>
              {n.sendAt && <div className="mt-1 text-xs text-gray-600">Send at: {new Date(n.sendAt).toLocaleString()}</div>}
              {n.expiresAt && <div className="mt-1 text-xs text-gray-600">Expires at: {new Date(n.expiresAt).toLocaleString()}</div>}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
