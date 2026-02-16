// src/pages/teacher/ClassRecords.js
import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { db } from "../../utils/firebase";
import { ref, get, set } from "firebase/database";
import { useAuth } from "../../context/AuthContext";
import BackButton from "../../components/BackButton"; // ✅ add this


function ClassRecords() {
  const { classId, studentId } = useParams();
  const { currentUser } = useAuth();
  const navigate = useNavigate();

  const [student, setStudent] = useState(null);
  const [extraInfo, setExtraInfo] = useState({
    conduct: "",
    attitude: "",
    interest: "",
    teacherComment: "",
    gender: "",
    vacationDate: "",
    reopeningDate: "",
    attendance: "", // ✅ Added attendance
  });

  useEffect(() => {
    // Fetch student info
    const studentRef = ref(db, `students/${classId}/${studentId}`);
    get(studentRef).then((snap) => {
      if (snap.exists()) {
        const data = snap.val();
        setStudent(data);
        if (data.records) {
          setExtraInfo((prev) => ({ ...prev, ...data.records }));
        }
      }
    });
  }, [classId, studentId]);

  const handleChange = (e) => {
    setExtraInfo({ ...extraInfo, [e.target.name]: e.target.value });
  };

  const handleSubmit = async () => {
    try {
      await set(ref(db, `students/${classId}/${studentId}/records`), {
        ...extraInfo,
        updatedBy: currentUser.uid,
        timestamp: Date.now(),
      });
      alert("✅ Class records submitted!");
      navigate(-1);
    } catch (err) {
      console.error(err);
      alert("❌ Failed to submit records.");
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-yellow-50 via-orange-100 to-yellow-200 flex items-center justify-center p-6">
      <div className="max-w-3xl w-full bg-white rounded-2xl shadow-xl p-6 space-y-6 border-t-8 border-yellow-600">
        <BackButton /> {/* ✅ added */}

        {student ? (
          <>
            <h1 className="text-2xl font-bold text-yellow-700 text-center">
              Class Teacher Records
            </h1>
            <p className="text-center font-semibold text-gray-700">
              Student: {student.firstName} {student.lastName} | Class:{" "}
              {classId.replace(/([a-zA-Z]+)(\d+)/, "$1 $2")}
            </p>

            {/* Form */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
              <div>
                <label className="block font-medium mb-1">Conduct:</label>
                <input
                  type="text"
                  name="conduct"
                  value={extraInfo.conduct}
                  onChange={handleChange}
                  className="w-full border p-2 rounded-lg focus:ring-2 focus:ring-yellow-400"
                />
              </div>
              <div>
                <label className="block font-medium mb-1">Attitude:</label>
                <input
                  type="text"
                  name="attitude"
                  value={extraInfo.attitude}
                  onChange={handleChange}
                  className="w-full border p-2 rounded-lg focus:ring-2 focus:ring-yellow-400"
                />
              </div>
              <div>
                <label className="block font-medium mb-1">Interest:</label>
                <input
                  type="text"
                  name="interest"
                  value={extraInfo.interest}
                  onChange={handleChange}
                  className="w-full border p-2 rounded-lg focus:ring-2 focus:ring-yellow-400"
                />
              </div>
              <div>
                <label className="block font-medium mb-1">Teacher's Comment:</label>
                <textarea
                  name="teacherComment"
                  value={extraInfo.teacherComment}
                  onChange={handleChange}
                  className="w-full border p-2 rounded-lg focus:ring-2 focus:ring-yellow-400"
                />
              </div>

              <div>
                <label className="block font-medium mb-1">Gender:</label>
                <select
                  name="gender"
                  value={extraInfo.gender}
                  onChange={handleChange}
                  className="w-full border p-2 rounded-lg"
                >
                  <option value="">-- Select Gender --</option>
                  <option value="Male">Male</option>
                  <option value="Female">Female</option>
                </select>
              </div>

              {/* ✅ Attendance Field */}
              <div>
                <label className="block font-medium mb-1">Attendance:</label>
                <input
                  type="number"
                  name="attendance"
                  value={extraInfo.attendance}
                  onChange={handleChange}
                  className="w-full border p-2 rounded-lg focus:ring-2 focus:ring-yellow-400"
                  placeholder="e.g. 56"
                />
              </div>

              <div>
                <label className="block font-medium mb-1">Vacation Date:</label>
                <input
                  type="date"
                  name="vacationDate"
                  value={extraInfo.vacationDate}
                  onChange={handleChange}
                  className="w-full border p-2 rounded-lg"
                />
              </div>
              <div>
                <label className="block font-medium mb-1">Reopening Date:</label>
                <input
                  type="date"
                  name="reopeningDate"
                  value={extraInfo.reopeningDate}
                  onChange={handleChange}
                  className="w-full border p-2 rounded-lg"
                />
              </div>
            </div>

            <button
              onClick={handleSubmit}
              className="w-full bg-yellow-600 text-white font-semibold py-3 rounded-xl hover:bg-yellow-700 transition mt-4"
            >
              Submit Records
            </button>
          </>
        ) : (
          <p className="text-center text-gray-600">Loading student info...</p>
        )}
      </div>
    </div>
  );
}

export default ClassRecords;
