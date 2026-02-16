import React, { useState, useEffect } from "react";
import { auth, db, secondaryAuth } from "../../utils/firebase";
import { ref, set, get } from "firebase/database";
import { createUserWithEmailAndPassword } from "firebase/auth";
import { v4 as uuidv4 } from "uuid";
import BackButton from "../../components/BackButton"; // ✅ added
import config from "../../config";

export default function RegisterStudent() {
  const [form, setForm] = useState({
    firstName: "",
    lastName: "",
    gender: "",
    classId: "",
  });
  const [classes, setClasses] = useState([]);
  const [loading, setLoading] = useState(false);
  const [credentials, setCredentials] = useState(null);

  useEffect(() => {
    const fetchClasses = async () => {
      try {
        const snap = await get(ref(db, "classes"));
        if (snap.exists()) {
          const data = snap.val();
          const classList = Object.keys(data).map((id) => ({
            id,
            name: data[id].name || id,
          }));
          setClasses(classList);
        }
      } catch (err) {
        console.error("Error fetching classes:", err);
      }
    };
    fetchClasses();
  }, []);

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const generateStudentId = async (classId) => {
    const year = new Date().getFullYear();
    const prefix = `${config.studentIdPrefix}${year}`;
    const unique = uuidv4().slice(0, 4).toUpperCase();
    return `${prefix}${unique}`;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const studentId = await generateStudentId(form.classId);
      const email = `${studentId.toLowerCase()}@${config.schoolEmailDomain}`;
      const password = `${config.studentIdPrefix}@${new Date().getFullYear()}`;

      // Use secondaryAuth to create user so Admin stays logged in
      const userCred = await createUserWithEmailAndPassword(secondaryAuth, email, password);
      const uid = userCred.user.uid;

      const studentData = {
        ...form,
        studentId,
        email,
        password, // Store password for report card display
        uid,
        createdAt: Date.now(),
      };

      await set(ref(db, `students/${form.classId}/${studentId}`), studentData);

      await set(ref(db, `users/${uid}`), {
        role: "student",
        studentId,
        mustChangePassword: true,
      });

      setCredentials({ email, password, studentId });
      setForm({ firstName: "", lastName: "", gender: "", classId: "" });
      alert("✅ Student registered successfully!");
    } catch (err) {
      console.error(err);
      alert("❌ Error: " + err.message);
    }
    setLoading(false);
  };

  return (
    <div className="p-6 max-w-lg mx-auto bg-white rounded-xl shadow-lg">
      <BackButton /> {/* ✅ added */}
      <h1 className="text-2xl font-bold text-yellow-700 mb-4 text-center">
        Register Student
      </h1>

      <form onSubmit={handleSubmit} className="space-y-3">
        <input
          type="text"
          name="firstName"
          value={form.firstName}
          onChange={handleChange}
          placeholder="First Name"
          className="w-full border p-2 rounded"
          required
        />
        <input
          type="text"
          name="lastName"
          value={form.lastName}
          onChange={handleChange}
          placeholder="Last Name"
          className="w-full border p-2 rounded"
          required
        />
        <select
          name="gender"
          value={form.gender}
          onChange={handleChange}
          className="w-full border p-2 rounded"
          required
        >
          <option value="">-- Select Gender --</option>
          <option value="Male">Male</option>
          <option value="Female">Female</option>
        </select>

        <select
          name="classId"
          value={form.classId}
          onChange={handleChange}
          className="w-full border p-2 rounded"
          required
        >
          <option value="">-- Select Class --</option>
          {classes.map((cls) => (
            <option key={cls.id} value={cls.id}>
              {cls.name}
            </option>
          ))}
        </select>

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-yellow-600 text-white px-4 py-2 rounded hover:bg-yellow-700"
        >
          {loading ? "Registering..." : "Register Student"}
        </button>
      </form>

      {credentials && (
        <div className="mt-6 bg-yellow-50 border border-yellow-400 p-4 rounded">
          <h2 className="font-semibold text-yellow-700 mb-2">
            Student Credentials
          </h2>
          <p><b>ID:</b> {credentials.studentId}</p>
          <p><b>Email:</b> {credentials.email}</p>
          <p><b>Password:</b> {credentials.password}</p>
          <button
            onClick={() =>
              navigator.clipboard.writeText(
                `ID: ${credentials.studentId}\nEmail: ${credentials.email}\nPassword: ${credentials.password}`
              )
            }
            className="mt-2 bg-yellow-600 text-white px-3 py-1 rounded"
          >
            Copy Credentials
          </button>
        </div>
      )}
    </div>
  );
}
