import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { db } from "../../utils/firebase";
import { ref, onValue, off } from "firebase/database";
import { useAuth } from "../../context/AuthContext";
import { Search, GraduationCap, Users, BookOpen } from "lucide-react";
import NotificationBell from "../../components/NotificationBell";
import { motion, AnimatePresence } from "framer-motion";

export default function TeacherDashboard() {
  const { currentUser } = useAuth();
  const navigate = useNavigate();

  const quotes = [
    { text: "Education is the most powerful weapon which you can use to change the world.", author: "Nelson Mandela" },
    { text: "The beautiful thing about learning is that no one can take it away from you.", author: "B.B. King" },
    { text: "Tell me and I forget. Teach me and I remember. Involve me and I learn.", author: "Benjamin Franklin" },
    { text: "Live as if you were to die tomorrow. Learn as if you were to live forever.", author: "Mahatma Gandhi" },
    { text: "The purpose of education is to replace an empty mind with an open one.", author: "Malcolm Forbes" },
    { text: "The mind is not a vessel to be filled but a fire to be ignited.", author: "Plutarch" },
    { text: "Education is the passport to the future, for tomorrow belongs to those who prepare for it today.", author: "Malcolm X" },
    { text: "Education is not preparation for life; education is life itself.", author: "John Dewey" },
    { text: "The roots of education are bitter, but the fruit is sweet.", author: "Aristotle" },
    { text: "Education is not the filling of a pail, but the lighting of a fire.", author: "William Butler Yeats" },
    { text: "Knowledge is power. Information is liberating. Education is the premise of progress, in every society, in every family.", author: "Kofi Annan" },
    { text: "Develop a passion for learning. If you do, you will never cease to grow.", author: "Anthony J. D'Angelo" },
    { text: "The function of education is to teach one to think intensively and to think critically. Intelligence plus character—that is the goal of true education.", author: "Martin Luther King Jr." },
    { text: "Education is the movement from darkness to light.", author: "Allan Bloom" },
    { text: "The goal of education is the advancement of knowledge and the dissemination of truth.", author: "John F. Kennedy" },
    { text: "A child miseducated is a child lost.", author: "John F. Kennedy" },
    { text: "Anyone who stops learning is old, whether at twenty or eighty. Anyone who keeps learning stays young.", author: "Henry Ford" },
    { text: "The more that you read, the more things you will know. The more that you learn, the more places you'll go.", author: "Dr. Seuss" },
    { text: "Education is the key to unlock the golden door of freedom.", author: "George Washington Carver" },
    { text: "It is not from ourselves that we learn to be better than we are.", author: "Wendell Berry" },
    { text: "No person is strong enough to carry a cross and a prejudice at the same time.", author: "William Arthur Ward" },
    { text: "The only person who is educated is the one who has learned how to learn and change.", author: "Carl Rogers" },
    { text: "The only real failure in life is one not learned from.", author: "Anthony J. D'Angelo" },
    { text: "You don't understand anything until you learn it more than one way.", author: "Marvin Minsky" },
    { text: "He who would learn to fly one day must first learn to stand and walk and run and climb and dance; one cannot fly into flying.", author: "Friedrich Nietzsche" }
  ];

  const bgImages = [
    "https://images.unsplash.com/photo-1509062522246-3755977927d7?q=80&w=1400&auto=format&fit=crop&ixlib=rb-4.0.3&s=6d9c2e27d3b4b9aee1b7d3d3c5a0f6a7",
    "https://images.unsplash.com/photo-1503676260728-1c00da094a0b?q=80&w=1400&auto=format&fit=crop&ixlib=rb-4.0.3&s=5d7d8a1b7d4e5c6f7a8b9c0d1e2f3a4b",
    "https://images.unsplash.com/photo-1516979187457-637abb4f9353?q=80&w=1400&auto=format&fit=crop&ixlib=rb-4.0.3&s=3b4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f",
  ];

  const [bgIndex, setBgIndex] = useState(0);
  const [teacher, setTeacher] = useState(null);
  const [assignedClasses, setAssignedClasses] = useState([]);
  const [selectedClass, setSelectedClass] = useState("");
  const [students, setStudents] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [loadingClasses, setLoadingClasses] = useState(true);
  const [loadingStudents, setLoadingStudents] = useState(false);

  // Restore persisted selection (per teacher) on mount
  useEffect(() => {
    if (!currentUser) return;
    try {
      const persisted = localStorage.getItem(`teacher_selectedClass_${currentUser.uid}`);
      if (persisted) setSelectedClass(persisted);
    } catch (err) {
      // ignore storage errors
    }
  }, [currentUser]);

  // Persist selection when teacher changes it
  useEffect(() => {
    if (!currentUser) return;
    try {
      if (selectedClass) localStorage.setItem(`teacher_selectedClass_${currentUser.uid}`, selectedClass);
    } catch (err) {
      // ignore
    }
  }, [selectedClass, currentUser]);

  useEffect(() => {
    if (!currentUser) return;

    const teacherRef = ref(db, `teachers/${currentUser.uid}`);
    const classesRef = ref(db, "classes");

    // Keep references to the callbacks so we can detach on cleanup
    let classesCallback = null;
    const teacherCallback = (teacherSnap) => {
      if (teacherSnap.exists()) {
        const teacherData = teacherSnap.val();
        setTeacher(teacherData);

        let assignedKeys = [];
        if (Array.isArray(teacherData.assignedClasses)) {
          assignedKeys = teacherData.assignedClasses.filter(Boolean);
        } else if (typeof teacherData.assignedClasses === "object") {
          assignedKeys = Object.keys(teacherData.assignedClasses);
        }

        // detach previous classes callback (if any) before attaching a new one
        if (classesCallback) off(classesRef, "value", classesCallback);

        classesCallback = (classSnap) => {
          if (classSnap.exists()) {
            const classData = classSnap.val();
            const teacherClasses = assignedKeys.map((key) => ({
              classId: key,
              className: classData[key]?.name || key,
            }));
            setAssignedClasses(teacherClasses);

            // preserve manual/persisted selection if still valid, otherwise fallback
            setSelectedClass((prev) => {
              if (prev && teacherClasses.some((c) => c.classId === prev)) return prev;
              try {
                const persisted = localStorage.getItem(`teacher_selectedClass_${currentUser.uid}`);
                if (persisted && teacherClasses.some((c) => c.classId === persisted)) return persisted;
              } catch (err) {
                // ignore
              }
              return teacherClasses.length > 0 ? teacherClasses[0].classId : "";
            });
          } else {
            setAssignedClasses([]);
            setSelectedClass((prev) => prev);
          }
          setLoadingClasses(false);
        };

        onValue(classesRef, classesCallback);
      } else {
        setTeacher(null);
        setAssignedClasses([]);
        setLoadingClasses(false);
      }
    };

    onValue(teacherRef, teacherCallback);

    return () => {
      // cleanup listeners
      off(teacherRef, "value", teacherCallback);
      if (classesCallback) off(classesRef, "value", classesCallback);
    };
  }, [currentUser]);

  useEffect(() => {
    const interval = setInterval(() => setBgIndex((i) => (i + 1) % bgImages.length), 30 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  function getQuoteOfDay() {
    const today = new Date();
    const dayIndex = Math.floor(today / (1000 * 60 * 60 * 24));
    return quotes[dayIndex % quotes.length];
  }

  const quote = getQuoteOfDay();

  useEffect(() => {
    if (!selectedClass) return;
    setLoadingStudents(true);

    const studentsRef = ref(db, `students/${selectedClass}`);
    const studentsCallback = (snap) => {
      const fetched = [];
      if (snap.exists()) {
        const data = snap.val();
        Object.keys(data).forEach((id) => fetched.push({ id, ...data[id] }));
      }
      setStudents(fetched);
      setLoadingStudents(false);
    };
    onValue(studentsRef, studentsCallback);

    return () => {
      off(studentsRef, "value", studentsCallback);
    };
  }, [selectedClass]);

  const filteredStudents = students.filter((s) => {
    const fullName = `${s.firstName || ""} ${s.lastName || ""}`.trim();
    return fullName.toLowerCase().includes(searchQuery.toLowerCase());
  });

  return (
    <div
      className="flex-1 p-4 md:p-8 overflow-y-auto min-h-full"
      style={{
        backgroundImage: `linear-gradient(rgba(239,246,255,0.85), rgba(219,234,254,0.85)), url(${bgImages[bgIndex]})`,
        backgroundSize: "cover",
        backgroundPosition: "center",
        backgroundAttachment: "fixed"
      }}
    >
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="max-w-7xl mx-auto space-y-8"
      >

        {/* Header Section */}
        <div className="flex justify-between items-center bg-white/70 backdrop-blur-md p-4 rounded-2xl shadow-sm border border-white/50 relative z-30">
          <div className="flex items-center gap-3">
            <h1 className="text-xl md:text-2xl font-bold text-indigo-900">Dashboard</h1>
          </div>

          <div className="flex items-center gap-4">
            <div className="hidden md:block"><NotificationBell /></div>
            <div className="flex items-center gap-3">
              {teacher && (
                <div className="text-right hidden md:block">
                  <p className="text-sm font-semibold text-gray-800">{teacher.firstName} {teacher.lastName}</p>
                  <p className="text-xs text-gray-500">Teacher</p>
                </div>
              )}
              <div className="h-10 w-10 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-700 font-bold border-2 border-indigo-200">
                {teacher ? teacher.firstName[0] : "T"}
              </div>
            </div>
          </div>
        </div>

        {/* Welcome & Stats */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Welcome Card */}
          <motion.div
            whileHover={{ scale: 1.01 }}
            className="lg:col-span-2 bg-gradient-to-r from-indigo-600 to-purple-600 rounded-3xl p-8 text-white shadow-xl relative overflow-hidden"
          >
            <div className="relative z-10">
              <h2 className="text-3xl font-bold mb-2">Welcome back, {teacher ? teacher.firstName : "Teacher"}! 👋</h2>
              <p className="text-indigo-100 mb-6 max-w-lg">
                {quote ? `"${quote.text}"` : "Ready to inspire your students today?"}
              </p>
              <div className="flex flex-wrap gap-3">
                <button onClick={() => document.getElementById('student-search').focus()} className="bg-white text-indigo-600 px-5 py-2 rounded-full font-semibold shadow-lg hover:bg-indigo-50 transition-colors">
                  Find Student
                </button>
                <button onClick={() => navigate('/profile')} className="bg-indigo-500/30 backdrop-blur-sm border border-white/20 text-white px-5 py-2 rounded-full font-semibold hover:bg-indigo-500/40 transition-colors">
                  View Profile
                </button>
              </div>
            </div>
            {/* Decorative circles */}
            <div className="absolute top-0 right-0 -mr-10 -mt-10 w-64 h-64 bg-white/10 rounded-full blur-3xl"></div>
            <div className="absolute bottom-0 left-0 -ml-10 -mb-10 w-40 h-40 bg-purple-500/20 rounded-full blur-2xl"></div>
          </motion.div>

          {/* Stats Grid */}
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-1">
            <motion.div whileHover={{ y: -5 }} className="bg-white/80 backdrop-blur-sm p-5 rounded-2xl shadow-sm border border-white/60 flex items-center gap-4">
              <div className="p-3 bg-blue-100 text-blue-600 rounded-xl">
                <Users className="h-6 w-6" />
              </div>
              <div>
                <p className="text-sm text-gray-500 font-medium">Assigned Classes</p>
                <p className="text-2xl font-bold text-gray-800">{assignedClasses.length}</p>
              </div>
            </motion.div>

            <motion.div whileHover={{ y: -5 }} className="bg-white/80 backdrop-blur-sm p-5 rounded-2xl shadow-sm border border-white/60 flex items-center gap-4">
              <div className="p-3 bg-emerald-100 text-emerald-600 rounded-xl">
                <GraduationCap className="h-6 w-6" />
              </div>
              <div>
                <p className="text-sm text-gray-500 font-medium">Total Students</p>
                <p className="text-2xl font-bold text-gray-800">{students.length}</p>
              </div>
            </motion.div>

            <motion.div whileHover={{ y: -5 }} className="bg-white/80 backdrop-blur-sm p-5 rounded-2xl shadow-sm border border-white/60 flex items-center gap-4 lg:hidden">
              <div className="p-3 bg-amber-100 text-amber-600 rounded-xl">
                <BookOpen className="h-6 w-6" />
              </div>
              <div>
                <p className="text-sm text-gray-500 font-medium">Subjects</p>
                <p className="text-2xl font-bold text-gray-800">{teacher?.assignedSubjects ? Object.keys(teacher.assignedSubjects).length : 0}</p>
              </div>
            </motion.div>
          </div>
        </div>

        {/* Main Content Area */}
        <div className="bg-white/90 backdrop-blur-xl rounded-3xl shadow-xl border border-white/50 overflow-hidden">
          {/* Controls Bar */}
          <div className="p-6 border-b border-gray-100 bg-white/50">
            <div className="flex flex-col md:flex-row flex-wrap gap-4 justify-between items-end md:items-center">
              <div className="w-full md:w-auto md:flex-1 min-w-[200px] space-y-1">
                <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">Current Class</label>
                <select
                  value={selectedClass}
                  onChange={(e) => setSelectedClass(e.target.value)}
                  className="w-full bg-gray-50 border border-gray-200 text-gray-800 text-sm rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 block p-2.5 transition-shadow"
                >
                  {loadingClasses ? <option>Loading...</option> : assignedClasses.length === 0 ? <option>No classes</option> : assignedClasses.map((cls) => (<option key={cls.classId} value={cls.classId}>{cls.className}</option>))}
                </select>
              </div>

              <div className="w-full md:w-auto md:flex-1 min-w-[200px] relative group">
                <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                  <Search className="w-5 h-5 text-gray-400 group-focus-within:text-indigo-500 transition-colors" />
                </div>
                <input
                  id="student-search"
                  type="text"
                  className="block w-full p-2.5 pl-10 text-sm text-gray-900 border border-gray-200 rounded-xl bg-gray-50 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-shadow"
                  placeholder="Search students..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>

              <div className="flex flex-wrap gap-2 w-full md:w-auto justify-end">
                <button
                  onClick={() => { if (selectedClass) navigate(`/teacher/master-sheet/${selectedClass}`); }}
                  disabled={!selectedClass || loadingClasses}
                  className="flex-1 md:flex-none px-4 py-2.5 bg-white border border-gray-200 text-gray-700 rounded-xl text-sm font-semibold hover:bg-gray-50 hover:border-gray-300 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-sm"
                >
                  Master Sheet
                </button>
                <button
                  onClick={() => {
                    if (!selectedClass) return;
                    navigate(`/teacher/midterm-scores/${selectedClass}`);
                  }}
                  disabled={!selectedClass || loadingStudents}
                  className="flex-1 md:flex-none px-4 py-2.5 bg-indigo-600 text-white rounded-xl text-sm font-semibold hover:bg-indigo-700 shadow-lg shadow-indigo-200 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                >
                  Midterm Records
                </button>
                <button
                  onClick={() => navigate("/teacher/comments")}
                  className="flex-1 md:flex-none px-4 py-2.5 bg-pink-600 text-white rounded-xl text-sm font-semibold hover:bg-pink-700 shadow-lg shadow-pink-200 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                >
                  Manage Comments
                </button>
              </div>
            </div>
          </div>

          {/* Students Grid */}
          <div className="p-6 bg-gray-50/50 min-h-[400px]">
            {loadingStudents ? (
              <div className="flex flex-col items-center justify-center h-64 text-gray-400">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 mb-2"></div>
                <p>Loading students...</p>
              </div>
            ) : filteredStudents.length > 0 ? (
              <motion.div
                layout
                className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4"
              >
                <AnimatePresence>
                  {filteredStudents.map((student) => (
                    <motion.div
                      layout
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.9 }}
                      whileHover={{ y: -4, shadow: "0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1)" }}
                      key={student.id}
                      className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm hover:border-indigo-200 transition-all group"
                    >
                      <div className="flex items-start justify-between mb-4">
                        <div className="h-12 w-12 rounded-full bg-gradient-to-br from-indigo-100 to-purple-100 text-indigo-600 flex items-center justify-center font-bold text-lg">
                          {student.firstName[0]}{student.lastName[0]}
                        </div>
                        <span className="px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded-md font-medium">
                          {selectedClass}
                        </span>
                      </div>

                      <h3 className="font-bold text-gray-800 text-lg truncate" title={`${student.firstName} ${student.lastName}`}>
                        {student.firstName} {student.lastName}
                      </h3>
                      <p className="text-sm text-gray-500 mb-4 truncate">{student.email || "No email"}</p>

                      <div className="grid grid-cols-2 gap-2 mt-auto">
                        <button
                          onClick={() => navigate(`/teacher/enter-scores/${selectedClass}/${student.id}`)}
                          className="px-3 py-2 bg-indigo-50 text-indigo-700 text-sm font-semibold rounded-lg hover:bg-indigo-100 transition-colors"
                        >
                          Enter Scores
                        </button>
                        <button
                          onClick={() => navigate(`/teacher/midterm-scores/${selectedClass}/${student.id}`)}
                          className="px-3 py-2 bg-amber-50 text-amber-700 text-sm font-semibold rounded-lg hover:bg-amber-100 transition-colors"
                        >
                          Midterms
                        </button>
                        <button
                          onClick={() => navigate(`/teacher/sba-records/${selectedClass}/${student.id}`)}
                          className="col-span-2 px-3 py-2 bg-purple-50 text-purple-700 text-sm font-semibold rounded-lg hover:bg-purple-100 transition-colors"
                        >
                          📊 SBA Records
                        </button>
                      </div>
                    </motion.div>
                  ))}
                </AnimatePresence>
              </motion.div>
            ) : (
              <div className="flex flex-col items-center justify-center h-64 text-gray-400">
                <Users className="h-12 w-12 mb-2 opacity-20" />
                <p className="text-lg font-medium">{selectedClass ? 'No students found.' : 'Select a class to view students.'}</p>
              </div>
            )}
          </div>
        </div>
      </motion.div>
    </div>
  );
}