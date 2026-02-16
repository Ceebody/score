// src/pages/ChangePassword.js
import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { updatePassword, reauthenticateWithCredential, EmailAuthProvider, signOut } from "firebase/auth";
import { ref, update, get } from "firebase/database";
import { auth, db } from "../utils/firebase";

const ChangePassword = () => {
  const [oldPassword, setOldPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const navigate = useNavigate();

  const handleChangePassword = async (e) => {
    e.preventDefault();
    try {
      const user = auth.currentUser;
      if (!user) throw new Error("No user logged in.");

      const userEmail = user.email;

      // Try to update password directly first (works if session is fresh)
      try {
        await updatePassword(user, newPassword);
      } catch (updateError) {
        // If it requires recent login, THEN re-authenticate
        if (updateError.code === 'auth/requires-recent-login') {
          if (!userEmail) throw new Error("Unable to determine your email for reauthentication.");
          const cred = EmailAuthProvider.credential(userEmail, oldPassword);
          await reauthenticateWithCredential(user, cred);
          // Try update again
          await updatePassword(user, newPassword);
        } else {
          throw updateError; // Throw other errors
        }
      }

      // update mustChangePassword flag in Realtime Database
      await update(ref(db, `users/${user.uid}`), {
        mustChangePassword: false,
      });

      // If the user was forced to change password (student first login), sign them out to force re-login with new credentials
      await signOut(auth);
      alert("Password updated successfully! Please log in with your new password.");
      navigate("/login");
      return;

    } catch (error) {
      console.error("Change password error:", error);
      if (error.code === 'auth/invalid-credential' || error.code === 'auth/wrong-password') {
        alert("❌ The 'Current Password' you entered is incorrect. Please try again.");
      } else if (error.code === 'auth/too-many-requests') {
        alert("❌ Too many failed attempts. Please try again later.");
      } else if (error.code === 'auth/weak-password') {
        alert("❌ The new password is too weak. It should be at least 6 characters.");
      } else {
        alert("❌ Error: " + error.message);
      }
    }
  };

  return (
    <div className="p-6 max-w-md mx-auto bg-white rounded shadow">
      <h2 className="text-xl font-bold mb-4">Change Your Password</h2>
      <form onSubmit={handleChangePassword} className="space-y-3">
        <input
          type="password"
          placeholder="Current Password"
          value={oldPassword}
          onChange={(e) => setOldPassword(e.target.value)}
          className="w-full px-3 py-2 border rounded"
          required
        />
        <input
          type="password"
          placeholder="New Password"
          value={newPassword}
          onChange={(e) => setNewPassword(e.target.value)}
          className="w-full px-3 py-2 border rounded"
          required
        />
        <button
          type="submit"
          className="w-full bg-green-500 text-white py-2 rounded hover:bg-green-600"
        >
          Update Password
        </button>
      </form>
    </div>
  );
};

export default ChangePassword;
