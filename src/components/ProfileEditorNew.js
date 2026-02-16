import React, { useState, useEffect } from "react";

export default function ProfileEditor({ initialData = {}, onSave, onCancel, readOnly = false }) {
  const [form, setForm] = useState({});
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [successMessage, setSuccessMessage] = useState("");

  useEffect(() => {
    setForm({
      // Personal Information
      registrationNumber: "",
      title: "",
      firstName: "",
      middleName: "",
      surname: "",
      gender: "",
      dateOfBirth: "",
      placeOfBirth: "",
      hometown: "",
      
      // Academic Information
      programme: "",
      currentMajor: "",
      level: "",
      hall: "",
      studyCentre: "",
      roomNumber: "",
      
      // Contact Information
      institutionalEmail: "",
      personalEmail: "",
      cellphone: "",
      homePhone: "",
      
      ...initialData,
    });
  }, [initialData]);

  function handleChange(e) {
    const { name, value } = e.target;
    setForm((f) => ({ ...f, [name]: value }));
  }

  async function handleSave() {
    setSaving(true);
    setError(null);
    try {
      // basic validation
      if (!form.firstName) throw new Error("First name is required");
      if (!form.surname) throw new Error("Surname is required");
      if (!form.personalEmail || !form.personalEmail.includes("@")) 
        throw new Error("Please provide a valid personal email");

      await onSave({ ...form });
      setSuccessMessage("Your details have been updated successfully.");
      setTimeout(() => setSuccessMessage(""), 5000); // Clear after 5 seconds
    } catch (err) {
      setError(err.message || "Failed to save");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="max-w-4xl mx-auto p-6">
      {/* Success Message */}
      {successMessage && (
        <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg flex items-center">
          <svg className="w-5 h-5 text-green-500 mr-2" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
          </svg>
          <span className="text-green-700">{successMessage}</span>
        </div>
      )}

      {/* Error Message */}
      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-red-600">{error}</p>
        </div>
      )}

      {/* Personal Information Section */}
      <section className="mb-8">
        <h2 className="flex items-center text-blue-900 text-lg font-semibold mb-4">
          <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
          </svg>
          Personal Information
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">Registration Number</label>
            <input
              type="text"
              name="registrationNumber"
              value={form.registrationNumber || ""}
              onChange={handleChange}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
              disabled={true}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Title</label>
            <input
              type="text"
              name="title"
              value={form.title || ""}
              onChange={handleChange}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
              disabled={readOnly}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">First Name</label>
            <input
              type="text"
              name="firstName"
              value={form.firstName || ""}
              onChange={handleChange}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
              disabled={readOnly}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Middle Name</label>
            <input
              type="text"
              name="middleName"
              value={form.middleName || ""}
              onChange={handleChange}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
              disabled={readOnly}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Surname</label>
            <input
              type="text"
              name="surname"
              value={form.surname || ""}
              onChange={handleChange}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
              disabled={readOnly}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Gender</label>
            <select
              name="gender"
              value={form.gender || ""}
              onChange={handleChange}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
              disabled={readOnly}
            >
              <option value="">Select Gender</option>
              <option value="M">Male</option>
              <option value="F">Female</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Date of Birth</label>
            <input
              type="date"
              name="dateOfBirth"
              value={form.dateOfBirth || ""}
              onChange={handleChange}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
              disabled={readOnly}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Place of Birth</label>
            <input
              type="text"
              name="placeOfBirth"
              value={form.placeOfBirth || ""}
              onChange={handleChange}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
              disabled={readOnly}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Hometown</label>
            <input
              type="text"
              name="hometown"
              value={form.hometown || ""}
              onChange={handleChange}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
              disabled={readOnly}
            />
          </div>
        </div>
      </section>

      {/* Academic Information Section */}
      <section className="mb-8">
        <h2 className="flex items-center text-blue-900 text-lg font-semibold mb-4">
          <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
          </svg>
          Academic Information
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">Programme</label>
            <input
              type="text"
              name="programme"
              value={form.programme || ""}
              onChange={handleChange}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
              disabled={true}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Current Major</label>
            <input
              type="text"
              name="currentMajor"
              value={form.currentMajor || ""}
              onChange={handleChange}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
              disabled={readOnly}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Level</label>
            <input
              type="text"
              name="level"
              value={form.level || ""}
              onChange={handleChange}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
              disabled={true}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Hall</label>
            <input
              type="text"
              name="hall"
              value={form.hall || ""}
              onChange={handleChange}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
              disabled={readOnly}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Study Centre</label>
            <input
              type="text"
              name="studyCentre"
              value={form.studyCentre || ""}
              onChange={handleChange}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
              disabled={readOnly}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Room No. (Hall Residents Only)</label>
            <input
              type="text"
              name="roomNumber"
              value={form.roomNumber || ""}
              onChange={handleChange}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
              disabled={readOnly}
            />
          </div>
        </div>
      </section>

      {/* Contact Information Section */}
      <section className="mb-8">
        <h2 className="flex items-center text-blue-900 text-lg font-semibold mb-4">
          <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
          </svg>
          Contact Information
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">Institutional Email</label>
            <input
              type="email"
              name="institutionalEmail"
              value={form.institutionalEmail || ""}
              onChange={handleChange}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
              disabled={true}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 after:content-['*'] after:ml-0.5 after:text-red-500">Personal Email</label>
            <input
              type="email"
              name="personalEmail"
              value={form.personalEmail || ""}
              onChange={handleChange}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
              disabled={readOnly}
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 after:content-['*'] after:ml-0.5 after:text-red-500">Cellphone</label>
            <input
              type="tel"
              name="cellphone"
              value={form.cellphone || ""}
              onChange={handleChange}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
              disabled={readOnly}
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 after:content-['*'] after:ml-0.5 after:text-red-500">Home Phone</label>
            <input
              type="tel"
              name="homePhone"
              value={form.homePhone || ""}
              onChange={handleChange}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
              disabled={readOnly}
              required
            />
          </div>
        </div>
      </section>

      {/* Action Buttons */}
      {!readOnly && (
        <div className="flex justify-end space-x-4">
          {onCancel && (
            <button
              type="button"
              onClick={onCancel}
              className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              disabled={saving}
            >
              Cancel
            </button>
          )}
          <button
            type="button"
            onClick={handleSave}
            className="px-4 py-2 border border-transparent rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            disabled={saving}
          >
            {saving ? "Saving..." : "Save Changes"}
          </button>
        </div>
      )}
    </div>
  );
}