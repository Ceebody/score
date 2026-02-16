import React, { useEffect, useState } from "react";
import { getDatabase, ref, onValue, update } from "firebase/database";
import { useAuth } from "../../context/AuthContext";
import SideNav from "../../components/SideNav";
import TimetableView from "../../components/TimetableView";
import { FaClock, FaPlus, FaTrash } from "react-icons/fa";

export default function AdminTimetableManager() {
    const { currentUser } = useAuth();
    const [classes, setClasses] = useState([]);
    const [selectedClass, setSelectedClass] = useState("");
    const [timetable, setTimetable] = useState({});
    const [loading, setLoading] = useState(true);

    // Form state
    const [day, setDay] = useState("Monday");
    const [subject, setSubject] = useState("");
    const [time, setTime] = useState("");
    const [teacher, setTeacher] = useState("");

    useEffect(() => {
        const db = getDatabase();
        const classesRef = ref(db, "classes");
        onValue(classesRef, (snap) => {
            if (snap.exists()) {
                setClasses(Object.keys(snap.val()));
            } else {
                setClasses([]);
            }
            setLoading(false);
        });
    }, []);

    useEffect(() => {
        if (!selectedClass) {
            setTimetable({});
            return;
        }
        const db = getDatabase();
        const ttRef = ref(db, `timetables/${selectedClass}`);
        onValue(ttRef, (snap) => {
            if (snap.exists()) {
                setTimetable(snap.val());
            } else {
                setTimetable({});
            }
        });
    }, [selectedClass]);

    const handleAddPeriod = () => {
        if (!selectedClass || !subject || !time) return;
        const db = getDatabase();
        const currentPeriods = timetable[day]?.periods || [];
        const newPeriods = [...currentPeriods, { subject, time, teacher }];

        update(ref(db, `timetables/${selectedClass}/${day}`), {
            periods: newPeriods
        });

        // Reset form
        setSubject("");
        setTime("");
        setTeacher("");
    };

    const handleClearDay = (d) => {
        if (!selectedClass) return;
        if (window.confirm(`Clear all periods for ${d}?`)) {
            const db = getDatabase();
            update(ref(db, `timetables/${selectedClass}/${d}`), {
                periods: null
            });
        }
    }

    return (
        <div className="flex min-h-screen bg-gray-50">
            <SideNav role="admin" />
            <div className="flex-1 p-6 md:p-10 ml-0 md:ml-64 transition-all">
                <h1 className="text-3xl font-bold text-gray-800 mb-6 flex items-center gap-3">
                    <FaClock className="text-blue-600" /> Timetable Manager
                </h1>

                <div className="bg-white p-6 rounded-lg shadow mb-6">
                    <label className="block text-sm font-medium text-gray-700 mb-2">Select Class</label>
                    <select
                        value={selectedClass}
                        onChange={(e) => setSelectedClass(e.target.value)}
                        className="w-full md:w-1/3 border rounded px-3 py-2"
                    >
                        <option value="">-- Select Class --</option>
                        {classes.map(cls => (
                            <option key={cls} value={cls}>{cls}</option>
                        ))}
                    </select>
                </div>

                {selectedClass && (
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                        {/* Editor */}
                        <div className="bg-white p-6 rounded-lg shadow lg:col-span-1">
                            <h2 className="text-lg font-semibold mb-4">Add Period</h2>
                            <div className="space-y-4">
                                <div>
                                    <label className="block text-sm text-gray-600">Day</label>
                                    <select value={day} onChange={e => setDay(e.target.value)} className="w-full border rounded px-3 py-2">
                                        {['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'].map(d => (
                                            <option key={d} value={d}>{d}</option>
                                        ))}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm text-gray-600">Time</label>
                                    <input
                                        type="text"
                                        placeholder="e.g. 09:00 - 10:00"
                                        value={time}
                                        onChange={e => setTime(e.target.value)}
                                        className="w-full border rounded px-3 py-2"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm text-gray-600">Subject</label>
                                    <input
                                        type="text"
                                        placeholder="Subject Name"
                                        value={subject}
                                        onChange={e => setSubject(e.target.value)}
                                        className="w-full border rounded px-3 py-2"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm text-gray-600">Teacher (Optional)</label>
                                    <input
                                        type="text"
                                        placeholder="Teacher Name"
                                        value={teacher}
                                        onChange={e => setTeacher(e.target.value)}
                                        className="w-full border rounded px-3 py-2"
                                    />
                                </div>
                                <button
                                    onClick={handleAddPeriod}
                                    className="w-full bg-blue-600 text-white py-2 rounded hover:bg-blue-700 flex items-center justify-center gap-2"
                                >
                                    <FaPlus /> Add Period
                                </button>
                            </div>
                        </div>

                        {/* Preview */}
                        <div className="bg-white p-6 rounded-lg shadow lg:col-span-2">
                            <div className="flex justify-between items-center mb-4">
                                <h2 className="text-lg font-semibold">Current Timetable</h2>
                            </div>
                            <TimetableView classId={selectedClass} />

                            <div className="mt-4 border-t pt-4">
                                <h3 className="text-sm font-medium text-gray-500 mb-2">Management</h3>
                                <div className="flex gap-2 flex-wrap">
                                    {['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'].map(d => (
                                        <button key={d} onClick={() => handleClearDay(d)} className="text-xs text-red-600 border border-red-200 px-2 py-1 rounded hover:bg-red-50">
                                            Clear {d}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
