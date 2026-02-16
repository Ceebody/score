import React, { useState, useEffect } from "react";
import { db } from "../../utils/firebase";
import { ref, onValue, update, off } from "firebase/database";
import BackButton from "../../components/BackButton";
import { useAuth } from "../../context/AuthContext";

export default function TeacherCommentManager() {
    const { currentUser } = useAuth();
    const [classes, setClasses] = useState([]);
    const [selectedClassId, setSelectedClassId] = useState("");
    const [students, setStudents] = useState([]);
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);
    // Local state to track edits: { [studentId]: "new comment" }
    const [edits, setEdits] = useState({});

    // 1. Fetch Assigned Classes on mount
    useEffect(() => {
        if (!currentUser) return;

        const teacherRef = ref(db, `teachers/${currentUser.uid}`);
        const classesRef = ref(db, "classes");

        let classesCallback = null;

        const teacherCallback = (teacherSnap) => {
            if (teacherSnap.exists()) {
                const teacherData = teacherSnap.val();
                let assignedKeys = [];

                if (Array.isArray(teacherData.assignedClasses)) {
                    assignedKeys = teacherData.assignedClasses.filter(Boolean);
                } else if (typeof teacherData.assignedClasses === "object") {
                    assignedKeys = Object.keys(teacherData.assignedClasses);
                }

                if (classesCallback) off(classesRef, "value", classesCallback);

                classesCallback = (classSnap) => {
                    if (classSnap.exists()) {
                        const classData = classSnap.val();
                        const teacherClasses = assignedKeys.map((key) => ({
                            id: key,
                            name: classData[key]?.name || key,
                        }));
                        setClasses(teacherClasses);

                        // Auto-select first class if none selected
                        if (teacherClasses.length > 0 && !selectedClassId) {
                            setSelectedClassId(teacherClasses[0].id);
                        }
                    } else {
                        setClasses([]);
                    }
                };
                onValue(classesRef, classesCallback);
            } else {
                setClasses([]);
            }
        };

        onValue(teacherRef, teacherCallback);

        return () => {
            off(teacherRef, "value", teacherCallback);
            if (classesCallback) off(classesRef, "value", classesCallback);
        };
    }, [currentUser]); // Removed selectedClassId from dependency to avoid loop

    // 2. Fetch Students when a class is selected
    useEffect(() => {
        if (!selectedClassId) {
            setStudents([]);
            setEdits({});
            return;
        }

        setLoading(true);
        const studentsRef = ref(db, `students/${selectedClassId}`);
        const unsub = onValue(studentsRef, (snapshot) => {
            if (snapshot.exists()) {
                const data = snapshot.val();
                const list = Object.keys(data).map((key) => ({
                    id: key,
                    ...data[key],
                    // Ensure nested records exist for safe access
                    records: data[key].records || {},
                }));
                // Sort by name for easier finding
                list.sort((a, b) => (a.firstName || "").localeCompare(b.firstName || ""));
                setStudents(list);
            } else {
                setStudents([]);
            }
            setLoading(false);
        });

        return () => unsub();
    }, [selectedClassId]);

    const handleCommentChange = (studentId, value) => {
        setEdits((prev) => ({
            ...prev,
            [studentId]: value,
        }));
    };

    const handleSave = async (studentId) => {
        // If no edit in state, nothing to save (or maybe explicit save of current val?)
        // We'll check if it exists in 'edits'
        if (edits[studentId] === undefined) return;

        setSaving(true);
        try {
            const updates = {};
            // Update the specific field
            updates[`students/${selectedClassId}/${studentId}/records/teacherComment`] = edits[studentId];

            await update(ref(db), updates);

            // Clear edit state for this item so it falls back to showing 'records.teacherComment' from DB (which will update via onValue)
            setEdits((prev) => {
                const next = { ...prev };
                delete next[studentId];
                return next;
            });

            // Optional: tiny toast/feedback could go here, but UI might be enough
        } catch (err) {
            console.error("Error saving comment:", err);
            alert("Failed to save comment.");
        } finally {
            setSaving(false);
        }
    };

    const handleSaveAll = async () => {
        const studentIds = Object.keys(edits);
        if (studentIds.length === 0) return;

        setSaving(true);
        try {
            const updates = {};
            studentIds.forEach(studentId => {
                updates[`students/${selectedClassId}/${studentId}/records/teacherComment`] = edits[studentId];
            });
            await update(ref(db), updates);

            setEdits({});
            alert("All comments saved successfully!");

        } catch (err) {
            console.error("Error saving all comments:", err);
            alert("Failed to save some comments.");
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="min-h-screen bg-gray-50 p-6">
            <div className="max-w-6xl mx-auto bg-white rounded-xl shadow-lg p-6">
                <div className="mb-6 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <BackButton />
                        <h1 className="text-2xl font-bold text-gray-800">Teacher Comment Manager</h1>
                    </div>
                    {Object.keys(edits).length > 0 && (
                        <button
                            onClick={handleSaveAll}
                            disabled={saving}
                            className="bg-green-600 text-white px-4 py-2 rounded shadow hover:bg-green-700 transition"
                        >
                            {saving ? "Saving All..." : `Save All (${Object.keys(edits).length})`}
                        </button>
                    )}
                </div>

                {/* Class Selector */}
                <div className="mb-8">
                    <label className="block text-sm font-medium text-gray-700 mb-2">Select Class</label>
                    <select
                        value={selectedClassId}
                        onChange={(e) => setSelectedClassId(e.target.value)}
                        className="w-full md:w-1/3 border border-gray-300 rounded-lg p-3 focus:ring-2 focus:ring-blue-500 outline-none"
                    >
                        <option value="">-- Choose a Class --</option>
                        {classes.map((cls) => (
                            <option key={cls.id} value={cls.id}>
                                {cls.name}
                            </option>
                        ))}
                    </select>
                </div>

                {/* Loading State */}
                {loading && <p className="text-center text-gray-500 py-8">Loading students...</p>}

                {/* Empty State */}
                {!loading && selectedClassId && students.length === 0 && (
                    <p className="text-center text-gray-500 py-8">No students found in this class.</p>
                )}
                {!loading && !selectedClassId && (
                    <p className="text-center text-gray-500 py-8">Please select a class to view students.</p>
                )}

                {/* Students Table */}
                {!loading && students.length > 0 && (
                    <div className="overflow-x-auto">
                        <table className="w-full border-collapse">
                            <thead>
                                <tr className="bg-gray-100 text-left">
                                    <th className="p-4 border-b font-semibold text-gray-700 w-1/4">Student Name</th>
                                    <th className="p-4 border-b font-semibold text-gray-700 w-1/4">ID</th>
                                    <th className="p-4 border-b font-semibold text-gray-700 w-1/2">Teacher's Comment</th>
                                    <th className="p-4 border-b font-semibold text-gray-700 w-24">Action</th>
                                </tr>
                            </thead>
                            <tbody>
                                {students.map((student) => {
                                    // Value to display: local edit if exists, otherwise DB value
                                    const currentVal = edits[student.id] !== undefined
                                        ? edits[student.id]
                                        : (student.records.teacherComment || "");

                                    const isEdited = edits[student.id] !== undefined && edits[student.id] !== (student.records.teacherComment || "");

                                    return (
                                        <tr key={student.id} className="hover:bg-gray-50 border-b last:border-0">
                                            <td className="p-4 align-top text-gray-900 font-medium">
                                                {student.firstName} {student.lastName}
                                            </td>
                                            <td className="p-4 align-top text-gray-600 font-mono text-sm">
                                                {student.studentId}
                                            </td>
                                            <td className="p-4">
                                                <textarea
                                                    value={currentVal}
                                                    onChange={(e) => handleCommentChange(student.id, e.target.value)}
                                                    className={`w-full border rounded-lg p-2 text-sm focus:ring-2 outline-none transition-colors ${isEdited ? "border-blue-400 ring-1 ring-blue-100" : "border-gray-300 focus:ring-blue-500"
                                                        }`}
                                                    rows={2}
                                                    placeholder="No comment entered yet..."
                                                />
                                            </td>
                                            <td className="p-4 align-top">
                                                {isEdited && (
                                                    <button
                                                        onClick={() => handleSave(student.id)}
                                                        disabled={saving}
                                                        className="bg-blue-600 text-white px-3 py-1.5 rounded text-sm hover:bg-blue-700 transition shadow-sm w-full"
                                                    >
                                                        {saving ? "Saving..." : "Save"}
                                                    </button>
                                                )}
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
    );
}
