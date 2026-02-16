import React, { useState, useEffect } from 'react';
import { db } from '../../utils/firebase';
import { ref, push, onValue, remove, get } from 'firebase/database';
import { useAuth } from '../../context/AuthContext';
import { Plus, Trash2, Calendar, BookOpen, AlertCircle, FileText, Download } from 'lucide-react';

export default function TeacherAssignments() {
    const { currentUser } = useAuth();
    const [assignments, setAssignments] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [teacherClasses, setTeacherClasses] = useState([]);
    const [teacherSubjects, setTeacherSubjects] = useState([]);

    const [formData, setFormData] = useState({
        title: '',
        description: '',
        classId: '',
        subject: '',
        dueDate: '',
        dueTime: ''
    });

    useEffect(() => {
        if (!currentUser) return;

        const fetchData = async () => {
            // 1. Get Teacher's assigned classes/subjects
            const teacherRef = ref(db, `teachers/${currentUser.uid}`);
            const teacherSnap = await get(teacherRef);

            if (teacherSnap.exists()) {
                const data = teacherSnap.val();
                if (data.assignedClasses) {
                    // Fetch class names
                    const classesList = [];
                    for (const clsId in data.assignedClasses) {
                        const clsSnap = await get(ref(db, `classes/${clsId}`));
                        if (clsSnap.exists()) {
                            classesList.push({ id: clsId, name: clsSnap.val().name });
                        }
                    }
                    setTeacherClasses(classesList);
                }
                if (data.assignedSubjects) {
                    setTeacherSubjects(Object.keys(data.assignedSubjects));
                }
            }

            // 2. Listen for assignments created by this teacher
            const assignmentsRef = ref(db, 'assignments');
            onValue(assignmentsRef, (snapshot) => {
                const data = snapshot.val();
                const loadedAssignments = [];
                if (data) {
                    Object.keys(data).forEach(key => {
                        if (data[key].teacherId === currentUser.uid) {
                            loadedAssignments.push({
                                id: key,
                                ...data[key]
                            });
                        }
                    });
                }
                // Sort by due date (nearest first)
                loadedAssignments.sort((a, b) => new Date(a.dueDate) - new Date(b.dueDate));
                setAssignments(loadedAssignments);
                setLoading(false);
            });
        };

        fetchData();
    }, [currentUser]);

    const handleClassesChange = (e) => {
        setFormData({ ...formData, classId: e.target.value });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!formData.title || !formData.classId || !formData.subject || !formData.dueDate) {
            alert("Please fill in all required fields.");
            return;
        }

        try {
            const assignmentRef = ref(db, 'assignments');
            await push(assignmentRef, {
                teacherId: currentUser.uid,
                teacherName: currentUser.displayName || currentUser.email, // Fallback
                classId: formData.classId,
                className: teacherClasses.find(c => c.id === formData.classId)?.name || "Unknown Class",
                subject: formData.subject,
                title: formData.title,
                description: formData.description,
                dueDate: formData.dueDate, // ISO string or date string
                dueTime: formData.dueTime,
                createdAt: new Date().toISOString(),
                status: 'active'
            });

            setShowModal(false);
            setFormData({
                title: '',
                description: '',
                classId: '',
                subject: '',
                dueDate: '',
                dueTime: ''
            });
            alert("Assignment created successfully!");
        } catch (error) {
            console.error("Error creating assignment:", error);
            alert("Failed to create assignment.");
        }
    };

    const handleDelete = async (id) => {
        if (window.confirm("Are you sure you want to delete this assignment?")) {
            try {
                await remove(ref(db, `assignments/${id}`));
            } catch (error) {
                console.error("Error deleting assignment:", error);
            }
        }
    };

    if (loading) return <div className="p-8 text-center">Loading assignments...</div>;

    return (
        <div className="max-w-6xl mx-auto p-6 space-y-8">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-bold text-indigo-900 flex items-center gap-2">
                        <BookOpen className="h-8 w-8 text-indigo-600" />
                        My Assignments
                    </h1>
                    <p className="text-gray-600 mt-1">Manage homework and assignments for your classes</p>
                </div>
                <button
                    onClick={() => setShowModal(true)}
                    className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 shadow-sm transition-all"
                >
                    <Plus className="h-5 w-5" />
                    New Assignment
                </button>
            </div>

            {assignments.length === 0 ? (
                <div className="text-center py-16 bg-white rounded-xl shadow-sm border border-gray-100">
                    <div className="bg-indigo-50 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                        <FileText className="h-8 w-8 text-indigo-400" />
                    </div>
                    <h3 className="text-lg font-medium text-gray-900">No assignments yet</h3>
                    <p className="text-gray-500 mt-1">Create your first assignment to get started.</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {assignments.map(assignment => (
                        <div key={assignment.id} className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 hover:shadow-md transition-shadow relative group">

                            <div className="flex justify-between items-start mb-4">
                                <div>
                                    <span className="inline-block px-2 py-1 bg-indigo-100 text-indigo-700 text-xs font-semibold rounded mb-2">
                                        {assignment.subject}
                                    </span>
                                    <h3 className="text-lg font-bold text-gray-800">{assignment.title}</h3>
                                    <p className="text-sm text-gray-500 font-medium">{assignment.className}</p>
                                </div>
                                <button
                                    onClick={() => handleDelete(assignment.id)}
                                    className="p-2 text-gray-400 hover:text-red-500 rounded-full hover:bg-red-50 transition-colors"
                                    title="Delete Allocation"
                                >
                                    <Trash2 className="h-5 w-5" />
                                </button>
                            </div>

                            <div className="space-y-3 mb-6">
                                <p className="text-gray-600 text-sm line-clamp-3">
                                    {assignment.description || "No description provided."}
                                </p>
                            </div>

                            <div className="flex items-center gap-4 text-sm text-gray-500 pt-4 border-t border-gray-100">
                                <div className="flex items-center gap-1.5">
                                    <Calendar className="h-4 w-4 text-indigo-400" />
                                    <span>Due: {new Date(assignment.dueDate).toLocaleDateString()}</span>
                                </div>
                                {assignment.dueTime && (
                                    <div className="flex items-center gap-1.5">
                                        <AlertCircle className="h-4 w-4 text-orange-400" />
                                        <span>{assignment.dueTime}</span>
                                    </div>
                                )}
                            </div>

                        </div>
                    ))}
                </div>
            )}

            {/* Modal */}
            {showModal && (
                <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl max-h-[90vh] overflow-y-auto">
                        <div className="p-6 border-b border-gray-100 flex justify-between items-center">
                            <h2 className="text-xl font-bold text-gray-800">Create New Assignment</h2>
                            <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-gray-600">
                                <Plus className="h-6 w-6 transform rotate-45" />
                            </button>
                        </div>

                        <form onSubmit={handleSubmit} className="p-6 space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Title</label>
                                <input
                                    type="text"
                                    required
                                    className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-indigo-500 outline-none"
                                    placeholder="e.g. Chapter 4 Review"
                                    value={formData.title}
                                    onChange={e => setFormData({ ...formData, title: e.target.value })}
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Class</label>
                                    <select
                                        required
                                        className="w-full border border-gray-300 rounded-lg px-4 py-2 outline-none"
                                        value={formData.classId}
                                        onChange={handleClassesChange}
                                    >
                                        <option value="">Select Class</option>
                                        {teacherClasses.map(c => (
                                            <option key={c.id} value={c.id}>{c.name}</option>
                                        ))}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Subject</label>
                                    <select
                                        required
                                        className="w-full border border-gray-300 rounded-lg px-4 py-2 outline-none"
                                        value={formData.subject}
                                        onChange={e => setFormData({ ...formData, subject: e.target.value })}
                                    >
                                        <option value="">Select Subject</option>
                                        {teacherSubjects.map(s => (
                                            <option key={s} value={s}>{s}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Description / Content</label>
                                <textarea
                                    className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-indigo-500 outline-none"
                                    rows="4"
                                    placeholder="Instructions for students..."
                                    value={formData.description}
                                    onChange={e => setFormData({ ...formData, description: e.target.value })}
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Due Date</label>
                                    <input
                                        type="date"
                                        required
                                        className="w-full border border-gray-300 rounded-lg px-4 py-2 outline-none"
                                        value={formData.dueDate}
                                        onChange={e => setFormData({ ...formData, dueDate: e.target.value })}
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Due Time (Optional)</label>
                                    <input
                                        type="time"
                                        className="w-full border border-gray-300 rounded-lg px-4 py-2 outline-none"
                                        value={formData.dueTime}
                                        onChange={e => setFormData({ ...formData, dueTime: e.target.value })}
                                    />
                                </div>
                            </div>

                            <div className="pt-4 flex justify-end gap-3">
                                <button
                                    type="button"
                                    onClick={() => setShowModal(false)}
                                    className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    className="px-6 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-medium shadow-sm"
                                >
                                    Create Assignment
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
