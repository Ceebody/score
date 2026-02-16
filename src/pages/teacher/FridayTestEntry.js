import React, { useState, useEffect } from 'react';
import { db } from '../../utils/firebase';
import { ref, get, update, onValue } from 'firebase/database';
import { useAuth } from '../../context/AuthContext';
import { Save, Calendar, BookOpen, Users, AlertCircle, Download, Upload, FileSpreadsheet } from 'lucide-react';
import * as XLSX from 'xlsx';

export default function FridayTestEntry() {
    const { currentUser } = useAuth();
    const [loading, setLoading] = useState(true);
    const [termId, setTermId] = useState('');

    // Selections
    const [selectedWeek, setSelectedWeek] = useState('');
    const [selectedClass, setSelectedClass] = useState('');
    const [selectedSubject, setSelectedSubject] = useState('');

    // Data Lists
    const [teacherClasses, setTeacherClasses] = useState([]);
    const [teacherSubjects, setTeacherSubjects] = useState([]);
    const [students, setStudents] = useState([]);
    const [scores, setScores] = useState({}); // { studentId: score }

    // UI States
    const [saving, setSaving] = useState(false);
    const [fetchError, setFetchError] = useState('');

    const weeks = Array.from({ length: 15 }, (_, i) => i + 1);

    useEffect(() => {
        const init = async () => {
            try {
                // 1. Get Current Term
                const termSnap = await get(ref(db, 'terms/current'));
                if (termSnap.exists()) {
                    const termData = termSnap.val();
                    if (termData.id) {
                        setTermId(termData.id);
                    } else if (termData.name && termData.year) {
                        // Fallback: Generate ID from name and year
                        // e.g. "Term 2", "2025/26" -> "term_2_2025_26"
                        const safeName = termData.name.toLowerCase().replace(/\s+/g, '_');
                        const safeYear = termData.year.replace(/\//g, '_');
                        setTermId(`${safeName}_${safeYear}`);
                    } else {
                        setFetchError("Current term is missing ID/Name.");
                        setLoading(false);
                        return;
                    }
                } else {
                    setFetchError("No active term found.");
                    setLoading(false);
                    return;
                }

                // 2. Get Teacher Assignments
                const teacherRef = ref(db, `teachers/${currentUser.uid}`);
                const teacherSnap = await get(teacherRef);

                if (teacherSnap.exists()) {
                    const data = teacherSnap.val();

                    // Classes
                    const classesSet = new Set();

                    // 1. assignedClasses (handle both Array and Object structures)
                    if (data.assignedClasses) {
                        if (Array.isArray(data.assignedClasses)) {
                            data.assignedClasses.forEach(c => { if (c) classesSet.add(c); });
                        } else {
                            Object.keys(data.assignedClasses).forEach(c => classesSet.add(c));
                        }
                    }

                    // 2. Legacy 'class' field
                    if (data.class) classesSet.add(data.class);

                    // 3. New 'classTeacherFor' field
                    if (data.classTeacherFor) classesSet.add(data.classTeacherFor);

                    // Fetch details for all unique class IDs
                    const classesList = [];
                    for (const clsId of classesSet) {
                        const clsSnap = await get(ref(db, `classes/${clsId}`));
                        if (clsSnap.exists()) {
                            classesList.push({ id: clsId, name: clsSnap.val().name });
                        }
                    }
                    setTeacherClasses(classesList);

                    // Subjects
                    if (data.assignedSubjects) {
                        setTeacherSubjects(Object.keys(data.assignedSubjects));
                    }
                }
                setLoading(false);
            } catch (err) {
                console.error(err);
                setFetchError("Failed to load initial data.");
                setLoading(false);
            }
        };
        if (currentUser) init();
    }, [currentUser]);

    // Load Students & Existing Scores when selections change
    useEffect(() => {
        if (selectedWeek && selectedClass && selectedSubject && termId) {
            setLoading(true);
            // 1. Get Students (Real-time) - MOVED to onValue inside useEffect
            // 2. Get Existing Scores (Real-time) - MOVED to onValue inside useEffect

            setLoading(true);
            const studentsRef = ref(db, `students/${selectedClass}`);
            const scoresRef = ref(db, `friday_tests/${termId}/week_${selectedWeek}/${selectedClass}/${selectedSubject}`);

            const unsubStudents = onValue(studentsRef, (snapshot) => {
                if (snapshot.exists()) {
                    const sData = snapshot.val();
                    const sList = Object.keys(sData).map(key => ({
                        id: key,
                        ...sData[key]
                    })).sort((a, b) => (a.firstName || "").localeCompare(b.firstName || ""));
                    setStudents(sList);
                } else {
                    setStudents([]);
                }
                setLoading(false);
            });

            const unsubScores = onValue(scoresRef, (snapshot) => {
                if (snapshot.exists()) {
                    setScores(snapshot.val());
                } else {
                    setScores({});
                }
            });

            return () => {
                unsubStudents();
                unsubScores();
            };
        } else {
            setStudents([]);
            setScores({});
        }
    }, [selectedWeek, selectedClass, selectedSubject, termId]);

    const handleScoreChange = (studentId, value) => {
        // Validation: 0-100 numeric
        if (value === '' || (Number(value) >= 0 && Number(value) <= 20)) {
            setScores(prev => ({
                ...prev,
                [studentId]: value
            }));
        }
    };

    const handleDownloadTemplate = () => {
        if (!students.length) return;

        const templateData = students.map(s => ({
            'Student ID': s.id,
            'First Name': s.firstName || '',
            'Last Name': s.lastName || '',
            'Score': scores[s.id] || ''
        }));

        const ws = XLSX.utils.json_to_sheet(templateData);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Scores");

        // Set column widths
        ws['!cols'] = [
            { wch: 15 }, // ID
            { wch: 20 }, // First Name
            { wch: 20 }, // Last Name
            { wch: 10 }  // Score
        ];

        const fileName = `${selectedClass}_${selectedSubject}_Week${selectedWeek}.xlsx`;
        XLSX.writeFile(wb, fileName);
    };

    const handleImportExcel = (e) => {
        const file = e.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (evt) => {
            try {
                const bstr = evt.target.result;
                const wb = XLSX.read(bstr, { type: 'binary' });
                const wsname = wb.SheetNames[0];
                const ws = wb.Sheets[wsname];
                const data = XLSX.utils.sheet_to_json(ws);

                const newScores = { ...scores };
                let matchCount = 0;

                data.forEach(row => {
                    const studentId = row['Student ID'] || row['ID']; // Handle minor header variations
                    let scoreValue = row['Score'];

                    if (studentId && scoreValue !== undefined) {
                        // Find if this student is in our current list
                        const studentExists = students.find(s => s.id === studentId);
                        if (studentExists) {
                            // Validate score
                            const numScore = parseFloat(scoreValue);
                            if (!isNaN(numScore) && numScore >= 0 && numScore <= 20) {
                                newScores[studentId] = numScore;
                                matchCount++;
                            }
                        }
                    }
                });

                setScores(newScores);
                alert(`Successfully matched and imported scores for ${matchCount} students. Click 'Save Scores' to store them permanently.`);
            } catch (err) {
                console.error("Excel Import Error:", err);
                alert("Failed to process Excel file. Please ensure it follows the template format.");
            }
            // Reset input
            e.target.value = '';
        };
        reader.readAsBinaryString(file);
    };

    const handleSave = async () => {
        if (!selectedWeek || !selectedClass || !selectedSubject) return;
        setSaving(true);
        try {
            const path = `friday_tests/${termId}/week_${selectedWeek}/${selectedClass}/${selectedSubject}`;

            // Clean undefined/empty scores before saving
            const cleanScores = {};
            Object.keys(scores).forEach(key => {
                if (scores[key] !== '' && scores[key] !== undefined) {
                    cleanScores[key] = parseFloat(scores[key]); // Ensure number
                }
            });

            await update(ref(db), {
                [path]: cleanScores
            });
            alert("Scores saved successfully!");
        } catch (err) {
            console.error(err);
            alert("Failed to save scores.");
        } finally {
            setSaving(false);
        }
    };

    if (loading && !students.length) return <div className="p-8 text-center text-gray-500">Loading data...</div>;
    if (fetchError) return <div className="p-8 text-center text-red-500">{fetchError}</div>;

    return (
        <div className="max-w-5xl mx-auto p-4 md:p-6 space-y-6">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                        <Calendar className="h-7 w-7 text-indigo-600" />
                        Friday Test Entry
                    </h1>
                    <p className="text-gray-500">Enter weekly test scores for your classes.</p>
                </div>
                {students.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                        <button
                            onClick={handleDownloadTemplate}
                            className="flex items-center gap-2 bg-emerald-50 text-emerald-700 border border-emerald-200 px-4 py-2.5 rounded-lg font-medium hover:bg-emerald-100 transition-all shadow-sm"
                            title="Download Excel template with student list"
                        >
                            <Download className="h-4 w-4" />
                            Template
                        </button>

                        <div className="relative">
                            <input
                                type="file"
                                accept=".xlsx, .xls"
                                onChange={handleImportExcel}
                                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                                id="excel-upload"
                            />
                            <label
                                htmlFor="excel-upload"
                                className="flex items-center gap-2 bg-blue-50 text-blue-700 border border-blue-200 px-4 py-2.5 rounded-lg font-medium hover:bg-blue-100 transition-all cursor-pointer shadow-sm"
                            >
                                <Upload className="h-4 w-4" />
                                Import
                            </label>
                        </div>

                        <button
                            onClick={handleSave}
                            disabled={saving}
                            className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-2.5 rounded-lg font-medium shadow-sm transition-all disabled:opacity-50"
                        >
                            <Save className="h-5 w-5" />
                            {saving ? "Saving..." : "Save Scores"}
                        </button>
                    </div>
                )}
            </div>

            {/* Controls */}
            <div className="bg-white p-4 md:p-6 rounded-xl shadow-sm border border-gray-100 grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6">
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Select Week</label>
                    <div className="relative">
                        <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                        <select
                            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                            value={selectedWeek}
                            onChange={(e) => setSelectedWeek(e.target.value)}
                        >
                            <option value="">-- Week --</option>
                            {weeks.map(w => (
                                <option key={w} value={w}>Week {w}</option>
                            ))}
                        </select>
                    </div>
                </div>

                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Select Class</label>
                    <div className="relative">
                        <Users className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                        <select
                            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                            value={selectedClass}
                            onChange={(e) => setSelectedClass(e.target.value)}
                        >
                            <option value="">-- Class --</option>
                            {teacherClasses.map(c => (
                                <option key={c.id} value={c.id}>{c.name}</option>
                            ))}
                        </select>
                    </div>
                </div>

                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Select Subject</label>
                    <div className="relative">
                        <BookOpen className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                        <select
                            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                            value={selectedSubject}
                            onChange={(e) => setSelectedSubject(e.target.value)}
                        >
                            <option value="">-- Subject --</option>
                            {teacherSubjects.map(s => (
                                <option key={s} value={s}>{s}</option>
                            ))}
                        </select>
                    </div>
                </div>
            </div>

            {/* Score Entry Table */}
            {selectedWeek && selectedClass && selectedSubject ? (
                students.length > 0 ? (
                    <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                        <div className="bg-gray-50 px-6 py-4 border-b border-gray-200 flex justify-between items-center">
                            <h3 className="font-semibold text-gray-800">Student List</h3>
                            <span className="text-sm text-gray-500">{students.length} Students</span>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="w-full">
                                <thead className="bg-gray-50">
                                    <tr>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Student Name</th>
                                        <th className="px-4 md:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-32">Score / 20</th>
                                    </tr>
                                </thead>
                                <tbody className="bg-white divide-y divide-gray-200">
                                    {students.map((student) => (
                                        <tr key={student.id} className="hover:bg-gray-50">
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <div className="text-sm font-medium text-gray-900">
                                                    {student.firstName} {student.lastName}
                                                </div>
                                                <div className="text-xs text-gray-500">{student.id}</div>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <input
                                                    type="number"
                                                    min="0"
                                                    max="20"
                                                    className={`w-24 border rounded px-3 py-1.5 focus:ring-2 focus:ring-indigo-500 outline-none ${scores[student.id] ? 'border-indigo-300 bg-indigo-50 font-bold text-indigo-700' : 'border-gray-300'
                                                        }`}
                                                    value={scores[student.id] || ''}
                                                    onChange={(e) => handleScoreChange(student.id, e.target.value)}
                                                    placeholder="0-20"
                                                />
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                ) : (
                    <div className="text-center py-12 bg-white rounded-xl border border-gray-100">
                        <Users className="h-12 w-12 mx-auto text-gray-300 mb-2" />
                        <p className="text-gray-500">No students found in this class.</p>
                        <p className="text-xs text-gray-400 mt-2">Class ID: {selectedClass} | Term ID: {termId}</p>
                    </div>
                )
            ) : (
                <div className="text-center py-12 bg-white rounded-xl border border-dashed border-gray-300">
                    <AlertCircle className="h-10 w-10 mx-auto text-indigo-300 mb-2" />
                    <p className="text-gray-600 font-medium">Please select a Week, Class, and Subject to enter scores.</p>
                </div>
            )}
        </div>
    );
}
