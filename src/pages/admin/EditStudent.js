import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { db } from "../../utils/firebase";
import { ref, get, update } from "firebase/database";
import BackButton from "../../components/BackButton";


function EditStudent() {
  const { classId, studentId } = useParams();
  const navigate = useNavigate();

  const [student, setStudent] = useState(null);
  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    classId: "",
    email: "",
    conduct: "",
    attitude: "",
    interest: "",
    teacherComment: "",
    vacationDate: "",
    reopeningDate: "",
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStudent = async () => {
      const studentSnap = await get(ref(db, `students/${classId}/${studentId}`));
      if (studentSnap.exists()) {
        const data = studentSnap.val();
        setStudent(data);
        setFormData({
          firstName: data.firstName || "",
          lastName: data.lastName || "",
          classId: data.classId || data.class || "",
          email: data.email || "",
          conduct: data.conduct || "",
          attitude: data.attitude || "",
          interest: data.interest || "",
          teacherComment: data.teacherComment || "",
          vacationDate: data.vacationDate || "",
          reopeningDate: data.reopeningDate || "",
        });
      }
      setLoading(false);
    };

    fetchStudent();
  }, [classId, studentId]);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.firstName || !formData.lastName || !formData.classId || !formData.email) {
      alert("Please fill in all required fields.");
      return;
    }

    try {
      // Update student in Firebase
      await update(ref(db, `students/${classId}/${studentId}`), {
        ...formData,
        classId: formData.classId, // ensure classId is updated
      });

      // If classId changed, move student node to new class
      if (formData.classId !== classId) {
        const oldRef = ref(db, `students/${classId}/${studentId}`);
        await update(ref(db, `students/${formData.classId}/${studentId}`), formData);
        await update(ref(db, `students/${classId}/${studentId}`), null); // remove old node
      }

      alert("✅ Student updated successfully");
      navigate("/students");
    } catch (error) {
      console.error("Error updating student:", error);
      alert("❌ Could not update student: " + error.message);
    }
  };

  if (loading) return <p className="p-4">Loading student data...</p>;
  if (!student) return <p className="p-4">Student not found.</p>;

  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-gray-100">
      <div className="bg-white shadow-lg rounded-2xl p-8 w-full max-w-2xl">
        <h2 className="text-2xl font-bold text-yellow-800 mb-6 text-center">
          Edit Student
        </h2>
        <BackButton/>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <input
            type="text"
            name="firstName"
            value={formData.firstName}
            onChange={handleChange}
            placeholder="First Name"
            required
            className="border p-3 rounded-lg focus:outline-none focus:ring-2 focus:ring-yellow-400"
          />
          <input
            type="text"
            name="lastName"
            value={formData.lastName}
            onChange={handleChange}
            placeholder="Last Name"
            required
            className="border p-3 rounded-lg focus:outline-none focus:ring-2 focus:ring-yellow-400"
          />
          <input
            type="email"
            name="email"
            value={formData.email}
            onChange={handleChange}
            placeholder="Email"
            required
            className="border p-3 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-400"
          />
          <select
            name="classId"
            value={formData.classId}
            onChange={handleChange}
            required
            className="border p-3 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-400"
          >
            <option value="">-- Select Class --</option>
            <option value="creche">Creche</option>
            <option value="nursery1">Nursery 1</option>
            <option value="nursery2">Nursery 2</option>
            <option value="kindergarten1">Kindergarten 1</option>
            <option value="kindergarten2">Kindergarten 2</option>
            <option value="basic1">Basic 1</option>
            <option value="basic2">Basic 2</option>
            <option value="basic3">Basic 3</option>
            <option value="basic4">Basic 4</option>
            <option value="basic5">Basic 5</option>
            <option value="basic6">Basic 6</option>
            <option value="basic7">Basic 7</option>
            <option value="basic8">Basic 8</option>
            <option value="basic9">Basic 9</option>
          </select>

          {/* Additional report fields */}
          <input
            type="text"
            name="conduct"
            value={formData.conduct}
            onChange={handleChange}
            placeholder="Conduct"
            className="border p-3 rounded-lg focus:outline-none focus:ring-2 focus:ring-yellow-400"
          />
          <input
            type="text"
            name="attitude"
            value={formData.attitude}
            onChange={handleChange}
            placeholder="Attitude"
            className="border p-3 rounded-lg focus:outline-none focus:ring-2 focus:ring-yellow-400"
          />
          <input
            type="text"
            name="interest"
            value={formData.interest}
            onChange={handleChange}
            placeholder="Interest"
            className="border p-3 rounded-lg focus:outline-none focus:ring-2 focus:ring-yellow-400"
          />
          <input
            type="text"
            name="teacherComment"
            value={formData.teacherComment}
            onChange={handleChange}
            placeholder="Teacher's Comment"
            className="border p-3 rounded-lg focus:outline-none focus:ring-2 focus:ring-yellow-400"
          />
          <input
            type="date"
            name="vacationDate"
            value={formData.vacationDate}
            onChange={handleChange}
            placeholder="Vacation Date"
            className="border p-3 rounded-lg focus:outline-none focus:ring-2 focus:ring-yellow-400"
          />
          <input
            type="date"
            name="reopeningDate"
            value={formData.reopeningDate}
            onChange={handleChange}
            placeholder="Reopening Date"
            className="border p-3 rounded-lg focus:outline-none focus:ring-2 focus:ring-yellow-400"
          />

          <div className="flex justify-between mt-4">
            <button
              type="button"
              onClick={() => navigate("/students")}
              className="bg-gray-400 text-white px-6 py-2 rounded-lg hover:bg-gray-500"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="bg-yellow-600 text-white px-6 py-2 rounded-lg hover:bg-yellow-700"
            >
              Save Changes
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default EditStudent;
