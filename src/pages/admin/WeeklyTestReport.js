import React, { useState, useEffect } from 'react';
import { db } from '../../utils/firebase';
import { ref, get } from 'firebase/database';
import { Calendar, Printer, School, Check, FileText } from 'lucide-react';

export default function WeeklyTestReport() {
    const [loading, setLoading] = useState(false);
    const [termId, setTermId] = useState('');
    const [selectedWeek, setSelectedWeek] = useState('');
    const [reportData, setReportData] = useState({}); // { classId: { studentId: { name, scores: { subject: score } } } }
    const [classes, setClasses] = useState({}); // { id: name }
    const [subjects, setSubjects] = useState([]);

    const weeks = Array.from({ length: 15 }, (_, i) => i + 1);

    useEffect(() => {
        // 1. Get Settings (Term, Classes, Subjects)
        const init = async () => {
            const termSnap = await get(ref(db, 'terms/current'));
            if (termSnap.exists()) {
                const termData = termSnap.val();
                if (termData.id) {
                    setTermId(termData.id);
                } else if (termData.name && termData.year) {
                    // Generate Same fallback ID as Teacher side
                    const safeName = termData.name.toLowerCase().replace(/\s+/g, '_');
                    const safeYear = termData.year.replace(/\//g, '_');
                    setTermId(`${safeName}_${safeYear}`);
                }
            }

            const classSnap = await get(ref(db, 'classes'));
            if (classSnap.exists()) {
                const cMap = {};
                classSnap.forEach(child => { cMap[child.key] = child.val().name; });
                setClasses(cMap);
            }

            const subjectSnap = await get(ref(db, 'subjects'));
            if (subjectSnap.exists()) {
                setSubjects(Object.keys(subjectSnap.val()).sort());
            }
        };
        init();
    }, []);

    useEffect(() => {
        if (!termId || !selectedWeek) {
            setReportData({});
            return;
        }

        const fetchReport = async () => {
            setLoading(true);
            try {
                // Structure: friday_tests/{term}/{week}/{class}/{subject}/{student} = score
                const weekRef = ref(db, `friday_tests/${termId}/week_${selectedWeek}`);
                const snapshot = await get(weekRef);

                if (snapshot.exists()) {
                    const data = snapshot.val(); // { classId: { subjectId: { studentId: score } } }
                    const formattedDetails = {};

                    // We need to fetch student names for all involved students
                    // To avoid N+1, we might fetch all students or just fetch as we go. 
                    // Let's assume we can fetch students per class encountered.

                    for (const classId in data) {
                        formattedDetails[classId] = {};

                        // Fetch students for this class
                        const stuSnap = await get(ref(db, `students/${classId}`));
                        const studentMap = stuSnap.exists() ? stuSnap.val() : {};

                        for (const subjectId in data[classId]) {
                            const studentScores = data[classId][subjectId];

                            for (const studentId in studentScores) {
                                if (!formattedDetails[classId][studentId]) {
                                    formattedDetails[classId][studentId] = {
                                        name: studentMap[studentId] ? `${studentMap[studentId].firstName} ${studentMap[studentId].lastName}` : 'Unknown Student',
                                        scores: {}
                                    };
                                }
                                formattedDetails[classId][studentId].scores[subjectId] = studentScores[studentId];
                            }
                        }
                    }
                    setReportData(formattedDetails);
                } else {
                    setReportData({});
                }
            } catch (error) {
                console.error("Error fetching report:", error);
            } finally {
                setLoading(false);
            }
        };

        fetchReport();
    }, [termId, selectedWeek]);

    const handlePrint = () => {
        window.print();
    };

    return (
        <div className="min-h-screen bg-gray-50 p-4 md:p-6 print:bg-white print:p-0">
            {/* Header - Hidden on Print */}
            <div className="max-w-7xl mx-auto mb-8 print:hidden flex flex-col md:flex-row justify-between items-center gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                        <FileText className="h-7 w-7 text-indigo-600" />
                        Weekly Test Report
                    </h1>
                    <p className="text-gray-500">View and print consolidated test scores for all classes.</p>
                </div>

                <div className="flex items-center gap-4 bg-white p-2 rounded-lg border border-gray-200 shadow-sm">
                    <div className="flex items-center gap-2">
                        <Calendar className="h-5 w-5 text-gray-400" />
                        <span className="text-sm font-medium text-gray-700">Week:</span>
                        <select
                            className="border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500 text-sm"
                            value={selectedWeek}
                            onChange={(e) => setSelectedWeek(e.target.value)}
                        >
                            <option value="">-- Select --</option>
                            {weeks.map(w => (
                                <option key={w} value={w}>Week {w}</option>
                            ))}
                        </select>
                    </div>
                </div>

                <button
                    onClick={handlePrint}
                    disabled={!selectedWeek || Object.keys(reportData).length === 0}
                    className="flex items-center gap-2 bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
                >
                    <Printer className="h-4 w-4" />
                    Print Report
                </button>
            </div>

            {/* Default State */}
            {!selectedWeek && (
                <div className="max-w-2xl mx-auto text-center py-20 text-gray-400 print:hidden">
                    <Calendar className="h-16 w-16 mx-auto mb-4 opacity-20" />
                    <h3 className="text-lg font-medium text-gray-600">Select a Week</h3>
                    <p>Choose a week number above to generate the report.</p>
                </div>
            )}

            {/* Report Content */}
            {selectedWeek && (
                <div className="max-w-7xl mx-auto print:max-w-none">
                    {/* Print Header */}
                    <div className="hidden print:block text-center mb-8 border-b-2 border-black pb-4">
                        <h1 className="text-3xl font-bold uppercase tracking-wider mb-2">Weekly Test Report</h1>
                        <p className="text-xl">Week {selectedWeek}</p>
                    </div>

                    {loading ? (
                        <div className="text-center py-12">Loading report data...</div>
                    ) : Object.keys(reportData).length === 0 ? (
                        <div className="text-center py-12 text-gray-500 bg-white rounded-xl border border-dashed print:border-none">
                            No data found for Week {selectedWeek}.
                            <p className="text-xs text-gray-400 mt-2 print:hidden whitespace-pre">Term ID: {termId || "Missing"}</p>
                        </div>
                    ) : (
                        <div className="space-y-8">
                            {Object.keys(reportData).sort().map(classId => {
                                // Only show subjects that have at least one score in this class
                                const activeSubjects = subjects.filter(subj =>
                                    Object.values(reportData[classId]).some(student => student.scores[subj] !== undefined)
                                );

                                if (activeSubjects.length === 0) return null;

                                return (
                                    <div key={classId} className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden print-card">
                                        <div className="bg-gray-50 px-6 py-3 border-b border-gray-200 print:bg-gray-100 print:border-black flex items-center gap-2">
                                            <School className="h-5 w-5 text-gray-600 print:hidden" />
                                            <h2 className="text-lg font-bold text-gray-800 uppercase">{classes[classId] || classId}</h2>
                                        </div>
                                        <div className="overflow-x-auto print:overflow-visible">
                                            <table className="w-full text-sm text-left">
                                                <thead className="bg-white text-gray-500 font-medium border-b border-gray-200 print:border-black">
                                                    <tr>
                                                        <th className="px-3 py-2 w-40 print:text-black">Student Name</th>
                                                        {activeSubjects.map(subj => (
                                                            <th key={subj} className="px-2 py-3 text-center w-20 border-l border-gray-100 print:border-gray-300 print:text-black">
                                                                {subj}
                                                            </th>
                                                        ))}
                                                    </tr>
                                                </thead>
                                                <tbody className="divide-y divide-gray-100 print:divide-gray-300">
                                                    {Object.values(reportData[classId])
                                                        .sort((a, b) => a.name.localeCompare(b.name))
                                                        .map((student, idx) => {
                                                            return (
                                                                <tr key={idx} className="hover:bg-gray-50 print:hover:bg-transparent">
                                                                    <td className="px-4 py-2 font-medium text-gray-900 border-r border-gray-100 print:border-gray-300">
                                                                        {student.name}
                                                                    </td>
                                                                    {activeSubjects.map(subj => (
                                                                        <td key={subj} className="px-2 py-2 text-center border-r border-gray-100 print:border-gray-300">
                                                                            {student.scores[subj] !== undefined ? (
                                                                                <span className={`
                                                                                    ${student.scores[subj] < 10 ? 'text-red-600 font-bold' : ''}
                                                                                    ${student.scores[subj] === 20 ? 'text-emerald-600 font-extrabold' : ''}
                                                                                `}>
                                                                                    {student.scores[subj]}
                                                                                    {student.scores[subj] === 20 && " ⭐"}
                                                                                </span>
                                                                            ) : (
                                                                                <span className="text-gray-300 print:text-transparent">-</span>
                                                                            )}
                                                                        </td>
                                                                    ))}
                                                                </tr>
                                                            );
                                                        })}
                                                </tbody>
                                            </table>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            )}

            {/* Print Styles */}
            <style>{`
                @media print {
                    @page { 
                        margin: 0.5cm; 
                        size: auto; 
                    }
                    
                    /* Force parent containers to expand for printing */
                    html, body, #root, [class*="min-h-screen"], main, .overflow-hidden, .overflow-y-auto {
                        height: auto !important;
                        overflow: visible !important;
                        position: static !important;
                        display: block !important;
                    }

                    /* Hide side nav and other UI elements if they leak through */
                    .md\\:block, aside, nav, button {
                        display: none !important;
                    }

                    body { 
                        -webkit-print-color-adjust: exact; 
                        background-color: white !important;
                    }

                    .print-card {
                        break-inside: avoid;
                        page-break-inside: avoid;
                        margin-bottom: 2rem;
                        border: 1px solid black !important;
                        border-radius: 0 !important;
                        box-shadow: none !important;
                    }

                    table {
                        width: 100% !important;
                        border-collapse: collapse !important;
                    }

                    th, td {
                        border: 1px solid #ddd !important;
                    }
                }
            `}</style>
        </div>
    );
}
