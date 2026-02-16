// src/pages/RegisterUser.js
import React, { useState } from "react";
import { createUserWithEmailAndPassword } from "firebase/auth";
import { ref, set } from "firebase/database";
import { auth, db } from "../utils/firebase";

const RegisterUser = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState("student");

  const handleRegister = async (e) => {
    e.preventDefault();
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;

      // Save user role + mustChangePassword
      await set(ref(db, "users/" + user.uid), {
        email,
        role,
        mustChangePassword: true,
      });

      alert("User registered successfully!");
    } catch (error) {
      alert(error.message);
    }
  };

  return (
    <div className="p-6 max-w-md mx-auto bg-white rounded shadow">
      <h2 className="text-xl font-bold mb-4">Register New User</h2>
      <form onSubmit={handleRegister} className="space-y-3">
        <input
          type="email"
          placeholder="User Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full px-3 py-2 border rounded"
          required
        />
        <input
          type="password"
          placeholder="Temporary Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="w-full px-3 py-2 border rounded"
          required
        />
        <select
          value={role}
          onChange={(e) => setRole(e.target.value)}
          className="w-full px-3 py-2 border rounded"
        >
          <option value="student">Student</option>
          <option value="teacher">Teacher</option>
        </select>
        <button
          type="submit"
          className="w-full bg-indigo-500 text-white py-2 rounded hover:bg-indigo-600"
        >
          Register
        </button>
      </form>
    </div>
  );
};

export default RegisterUser;
