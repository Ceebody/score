import React, { useEffect, useState } from "react";
import { ref, get, update } from "firebase/database";
import { db } from "../utils/firebase";
import { useAuth } from "../context/AuthContext";
import ProfileEditor from "../components/ProfileEditor";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { User, Home, ChevronRight } from "lucide-react";

export default function MyProfile() {
  const { currentUser, role } = useAuth();
  const navigate = useNavigate();
  const [initial, setInitial] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showSuccess, setShowSuccess] = useState(false);

  useEffect(() => {
    if (!currentUser) return;
    async function fetchData() {
      setLoading(true);
      try {
        const userRef = ref(db, `users/${currentUser.uid}`);
        const snap = await get(userRef);
        const userData = snap.exists() ? snap.val() : {};

        // also try role-specific node if present
        let roleData = {};
        if (role === "teacher") {
          const s = await get(ref(db, `teachers/${currentUser.uid}`));
          roleData = s.exists() ? s.val() : {};
        } else if (role === "student") {
          const s = await get(ref(db, `students/${currentUser.uid}`));
          roleData = s.exists() ? s.val() : {};
        } else if (role === "parent") {
          const s = await get(ref(db, `parents/${currentUser.uid}`));
          roleData = s.exists() ? s.val() : {};
        }

        setInitial({ ...userData, ...roleData });
      } catch (err) {
        console.error("Failed to load profile:", err);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, [currentUser, role]);

  async function handleSave(data) {
    if (!currentUser) return;
    try {
      // write to users/ for central profile
      await update(ref(db, `users/${currentUser.uid}`), data);

      // also update role-specific path when applicable
      if (role === "teacher") {
        await update(ref(db, `teachers/${currentUser.uid}`), data);
      } else if (role === "student") {
        await update(ref(db, `students/${currentUser.uid}`), data);
      } else if (role === "parent") {
        await update(ref(db, `parents/${currentUser.uid}`), data);
      }

      setInitial(data);
      setShowSuccess(true);
      setTimeout(() => setShowSuccess(false), 3000);
    } catch (err) {
      console.error("Failed to save profile:", err);
      alert("Failed to save profile. See console.");
      throw err;
    }
  }

  if (!currentUser) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="bg-white p-8 rounded-lg shadow-md">
          <User className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-600">You must be signed in to view this page.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-indigo-50">
      {/* Success Toast */}
      {showSuccess && (
        <motion.div
          initial={{ opacity: 0, y: -50 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -50 }}
          className="fixed top-4 right-4 bg-green-500 text-white px-6 py-3 rounded-lg shadow-lg z-50 flex items-center gap-2"
        >
          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
          </svg>
          Profile saved successfully!
        </motion.div>
      )}

      {/* Modern Header */}
      <div className="bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 text-white py-12 px-6">
        <div className="max-w-4xl mx-auto">
          {/* Breadcrumb */}
          <div className="flex items-center gap-2 text-indigo-100 mb-4 text-sm">
            <button onClick={() => navigate("/dashboard")} className="hover:text-white transition flex items-center gap-1">
              <Home className="w-4 h-4" />
              Dashboard
            </button>
            <ChevronRight className="w-4 h-4" />
            <span className="text-white">My Profile</span>
          </div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <h1 className="text-4xl font-bold mb-2">My Profile</h1>
            <p className="text-indigo-100">Manage your account settings and personal information</p>
          </motion.div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-4xl mx-auto px-6 py-8">
        {loading ? (
          <div className="bg-white rounded-2xl shadow-2xl p-8 animate-pulse">
            <div className="flex gap-8 mb-8">
              <div className="w-32 h-32 rounded-full bg-gray-200"></div>
              <div className="flex-1 space-y-4">
                <div className="h-8 bg-gray-200 rounded w-1/3"></div>
                <div className="h-4 bg-gray-200 rounded w-1/2"></div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="h-16 bg-gray-200 rounded"></div>
                  <div className="h-16 bg-gray-200 rounded"></div>
                </div>
              </div>
            </div>
            <div className="space-y-4">
              <div className="h-12 bg-gray-200 rounded"></div>
              <div className="h-12 bg-gray-200 rounded"></div>
              <div className="h-12 bg-gray-200 rounded"></div>
              <div className="h-32 bg-gray-200 rounded"></div>
            </div>
          </div>
        ) : (
          <ProfileEditor
            initialData={initial || {}}
            onSave={handleSave}
            onCancel={() => navigate(-1)}
          />
        )}
      </div>
    </div>
  );
}
