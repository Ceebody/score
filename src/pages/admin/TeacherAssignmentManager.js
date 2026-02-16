import React, { useState, useEffect } from "react";
import { db } from "../../utils/firebase";
import { ref, onValue, update } from "firebase/database";
import BackButton from "../../components/BackButton";
import { Save, Check, User, BookOpen, School } from "lucide-react";

export default function TeacherAssignmentManager() {
    const [teachers, setTeachers] = useState([]);
    const [classes, setClasses] = useState([]);
    const [subjects, setSubjects] = useState([]);

    const [selectedTeacherId, setSelectedTeacherId] = useState("");
    const [editedClasses, setEditedClasses] = useState({}); // { classId: true/false }
    const [editedSubjects, setEditedSubjects] = useState({}); // { subjectId: true/false }
    const [classTeacherFor, setClassTeacherFor] = useState(""); // Class ID if class teacher

    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    // 1. Fetch Data
    useEffect(() => {
        const fetchData = async () => {
            // Teachers
            onValue(ref(db, "teachers"), (snap) => {
                if (snap.exists()) {
                    const data = snap.val();
                    const list = Object.keys(data).map((key) => ({
                        id: key,
                        ...data[key],
                    }));
                    list.sort((a, b) => (a.firstName || "").localeCompare(b.firstName || ""));
                    setTeachers(list);
                } else {
                    setTeachers([]);
                }
            });

            // Classes
            onValue(ref(db, "classes"), (snap) => {
                if (snap.exists()) {
                    const data = snap.val();
                    const list = Object.keys(data).map((key) => ({
                        id: key,
                        name: data[key].name || key,
                    }));
                    setClasses(list);
                }
            });

            // Subjects
            onValue(ref(db, "subjects"), (snap) => {
                if (snap.exists()) {
                    const data = snap.val();
                    const list = Object.keys(data).map((key) => ({
                        id: key,
                        name: key, // Subjects are often just keys or have names
                    }));
                    setSubjects(list);
                }
                setLoading(false);
            });
        };
        fetchData();
    }, []);

    // 2. Handle Teacher Selection
    useEffect(() => {
        if (selectedTeacherId) {
            const teacher = teachers.find(t => t.id === selectedTeacherId);
            if (teacher) {
                setEditedClasses(teacher.assignedClasses || {});
                setEditedSubjects(teacher.assignedSubjects || {});
                setClassTeacherFor(teacher.classTeacherFor || "");
            }
        } else {
            setEditedClasses({});
            setEditedSubjects({});
            setClassTeacherFor("");
        }
    }, [selectedTeacherId, teachers]);

    const toggleClass = (classId) => {
        setEditedClasses(prev => {
            const next = { ...prev };
            if (next[classId]) {
                delete next[classId];
            } else {
                next[classId] = true;
            }
            return next;
        });
    };

    const toggleSubject = (subjectId) => {
        setEditedSubjects(prev => {
            const next = { ...prev };
            if (next[subjectId]) {
                delete next[subjectId];
            } else {
                next[subjectId] = true;
            }
            return next;
        });
    };

    const handleSave = async () => {
        if (!selectedTeacherId) return;
        setSaving(true);
        try {
            await update(ref(db, `teachers/${selectedTeacherId}`), {
                assignedClasses: editedClasses,
                assignedSubjects: editedSubjects,
                classTeacherFor: classTeacherFor || null
            });
            alert("Assignments updated successfully!");
        } catch (err) {
            console.error("Error saving assignments:", err);
            alert("Failed to save assignments.");
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="min-h-screen bg-gray-50 p-6">
            <div className="max-w-6xl mx-auto bg-white rounded-xl shadow-lg p-6">
                <div className="mb-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="flex items-center gap-4">
                        <BackButton />
                        <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
                            <User className="h-6 w-6 text-blue-600" />
                            Teacher Assignments
                        </h1>
                    </div>

                    <select
                        value={selectedTeacherId}
                        onChange={(e) => setSelectedTeacherId(e.target.value)}
                        className="w-full md:w-1/3 border border-gray-300 rounded-lg p-3 focus:ring-2 focus:ring-blue-500 outline-none"
                    >
                        <option value="">-- Select a Teacher to Edit --</option>
                        {teachers.map((t) => (
                            <option key={t.id} value={t.id}>
                                {t.firstName} {t.lastName} ({t.email})
                            </option>
                        ))}
                    </select>
                </div>

                {loading && <p className="text-center py-8">Loading data...</p>}

                {!loading && !selectedTeacherId && (
                    <div className="text-center py-12 text-gray-500 bg-gray-50 rounded-lg border border-dashed border-gray-300">
                        <User className="h-12 w-12 mx-auto mb-3 text-gray-400" />
                        <p>Please select a teacher above to manage their classes and subjects.</p>
                    </div>
                )}

                {!loading && selectedTeacherId && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        {/* Classes Section */}
                        <div className="bg-blue-50 p-6 rounded-xl border border-blue-100">
                            <div className="flex items-center gap-2 mb-4 border-b border-blue-200 pb-2">
                                <School className="h-5 w-5 text-blue-700" />
                                <h2 className="text-lg font-bold text-blue-800">Assigned Classes</h2>
                            </div>
                            <div className="grid grid-cols-2 gap-3 max-h-96 overflow-y-auto pr-2">
                                {classes.map(cls => (
                                    <label key={cls.id} className="flex items-center space-x-3 p-3 bg-white rounded-lg border border-blue-100 hover:border-blue-300 cursor-pointer transition-colors shadow-sm">
                                        <div className={`w-5 h-5 rounded border flex items-center justify-center transition-colors ${editedClasses[cls.id] ? "bg-blue-600 border-blue-600" : "border-gray-300"}`}>
                                            {editedClasses[cls.id] && <Check className="h-3.5 w-3.5 text-white" />}
                                        </div>
                                        <input
                                            type="checkbox"
                                            checked={!!editedClasses[cls.id]}
                                            onChange={() => toggleClass(cls.id)}
                                            className="hidden"
                                        />
                                        <span className="text-gray-700 font-medium">{cls.name}</span>
                                    </label>
                                ))}
                            </div>
                        </div>

                        {/* Subjects Section */}
                        <div className="bg-amber-50 p-6 rounded-xl border border-amber-100">
                            <div className="flex items-center gap-2 mb-4 border-b border-amber-200 pb-2">
                                <BookOpen className="h-5 w-5 text-amber-700" />
                                <h2 className="text-lg font-bold text-amber-800">Assigned Subjects</h2>
                            </div>
                            <div className="grid grid-cols-2 gap-3 max-h-96 overflow-y-auto pr-2">
                                {subjects.map(sub => (
                                    <label key={sub.id} className="flex items-center space-x-3 p-3 bg-white rounded-lg border border-amber-100 hover:border-amber-300 cursor-pointer transition-colors shadow-sm">
                                        <div className={`w-5 h-5 rounded border flex items-center justify-center transition-colors ${editedSubjects[sub.id] ? "bg-amber-600 border-amber-600" : "border-gray-300"}`}>
                                            {editedSubjects[sub.id] && <Check className="h-3.5 w-3.5 text-white" />}
                                        </div>
                                        <input
                                            type="checkbox"
                                            checked={!!editedSubjects[sub.id]}
                                            onChange={() => toggleSubject(sub.id)}
                                            className="hidden"
                                        />
                                        <span className="text-gray-700 font-medium">{sub.name}</span>
                                    </label>
                                ))}
                            </div>
                        </div>

                        {/* Class Teacher Section */}
                        <div className="md:col-span-2 bg-purple-50 p-6 rounded-xl border border-purple-100">
                            <div className="flex items-center gap-2 mb-4 border-b border-purple-200 pb-2">
                                <User className="h-5 w-5 text-purple-700" />
                                <h2 className="text-lg font-bold text-purple-800">Class Teacher Assignment</h2>
                            </div>
                            <div className="flex flex-col md:flex-row items-center gap-4">
                                <label className="whitespace-nowrap font-medium text-gray-700">Assign as Class Teacher for:</label>
                                <select
                                    value={classTeacherFor}
                                    onChange={(e) => setClassTeacherFor(e.target.value)}
                                    className="w-full md:w-1/2 border border-purple-200 rounded-lg p-2 focus:ring-2 focus:ring-purple-500 outline-none"
                                >
                                    <option value="">-- Not a Class Teacher --</option>
                                    {classes.map(cls => (
                                        <option key={cls.id} value={cls.id}>
                                            {cls.name}
                                        </option>
                                    ))}
                                </select>
                                <p className="text-sm text-gray-500 italic">
                                    (This sets the primary class for this teacher)
                                </p>
                            </div>
                        </div>

                        {/* Save Button */}
                        <div className="md:col-span-2 pt-4 border-t border-gray-100 flex justify-end">
                            <button
                                onClick={handleSave}
                                disabled={saving}
                                className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-8 py-3 rounded-xl font-bold shadow-lg transform active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {saving ? (
                                    <>Processing...</>
                                ) : (
                                    <>
                                        <Save className="h-5 w-5" />
                                        Save Assignments
                                    </>
                                )}
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
