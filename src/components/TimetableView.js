import React, { useState, useEffect } from 'react';
import { db } from '../utils/firebase';
import { ref, onValue, off } from 'firebase/database';

export default function TimetableView({ classId }) {
    const [timetable, setTimetable] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!classId) return;

        const timetableRef = ref(db, `timetables/${classId}`);
        const listener = onValue(timetableRef, (snapshot) => {
            if (snapshot.exists()) {
                setTimetable(snapshot.val());
            } else {
                setTimetable(null);
            }
            setLoading(false);
        });

        return () => off(timetableRef, 'value', listener);
    }, [classId]);

    if (loading) return <div className="text-center p-4">Loading timetable...</div>;

    if (!timetable) {
        return <div className="text-center p-4 text-gray-500">No timetable available for this class.</div>;
    }

    // Assuming timetable structure: { Monday: { periods: [{ time: '9:00', subject: 'Math' }] } }
    // Or if it's an image URL as per rules: { url: '...' }

    if (timetable.url) {
        return (
            <div className="flex justify-center">
                <img src={timetable.url} alt="Class Timetable" className="max-w-full h-auto rounded-lg shadow-md" />
            </div>
        )
    }

    const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];

    return (
        <div className="overflow-x-auto">
            <table className="min-w-full bg-white border border-gray-200 rounded-lg shadow-sm">
                <thead className="bg-gray-50">
                    <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Day</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Schedule</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                    {days.map(day => {
                        const dayData = timetable[day];
                        return (
                            <tr key={day}>
                                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{day}</td>
                                <td className="px-6 py-4 text-sm text-gray-500">
                                    {dayData && dayData.periods ? (
                                        <ul className="list-disc list-inside">
                                            {dayData.periods.map((period, idx) => (
                                                <li key={idx}>
                                                    <span className="font-semibold">{period.time}:</span> {period.subject}
                                                </li>
                                            ))}
                                        </ul>
                                    ) : (
                                        <span className="italic text-gray-400">No classes scheduled</span>
                                    )}
                                </td>
                            </tr>
                        );
                    })}
                </tbody>
            </table>
        </div>
    );
}
