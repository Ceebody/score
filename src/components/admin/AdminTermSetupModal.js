import React, { useState, useEffect } from "react";
import { Dialog, Transition } from "@headlessui/react";
import { Fragment } from "react";
import { db } from "../../utils/firebase";
import { ref, update, push, get } from "firebase/database";
import { Calendar, Bell } from "lucide-react";
import { useAuth } from "../../context/AuthContext";

export default function AdminTermSetupModal() {
    const { currentUser } = useAuth();
    const [isOpen, setIsOpen] = useState(false);
    const [loading, setLoading] = useState(true);
    const [termData, setTermData] = useState({
        vacationDate: "",
        reopeningDate: "",
    });

    const [notifications, setNotifications] = useState({
        comments: false,
        midterm: false,
        exam: false,
    });

    const [processing, setProcessing] = useState(false);

    useEffect(() => {
        const checkTerm = async () => {
            try {
                const termRef = ref(db, "terms/current");
                const snap = await get(termRef);

                if (snap.exists()) {
                    const data = snap.val();
                    setTermData({
                        vacationDate: data.vacationDate || "",
                        reopeningDate: data.reopeningDate || "",
                    });

                    // Auto-open if dates are missing
                    if (!data.vacationDate || !data.reopeningDate) {
                        setIsOpen(true);
                    }
                }
            } catch (err) {
                console.error("Error checking term:", err);
            } finally {
                setLoading(false);
            }
        };

        if (currentUser) {
            checkTerm();
        }
    }, [currentUser]);

    const handleDateChange = (e) => {
        setTermData({ ...termData, [e.target.name]: e.target.value });
    };

    const handleCheckboxChange = (e) => {
        setNotifications({ ...notifications, [e.target.name]: e.target.checked });
    };

    const handleSubmit = async () => {
        setProcessing(true);
        try {
            // 1. Update Term Dates
            await update(ref(db, "terms/current"), {
                vacationDate: termData.vacationDate,
                reopeningDate: termData.reopeningDate,
            });

            // 2. Send Notifications
            const messages = [];
            if (notifications.comments) messages.push("Please submit your student comments.");
            if (notifications.midterm) messages.push("Midterm scores submission is due.");
            if (notifications.exam) messages.push("Exam scores submission is due.");

            if (messages.length > 0) {
                const body = messages.join("\n");
                const title = "End of Term Actions Required";
                const now = Date.now();

                // Push to global notifications (or could iterate teachers for specific targeting)
                // Using global for simplicity as per requirement "Send notification to teachers"
                // But better to target "teachers" group if we had one. 
                // Admin usually speaks to all staff.
                // Let's us use the 'global' notification for now, or we can filter teachers. 
                // Since we don't have a specific "teachers" topic in SendNotification logic easily accessible here without fetching all users,
                // We will send to 'global' but prefixed, or if we want to be clean, we iterate.

                // Let's send a GLOBAL notification for now as it's the most reliable "All Staff" equivalent in this simple system.
                // OR we can fetch all teachers.

                const teachersRef = ref(db, "teachers");
                const teachersSnap = await get(teachersRef);
                if (teachersSnap.exists()) {
                    const updates = {};
                    const keys = Object.keys(teachersSnap.val());
                    keys.forEach(uid => {
                        const newNotifKey = push(child(ref(db), `notifications/user/${uid}`)).key;
                        updates[`notifications/user/${uid}/${newNotifKey}`] = {
                            title,
                            body,
                            createdAt: now,
                            createdBy: currentUser.uid,
                            type: 'admin-alert'
                        };
                    });
                    // Also archive it
                    const archiveRef = push(ref(db, `notifications/archive`));
                    updates[`notifications/archive/${archiveRef.key}`] = {
                        title,
                        body,
                        createdAt: now,
                        createdBy: currentUser.uid,
                        target: 'teachers (bulk)',
                        status: 'sent'
                    };

                    await update(ref(db), updates);
                }
            }

            setIsOpen(false);
            alert("Term dates updated and notifications sent!");
        } catch (err) {
            console.error("Error saving:", err);
            alert("Failed to save changes.");
        } finally {
            setProcessing(false);
        }
    };

    if (loading) return null;

    return (
        <Transition appear show={isOpen} as={Fragment}>
            <Dialog as="div" className="relative z-50" onClose={() => setIsOpen(false)}>
                <Transition.Child
                    as={Fragment}
                    enter="ease-out duration-300"
                    enterFrom="opacity-0"
                    enterTo="opacity-100"
                    leave="ease-in duration-200"
                    leaveFrom="opacity-100"
                    leaveTo="opacity-0"
                >
                    <div className="fixed inset-0 bg-black bg-opacity-25" />
                </Transition.Child>

                <div className="fixed inset-0 overflow-y-auto">
                    <div className="flex min-h-full items-center justify-center p-4 text-center">
                        <Transition.Child
                            as={Fragment}
                            enter="ease-out duration-300"
                            enterFrom="opacity-0 scale-95"
                            enterTo="opacity-100 scale-100"
                            leave="ease-in duration-200"
                            leaveFrom="opacity-100 scale-100"
                            leaveTo="opacity-0 scale-95"
                        >
                            <Dialog.Panel className="w-full max-w-md transform overflow-hidden rounded-2xl bg-white p-6 text-left align-middle shadow-xl transition-all">
                                <Dialog.Title
                                    as="h3"
                                    className="text-lg font-medium leading-6 text-gray-900 flex items-center gap-2"
                                >
                                    <Calendar className="h-5 w-5 text-indigo-600" />
                                    Term Setup Required
                                </Dialog.Title>
                                <div className="mt-2">
                                    <p className="text-sm text-gray-500">
                                        The current term is missing critical dates. Please set them below so they appear on student reports.
                                    </p>

                                    <div className="mt-4 space-y-3">
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700">Vacation Date</label>
                                            <input
                                                type="date"
                                                name="vacationDate"
                                                value={termData.vacationDate}
                                                onChange={handleDateChange}
                                                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm border p-2"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700">Reopening Date</label>
                                            <input
                                                type="date"
                                                name="reopeningDate"
                                                value={termData.reopeningDate}
                                                onChange={handleDateChange}
                                                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm border p-2"
                                            />
                                        </div>
                                    </div>

                                    <div className="mt-6 border-t pt-4">
                                        <h4 className="text-sm font-medium text-gray-900 flex items-center gap-2 mb-2">
                                            <Bell className="h-4 w-4 text-amber-500" />
                                            Send Teacher Reminders
                                        </h4>
                                        <div className="space-y-2">
                                            <div className="flex items-center">
                                                <input
                                                    id="notif-comments"
                                                    name="comments"
                                                    type="checkbox"
                                                    checked={notifications.comments}
                                                    onChange={handleCheckboxChange}
                                                    className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                                                />
                                                <label htmlFor="notif-comments" className="ml-2 block text-sm text-gray-900">
                                                    Submit Comments
                                                </label>
                                            </div>
                                            <div className="flex items-center">
                                                <input
                                                    id="notif-midterm"
                                                    name="midterm"
                                                    type="checkbox"
                                                    checked={notifications.midterm}
                                                    onChange={handleCheckboxChange}
                                                    className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                                                />
                                                <label htmlFor="notif-midterm" className="ml-2 block text-sm text-gray-900">
                                                    Submit Midterm Scores
                                                </label>
                                            </div>
                                            <div className="flex items-center">
                                                <input
                                                    id="notif-exam"
                                                    name="exam"
                                                    type="checkbox"
                                                    checked={notifications.exam}
                                                    onChange={handleCheckboxChange}
                                                    className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                                                />
                                                <label htmlFor="notif-exam" className="ml-2 block text-sm text-gray-900">
                                                    Submit Exam Scores
                                                </label>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                <div className="mt-6 flex justify-end gap-3">
                                    <button
                                        type="button"
                                        className="inline-flex justify-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
                                        onClick={() => setIsOpen(false)}
                                        disabled={processing}
                                    >
                                        Close
                                    </button>
                                    <button
                                        type="button"
                                        className="inline-flex justify-center rounded-md border border-transparent bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
                                        onClick={handleSubmit}
                                        disabled={processing}
                                    >
                                        {processing ? "Saving..." : "Save & Notify"}
                                    </button>
                                </div>
                            </Dialog.Panel>
                        </Transition.Child>
                    </div>
                </div>
            </Dialog>
        </Transition>
    );
}
