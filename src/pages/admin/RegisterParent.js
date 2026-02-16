import React, { useEffect, useState } from "react";
import { auth, db } from "../../utils/firebase";
import { createUserWithEmailAndPassword } from "firebase/auth";
import { ref, set, get, update } from "firebase/database";
import BackButton from "../../components/BackButton";

export default function RegisterParent() {
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [credentials, setCredentials] = useState(null);
  const [students, setStudents] = useState([]);
  const [selectedChildren, setSelectedChildren] = useState([]);
  const [search, setSearch] = useState("");

  const generatePassword = () => Math.random().toString(36).slice(-8);

  const handleRegister = async (e) => {
    e.preventDefault();
    try {
      const password = generatePassword();
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const uid = userCredential.user.uid;

      // Save in users
      await set(ref(db, `users/${uid}`), {
        email,
        role: "parent",
        mustChangePassword: true,
      });

      // Save in parents (include linked children if any)
      const wardValue = selectedChildren.length === 1 ? selectedChildren[0].studentId : selectedChildren.map(s => s.studentId);
      await set(ref(db, `parents/${uid}`), {
        firstName,
        lastName,
        email,
        ward: wardValue,
        role: "parent",
      });

      // Update each selected student's record to reference this parent
      for (const child of selectedChildren) {
        try {
          const studentRef = ref(db, `students/${child.classId}/${child.studentId}`);
          // write a parentUid field for quick lookup
          await update(studentRef, { parentUid: uid });
        } catch (err) {
          console.warn("Failed to link child:", child, err);
        }
      }

      setCredentials({ email, password });
      setFirstName("");
      setLastName("");
      setEmail("");
    } catch (error) {
      console.error("Error registering parent:", error);
      alert("Error: " + error.message);
    }
  };

  // load students to let admin link children
  useEffect(() => {
    async function loadStudents() {
      try {
        const snap = await get(ref(db, "students"));
        if (!snap.exists()) return setStudents([]);
        const data = snap.val();
        const list = [];
        Object.keys(data).forEach(classId => {
          const classData = data[classId] || {};
          Object.keys(classData).forEach(studentId => {
            const s = classData[studentId];
            list.push({ studentId, classId, name: `${s.firstName || ''} ${s.lastName || ''}`.trim() || studentId });
          });
        });
        setStudents(list);
      } catch (err) {
        console.error("Failed to load students:", err);
      }
    }
    loadStudents();
  }, []);

  return (
    <div className="max-w-lg mx-auto bg-white shadow p-6 rounded-xl">
      <BackButton />

      <h2 className="text-xl font-bold mb-4">Register Parent</h2>
      <form onSubmit={handleRegister}>
        <input
          type="text"
          placeholder="First Name"
          value={firstName}
          onChange={(e) => setFirstName(e.target.value)}
          className="w-full border p-2 mb-2 rounded"
          required
        />
        <input
          type="text"
          placeholder="Last Name"
          value={lastName}
          onChange={(e) => setLastName(e.target.value)}
          className="w-full border p-2 mb-2 rounded"
          required
        />
        <input
          type="email"
          placeholder="Parent Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full border p-2 mb-4 rounded"
          required
        />

        {/* Link children section */}
        <div className="mb-4">
          <label className="block font-medium mb-2">Link child(ren) (optional)</label>
          <input
            type="text"
            placeholder="Search child by name or ID"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full px-3 py-2 mb-2 border rounded focus:outline-none focus:ring-2 focus:ring-yellow-500"
          />

          <div className="max-h-48 overflow-auto border rounded p-2 bg-gray-50">
            {students.length === 0 ? (
              <div className="text-sm text-gray-500">No students loaded.</div>
            ) : (
              // filter students client-side by name or id
              students
                .filter((s) => {
                  if (!search) return true;
                  const q = search.toLowerCase();
                  return (s.name || "").toLowerCase().includes(q) || (s.studentId || "").toLowerCase().includes(q) || (s.classId || "").toLowerCase().includes(q);
                })
                .map((s) => (
                  <label key={`${s.classId}-${s.studentId}`} className="flex items-center gap-2 mb-1 text-sm">
                    <input type="checkbox" checked={selectedChildren.some(c => c.studentId === s.studentId)} onChange={(e) => {
                      if (e.target.checked) setSelectedChildren(prev => [...prev, s]);
                      else setSelectedChildren(prev => prev.filter(c => c.studentId !== s.studentId));
                    }} />
                    <span>{s.name} — <em className="text-xs text-gray-500">{s.classId}</em></span>
                  </label>
                ))
            )}
          </div>
        </div>

        <button
          type="submit"
          className="w-full bg-green-600 text-white p-2 rounded hover:bg-green-700"
        >
          Register Parent
        </button>
      </form>

      {credentials && (
        <div className="mt-4 bg-gray-100 p-3 rounded">
          <p className="font-semibold">Parent Registered Successfully 🎉</p>
          <p>Email: {credentials.email}</p>
          <p>Password: {credentials.password}</p>
        </div>
      )}
    </div>
  );
}

// Load students list when component mounts
// (outside component to keep main component focused)
