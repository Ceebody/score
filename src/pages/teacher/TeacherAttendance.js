import React, { useEffect, useState } from "react";
import { getDatabase, ref, onValue, update, get } from "firebase/database";
import { useAuth } from "../../context/AuthContext";
import SideNav from "../../components/SideNav";
import AttendanceTable from "../../components/AttendanceTable";
import { FaCalendarCheck } from "react-icons/fa";

export default function TeacherAttendance() {
    const { currentUser } = useAuth();
    const [students, setStudents] = useState([]);
    const [attendanceData, setAttendanceData] = useState({});
    const [loading, setLoading] = useState(true);
    const [assignedClasses, setAssignedClasses] = useState([]);
    const [selectedClassId, setSelectedClassId] = useState("");
    const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);

    const [pendingChanges, setPendingChanges] = useState({});
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        if (!currentUser) return;
        const db = getDatabase();

        // Get teacher's assigned classes from teachers node
        const teacherRef = ref(db, `teachers/${currentUser.uid}`);
        onValue(teacherRef, (snap) => {
            if (snap.exists()) {
                const data = snap.val();
                let classes = [];
                if (Array.isArray(data.assignedClasses)) {
                    classes = data.assignedClasses.filter(Boolean).map(c => ({ id: c, name: c }));
                } else if (typeof data.assignedClasses === 'object') {
                    classes = Object.keys(data.assignedClasses).map(key => ({ id: key, name: key }));
                }

                // Also check if we need to fetch class names from classes node for better display
                // For now, using ID as name is a safe fallback, but let's try to get names if possible
                // (Optional enhancement: fetch class names)

                setAssignedClasses(classes);
                if (classes.length > 0) {
                    setSelectedClassId(classes[0].id);
                }
            }
            setLoading(false);
        });
    }, [currentUser]);

    // Load students and attendance when class or date changes
    useEffect(() => {
        if (!selectedClassId) return;
        setPendingChanges({}); // Clear pending changes on class/date switch

        const db = getDatabase();

        // Load students
        const studentsRef = ref(db, `students/${selectedClassId}`);
        onValue(studentsRef, (sSnap) => {
            if (sSnap.exists()) {
                const sData = sSnap.val();
                const sList = Object.keys(sData).map(key => ({
                    id: key,
                    ...sData[key]
                }));
                setStudents(sList);
            } else {
                setStudents([]);
            }
        });

        // Load attendance
        const attRef = ref(db, `attendance/${selectedClassId}/${selectedDate}`);
        onValue(attRef, (snap) => {
            if (snap.exists()) {
                setAttendanceData(snap.val());
            } else {
                setAttendanceData({});
            }
        });

    }, [selectedClassId, selectedDate]);

    const handleStatusChange = (studentId, status) => {
        setPendingChanges(prev => ({
            ...prev,
            [studentId]: status
        }));
    };

    const saveAttendance = async () => {
        if (Object.keys(pendingChanges).length === 0) return;
        setSaving(true);
        const db = getDatabase();
        const updates = {};

        try {
            // Process all pending changes to build the updates object
            // We use Promise.all to fetch existing records for all affected students in parallel
            await Promise.all(Object.keys(pendingChanges).map(async (studentId) => {
                const status = pendingChanges[studentId];
                const timestamp = Date.now();

                // 1. Update Class-based Attendance Node (Existing)
                updates[`attendance/${selectedClassId}/${selectedDate}/${studentId}`] = {
                    status: status,
                    timestamp: timestamp
                };

                // 2. Update Student-based Attendance Node (New - Centralized)
                updates[`students/${studentId}/attendance_records/${selectedDate}`] = {
                    status: status,
                    classId: selectedClassId,
                    timestamp: timestamp
                };

                // 3. Accumulate Total for Class Record
                // Fetch existing records to calculate accurate total
                const recordsRef = ref(db, `students/${studentId}/attendance_records`);
                const snapshot = await get(recordsRef);
                let currentRecords = {};
                if (snapshot.exists()) {
                    currentRecords = snapshot.val();
                }

                // Apply the pending change to the fetched records to get the "new" state
                // This ensures we count the new status correctly even if it overwrites an old one
                currentRecords[selectedDate] = { status: status };

                // Calculate total (Present + Late)
                const presentCount = Object.values(currentRecords).filter(r => r.status === 'Present' || r.status === 'Late').length;

                // Update the class record
                updates[`students/${selectedClassId}/${studentId}/records/attendance`] = presentCount;
            }));

            await update(ref(db), updates);
            setPendingChanges({});
            alert("Attendance saved successfully!");
        } catch (error) {
            console.error("Error saving attendance:", error);
            alert("Failed to save attendance.");
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="flex min-h-screen bg-gray-50">
            <SideNav role="teacher" />
            <div className="flex-1 p-6 md:p-10 ml-0 md:ml-64 transition-all">
                <h1 className="text-3xl font-bold text-gray-800 mb-6 flex items-center gap-3">
                    <FaCalendarCheck className="text-blue-600" /> Class Attendance
                </h1>

                {loading ? (
                    <div>Loading...</div>
                ) : assignedClasses.length === 0 ? (
                    <div className="text-red-600">You are not assigned to any classes.</div>
                ) : (
                    <div className="bg-white p-6 rounded-lg shadow">
                        <div className="mb-6 flex flex-col md:flex-row gap-4 justify-between items-end">
                            <div className="flex gap-4">
                                <div className="flex flex-col">
                                    <label className="font-medium text-gray-700 mb-1">Select Class:</label>
                                    <select
                                        value={selectedClassId}
                                        onChange={(e) => setSelectedClassId(e.target.value)}
                                        className="border rounded px-3 py-2"
                                    >
                                        {assignedClasses.map(cls => (
                                            <option key={cls.id} value={cls.id}>{cls.name}</option>
                                        ))}
                                    </select>
                                </div>

                                <div className="flex flex-col">
                                    <label className="font-medium text-gray-700 mb-1">Date:</label>
                                    <input
                                        type="date"
                                        value={selectedDate}
                                        onChange={(e) => setSelectedDate(e.target.value)}
                                        className="border rounded px-3 py-2"
                                    />
                                </div>
                            </div>

                            <button
                                onClick={saveAttendance}
                                disabled={Object.keys(pendingChanges).length === 0 || saving}
                                className={`px-6 py-2 rounded-lg font-semibold text-white transition-colors ${Object.keys(pendingChanges).length === 0 || saving
                                    ? "bg-gray-400 cursor-not-allowed"
                                    : "bg-blue-600 hover:bg-blue-700 shadow-md"
                                    }`}
                            >
                                {saving ? "Saving..." : `Save Changes (${Object.keys(pendingChanges).length})`}
                            </button>
                        </div>

                        <div className="overflow-x-auto">
                            <table className="min-w-full bg-white border border-gray-200 rounded-lg shadow-sm">
                                <thead className="bg-gray-50">
                                    <tr>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Student Name</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-200">
                                    {students.length > 0 ? (
                                        students.map((student) => {
                                            // Show pending status if exists, otherwise saved status
                                            const savedStatus = attendanceData[student.id]?.status;
                                            const pendingStatus = pendingChanges[student.id];
                                            const displayStatus = pendingStatus !== undefined ? pendingStatus : savedStatus;

                                            return (
                                                <tr key={student.id} className={pendingStatus ? "bg-blue-50" : ""}>
                                                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                                                        {student.firstName} {student.lastName}
                                                        {pendingStatus && <span className="ml-2 text-xs text-blue-600 font-normal">(Unsaved)</span>}
                                                    </td>
                                                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                                                        <div className="flex gap-2">
                                                            <button
                                                                onClick={() => handleStatusChange(student.id, "Present")}
                                                                className={`px-3 py-1 rounded-full text-xs font-semibold ${displayStatus === "Present"
                                                                    ? "bg-green-600 text-white"
                                                                    : "bg-gray-100 text-gray-600 hover:bg-green-100"
                                                                    }`}
                                                            >
                                                                Present
                                                            </button>
                                                            <button
                                                                onClick={() => handleStatusChange(student.id, "Absent")}
                                                                className={`px-3 py-1 rounded-full text-xs font-semibold ${displayStatus === "Absent"
                                                                    ? "bg-red-600 text-white"
                                                                    : "bg-gray-100 text-gray-600 hover:bg-red-100"
                                                                    }`}
                                                            >
                                                                Absent
                                                            </button>
                                                            <button
                                                                onClick={() => handleStatusChange(student.id, "Late")}
                                                                className={`px-3 py-1 rounded-full text-xs font-semibold ${displayStatus === "Late"
                                                                    ? "bg-yellow-500 text-white"
                                                                    : "bg-gray-100 text-gray-600 hover:bg-yellow-100"
                                                                    }`}
                                                            >
                                                                Late
                                                            </button>
                                                        </div>
                                                    </td>
                                                </tr>
                                            );
                                        })
                                    ) : (
                                        <tr>
                                            <td colSpan="2" className="px-6 py-4 text-center text-gray-500">
                                                No students found in this class.
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
