// src/pages/admin/StudentReport.js
import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { db } from "../../utils/firebase";
import { ref, get } from "firebase/database";
import Logo from "../../assets/logo.png";
import BackButton from "../../components/BackButton"; // ✅ add this
import { getFunctions, httpsCallable } from 'firebase/functions';
import config from "../../config";


export default function StudentReport() {
  const { classId, studentId } = useParams();
  const [student, setStudent] = useState(null);
  const [scores, setScores] = useState({});
  const [records, setRecords] = useState({});
  const [term, setTerm] = useState({});
  const [className, setClassName] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      // ✅ Fetch student info
      const studentSnap = await get(ref(db, `students/${classId}/${studentId}`));
      if (studentSnap.exists()) {
        const data = studentSnap.val();
        setStudent(data);
        if (data.records) setRecords(data.records);
      }

      // ✅ Fetch scores
      const scoresSnap = await get(ref(db, `scores/${classId}`));
      if (scoresSnap.exists()) {
        const data = scoresSnap.val();
        const studentScores = {};
        Object.keys(data).forEach((subject) => {
          if (data[subject][studentId]) {
            studentScores[subject] = data[subject][studentId];
          }
        });
        setScores(studentScores);
      }

      // ✅ Term
      const termSnap = await get(ref(db, "terms/current"));
      if (termSnap.exists()) {
        const termData = termSnap.val();
        setTerm(termData);
        // Fallback for dates
        setRecords(prev => ({
          ...prev,
          vacationDate: prev.vacationDate || termData.vacationDate,
          reopeningDate: prev.reopeningDate || termData.reopeningDate
        }));
      }

      // ✅ Class name
      const classSnap = await get(ref(db, `classes/${classId}/name`));
      if (classSnap.exists()) setClassName(classSnap.val());

      // ✅ Fetch Centralized Attendance
      const attSnap = await get(ref(db, `students/${studentId}/attendance_records`));
      if (attSnap.exists()) {
        const attData = attSnap.val();
        const totalDays = Object.keys(attData).length;
        const presentDays = Object.values(attData).filter(r => r.status === 'Present' || r.status === 'Late').length;
        // Update records state with calculated attendance
        setRecords(prev => ({
          ...prev,
          attendance: `${presentDays} / ${totalDays}`
        }));
      }

      setLoading(false);
    };
    fetchData();
  }, [classId, studentId]);

  const handlePrint = () => window.print();

  const handleAdminResetPassword = async () => {
    const newPassword = window.prompt('Enter new password for this student (admin reset):');
    if (!newPassword) return;
    try {
      const functions = getFunctions();
      const adminReset = httpsCallable(functions, 'adminResetStudentPassword');
      const res = await adminReset({ classId, studentId, newPassword });
      if (res.data && res.data.success) {
        alert('Password reset successfully');
      } else {
        alert('Password reset failed: ' + (res.data?.message || 'unknown'));
      }
    } catch (err) {
      console.error('Admin reset error', err);
      alert('Error resetting password: ' + err.message);
    }
  };

  if (loading) return <p className="p-4 text-center">Loading...</p>;
  if (!student) return <p className="p-4 text-center">Student not found.</p>;

  const allSubjects = Object.keys(scores);
  const grandTotal = allSubjects.reduce((a, subject) => {
    const sc = scores[subject];
    const total = (Number(sc.classScore50) || 0) + (Number(sc.examHalf) || 0);
    return a + total;
  }, 0);
  const average = allSubjects.length
    ? (grandTotal / allSubjects.length).toFixed(2)
    : 0;

  const getGrade = (t) =>
    t >= 80
      ? "1"
      : t >= 75
        ? "2"
        : t >= 70
          ? "3"
          : t >= 65
            ? "4"
            : t >= 60
              ? "5"
              : t >= 55
                ? "6"
                : t >= 50
                  ? "7"
                  : t >= 40
                    ? "8"
                    : "9";

  const getRemark = (t) =>
    t >= 80 ? "A" : t > 70 ? "P" : t > 60 ? "AP" : t > 50 ? "D" : "B";

  return (
    <div className="p-4 sm:p-8 bg-pink text-black max-w-5xl mx-auto shadow-lg">
      <BackButton /> {/* ✅ added */}

      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-center mb-6 text-center sm:text-left">
        <img src={Logo} alt="School Logo" className="w-20 h-20 mx-auto sm:mx-0" />
        <div>
          <h1 className="text-xl sm:text-2xl font-bold uppercase">
            {config.schoolName}
          </h1>
          <p>P. O. Box DT 2962, Adenta Accra</p>
          <p>Email: {config.adminEmail}</p>
          <h2 className="text-base sm:text-lg font-bold mt-2 underline">
            Terminal Report
          </h2>
        </div>
        <div className="w-20 h-20 border flex items-center justify-center text-xs mt-4 sm:mt-0">
          Photo
        </div>
      </div>

      {/* Student Info */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm mb-4 border p-3 rounded">
        <p>
          <b>Name of Student:</b> {student.firstName} {student.lastName}
        </p>
        <p>
          <b>Class:</b> {className || "N/A"}
        </p>
        <p>
          <b>Sex:</b> {student.gender || "N/A"}
        </p>
        <p>
          <b>Term:</b> {term.year ? `${term.year} - ${term.name}` : "N/A"}
        </p>
        <p>
          <b>Attendance:</b> {records.attendance || "N/A"}
        </p>
      </div>

      {/* Admin actions */}
      <div className="flex justify-end mb-4 no-print">
        <button
          onClick={handleAdminResetPassword}
          className="bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700"
        >
          Reset Student Password (admin)
        </button>
      </div>

      {/* Scores Table (responsive scroll) */}
      <div className="overflow-x-auto mb-6">
        <table className="min-w-full border text-sm">
          <thead>
            <tr className="bg-gray-200 text-center">
              <th className="border p-2">Subject</th>
              <th className="border p-2">Class Score 50%</th>
              <th className="border p-2">Exam Score 50%</th>
              <th className="border p-2">Total</th>
              <th className="border p-2">Grade</th>
              <th className="border p-2">Remark</th>
            </tr>
          </thead>
          <tbody>
            {allSubjects.map((subject) => {
              const sc = scores[subject];
              const classScore = Number(sc.classScore50) || 0;
              const examScore = Number(sc.examHalf) || 0;
              const total = classScore + examScore;

              return (
                <tr key={subject} className="text-center">
                  <td className="border p-2">{subject}</td>
                  <td className="border p-2">{classScore.toFixed(2)}</td>
                  <td className="border p-2">{examScore.toFixed(2)}</td>
                  <td className="border p-2">{total.toFixed(2)}</td>
                  <td className="border p-2">{getGrade(total)}</td>
                  <td className="border p-2">{getRemark(total)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Summary */}
      <div className="flex flex-col sm:flex-row justify-between mb-6 text-sm border p-3 rounded">
        <p>
          <b>Total Marks:</b> {grandTotal.toFixed(2)}
        </p>
        <p>
          <b>Average:</b> {average}
        </p>
      </div>

      {/* Conduct, Attitude, Interest */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6 text-sm">
        <p>
          <b>Conduct:</b> {records.conduct || "N/A"}
        </p>
        <p>
          <b>Attitude:</b> {records.attitude || "N/A"}
        </p>
        <p>
          <b>Interest:</b> {records.interest || "N/A"}
        </p>
      </div>

      {/* Comment */}
      <div className="mb-6 text-sm">
        <p>
          <b>Teacher’s Comment:</b> {records.teacherComment || "N/A"}
        </p>
      </div>

      {/* Vacation & Reopening */}
      <div className="flex flex-col sm:flex-row justify-between mb-6 text-sm border p-3 rounded">
        <p>
          <b>Vacation Date:</b> {records.vacationDate || "N/A"}
        </p>
        <p>
          <b>Reopening Date:</b> {records.reopeningDate || "N/A"}
        </p>
      </div>

      {/* Remarks Key */}
      <div className="border-t pt-4 mt-6 text-sm">
        <h3 className="font-bold mb-2">Remarks Key</h3>
        <ul className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          <li>
            <b>A</b> – Advance
          </li>
          <li>
            <b>P</b> – Proficient
          </li>
          <li>
            <b>AP</b> – Approaching Proficiency
          </li>
          <li>
            <b>D</b> – Developing
          </li>
          <li>
            <b>B</b> – Beginner
          </li>
        </ul>
      </div>

      {/* Print Button */}
      <div className="mt-6 text-center no-print">
        <button
          onClick={handlePrint}
          className="bg-blue-600 text-white px-6 py-2 rounded shadow hover:bg-blue-700 transition"
        >
          Print Report
        </button>
      </div>
    </div>
  );
}
