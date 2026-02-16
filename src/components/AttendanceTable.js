import React, { useState, useEffect } from 'react';
import { db } from '../utils/firebase';
import { ref, onValue, off, getDatabase } from 'firebase/database';

export default function AttendanceTable({ classId, studentId = null }) {
  const [attendanceData, setAttendanceData] = useState({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const db = getDatabase();
    let attendanceRef;

    if (studentId) {
      // New centralized path for students
      attendanceRef = ref(db, `students/${studentId}/attendance_records`);
    } else if (classId) {
      // Fallback to class-based path (legacy or teacher view)
      attendanceRef = ref(db, `attendance/${classId}`);
    } else {
      return;
    }

    const listener = onValue(attendanceRef, (snapshot) => {
      if (snapshot.exists()) {
        setAttendanceData(snapshot.val());
      } else {
        setAttendanceData({});
      }
      setLoading(false);
    });

    return () => off(attendanceRef, 'value', listener);
  }, [classId, studentId]);

  if (loading) return <div className="text-center p-4">Loading attendance...</div>;

  // Transform data for display
  const dates = Object.keys(attendanceData).sort().reverse();

  if (dates.length === 0) {
    return <div className="text-center p-4 text-gray-500">No attendance records found.</div>;
  }

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full bg-white border border-gray-200 rounded-lg shadow-sm">
        <thead className="bg-gray-50">
          <tr>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-200">
          {dates.map(date => {
            const record = attendanceData[date];
            let status = 'N/A';

            if (studentId) {
              // In centralized student node, record is directly the object { status: '...', ... }
              // In legacy class node, record is { studentId: { status: '...' } }
              // We need to detect structure.
              if (record.status) {
                status = record.status;
              } else if (record[studentId]) {
                status = record[studentId].status;
              }
            } else {
              // Class view (not really used here based on analysis, but keeping logic)
              status = 'N/A';
            }

            if (status === 'N/A') return null;

            return (
              <tr key={date}>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{date}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm">
                  <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full 
                    ${status === 'Present' ? 'bg-green-100 text-green-800' :
                      status === 'Absent' ? 'bg-red-100 text-red-800' :
                        status === 'Late' ? 'bg-yellow-100 text-yellow-800' :
                          'bg-gray-100 text-gray-800'}`}>
                    {status}
                  </span>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
