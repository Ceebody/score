import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { db } from "../../utils/firebase";
import { ref, get, set } from "firebase/database";
import { useAuth } from "../../context/AuthContext";
import { Database, Download, Clock, CheckCircle, AlertCircle, Loader, Archive, FolderOpen } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

export default function ModernBackupManager() {
    const { currentUser } = useAuth();
    const navigate = useNavigate();
    const [backups, setBackups] = useState([]);
    const [loading, setLoading] = useState(true);
    const [creating, setCreating] = useState(false);
    const [progress, setProgress] = useState({ step: 0, total: 4, message: "" });
    const [lastBackup, setLastBackup] = useState(null);

    useEffect(() => {
        loadBackups();
    }, []);

    const loadBackups = async () => {
        setLoading(true);
        try {
            const snap = await get(ref(db, "backups/stable"));
            if (!snap.exists()) {
                setBackups([]);
                setLoading(false);
                return;
            }

            const data = snap.val();
            const backupList = [];

            Object.keys(data).forEach((termKey) => {
                const node = data[termKey] || {};
                const versions = node.versions ? Object.keys(node.versions) : [];
                const latest = node.latest || (versions.length ? versions.sort((a, b) => b - a)[0] : null);

                if (latest && node.versions[latest]) {
                    const meta = node.versions[latest].meta || {};
                    backupList.push({
                        id: latest,
                        termKey,
                        term: meta.term || {},
                        createdAt: meta.createdAt,
                        createdBy: meta.createdBy,
                        size: calculateSize(node.versions[latest]),
                    });
                }
            });

            // Sort by creation date, newest first
            backupList.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

            setBackups(backupList);
            if (backupList.length > 0) {
                setLastBackup(backupList[0]);
            }
        } catch (err) {
            console.error("Error loading backups:", err);
        } finally {
            setLoading(false);
        }
    };

    const calculateSize = (data) => {
        const str = JSON.stringify(data);
        const bytes = new Blob([str]).size;
        if (bytes < 1024) return `${bytes} B`;
        if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
        return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
    };

    const [showBackupModal, setShowBackupModal] = useState(false);
    const [configYear, setConfigYear] = useState("");
    const [configTerm, setConfigTerm] = useState("");

    // Initial fetch for modal defaults
    const openBackupModal = async () => {
        console.log("Opening backup modal...");
        try {
            const termSnap = await get(ref(db, "terms/current"));
            if (termSnap.exists()) {
                const t = termSnap.val();
                setConfigYear(t.year);
                setConfigTerm(t.name);
            } else {
                const now = new Date();
                setConfigYear(now.getFullYear().toString());
                setConfigTerm("Term 1");
            }
            console.log("Setting showBackupModal to true");
            setShowBackupModal(true);
        } catch (e) {
            console.error(e);
            alert("Failed to load current term info.");
        }
    };

    const startBackup = () => {
        setShowBackupModal(false);
        createBackup(configYear, configTerm);
    };

    const createBackup = async (overrideYear, overrideTerm) => {
        setCreating(true);
        setProgress({ step: 0, total: 4, message: "Initializing backup..." });

        try {
            // Step 1: Get term info (use override or fetch)
            setProgress({ step: 1, total: 4, message: "Configuring term..." });
            await new Promise(resolve => setTimeout(resolve, 300));

            let term = { year: overrideYear, name: overrideTerm };

            // If no override provided (shouldn't happen with modal, but safe fallback), fetch current
            if (!overrideYear || !overrideTerm) {
                const termSnap = await get(ref(db, "terms/current"));
                if (!termSnap.exists()) throw new Error("No current term set.");
                term = termSnap.val();
            }

            const termKey = `${term.year}-${term.name}`;

            // Step 2: Fetch data
            // Note: We still fetch the CURRENT database state. 
            // The user is just labelling it as a specific term.
            // This is "Backup As..." functionality.
            setProgress({ step: 2, total: 4, message: `Fetching database content for ${termKey}...` });
            const [studentsSnap, scoresSnap, midtermSnap, classesSnap] = await Promise.all([
                get(ref(db, "students")),
                get(ref(db, "scores")),
                get(ref(db, `midtermScores/${term.year}/${term.name}`)), // Try to fetch exact midterm if exists, or maybe global?
                // Actually, if we are backing up AS Term 1, but we are in Term 2, 
                // the `scores` node might contain Term 2 data if it was overwritten.
                // However, usually `scores` is the current active scores. 
                // Using the override term to fetch `midtermScores` is correct/safer if they exist.
                get(ref(db, "classes")),
            ]);

            const payload = {
                meta: {
                    createdAt: new Date().toISOString(),
                    createdBy: currentUser?.uid || "system",
                    term, // The chosen term
                    type: "manual",
                },
                students: studentsSnap.exists() ? studentsSnap.val() : {},
                scores: scoresSnap.exists() ? scoresSnap.val() : {},
                midtermScores: midtermSnap.exists() ? midtermSnap.val() : {},
                classes: classesSnap.exists() ? classesSnap.val() : {},
            };

            // Step 3: Save backup
            setProgress({ step: 3, total: 4, message: "Saving backup..." });
            await new Promise(resolve => setTimeout(resolve, 300));

            const versionId = Date.now().toString();
            await set(ref(db, `backups/stable/${termKey}/versions/${versionId}`), payload);
            await set(ref(db, `backups/stable/${termKey}/latest`), versionId);

            // Step 4: Complete
            setProgress({ step: 4, total: 4, message: "Backup completed!" });
            await new Promise(resolve => setTimeout(resolve, 500));

            // Reload backups
            await loadBackups();

        } catch (err) {
            console.error("Backup failed:", err);
            setProgress({ step: 0, total: 4, message: `Error: ${err.message}` });
        } finally {
            setTimeout(() => setCreating(false), 1000);
        }
    };

    const createNextTemplate = async () => {
        setCreating(true);
        setProgress({ step: 0, total: 3, message: "Initializing template..." });

        try {
            // Step 1: Get current term
            setProgress({ step: 1, total: 3, message: "Reading current term..." });
            await new Promise(resolve => setTimeout(resolve, 300));

            const termSnap = await get(ref(db, "terms/current"));
            if (!termSnap.exists()) throw new Error("No current term set.");
            const term = termSnap.val();

            // Derive next term
            let nextName = "Term 1";
            let nextYear = term.year;
            if (term.name === "Term 1") nextName = "Term 2";
            else if (term.name === "Term 2") nextName = "Term 3";
            else {
                // rotate year (assumes format like 2024/2025)
                try {
                    const parts = term.year.split("/").map(Number);
                    if (parts.length === 2) {
                        const next = `${parts[0] + 1}/${(parts[1] + 1).toString()}`;
                        const p1 = parts[0] + 1;
                        const p2 = parts[1] + 1;
                        nextYear = `${p1}/${p2}`;
                    } else {
                        // Fallback for simple year like "2025"
                        nextYear = (parseInt(term.year) + 1).toString();
                    }
                } catch (e) {
                    nextYear = term.year; // Fallback
                }
                nextName = "Term 1";
            }
            const nextKey = `${nextYear}-${nextName}`;

            // Step 2: Fetch data (classes & students only)
            setProgress({ step: 2, total: 3, message: "Preparing roster..." });
            const [classesSnap, studentsSnap] = await Promise.all([
                get(ref(db, "classes")),
                get(ref(db, "students")),
            ]);

            const template = {
                meta: {
                    createdAt: new Date().toISOString(),
                    createdBy: currentUser?.uid || "system",
                    next: { year: nextYear, name: nextName },
                    type: "template",
                },
                classes: classesSnap.exists() ? classesSnap.val() : {},
                students: {},
            };

            if (studentsSnap.exists()) {
                const data = studentsSnap.val();
                Object.keys(data).forEach((classId) => {
                    template.students[classId] = {};
                    const classData = data[classId] || {};
                    Object.keys(classData).forEach((studentId) => {
                        const s = classData[studentId];
                        template.students[classId][studentId] = {
                            firstName: s.firstName || "",
                            lastName: s.lastName || "",
                            gender: s.gender || "",
                            class: classId,
                            // No scores, attendance, etc.
                        };
                    });
                });
            }

            // Step 3: Save template
            setProgress({ step: 3, total: 3, message: `Saving to backups/next/${nextKey}...` });
            await new Promise(resolve => setTimeout(resolve, 300));

            await set(ref(db, `backups/next/${nextKey}`), template);

            // Complete
            setProgress({ step: 3, total: 3, message: `Template created: ${nextKey}` });
            await new Promise(resolve => setTimeout(resolve, 1000));

        } catch (err) {
            console.error("Template creation failed:", err);
            setProgress({ step: 0, total: 3, message: `Error: ${err.message}` });
        } finally {
            setTimeout(() => setCreating(false), 1500);
        }
    };

    const formatDate = (dateStr) => {
        if (!dateStr) return "Unknown";
        const date = new Date(dateStr);
        const now = new Date();
        const diff = now - date;

        const minutes = Math.floor(diff / 60000);
        const hours = Math.floor(diff / 3600000);
        const days = Math.floor(diff / 86400000);

        if (minutes < 1) return "Just now";
        if (minutes < 60) return `${minutes} min ago`;
        if (hours < 24) return `${hours} hours ago`;
        if (days < 7) return `${days} days ago`;

        return date.toLocaleDateString();
    };

    // Group backups by Year -> Term
    const backupsByYear = React.useMemo(() => {
        const groups = {};
        backups.forEach(b => {
            let year = b.term.year;
            // Fallback: try to extract from termKey (e.g. "2025-Term 1")
            if (!year && b.termKey) {
                const parts = b.termKey.split("-");
                if (parts.length > 0 && parts[0].length === 4 && !isNaN(parts[0])) {
                    year = parts[0];
                }
            }
            year = year || "Unknown";

            if (!groups[year]) groups[year] = [];
            groups[year].push(b);
        });
        return groups;
    }, [backups]);

    const sortedYears = Object.keys(backupsByYear).sort((a, b) => b - a);
    const [expandedYears, setExpandedYears] = useState({});

    const toggleYear = (year) => {
        setExpandedYears(prev => ({ ...prev, [year]: !prev[year] }));
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <div className="text-center">
                    <Loader className="h-12 w-12 animate-spin text-amber-600 mx-auto mb-4" />
                    <p className="text-gray-600">Loading backups...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="max-w-6xl mx-auto space-y-6">
            {/* Header */}
            <div>
                <h1 className="text-3xl font-bold text-gray-900 mb-2">Backup Manager</h1>
                <p className="text-gray-600">Create and manage your database backups</p>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Total Backups */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-white rounded-xl shadow-sm border border-gray-200 p-6"
                >
                    <div className="flex items-center gap-3 mb-2">
                        <div className="h-10 w-10 rounded-lg bg-blue-100 flex items-center justify-center">
                            <Database className="h-5 w-5 text-blue-600" />
                        </div>
                        <h3 className="font-semibold text-gray-900">Total Backups</h3>
                    </div>
                    <p className="text-3xl font-bold text-gray-900">{backups.length}</p>
                </motion.div>

                {/* Last Backup */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 }}
                    className="bg-white rounded-xl shadow-sm border border-gray-200 p-6"
                >
                    <div className="flex items-center gap-3 mb-2">
                        <div className="h-10 w-10 rounded-lg bg-green-100 flex items-center justify-center">
                            <Clock className="h-5 w-5 text-green-600" />
                        </div>
                        <h3 className="font-semibold text-gray-900">Last Backup</h3>
                    </div>
                    <p className="text-lg font-semibold text-gray-900">
                        {lastBackup ? formatDate(lastBackup.createdAt) : "Never"}
                    </p>
                </motion.div>

                {/* Create Backup Button */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2 }}
                    className="bg-gradient-to-br from-brown-700 to-amber-600 rounded-xl shadow-sm p-6 text-white"
                >
                    <h3 className="font-semibold mb-3">Create New Backup</h3>
                    <button
                        onClick={openBackupModal}
                        disabled={creating}
                        className="w-full px-4 py-2 bg-white text-brown-700 rounded-lg font-medium hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {creating ? "Creating..." : "Create Backup"}
                    </button>
                </motion.div>

                {/* Create Next-Term Template Button */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.3 }}
                    className="bg-gradient-to-br from-green-700 to-teal-600 rounded-xl shadow-sm p-6 text-white"
                >
                    <h3 className="font-semibold mb-3">Prepare Next Term</h3>
                    <button
                        onClick={createNextTemplate}
                        disabled={creating}
                        className="w-full px-4 py-2 bg-white text-green-700 rounded-lg font-medium hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {creating ? "Processing..." : "Create Template"}
                    </button>
                </motion.div>
            </div>

            {/* Modal for Backup Configuration */}
            {showBackupModal && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
                    <div className="bg-white rounded-2xl p-8 max-w-md w-full mx-4 shadow-2xl">
                        <h3 className="text-xl font-bold text-gray-900 mb-4">Backup Configuration</h3>
                        <p className="text-sm text-gray-600 mb-4">
                            Please confirm the Term and Year for this backup.
                            <br />
                            <span className="text-xs text-amber-600">Use this to save current data as a different term (e.g. backing up Term 1 data while in Term 2).</span>
                        </p>

                        <div className="space-y-3 mb-6">
                            <div>
                                <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Year</label>
                                <input
                                    type="text"
                                    value={configYear}
                                    onChange={(e) => setConfigYear(e.target.value)}
                                    className="w-full p-2 border border-gray-300 rounded text-gray-900 focus:ring-2 focus:ring-amber-500 focus:outline-none"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Term</label>
                                <select
                                    value={configTerm}
                                    onChange={(e) => setConfigTerm(e.target.value)}
                                    className="w-full p-2 border border-gray-300 rounded text-gray-900 focus:ring-2 focus:ring-amber-500 focus:outline-none"
                                >
                                    <option value="Term 1">Term 1</option>
                                    <option value="Term 2">Term 2</option>
                                    <option value="Term 3">Term 3</option>
                                </select>
                            </div>
                        </div>

                        <div className="flex gap-3">
                            <button
                                onClick={() => setShowBackupModal(false)}
                                className="flex-1 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 font-medium"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={startBackup}
                                className="flex-1 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700 font-medium"
                            >
                                Start Backup
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Progress Modal */}
            <AnimatePresence>
                {creating && !showBackupModal && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50"
                    >
                        <motion.div
                            initial={{ scale: 0.9, y: 20 }}
                            animate={{ scale: 1, y: 0 }}
                            exit={{ scale: 0.9, y: 20 }}
                            className="bg-white rounded-2xl p-8 max-w-md w-full mx-4"
                        >
                            <div className="text-center">
                                {progress.step < progress.total ? (
                                    <Loader className="h-16 w-16 animate-spin text-amber-600 mx-auto mb-4" />
                                ) : (
                                    <CheckCircle className="h-16 w-16 text-green-600 mx-auto mb-4" />
                                )}

                                <h3 className="text-xl font-bold text-gray-900 mb-2">
                                    {progress.step < progress.total ? "Creating Backup" : "Backup Complete!"}
                                </h3>
                                <p className="text-gray-600 mb-4">{progress.message}</p>

                                {/* Progress Bar */}
                                <div className="w-full bg-gray-200 rounded-full h-2 mb-2">
                                    <motion.div
                                        className="h-full bg-amber-600 rounded-full"
                                        initial={{ width: 0 }}
                                        animate={{ width: `${(progress.step / progress.total) * 100}%` }}
                                        transition={{ duration: 0.3 }}
                                    />
                                </div>
                                <p className="text-sm text-gray-500">
                                    Step {progress.step} of {progress.total}
                                </p>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Backups List (Grouped) */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                <div className="px-6 py-4 border-b border-gray-200">
                    <h2 className="text-lg font-semibold text-gray-900">Backup History</h2>
                </div>

                {sortedYears.length === 0 ? (
                    <div className="p-12 text-center">
                        <Archive className="h-16 w-16 text-gray-300 mx-auto mb-4" />
                        <p className="text-gray-600 mb-2">No backups yet</p>
                        <p className="text-sm text-gray-500">Create your first backup to get started</p>
                    </div>
                ) : (
                    <div className="p-6 space-y-4">
                        {sortedYears.map((year) => (
                            <div key={year} className="border border-gray-200 rounded-xl overflow-hidden">
                                <button
                                    onClick={() => toggleYear(year)}
                                    className="w-full flex items-center justify-between p-4 bg-gray-50 hover:bg-gray-100 transition-colors text-left"
                                >
                                    <div className="flex items-center gap-3">
                                        <FolderOpen className="h-5 w-5 text-amber-600" />
                                        <span className="font-bold text-gray-800 text-lg">{year} Backups</span>
                                        <span className="text-sm text-gray-500 bg-white px-2 py-0.5 rounded border border-gray-200">
                                            {backupsByYear[year].length} Terms
                                        </span>
                                    </div>
                                    <div className="text-gray-400">
                                        {expandedYears[year] ? "▼" : "▶"}
                                    </div>
                                </button>

                                <AnimatePresence>
                                    {expandedYears[year] && (
                                        <motion.div
                                            initial={{ height: 0, opacity: 0 }}
                                            animate={{ height: "auto", opacity: 1 }}
                                            exit={{ height: 0, opacity: 0 }}
                                            className="overflow-hidden bg-white"
                                        >
                                            <div className="p-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                                                {backupsByYear[year].sort((a, b) => b.termKey.localeCompare(a.termKey)).map((backup) => (
                                                    <div key={backup.id} className="border border-gray-100 rounded-lg p-4 hover:shadow-md transition-shadow">
                                                        <div className="flex justify-between items-start mb-2">
                                                            <h4 className="font-semibold text-gray-800">{backup.term.name}</h4>
                                                            <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded-full">{backup.size}</span>
                                                        </div>
                                                        <p className="text-xs text-gray-500 mb-4">
                                                            Updated {formatDate(backup.createdAt)}
                                                        </p>
                                                        <div className="flex gap-2">
                                                            <button
                                                                onClick={() => navigate(`/admin/backup-view/${encodeURIComponent(backup.termKey)}/${backup.id}/reports`)}
                                                                className="flex-1 px-3 py-2 bg-blue-50 text-blue-700 text-sm font-medium rounded hover:bg-blue-100 transition-colors"
                                                            >
                                                                Reports
                                                            </button>
                                                            <button
                                                                onClick={() => navigate(`/admin/backup-view/${encodeURIComponent(backup.termKey)}/${backup.id}/midterms`)}
                                                                className="flex-1 px-3 py-2 bg-green-50 text-green-700 text-sm font-medium rounded hover:bg-green-100 transition-colors"
                                                            >
                                                                Midterms
                                                            </button>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        </motion.div>
                                    )}
                                </AnimatePresence>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
