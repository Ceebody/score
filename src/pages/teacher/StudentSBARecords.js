import React, { useEffect, useState } from "react";
import { db } from "../../utils/firebase";
import { ref, get } from "firebase/database";
import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, FileText } from "lucide-react";

export default function StudentSBARecords() {
    const { classId, studentId } = useParams();
    const navigate = useNavigate();

    const [student, setStudent] = useState(null);
    const [sbaData, setSbaData] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        async function fetchData() {
            try {
                // Fetch student info
                const studentSnap = await get(ref(db, `students/${classId}/${studentId}`));
                if (studentSnap.exists()) {
                    setStudent(studentSnap.val());
                }

                // Fetch all scores for this student across all subjects
                const scoresSnap = await get(ref(db, `scores/${classId}`));
                if (scoresSnap.exists()) {
                    const allScores = scoresSnap.val();
                    const records = [];

                    // Loop through each subject
                    Object.keys(allScores).forEach((subject) => {
                        const subjectScores = allScores[subject];
                        if (subjectScores[studentId]) {
                            const data = subjectScores[studentId];
                            records.push({
                                subject,
                                test1: Number(data.test1) || 0,
                                test2: Number(data.test2) || 0,
                                groupWork: Number(data.groupWork) || 0,
                                projectWork: Number(data.projectWork) || 0,
                                subtotal: Number(data.subtotal) || 0,
                                classScore50: Number(data.classScore50) || 0,
                                exam: Number(data.exam) || 0,
                                examHalf: Number(data.examHalf) || 0,
                            });
                        }
                    });

                    setSbaData(records);
                }

                setLoading(false);
            } catch (err) {
                console.error("Error fetching SBA records:", err);
                setLoading(false);
            }
        }

        fetchData();
    }, [classId, studentId]);

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-indigo-50 to-purple-100">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto mb-4"></div>
                    <p className="text-gray-600 font-medium">Loading SBA records...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50 p-4 md:p-8">
            <div className="max-w-7xl mx-auto">
                {/* Header */}
                <div className="bg-white rounded-2xl shadow-xl p-6 mb-6 border-t-4 border-indigo-600">
                    <button
                        onClick={() => navigate(-1)}
                        className="flex items-center gap-2 text-indigo-600 hover:text-indigo-800 mb-4 transition-colors"
                    >
                        <ArrowLeft className="h-4 w-4" />
                        <span className="text-sm font-medium">Back</span>
                    </button>

                    <div className="flex items-center gap-4">
                        <div className="p-3 bg-indigo-100 rounded-xl">
                            <FileText className="h-8 w-8 text-indigo-600" />
                        </div>
                        <div>
                            <h1 className="text-2xl md:text-3xl font-bold text-gray-800">SBA Records</h1>
                            {student && (
                                <p className="text-gray-600 mt-1">
                                    <span className="font-semibold">{student.firstName} {student.lastName}</span>
                                    <span className="mx-2">•</span>
                                    <span className="text-sm">Class: {classId.replace(/([a-zA-Z]+)(\d+)/, "$1 $2")}</span>
                                </p>
                            )}
                        </div>
                    </div>
                </div>

                {/* SBA Records Table */}
                {sbaData.length === 0 ? (
                    <div className="bg-white rounded-2xl shadow-lg p-8 text-center">
                        <div className="inline-block p-4 bg-gray-100 rounded-full mb-4">
                            <FileText className="h-12 w-12 text-gray-400" />
                        </div>
                        <h3 className="text-xl font-semibold text-gray-700 mb-2">No SBA Records Found</h3>
                        <p className="text-gray-500">This student doesn't have any SBA scores entered yet.</p>
                    </div>
                ) : (
                    <div className="bg-white rounded-2xl shadow-xl overflow-hidden">
                        <div className="overflow-x-auto">
                            <table className="w-full">
                                <thead>
                                    <tr className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white">
                                        <th className="px-4 py-4 text-left font-semibold">Subject</th>
                                        <th className="px-4 py-4 text-center font-semibold">Test 1<br /><span className="text-xs font-normal opacity-80">(20)</span></th>
                                        <th className="px-4 py-4 text-center font-semibold">Test 2<br /><span className="text-xs font-normal opacity-80">(20)</span></th>
                                        <th className="px-4 py-4 text-center font-semibold">Group Work<br /><span className="text-xs font-normal opacity-80">(10)</span></th>
                                        <th className="px-4 py-4 text-center font-semibold">Project Work<br /><span className="text-xs font-normal opacity-80">(10)</span></th>
                                        <th className="px-4 py-4 text-center font-semibold bg-indigo-700">Total<br /><span className="text-xs font-normal opacity-80">(60)</span></th>
                                        <th className="px-4 py-4 text-center font-semibold bg-purple-700">Total<br /><span className="text-xs font-normal opacity-80">(50)</span></th>
                                        <th className="px-4 py-4 text-center font-semibold bg-blue-700">Exam<br /><span className="text-xs font-normal opacity-80">(100)</span></th>
                                        <th className="px-4 py-4 text-center font-semibold bg-green-700">Exam<br /><span className="text-xs font-normal opacity-80">(50%)</span></th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {sbaData.map((record, index) => (
                                        <tr
                                            key={record.subject}
                                            className={`border-b border-gray-100 hover:bg-indigo-50 transition-colors ${index % 2 === 0 ? "bg-gray-50" : "bg-white"
                                                }`}
                                        >
                                            <td className="px-4 py-4 font-semibold text-gray-800">{record.subject}</td>
                                            <td className="px-4 py-4 text-center text-gray-700">{record.test1.toFixed(2)}</td>
                                            <td className="px-4 py-4 text-center text-gray-700">{record.test2.toFixed(2)}</td>
                                            <td className="px-4 py-4 text-center text-gray-700">{record.groupWork.toFixed(2)}</td>
                                            <td className="px-4 py-4 text-center text-gray-700">{record.projectWork.toFixed(2)}</td>
                                            <td className="px-4 py-4 text-center font-bold text-indigo-700 bg-indigo-50">
                                                {record.subtotal.toFixed(2)}
                                            </td>
                                            <td className="px-4 py-4 text-center font-bold text-purple-700 bg-purple-50">
                                                {record.classScore50.toFixed(2)}
                                            </td>
                                            <td className="px-4 py-4 text-center font-bold text-blue-700 bg-blue-50">
                                                {record.exam.toFixed(2)}
                                            </td>
                                            <td className="px-4 py-4 text-center font-bold text-green-700 bg-green-50">
                                                {record.examHalf.toFixed(2)}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                                <tfoot>
                                    <tr className="bg-gradient-to-r from-gray-100 to-gray-200 font-bold">
                                        <td className="px-4 py-4 text-gray-800">AVERAGE</td>
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
                                        <td className="px-4 py-4 text-center text-indigo-800 bg-indigo-100">
                                            {(sbaData.reduce((sum, r) => sum + r.subtotal, 0) / sbaData.length).toFixed(2)}
                                        </td>
                                        <td className="px-4 py-4 text-center text-purple-800 bg-purple-100">
                                            {(sbaData.reduce((sum, r) => sum + r.classScore50, 0) / sbaData.length).toFixed(2)}
                                        </td>
                                        <td className="px-4 py-4 text-center text-blue-800 bg-blue-100">
                                            {(sbaData.reduce((sum, r) => sum + r.exam, 0) / sbaData.length).toFixed(2)}
                                        </td>
                                        <td className="px-4 py-4 text-center text-green-800 bg-green-100">
                                            {(sbaData.reduce((sum, r) => sum + r.examHalf, 0) / sbaData.length).toFixed(2)}
                                        </td>
                                    </tr>
                                </tfoot>
                            </table>
                        </div>

                        {/* Summary Stats */}
                        <div className="bg-gradient-to-r from-indigo-50 to-purple-50 p-6 border-t border-gray-200">
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                                <div className="bg-white rounded-lg p-4 shadow-sm">
                                    <p className="text-sm text-gray-600 mb-1">Total Subjects</p>
                                    <p className="text-2xl font-bold text-indigo-600">{sbaData.length}</p>
                                </div>
                                <div className="bg-white rounded-lg p-4 shadow-sm">
                                    <p className="text-sm text-gray-600 mb-1">SBA Average (60)</p>
                                    <p className="text-2xl font-bold text-purple-600">
                                        {(sbaData.reduce((sum, r) => sum + r.subtotal, 0) / sbaData.length).toFixed(2)}
                                    </p>
                                </div>
                                <div className="bg-white rounded-lg p-4 shadow-sm">
                                    <p className="text-sm text-gray-600 mb-1">SBA Average (50)</p>
                                    <p className="text-2xl font-bold text-pink-600">
                                        {(sbaData.reduce((sum, r) => sum + r.classScore50, 0) / sbaData.length).toFixed(2)}
                                    </p>
                                </div>
                                <div className="bg-white rounded-lg p-4 shadow-sm">
                                    <p className="text-sm text-gray-600 mb-1">Exam Average (50%)</p>
                                    <p className="text-2xl font-bold text-green-600">
                                        {(sbaData.reduce((sum, r) => sum + r.examHalf, 0) / sbaData.length).toFixed(2)}
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
