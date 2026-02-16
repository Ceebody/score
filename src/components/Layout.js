import React, { useState, useEffect } from "react";
import { Outlet } from "react-router-dom";
import SideNav from "./SideNav";
import AdminTopNav from "./admin/AdminTopNav";
import { Menu, X } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { db } from "../utils/firebase";
import { ref, get } from "firebase/database";
import TermTransitionDialog from "./admin/TermTransitionDialog";

export default function Layout({ role }) {
    const [mobileNavOpen, setMobileNavOpen] = useState(false);
    const { currentUser } = useAuth();
    const [currentTerm, setCurrentTerm] = useState(null);
    const [showTermDialog, setShowTermDialog] = useState(false);

    // Fetch current term for admin
    useEffect(() => {
        if (role === 'admin') {
            const fetchTerm = async () => {
                const termSnap = await get(ref(db, "terms/current"));
                if (termSnap.exists()) {
                    setCurrentTerm(termSnap.val());
                }
            };
            fetchTerm();
        }
    }, [role]);

    const handleTermChange = () => {
        setShowTermDialog(true);
    };

    const handleTermTransitionComplete = async () => {
        const termSnap = await get(ref(db, "terms/current"));
        if (termSnap.exists()) {
            setCurrentTerm(termSnap.val());
        }
        setShowTermDialog(false);
        window.location.reload();
    };

    return (
        <div className="flex min-h-screen bg-gray-50 font-sans">
            {/* Desktop SideNav */}
            <div className="hidden md:block">
                <SideNav role={role} />
            </div>

            {/* Mobile Off-canvas Menu */}
            {mobileNavOpen && (
                <div className="fixed inset-0 z-50 flex md:hidden">
                    {/* Backdrop */}
                    <div
                        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
                        onClick={() => setMobileNavOpen(false)}
                    />

                    {/* Sidebar Content reused for mobile */}
                    <div className="relative w-64 max-w-[80%] bg-white shadow-2xl h-full overflow-y-auto">
                        <div className="p-4 flex justify-between items-center border-b">
                            <span className="font-bold text-lg text-indigo-700">Menu</span>
                            <button onClick={() => setMobileNavOpen(false)} className="p-2 rounded hover:bg-gray-100">
                                <X className="h-5 w-5 text-gray-600" />
                            </button>
                        </div>
                        <div className="p-0">
                            {/* We can reuse SideNav content here if we refactor SideNav to be purely presentational or just render it */}
                            {/* Since SideNav has 'hidden md:block' class on the aside, we can't just render <SideNav /> directly without modification if it has layout classes. 
                   Let's assume we will update SideNav to accept a className or style prop to override 'hidden'. 
                   Or better, we wrap SideNav's internal content in a reusable component. 
                   For now, let's just render SideNav and ensure we handle the styling in SideNav to be flexible.
               */}
                            <SideNav role={role} mobile={true} onItemClick={() => setMobileNavOpen(false)} />
                        </div>
                    </div>
                </div>
            )}

            {/* Main Content */}
            <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
                {/* Admin Top Nav - Desktop & Tablet */}
                {role === 'admin' && (
                    <div className="hidden md:block">
                        <AdminTopNav
                            currentTerm={currentTerm}
                            onTermChange={handleTermChange}
                            notificationCount={0}
                        />
                    </div>
                )}

                {/* Mobile Header */}
                <div className="md:hidden bg-white border-b border-gray-200 p-4 flex items-center justify-between sticky top-0 z-30">
                    <button onClick={() => setMobileNavOpen(true)} className="p-2 rounded-lg bg-indigo-600 text-white shadow-sm">
                        <Menu className="h-5 w-5" />
                    </button>
                    <span className="font-semibold text-gray-800">
                        {role === 'admin' ? 'Admin Portal' : role === 'teacher' ? 'Teacher Portal' : role === 'student' ? 'Student Portal' : 'Parent Portal'}
                    </span>
                    <div className="w-9 h-9 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-700 font-bold border border-indigo-200">
                        {currentUser?.email ? currentUser.email[0].toUpperCase() : "U"}
                    </div>
                </div>

                {/* Page Content */}
                <main className="flex-1 overflow-y-auto p-4 md:p-8">
                    <Outlet />
                </main>
            </div>

            {/* Term Transition Dialog */}
            {role === 'admin' && showTermDialog && (
                <TermTransitionDialog
                    isOpen={showTermDialog}
                    onClose={() => setShowTermDialog(false)}
                    onComplete={handleTermTransitionComplete}
                    currentUserId={currentUser?.uid}
                />
            )}
        </div>
    );
}
