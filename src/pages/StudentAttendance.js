import React, { useEffect, useState } from "react";
import { getDatabase, ref, onValue } from "firebase/database";
import { useAuth } from "../context/AuthContext";
import SideNav from "../components/SideNav";
import AttendanceTable from "../components/AttendanceTable";
import { FaCalendarCheck, FaArrowLeft } from "react-icons/fa";
import { Link } from "react-router-dom";

export default function StudentAttendance() {
  const { currentUser } = useAuth();
  const [studentData, setStudentData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!currentUser) return;

    const db = getDatabase();
    const studentRef = ref(db, "students");

    const unsubscribe = onValue(studentRef, (snapshot) => {
      let found = null;
      if (snapshot.exists()) {
        const data = snapshot.val();

        // Case A: flat structure - try both UID and studentId lookup
        if (data[currentUser.uid]) {
          found = { ...data[currentUser.uid], class: data[currentUser.uid].class || "", id: currentUser.uid };
        } else {
          // Try looking up by studentId in flat structure
          Object.keys(data).forEach((key) => {
            if (data[key] && data[key].uid === currentUser.uid) {
              found = { ...data[key], class: data[key].class || "", id: key };
            }
          });

          // Case B: nested by class lookup if still not found
          if (!found) {
            Object.keys(data).forEach((cls) => {
              const classData = data[cls];
              if (classData) {
                // Try both UID and studentId in nested structure
                Object.keys(classData).forEach((sid) => {
                  if (classData[sid].uid === currentUser.uid || sid === currentUser.uid) {
                    found = { ...classData[sid], class: cls, id: sid };
                  }
                });
              }
            });
          }
        }
      }

      setStudentData(found);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [currentUser]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-50">
        <p className="text-lg font-semibold text-gray-600">Loading attendance...</p>
      </div>
    );
  }

  if (!studentData) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-50">
        <p className="text-lg font-semibold text-red-600">Student record not found.</p>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-gray-50">
      <SideNav role="student" />
      <div className="flex-1 p-6 md:p-10 ml-0 md:ml-64 transition-all">
        <div className="mb-6">
          <Link to="/student" className="text-blue-600 hover:underline flex items-center gap-2 mb-2">
            <FaArrowLeft /> Back to Dashboard
          </Link>
          <h1 className="text-3xl font-bold text-gray-800 flex items-center gap-3">
            <FaCalendarCheck className="text-blue-600" /> My Attendance
          </h1>
        </div>

        <div className="bg-white p-6 rounded-lg shadow">
          <h2 className="text-xl font-semibold mb-4 text-gray-700">
            Attendance Record for {studentData.firstName} {studentData.lastName}
          </h2>
          <AttendanceTable classId={studentData.class} studentId={studentData.id} />
        </div>
      </div>
    </div>
  );
}
