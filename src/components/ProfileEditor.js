import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { User, Mail, Phone, MapPin, Image, Tag, Save, X } from "lucide-react";

export default function ProfileEditor({ initialData = {}, onSave, onCancel, readOnly = false }) {
  const [form, setForm] = useState({});
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    setForm({
      name: "",
      email: "",
      phone: "",
      address: "",
      bio: "",
      avatarUrl: "",
      tags: [],
      ...initialData,
    });
  }, [initialData]);

  function handleChange(e) {
    const { name, value } = e.target;
    setForm((f) => ({ ...f, [name]: value }));
  }

  function handleTagKey(e) {
    if (e.key === "Enter") {
      e.preventDefault();
      const v = e.target.value.trim();
      if (!v) return;
      setForm((f) => ({ ...f, tags: Array.from(new Set([...(f.tags || []), v])) }));
      e.target.value = "";
    }
  }

  function removeTag(t) {
    setForm((f) => ({ ...f, tags: (f.tags || []).filter((x) => x !== t) }));
  }

  async function handleSave() {
    setSaving(true);
    setError(null);
    try {
      if (!form.name || form.name.trim().length < 2) throw new Error("Please provide a valid name.");
      if (!form.email || !form.email.includes("@")) throw new Error("Please provide a valid email.");
      await onSave({ ...form });
    } catch (err) {
      setError(err.message || "Failed to save");
    } finally {
      setSaving(false);
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white rounded-2xl shadow-2xl overflow-hidden max-w-4xl mx-auto"
    >
      {/* Header with gradient */}
      <div className="bg-gradient-to-r from-brown-700 via-amber-600 to-yellow-600 p-8 text-white">
        <h2 className="text-3xl font-bold mb-2">Profile Settings</h2>
        <p className="text-amber-100">Manage your personal information and preferences</p>
      </div>

      <div className="p-8">
        {/* Avatar Section */}
        <div className="flex flex-col md:flex-row gap-8 mb-8">
          <div className="flex flex-col items-center">
            <motion.div
              whileHover={{ scale: 1.05 }}
              className="w-32 h-32 rounded-full overflow-hidden bg-gradient-to-br from-amber-400 to-yellow-500 flex items-center justify-center shadow-lg"
            >
              {form.avatarUrl ? (
                <img src={form.avatarUrl} alt="avatar" className="w-full h-full object-cover" />
              ) : (
                <User className="w-16 h-16 text-white" />
              )}
            </motion.div>
            <p className="text-sm text-gray-500 mt-3">Profile Picture</p>
          </div>

          <div className="flex-1">
            <h3 className="text-2xl font-bold text-gray-800 mb-1">{form.name || "Unnamed User"}</h3>
            <p className="text-gray-500 mb-4">{form.email}</p>

            {/* Stats */}
            <div className="grid grid-cols-2 gap-4 mt-4">
              <div className="bg-amber-50 rounded-lg p-3">
                <p className="text-xs text-amber-700 font-semibold">Member Since</p>
                <p className="text-sm text-gray-700">2024</p>
              </div>
              <div className="bg-yellow-50 rounded-lg p-3">
                <p className="text-xs text-yellow-700 font-semibold">Last Updated</p>
                <p className="text-sm text-gray-700">Today</p>
              </div>
            </div>
          </div>
        </div>

        {/* Form Fields */}
        <div className="space-y-6">
          {/* Personal Info Section */}
          <div>
            <h4 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
              <User className="w-5 h-5 text-brown-700" />
              Personal Information
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="relative">
                <label className="block text-sm font-medium text-gray-700 mb-1">Full Name</label>
                <input
                  name="name"
                  value={form.name || ""}
                  onChange={handleChange}
                  placeholder="John Doe"
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent transition"
                  disabled={readOnly}
                />
              </div>

              <div className="relative">
                <label className="block text-sm font-medium text-gray-700 mb-1">Email Address</label>
                <input
                  name="email"
                  value={form.email || ""}
                  onChange={handleChange}
                  placeholder="john@example.com"
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg bg-gray-50 cursor-not-allowed"
                  disabled
                />
              </div>

              <div className="relative">
                <label className="block text-sm font-medium text-gray-700 mb-1">Phone Number</label>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    name="phone"
                    value={form.phone || ""}
                    onChange={handleChange}
                    placeholder="+1 234 567 8900"
                    className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition"
                    disabled={readOnly}
                  />
                </div>
              </div>

              <div className="relative">
                <label className="block text-sm font-medium text-gray-700 mb-1">Address</label>
                <div className="relative">
                  <MapPin className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    name="address"
                    value={form.address || ""}
                    onChange={handleChange}
                    placeholder="123 Main St, City"
                    className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition"
                    disabled={readOnly}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Avatar URL */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center gap-2">
              <Image className="w-5 h-5 text-indigo-600" />
              Avatar Image URL
            </label>
            <input
              name="avatarUrl"
              value={form.avatarUrl || ""}
              onChange={handleChange}
              placeholder="https://example.com/avatar.jpg"
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition"
              disabled={readOnly}
            />
          </div>

          {/* Bio */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Bio / About</label>
            <textarea
              name="bio"
              value={form.bio || ""}
              onChange={handleChange}
              placeholder="Tell us about yourself..."
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition resize-none h-32"
              disabled={readOnly}
            />
          </div>

          {/* Tags */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center gap-2">
              <Tag className="w-5 h-5 text-indigo-600" />
              Tags / Subjects
            </label>
            <div className="border border-gray-300 rounded-lg p-3 min-h-[60px] flex flex-wrap gap-2 items-center focus-within:ring-2 focus-within:ring-indigo-500 transition">
              {(form.tags || []).map((t) => (
                <motion.span
                  key={t}
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  className="bg-gradient-to-r from-indigo-500 to-purple-500 text-white px-3 py-1 rounded-full text-sm flex items-center gap-2 shadow-sm"
                >
                  {t}
                  {!readOnly && (
                    <button onClick={() => removeTag(t)} className="hover:bg-white/20 rounded-full p-0.5 transition">
                      <X className="w-3 h-3" />
                    </button>
                  )}
                </motion.span>
              ))}

              {!readOnly && (
                <input
                  placeholder="Type and press Enter"
                  className="flex-1 min-w-[150px] px-2 py-1 outline-none"
                  onKeyDown={handleTagKey}
                />
              )}
            </div>
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-4 p-4 bg-red-50 border border-red-200 text-red-700 rounded-lg"
          >
            {error}
          </motion.div>
        )}

        {/* Action Buttons */}
        <div className="mt-8 flex gap-3 justify-end">
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={onCancel}
            className="px-6 py-3 rounded-lg bg-gray-100 text-gray-700 font-medium hover:bg-gray-200 transition flex items-center gap-2"
            disabled={saving}
          >
            <X className="w-5 h-5" />
            Cancel
          </motion.button>
          {!readOnly && (
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={handleSave}
              className="px-6 py-3 rounded-lg bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-medium shadow-lg hover:shadow-xl transition flex items-center gap-2"
              disabled={saving}
            >
              <Save className="w-5 h-5" />
              {saving ? "Saving..." : "Save Profile"}
            </motion.button>
          )}
        </div>
      </div>
    </motion.div>
  );
}
