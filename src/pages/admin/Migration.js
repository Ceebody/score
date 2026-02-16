import React from "react";
import { getDatabase, ref, get, set, update } from "firebase/database";
import app from "../../utils/firebase";

const Migration = () => {
  const db = getDatabase(app);

  const handleNextTerm = async () => {
    if (!window.confirm("Move to the next term? This will reset term reports.")) return;

    const snapshot = await get(ref(db, "settings"));
    let settings = snapshot.exists() ? snapshot.val() : { term: 1, year: new Date().getFullYear() };

    let newTerm = settings.term + 1;
    if (newTerm > 3) newTerm = 1; // 3 terms per year

    await update(ref(db, "settings"), { term: newTerm, year: settings.year });
    alert(`Migrated to Term ${newTerm}`);
  };

  const handleNextYear = async () => {
    if (!window.confirm("Promote all students to the next class?")) return;

    const snapshot = await get(ref(db, "students"));
    if (snapshot.exists()) {
      const students = snapshot.val();
      for (let uid in students) {
        let student = students[uid];
        let currentClass = student.classId;
        let promotedClass = getNextClass(currentClass);

        await update(ref(db, `students/${uid}`), { classId: promotedClass });
      }
    }

    const snapshot2 = await get(ref(db, "settings"));
    let settings = snapshot2.exists() ? snapshot2.val() : { term: 1, year: new Date().getFullYear() };

    await update(ref(db, "settings"), { term: 1, year: settings.year + 1 });
    alert("Promoted all students and started a new academic year.");
  };

  // Simple class promotion logic (you can expand)
  const getNextClass = (currentClass) => {
    const order = ["JHS1", "JHS2", "JHS3"];
    const idx = order.indexOf(currentClass);
    return idx !== -1 && idx < order.length - 1 ? order[idx + 1] : currentClass;
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-6">
      <div className="bg-white shadow-lg rounded-lg p-8 w-full max-w-md text-center">
        <h2 className="text-xl font-bold text-[#4B2E2E] mb-6">Migration Panel</h2>
        <button
          onClick={handleNextTerm}
          className="w-full py-2 mb-4 bg-[#FFD700] text-[#4B2E2E] font-bold rounded-lg"
        >
          Move to Next Term
        </button>
        <button
          onClick={handleNextYear}
          className="w-full py-2 bg-[#4B2E2E] text-white font-bold rounded-lg"
        >
          Promote Students & New Year
        </button>
      </div>
    </div>
  );
};

export default Migration;
