import React, { useEffect, useState } from "react";
import { getDatabase, ref, onValue } from "firebase/database";
import { useAuth } from "../context/AuthContext";
import SideNav from "../components/SideNav";
import TimetableView from "../components/TimetableView";
import { FaClock, FaArrowLeft } from "react-icons/fa";
import { Link } from "react-router-dom";

export default function StudentTimetable() {
    const { currentUser } = useAuth();
    const [timetable, setTimetable] = useState(null);
    const [loading, setLoading] = useState(true);
    const [studentClass, setStudentClass] = useState(null);

    useEffect(() => {
        if (!currentUser) return;
        const db = getDatabase();

        // First get student's class
        const userRef = ref(db, `users/${currentUser.uid}`);
        onValue(userRef, (snap) => {
            const data = snap.val();
            if (data && data.classId) {
                setStudentClass(data.classId);

                // Then listen to timetable for that class
                const ttRef = ref(db, `timetables/${data.classId}`);
                onValue(ttRef, (ttSnap) => {
                    if (ttSnap.exists()) {
                        setTimetable(ttSnap.val());
                    } else {
                        setTimetable(null);
                    }
                    setLoading(false);
                });
            } else {
                setLoading(false);
            }
        });
    }, [currentUser]);

    return (
        <div className="flex min-h-screen bg-gray-50">
            <SideNav role="student" />
            <div className="flex-1 p-6 md:p-10 ml-0 md:ml-64 transition-all">
                <div className="mb-6">
                    <Link to="/student-dashboard" className="text-blue-600 hover:underline flex items-center gap-2 mb-2">
                        <FaArrowLeft /> Back to Dashboard
                    </Link>
                    <h1 className="text-3xl font-bold text-gray-800 flex items-center gap-3">
                        <FaClock className="text-blue-600" /> Class Timetable
                    </h1>
                </div>

                {loading ? (
                    <div>Loading...</div>
                ) : !studentClass ? (
                    <div className="text-red-600">Class information not found.</div>
                ) : (
                    <div className="bg-white p-6 rounded-lg shadow">
                        <h2 className="text-xl font-semibold mb-4 text-gray-700">Schedule for {studentClass}</h2>
                        <TimetableView classId={studentClass} />
                    </div>
                )}
            </div>
        </div>
    );
}
