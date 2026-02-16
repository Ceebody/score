import React, { useState, useEffect } from "react";
import { auth, db } from "../../utils/firebase";
import {
  createUserWithEmailAndPassword,
  sendPasswordResetEmail,
} from "firebase/auth";
import { ref, set, onValue } from "firebase/database";
import BackButton from "../../components/BackButton"; // ✅ added

export default function RegisterTeacher() {
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [assignedClasses, setAssignedClasses] = useState([]);
  const [assignedSubjects, setAssignedSubjects] = useState([]);
  const [classTeacherFor, setClassTeacherFor] = useState("");
  const [availableClasses, setAvailableClasses] = useState([]);
  const [availableSubjects, setAvailableSubjects] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const classRef = ref(db, "classes");
    onValue(classRef, (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.val();
        const classList = Object.keys(data).map((key) => ({
          id: key,
          name: data[key].name || key,
        }));
        setAvailableClasses(classList);
      }
    });
  }, []);

  useEffect(() => {
    const subjectRef = ref(db, "subjects");
    onValue(subjectRef, (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.val();
        const subjectList = Object.keys(data).map((key) => ({
          id: key,
          name: key,
        }));
        setAvailableSubjects(subjectList);
      }
    });
  }, []);

  const handleClassToggle = (cls) => {
    setAssignedClasses((prev) =>
      prev.includes(cls) ? prev.filter((c) => c !== cls) : [...prev, cls]
    );
  };

  const handleSubjectToggle = (subj) => {
    setAssignedSubjects((prev) =>
      prev.includes(subj) ? prev.filter((s) => s !== subj) : [...prev, subj]
    );
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const tempPassword = "Temp1234";
      const userCredential = await createUserWithEmailAndPassword(
        auth,
        email,
        tempPassword
      );
      const uid = userCredential.user.uid;

      await set(ref(db, `users/${uid}`), {
        email,
        role: "teacher",
        mustChangePassword: true,
      });

      await set(ref(db, `teachers/${uid}`), {
        firstName,
        lastName,
        email,
        assignedClasses: assignedClasses.reduce(
          (acc, cls) => ({ ...acc, [cls]: true }),
          {}
        ),
        assignedSubjects: assignedSubjects.reduce(
          (acc, subj) => ({ ...acc, [subj]: true }),
          {}
        ),
        role: "teacher",
        classTeacherFor: classTeacherFor || null,
        createdAt: Date.now(),
      });

      await sendPasswordResetEmail(auth, email);

      alert(
        `Teacher registered successfully! A password reset link has been sent to ${email}`
      );

      setFirstName("");
      setLastName("");
      setEmail("");
      setAssignedClasses([]);
      setAssignedSubjects([]);
      setClassTeacherFor("");
    } catch (error) {
      console.error("Error registering teacher:", error);
      alert("Error: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto bg-white shadow-lg p-8 rounded-xl">
      <BackButton /> {/* ✅ added */}
      <h2 className="text-2xl font-bold mb-6 text-center text-blue-700">
        Register Teacher
      </h2>
      <form onSubmit={handleRegister} className="space-y-4">
        <input
          type="text"
          placeholder="First Name"
          value={firstName}
          onChange={(e) => setFirstName(e.target.value)}
          className="w-full border p-3 rounded-lg"
          required
        />
        <input
          type="text"
          placeholder="Last Name"
          value={lastName}
          onChange={(e) => setLastName(e.target.value)}
          className="w-full border p-3 rounded-lg"
          required
        />
        <input
          type="email"
          placeholder="Teacher Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full border p-3 rounded-lg"
          required
        />

        <div>
          <p className="font-semibold mb-2">Assign Classes</p>
          <div className="grid grid-cols-2 gap-2">
            {availableClasses.map((cls) => (
              <label key={cls.id} className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  checked={assignedClasses.includes(cls.id)}
                  onChange={() => handleClassToggle(cls.id)}
                />
                <span>{cls.name}</span>
              </label>
            ))}
          </div>
        </div>

        <div>
          <p className="font-semibold mb-2">Assign Subjects</p>
          <div className="grid grid-cols-2 gap-2">
            {availableSubjects.map((subj) => (
              <label key={subj.id} className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  checked={assignedSubjects.includes(subj.id)}
                  onChange={() => handleSubjectToggle(subj.id)}
                />
                <span>{subj.name}</span>
              </label>
            ))}
          </div>
        </div>

        <div>
          <p className="font-semibold mb-2">Assign as Class Teacher</p>
          <select
            value={classTeacherFor}
            onChange={(e) => setClassTeacherFor(e.target.value)}
            className="w-full border p-3 rounded-lg"
          >
            <option value="">-- Not a Class Teacher --</option>
            {availableClasses.map((cls) => (
              <option key={cls.id} value={cls.id}>
                {cls.name}
              </option>
            ))}
          </select>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-blue-600 text-white p-3 rounded-lg hover:bg-blue-700"
        >
          {loading ? "Registering..." : "Register Teacher"}
        </button>
      </form>
    </div>
  );
}
