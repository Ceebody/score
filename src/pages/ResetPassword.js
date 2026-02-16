import React, { useState } from "react";
import { sendPasswordResetEmail } from "firebase/auth";
import { auth } from "../utils/firebase";
import { Link } from "react-router-dom";

export default function ResetPassword() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setMessage("");
    setLoading(true);
    try {
      await sendPasswordResetEmail(auth, email);
      setMessage("If an account exists for that email, a password reset link has been sent.");
    } catch (err) {
      console.error("Reset error", err);
      setError(err.message || "Failed to send reset email.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-yellow-800 via-yellow-500 to-yellow-200">
      <div className="w-full max-w-md bg-white shadow-2xl rounded-2xl p-8 border-4 border-yellow-600">
        <h2 className="text-2xl font-bold text-center text-yellow-700 mb-4">Reset Password</h2>

        {message && <p className="text-green-600 text-center mb-3">{message}</p>}
        {error && <p className="text-red-600 text-center mb-3">{error}</p>}

        <form onSubmit={handleSubmit} className="space-y-4" autoComplete="off">
          <div>
            <label className="block text-gray-700 mb-1 font-medium">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-yellow-500 focus:outline-none"
              placeholder="Enter your account email"
            />
          </div>

          <button type="submit" disabled={loading} className={`w-full py-2 rounded-lg text-white ${loading ? 'bg-gray-400' : 'bg-yellow-600 hover:bg-yellow-700'}`}>
            {loading ? 'Sending...' : 'Send reset link'}
          </button>
        </form>

        <div className="mt-4 text-center">
          <Link to="/login" className="text-sm text-blue-600">← Back to login</Link>
        </div>
      </div>
    </div>
  );
}
