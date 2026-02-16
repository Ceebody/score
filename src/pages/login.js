import React, { useState } from "react";
import { signInWithEmailAndPassword } from "firebase/auth";
import { ref, get } from "firebase/database";
import { useNavigate, Link } from "react-router-dom";
import { auth, db } from "../utils/firebase";
import config from "../config";

// Eye icons
const EyeIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
  </svg>
);

const EyeOffIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.878 9.878L3 3m6.878 6.878L21 21" />
  </svg>
);

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;

      // Fetch role + mustChangePassword
      const userRef = ref(db, `users/${user.uid}`);
      const snapshot = await get(userRef);

      if (snapshot.exists()) {
        const { role, mustChangePassword } = snapshot.val();

        if (!role) {
          setError("No role assigned. Contact admin.");
          setLoading(false);
          return;
        }

        // Role-based navigation
        if (role === "student") {
          if (mustChangePassword) navigate("/change-password");
          else navigate("/student-dashboard");
        } else if (role === "teacher") {
          navigate("/teacher-dashboard");
        } else if (role === "admin") {
          navigate("/admin-dashboard");
        } else {
          setError("Unknown role. Contact admin.");
        }

        setLoading(false);
      } else {
        setError("User record not found in database.");
        setLoading(false);
      }
    } catch (err) {
      console.error(err);
      setError("Invalid email or password.");
      setLoading(false);
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-yellow-800 via-yellow-500 to-yellow-200">
      <div className="w-full max-w-md bg-white shadow-2xl rounded-2xl p-8 border-4 border-yellow-600">
        <h2 className="text-3xl font-bold text-center text-yellow-700 mb-6">
          Login
        </h2>

        {error && <p className="text-red-500 text-center mb-3">{error}</p>}

        {loading && (
          <div className="w-full bg-gray-200 rounded-full h-2 mb-4">
            <div className="bg-yellow-600 h-2 rounded-full animate-pulse w-2/3"></div>
          </div>
        )}

        <form onSubmit={handleLogin} className="space-y-5" autoComplete="off">
          {/* Email */}
          <div>
            <label htmlFor="email" className="block text-gray-700 mb-1 font-medium">Email</label>
            <input
              id="email"
              name="email"
              type="email"
              placeholder="Enter your email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              inputMode="email"
              className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-yellow-500 focus:outline-none"
            />
          </div>

          {/* Password */}
          <div>
            <label htmlFor="password" className="block text-gray-700 mb-1 font-medium">Password</label>
            <div className="relative">
              <input
                id="password"
                name="password"
                type={showPassword ? "text" : "password"}
                placeholder="Enter your password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="w-full px-4 py-2 pr-10 border rounded-lg focus:ring-2 focus:ring-yellow-500 focus:outline-none"
              />
              <span
                role="button"
                tabIndex={0}
                onClick={() => setShowPassword((prev) => !prev)}
                onKeyDown={(e) => e.key === "Enter" && setShowPassword((prev) => !prev)}
                className="absolute inset-y-0 right-0 flex items-center pr-3 text-gray-500 hover:text-yellow-700 cursor-pointer"
              >
                {showPassword ? <EyeOffIcon /> : <EyeIcon />}
              </span>
            </div>
          </div>

          {/* Submit */}
          <button
            type="submit"
            disabled={loading}
            className={`w-full py-2 rounded-lg transition font-semibold text-white ${loading ? "bg-gray-400 cursor-not-allowed" : "bg-yellow-600 hover:bg-yellow-700"
              }`}
          >
            {loading ? "Logging in..." : "Login"}
          </button>
        </form>
        <div className="mt-3 text-center">
          <Link to="/reset-password" className="text-sm text-blue-600 underline">Forgot password?</Link>
        </div>
      </div>
    </div>
  );
}
