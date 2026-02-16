import React, { useEffect, useState } from "react";
import { db } from "../../utils/firebase";
import { ref, get } from "firebase/database";
import { FileText, Users } from "lucide-react";
import { useAuth } from "../../context/AuthContext";

export default function SBARecordsBySubject() {
    const { currentUser } = useAuth();
    const [assignedClasses, setAssignedClasses] = useState([]);
    const [selectedClass, setSelectedClass] = useState("");
    const [subjects, setSubjects] = useState([]);
    const [selectedSubject, setSelectedSubject] = useState("");
    const [sbaData, setSbaData] = useState([]);
    const [loading, setLoading] = useState(false);

    // Fetch teacher's assigned classes
    useEffect(() => {
        if (!currentUser) return;

        async function fetchClasses() {
            const teacherSnap = await get(ref(db, `teachers/${currentUser.uid}`));
            if (teacherSnap.exists()) {
                const teacherData = teacherSnap.val();

                let assignedKeys = [];
                if (Array.isArray(teacherData.assignedClasses)) {
                    assignedKeys = teacherData.assignedClasses.filter(Boolean);
                } else if (typeof teacherData.assignedClasses === "object") {
                    assignedKeys = Object.keys(teacherData.assignedClasses);
                }

                // Fetch class names
                const classesSnap = await get(ref(db, "classes"));
                if (classesSnap.exists()) {
                    const classData = classesSnap.val();
                    const classList = assignedKeys.map((key) => ({
                        classId: key,
                        className: classData[key]?.name || key,
                    }));
                    setAssignedClasses(classList);
                    if (classList.length > 0) setSelectedClass(classList[0].classId);
                }

                // Get subjects from teacher
                let subjectList = [];
                if (Array.isArray(teacherData.subjects)) {
                    subjectList = teacherData.subjects.filter(Boolean);
                } else if (typeof teacherData.subjects === "object") {
                    subjectList = Object.keys(teacherData.subjects);
                }
                if (Array.isArray(teacherData.assignedSubjects)) {
                    subjectList = [...subjectList, ...teacherData.assignedSubjects.filter(Boolean)];
                } else if (typeof teacherData.assignedSubjects === "object") {
                    subjectList = [...subjectList, ...Object.keys(teacherData.assignedSubjects)];
                }
                subjectList = [...new Set(subjectList)];
                setSubjects(subjectList);
                if (subjectList.length > 0) setSelectedSubject(subjectList[0]);
            }
        }

        fetchClasses();
    }, [currentUser]);

    // Fetch SBA data when class or subject changes
    useEffect(() => {
        if (!selectedClass || !selectedSubject) return;

        async function fetchSBAData() {
            setLoading(true);
            try {
                // Fetch all students in the class
                const studentsSnap = await get(ref(db, `students/${selectedClass}`));
                let records = [];

                if (studentsSnap.exists()) {
                    const students = studentsSnap.val();

                    // Fetch scores for the selected subject
                    const scoresSnap = await get(ref(db, `scores/${selectedClass}/${selectedSubject}`));
                    const scores = scoresSnap.exists() ? scoresSnap.val() : {};

                    Object.keys(students).forEach((studentId) => {
                        const student = students[studentId];
                        const score = scores[studentId] || {};

                        const classScore50 = Number(score.classScore50) || 0;
                        const examHalf = Number(score.examHalf) || 0;
                        const totalScore = classScore50 + examHalf;

                        records.push({
                            studentId,
                            studentName: `${student.firstName} ${student.lastName}`,
                            test1: Number(score.test1) || 0,
                            test2: Number(score.test2) || 0,
                            groupWork: Number(score.groupWork) || 0,
                            projectWork: Number(score.projectWork) || 0,
                            subtotal: Number(score.subtotal) || 0,
                            classScore50,
                            exam: Number(score.exam) || 0,
                            examHalf,
                            totalScore
                        });
                    });

                    // Calculate Positions
                    // Sort by total score descending to determine rank
                    const sortedByScore = [...records].sort((a, b) => b.totalScore - a.totalScore);

                    // Map studentId to position
                    const positionMap = {};
                    sortedByScore.forEach((record, index) => {
                        // Handle ties: if same score as previous, same rank
                        if (index > 0 && record.totalScore === sortedByScore[index - 1].totalScore) {
                            positionMap[record.studentId] = positionMap[sortedByScore[index - 1].studentId];
                        } else {
                            positionMap[record.studentId] = index + 1;
                        }
                    });

                    // Assign positions to records
                    records.forEach(record => {
                        record.position = positionMap[record.studentId];
                    });

                    // Sort alphabetically for display
                    records.sort((a, b) => a.studentName.localeCompare(b.studentName));
                }

                setSbaData(records);
                setLoading(false);
            } catch (err) {
                console.error("Error fetching SBA records:", err);
                setLoading(false);
            }
        }

        fetchSBAData();
    }, [selectedClass, selectedSubject]);

    // Helper to get ordinal suffix (1st, 2nd, 3rd)
    const getOrdinal = (n) => {
        const s = ["th", "st", "nd", "rd"];
        const v = n % 100;
        return n + (s[(v - 20) % 10] || s[v] || s[0]);
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-amber-50 p-4 md:p-8">
            <div className="max-w-7xl mx-auto">
                {/* Header */}
                <div className="bg-white rounded-2xl shadow-xl p-6 mb-6 border-t-4 border-stone-700">
                    <div className="flex items-center gap-4">
                        <div className="p-3 bg-stone-100 rounded-xl">
                            <FileText className="h-8 w-8 text-stone-700" />
                        </div>
                        <div>
                            <h1 className="text-2xl md:text-3xl font-bold text-gray-800">SBA Records by Subject</h1>
                            <p className="text-gray-600 mt-1 text-sm">View all student scores for a specific subject</p>
                        </div>
                    </div>

                    {/* Filters */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6">
                        <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-2">Select Class</label>
                            <select
                                value={selectedClass}
                                onChange={(e) => setSelectedClass(e.target.value)}
                                className="w-full bg-gray-50 border border-gray-200 text-gray-800 text-sm rounded-xl focus:ring-2 focus:ring-amber-500 focus:border-amber-500 block p-3 transition-shadow"
                            >
                                {assignedClasses.map((cls) => (
                                    <option key={cls.classId} value={cls.classId}>
                                        {cls.className}
                                    </option>
                                ))}
                            </select>
                        </div>

                        <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-2">Select Subject</label>
                            <select
                                value={selectedSubject}
                                onChange={(e) => setSelectedSubject(e.target.value)}
                                className="w-full bg-gray-50 border border-gray-200 text-gray-800 text-sm rounded-xl focus:ring-2 focus:ring-amber-500 focus:border-amber-500 block p-3 transition-shadow"
                            >
                                {subjects.map((subject) => (
                                    <option key={subject} value={subject}>
                                        {subject}
                                    </option>
                                ))}
                            </select>
                        </div>
                    </div>
                </div>

                {/* SBA Records Table */}
                {loading ? (
                    <div className="flex items-center justify-center bg-white rounded-2xl shadow-lg p-12">
                        <div className="text-center">
                            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-amber-600 mx-auto mb-4"></div>
                            <p className="text-gray-600 font-medium">Loading SBA records...</p>
                        </div>
                    </div>
                ) : sbaData.length === 0 ? (
                    <div className="bg-white rounded-2xl shadow-lg p-8 text-center">
                        <div className="inline-block p-4 bg-gray-100 rounded-full mb-4">
                            <Users className="h-12 w-12 text-gray-400" />
                        </div>
                        <h3 className="text-xl font-semibold text-gray-700 mb-2">No Records Found</h3>
                        <p className="text-gray-500">No students or scores found for this class and subject.</p>
                    </div>
                ) : (
                    <div className="bg-white rounded-2xl shadow-xl overflow-hidden">
                        <div className="overflow-x-auto">
                            <table className="w-full">
                                <thead>
                                    <tr className="bg-gradient-to-r from-stone-700 to-amber-600 text-white">
                                        <th className="px-4 py-4 text-left font-semibold">Student Name</th>
                                        <th className="px-4 py-4 text-center font-semibold">Test 1<br /><span className="text-xs font-normal opacity-80">(20)</span></th>
                                        <th className="px-4 py-4 text-center font-semibold">Test 2<br /><span className="text-xs font-normal opacity-80">(20)</span></th>
                                        <th className="px-4 py-4 text-center font-semibold">Group Work<br /><span className="text-xs font-normal opacity-80">(10)</span></th>
                                        <th className="px-4 py-4 text-center font-semibold">Project Work<br /><span className="text-xs font-normal opacity-80">(10)</span></th>
                                        <th className="px-4 py-4 text-center font-semibold bg-stone-800">Total<br /><span className="text-xs font-normal opacity-80">(60)</span></th>
                                        <th className="px-4 py-4 text-center font-semibold bg-stone-700">Total<br /><span className="text-xs font-normal opacity-80">(50)</span></th>
                                        <th className="px-4 py-4 text-center font-semibold bg-amber-700">Exam<br /><span className="text-xs font-normal opacity-80">(100)</span></th>
                                        <th className="px-4 py-4 text-center font-semibold bg-amber-600">Exam<br /><span className="text-xs font-normal opacity-80">(50%)</span></th>
                                        <th className="px-4 py-4 text-center font-semibold bg-gray-800">Total<br /><span className="text-xs font-normal opacity-80">(100%)</span></th>
                                        <th className="px-4 py-4 text-center font-semibold bg-gray-900">Pos.</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {sbaData.map((record, index) => (
                                        <tr
                                            key={record.studentId}
                                            className={`border-b border-gray-100 hover:bg-amber-50 transition-colors ${index % 2 === 0 ? "bg-gray-50" : "bg-white"
                                                }`}
                                        >
                                            <td className="px-4 py-4 font-semibold text-gray-800">{record.studentName}</td>
                                            <td className="px-4 py-4 text-center text-gray-700">{record.test1.toFixed(2)}</td>
                                            <td className="px-4 py-4 text-center text-gray-700">{record.test2.toFixed(2)}</td>
                                            <td className="px-4 py-4 text-center text-gray-700">{record.groupWork.toFixed(2)}</td>
                                            <td className="px-4 py-4 text-center text-gray-700">{record.projectWork.toFixed(2)}</td>
                                            <td className="px-4 py-4 text-center font-bold text-stone-700 bg-stone-50">
                                                {record.subtotal.toFixed(2)}
                                            </td>
                                            <td className="px-4 py-4 text-center font-bold text-stone-800 bg-stone-100">
                                                {record.classScore50.toFixed(2)}
                                            </td>
                                            <td className="px-4 py-4 text-center font-bold text-amber-700 bg-amber-50">
                                                {record.exam.toFixed(2)}
                                            </td>
                                            <td className="px-4 py-4 text-center font-bold text-amber-800 bg-amber-100">
                                                {record.examHalf.toFixed(2)}
                                            </td>
                                            <td className="px-4 py-4 text-center font-bold text-gray-800 bg-gray-100">
                                                {record.totalScore.toFixed(2)}
                                            </td>
                                            <td className="px-4 py-4 text-center font-bold text-white bg-gray-800 rounded-lg">
                                                {getOrdinal(record.position)}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                                <tfoot>
                                    <tr className="bg-gradient-to-r from-gray-100 to-gray-200 font-bold">
                                        <td className="px-4 py-4 text-gray-800">CLASS AVERAGE</td>
                                        <td className="px-4 py-4 text-center text-gray-700">
                                            {(sbaData.reduce((sum, r) => sum + r.test1, 0) / sbaData.length).toFixed(2)}
                                        </td>
                                        <td className="px-4 py-4 text-center text-gray-700">
                                            {(sbaData.reduce((sum, r) => sum + r.test2, 0) / sbaData.length).toFixed(2)}
                                        </td>
                                        <td className="px-4 py-4 text-center text-gray-700">
                                            {(sbaData.reduce((sum, r) => sum + r.groupWork, 0) / sbaData.length).toFixed(2)}
                                        </td>
                                        <td className="px-4 py-4 text-center text-gray-700">
                                            {(sbaData.reduce((sum, r) => sum + r.projectWork, 0) / sbaData.length).toFixed(2)}
                                        </td>
                                        <td className="px-4 py-4 text-center text-stone-700 bg-stone-50">
                                            {(sbaData.reduce((sum, r) => sum + r.subtotal, 0) / sbaData.length).toFixed(2)}
                                        </td>
                                        <td className="px-4 py-4 text-center text-stone-800 bg-stone-100">
                                            {(sbaData.reduce((sum, r) => sum + r.classScore50, 0) / sbaData.length).toFixed(2)}
                                        </td>
                                        <td className="px-4 py-4 text-center text-amber-700 bg-amber-50">
                                            {(sbaData.reduce((sum, r) => sum + r.exam, 0) / sbaData.length).toFixed(2)}
                                        </td>
                                        <td className="px-4 py-4 text-center text-amber-800 bg-amber-100">
                                            {(sbaData.reduce((sum, r) => sum + r.examHalf, 0) / sbaData.length).toFixed(2)}
                                        </td>
                                        <td className="px-4 py-4 text-center text-gray-800 bg-gray-100">
                                            {(sbaData.reduce((sum, r) => sum + r.totalScore, 0) / sbaData.length).toFixed(2)}
                                        </td>
                                        <td className="px-4 py-4"></td>
                                    </tr>
                                </tfoot>
                            </table>
                        </div>

                        {/* Summary Stats */}
                        <div className="bg-gradient-to-r from-brown-50 to-amber-50 p-6 border-t border-gray-200">
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                                <div className="bg-white rounded-lg p-4 shadow-sm">
                                    <p className="text-sm text-gray-600 mb-1">Total Students</p>
                                    <p className="text-2xl font-bold text-brown-700">{sbaData.length}</p>
                                </div>
                                <div className="bg-white rounded-lg p-4 shadow-sm">
                                    <p className="text-sm text-gray-600 mb-1">SBA Avg (50)</p>
                                    <p className="text-2xl font-bold text-brown-600">
                                        {(sbaData.reduce((sum, r) => sum + r.classScore50, 0) / sbaData.length).toFixed(2)}
                                    </p>
                                </div>
                                <div className="bg-white rounded-lg p-4 shadow-sm">
                                    <p className="text-sm text-gray-600 mb-1">Exam Avg (50%)</p>
                                    <p className="text-2xl font-bold text-amber-600">
                                        {(sbaData.reduce((sum, r) => sum + r.examHalf, 0) / sbaData.length).toFixed(2)}
                                    </p>
                                </div>
                                <div className="bg-white rounded-lg p-4 shadow-sm">
                                    <p className="text-sm text-gray-600 mb-1">Selected Subject</p>
                                    <p className="text-lg font-bold text-gray-800">{selectedSubject}</p>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
