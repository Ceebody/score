import React, { useState, useEffect } from 'react';
import { db } from '../../utils/firebase';
import { ref, onValue, remove } from 'firebase/database';
import { Trash2, Calendar, BookOpen, User, School, FileText, Search, Filter } from 'lucide-react';

export default function AdminAssignments() {
    const [assignments, setAssignments] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [filterClass, setFilterClass] = useState('');
    const [filterSubject, setFilterSubject] = useState('');

    // Derived lists for filters
    const [classes, setClasses] = useState([]);
    const [subjects, setSubjects] = useState([]);
    const [expandedId, setExpandedId] = useState(null);

    useEffect(() => {
        const assignmentsRef = ref(db, 'assignments');
        onValue(assignmentsRef, (snapshot) => {
            const data = snapshot.val();
            const loadedAssignments = [];
            const classSet = new Set();
            // ... (rest of useEffect is same, skipping to keep context short in thought, but tool needs exact target match/replacement)
            const subjectSet = new Set();
            if (data) {
                Object.keys(data).forEach(key => {
                    loadedAssignments.push({
                        id: key,
                        ...data[key]
                    });
                    if (data[key].className) classSet.add(data[key].className);
                    if (data[key].subject) subjectSet.add(data[key].subject);
                });
            }
            // Sort by createdAt desc
            loadedAssignments.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
            setAssignments(loadedAssignments);
            setClasses(Array.from(classSet).sort());
            setSubjects(Array.from(subjectSet).sort());
            setLoading(false);
        });
    }, []);

    const toggleExpand = (id) => {
        setExpandedId(prev => (prev === id ? null : id));
    };

    const handleDelete = async (id, e) => {
        e.stopPropagation(); // Prevent expand when deleting
        if (window.confirm("Are you sure you want to delete this assignment? This action cannot be undone.")) {
            try {
                await remove(ref(db, `assignments/${id}`));
            } catch (error) {
                console.error("Error deleting assignment:", error);
            }
        }
    };


    const filteredAssignments = assignments.filter(a => {
        const matchesSearch = (a.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            a.teacherName?.toLowerCase().includes(searchTerm.toLowerCase()));
        const matchesClass = filterClass ? a.className === filterClass : true;
        const matchesSubject = filterSubject ? a.subject === filterSubject : true;
        return matchesSearch && matchesClass && matchesSubject;
    });

    if (loading) return <div className="p-8 text-center">Loading assignments...</div>;

    return (
        <div className="max-w-7xl mx-auto p-6 space-y-8">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                        <BookOpen className="h-8 w-8 text-indigo-600" />
                        All Assignments
                    </h1>
                    <p className="text-gray-600 mt-1">Monitor all assignments issued by teachers</p>
                </div>
                <div className="flex items-center gap-2 bg-indigo-50 px-4 py-2 rounded-lg text-indigo-700 font-medium">
                    <FileText className="h-5 w-5" />
                    <span>Total: {assignments.length}</span>
                </div>
            </div>

            {/* Filters */}
            <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex flex-col md:flex-row gap-4">
                <div className="flex-1 relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
                    <input
                        type="text"
                        placeholder="Search by title or teacher..."
                        className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                        value={searchTerm}
                        onChange={e => setSearchTerm(e.target.value)}
                    />
                </div>
                <div className="flex gap-4">
                    <div className="relative">
                        <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                        <select
                            className="pl-10 pr-8 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none appearance-none bg-white"
                            value={filterClass}
                            onChange={e => setFilterClass(e.target.value)}
                        >
                            <option value="">All Classes</option>
                            {classes.map(c => <option key={c} value={c}>{c}</option>)}
                        </select>
                    </div>
                    <div className="relative">
                        <BookOpen className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                        <select
                            className="pl-10 pr-8 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none appearance-none bg-white"
                            value={filterSubject}
                            onChange={e => setFilterSubject(e.target.value)}
                        >
                            <option value="">All Subjects</option>
                            {subjects.map(s => <option key={s} value={s}>{s}</option>)}
                        </select>
                    </div>
                    {(searchTerm || filterClass || filterSubject) && (
                        <button
                            onClick={() => { setSearchTerm(''); setFilterClass(''); setFilterSubject(''); }}
                            className="text-sm text-red-500 hover:text-red-700 font-medium whitespace-nowrap"
                        >
                            Clear Filters
                        </button>
                    )}
                </div>
            </div>

            <div className="grid grid-cols-1 gap-4">
                {filteredAssignments.length === 0 ? (
                    <div className="text-center py-12 text-gray-500">
                        No assignments found matching your filters.
                    </div>
                ) : (
                    filteredAssignments.map(assignment => (
                        <div
                            key={assignment.id}
                            onClick={() => toggleExpand(assignment.id)}
                            className={`bg-white p-5 rounded-xl shadow-sm border transition-all cursor-pointer ${expandedId === assignment.id ? 'border-indigo-500 ring-1 ring-indigo-500' : 'border-gray-100 hover:shadow-md'}`}
                        >
                            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                                <div className="flex-1">
                                    <div className="flex items-center gap-2 mb-1">
                                        <span className="px-2 py-0.5 bg-indigo-50 text-indigo-700 text-xs font-bold rounded uppercase tracking-wide">
                                            {assignment.subject}
                                        </span>
                                        <span className="text-gray-400 text-xs">•</span>
                                        <span className="flex items-center gap-1 text-xs text-gray-500">
                                            <School className="h-3 w-3" />
                                            {assignment.className}
                                        </span>
                                    </div>
                                    <h3 className="text-lg font-bold text-gray-800 mb-1">{assignment.title}</h3>
                                    <div className="flex items-center gap-4 text-sm text-gray-500">
                                        <div className="flex items-center gap-1.5">
                                            <User className="h-4 w-4 text-gray-400" />
                                            <span>{assignment.teacherName}</span>
                                        </div>
                                        <div className="flex items-center gap-1.5">
                                            <Calendar className="h-4 w-4 text-gray-400" />
                                            <span>Due: {new Date(assignment.dueDate).toLocaleDateString()}</span>
                                        </div>
                                    </div>
                                </div>

                                <div className="flex items-center gap-3 border-t md:border-t-0 md:border-l border-gray-100 pt-4 md:pt-0 md:pl-4">
                                    <button
                                        onClick={(e) => handleDelete(assignment.id, e)}
                                        className="p-2 text-gray-400 hover:text-white hover:bg-red-500 rounded-lg transition-colors"
                                        title="Delete Assignment"
                                    >
                                        <Trash2 className="h-5 w-5" />
                                    </button>
                                </div>
                            </div>

                            {/* Expanded Content */}
                            {expandedId === assignment.id && (
                                <div className="mt-4 pt-4 border-t border-gray-100 animate-in fade-in slide-in-from-top-1 duration-200">
                                    <p className="text-gray-700 whitespace-pre-wrap leading-relaxed">
                                        {assignment.description || <span className="text-gray-400 italic">No description provided.</span>}
                                    </p>
                                    {assignment.dueTime && (
                                        <p className="mt-2 text-sm text-orange-600 font-medium">
                                            Cut-off Time: {assignment.dueTime}
                                        </p>
                                    )}
                                </div>
                            )}
                        </div>
                    ))
                )}
            </div>
        </div>
    );
}
