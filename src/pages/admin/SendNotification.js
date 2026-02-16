import React, { useEffect, useMemo, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { db } from '../../utils/firebase';
import { ref, push, set, get, child } from 'firebase/database';

export default function SendNotification() {
  const { currentUser, role } = useAuth();
  const [target, setTarget] = useState('global'); // global | class | user
  const [selectedClass, setSelectedClass] = useState('');
  const [classes, setClasses] = useState([]);
  const [userQuery, setUserQuery] = useState('');
  const [users, setUsers] = useState([]);
  const [selectedUser, setSelectedUser] = useState(null);
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [sendAt, setSendAt] = useState(''); // datetime-local string
  const [expiresAt, setExpiresAt] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // fetch classes list (if available)
    const classesRef = ref(db, 'classes');
    get(classesRef)
      .then((snap) => {
        if (snap.exists()) {
          const val = snap.val();
          const arr = Object.keys(val).map((k) => ({ id: k, ...(val[k] || {}) }));
          setClasses(arr);
        } else {
          setClasses([]);
        }
      })
      .catch((err) => {
        console.warn('Failed to fetch classes', err);
        setClasses([]);
      });

    // fetch users for picker
    const usersRef = ref(db, 'users');
    get(usersRef)
      .then((snap) => {
        const list = [];
        if (snap.exists()) {
          const val = snap.val();
          Object.keys(val).forEach((k) => {
            list.push({ uid: k, ...(val[k] || {}) });
          });
        }
        setUsers(list);
      })
      .catch((err) => {
        console.warn('Failed to fetch users', err);
        setUsers([]);
      });
  }, []);

  const filteredUsers = useMemo(() => {
    const q = userQuery.trim().toLowerCase();
    if (!q) return users.slice(0, 25); // show first 25 by default
    return users.filter((u) => {
      const name = (u.name || '').toLowerCase();
      const email = (u.email || '').toLowerCase();
      return name.includes(q) || email.includes(q) || u.uid.toLowerCase().includes(q);
    }).slice(0, 50);
  }, [userQuery, users]);

  async function handleSubmit(e) {
    e.preventDefault();
    if (!title || !body) return alert('Provide title and body');
    if (target === 'class' && !selectedClass) return alert('Select a class');
    if (target === 'user' && !selectedUser) return alert('Select a user');

    setLoading(true);
    try {
      const now = Date.now();
      const payload = {
        title,
        body,
        createdAt: now,
        createdBy: currentUser?.uid || 'system',
        sendAt: sendAt ? new Date(sendAt).getTime() : null,
        expiresAt: expiresAt ? new Date(expiresAt).getTime() : null,
      };

      // archive first (so we have an id)
      const archiveRef = push(ref(db, `notifications/archive`));
      const archiveId = archiveRef.key;
      const archiveRecord = {
        ...payload,
        target,
        targetId: target === 'class' ? selectedClass : target === 'user' ? selectedUser?.uid : 'global',
        status: payload.sendAt && payload.sendAt > now ? 'scheduled' : 'sent',
        archiveId,
      };
      await set(archiveRef, archiveRecord);

      // if scheduled for future, add to scheduled node; otherwise push immediately to target nodes
      if (payload.sendAt && payload.sendAt > now) {
        // store scheduled notifications separately; a server or cloud function should pick these up and deliver when the time comes
        await set(ref(db, `notifications/scheduled/${archiveId}`), archiveRecord);
      } else {
        // immediate delivery
        if (target === 'global') {
          await push(ref(db, `notifications/global`), payload);
        } else if (target === 'class') {
          await push(ref(db, `notifications/class/${selectedClass}`), payload);
        } else if (target === 'user') {
          await push(ref(db, `notifications/user/${selectedUser.uid}`), payload);
        }
      }

      setTitle('');
      setBody('');
      setSelectedClass('');
      setSelectedUser(null);
      setUserQuery('');
      setSendAt('');
      setExpiresAt('');

      alert('Notification saved' + (payload.sendAt && payload.sendAt > now ? ' (scheduled)' : ''));
    } catch (err) {
      console.error('Send failed', err);
      alert('Failed to send notification');
    } finally {
      setLoading(false);
    }
  }

  if (role !== 'admin') return <div className="p-6">Not authorized</div>;

  return (
    <div className="p-6 max-w-3xl mx-auto">
      <h2 className="text-2xl font-semibold mb-4">Send Notification</h2>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium">Target</label>
          <select value={target} onChange={(e) => setTarget(e.target.value)} className="mt-1 p-2 border rounded w-full">
            <option value="global">Global (all users)</option>
            <option value="class">Class</option>
            <option value="user">User</option>
          </select>
        </div>

        {target === 'class' && (
          <div>
            <label className="block text-sm font-medium">Class</label>
            <select value={selectedClass} onChange={(e) => setSelectedClass(e.target.value)} className="mt-1 p-2 border rounded w-full">
              <option value="">-- Select class --</option>
              {classes.map((c) => (
                <option key={c.id} value={c.id}>{c.name || c.id}</option>
              ))}
            </select>
            <p className="text-xs text-gray-500 mt-1">If you don't see classes, make sure there's a `classes` node in the DB or enter a class id manually.</p>
          </div>
        )}

        {target === 'user' && (
          <div>
            <label className="block text-sm font-medium">Pick user (search by name or email)</label>
            <input value={userQuery} onChange={(e) => setUserQuery(e.target.value)} placeholder="Type name or email..." className="mt-1 p-2 border rounded w-full" />
            <div className="border rounded max-h-48 overflow-auto mt-2">
              {filteredUsers.length === 0 && <div className="p-2 text-sm text-gray-500">No users</div>}
              {filteredUsers.map((u) => (
                <div key={u.uid} className={`p-2 hover:bg-gray-50 cursor-pointer flex justify-between items-center ${selectedUser?.uid === u.uid ? 'bg-indigo-50' : ''}`} onClick={() => { setSelectedUser(u); setUserQuery((u.name || u.email || u.uid)); }}>
                  <div>
                    <div className="font-medium">{u.name || '(no name)'}</div>
                    <div className="text-xs text-gray-600">{u.email || u.uid}</div>
                  </div>
                  {selectedUser?.uid === u.uid && <div className="text-xs text-indigo-600">Selected</div>}
                </div>
              ))}
            </div>
            {selectedUser && <div className="text-xs mt-1">Selected: <strong>{selectedUser.name || selectedUser.email || selectedUser.uid}</strong> <button type="button" onClick={() => setSelectedUser(null)} className="ml-2 text-xs text-red-500">Clear</button></div>}
          </div>
        )}

        <div>
          <label className="block text-sm font-medium">Title</label>
          <input value={title} onChange={(e) => setTitle(e.target.value)} className="mt-1 p-2 border rounded w-full" />
        </div>

        <div>
          <label className="block text-sm font-medium">Message</label>
          <textarea value={body} onChange={(e) => setBody(e.target.value)} className="mt-1 p-2 border rounded w-full" rows={4} />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium">Schedule send (optional)</label>
            <input type="datetime-local" value={sendAt} onChange={(e) => setSendAt(e.target.value)} className="mt-1 p-2 border rounded w-full" />
          </div>
          <div>
            <label className="block text-sm font-medium">Expires at (optional)</label>
            <input type="datetime-local" value={expiresAt} onChange={(e) => setExpiresAt(e.target.value)} className="mt-1 p-2 border rounded w-full" />
          </div>
        </div>

        <div className="flex gap-2">
          <button type="submit" disabled={loading} className="px-4 py-2 bg-indigo-600 text-white rounded">Save</button>
          <button type="button" onClick={() => { setTitle(''); setBody(''); setSelectedClass(''); setSelectedUser(null); setUserQuery(''); setSendAt(''); setExpiresAt(''); }} className="px-4 py-2 border rounded">Reset</button>
        </div>
      </form>

      <div className="mt-8">
        <h3 className="text-lg font-medium">Notes</h3>
        <ul className="list-disc list-inside text-sm text-gray-600 mt-2">
          <li>Scheduled notifications are saved under <code>notifications/scheduled/&lt;archiveId&gt;</code> — a server process or Cloud Function should deliver them when the time comes.</li>
          <li>All sends (scheduled or immediate) are copied to <code>notifications/archive</code> and visible in the archive UI.</li>
          <li>Clients should respect <code>sendAt</code> and <code>expiresAt</code> when showing notifications.</li>
        </ul>
      </div>
    </div>
  );
}
