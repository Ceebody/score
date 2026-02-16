import React, { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
    ChevronDown,
    UserPlus,
    Users,
    BookOpen,
    Database,
    FileText,
    Bell,
    User,
    Settings,
    LogOut,
    Zap,
    Calendar,
    Send,
    ToggleLeft,
} from "lucide-react";
import { useAuth } from "../../context/AuthContext";

/**
 * Admin Top Navigation Bar
 * Features: Quick Actions, Term Switcher, Notifications, Profile
 */
export default function AdminTopNav({ currentTerm, onTermChange, notificationCount = 0 }) {
    const navigate = useNavigate();
    const { currentUser, logout } = useAuth();
    const [showQuickActions, setShowQuickActions] = useState(false);
    const [showTermSwitcher, setShowTermSwitcher] = useState(false);
    const [showProfile, setShowProfile] = useState(false);

    const quickActionsRef = useRef(null);
    const termSwitcherRef = useRef(null);
    const profileRef = useRef(null);

    // Close dropdowns when clicking outside
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (quickActionsRef.current && !quickActionsRef.current.contains(event.target)) {
                setShowQuickActions(false);
            }
            if (termSwitcherRef.current && !termSwitcherRef.current.contains(event.target)) {
                setShowTermSwitcher(false);
            }
            if (profileRef.current && !profileRef.current.contains(event.target)) {
                setShowProfile(false);
            }
        };

        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const quickActions = [
        { id: "register-student", label: "Register Student", icon: UserPlus, route: "/register-student" },
        { id: "register-teacher", label: "Register Teacher", icon: Users, route: "/register-teacher" },
        { id: "register-parent", label: "Register Parent", icon: Users, route: "/register-parent" },
        { id: "divider-1", divider: true },
        { id: "create-backup", label: "Create Backup", icon: Database, route: "/admin/backup-manager" },
        { id: "view-reports", label: "View Reports", icon: FileText, route: "/reports" },
        { id: "send-notification", label: "Send Notification", icon: Send, route: "/admin/notifications" },
        { id: "divider-2", divider: true },
        { id: "publish-controls", label: "Publish Controls", icon: ToggleLeft, route: "/admin/publish" },
    ];

    const handleQuickAction = (action) => {
        if (action.route) {
            navigate(action.route);
        }
        setShowQuickActions(false);
    };

    const handleLogout = async () => {
        await logout();
        navigate("/login");
    };

    return (
        <div className="bg-white border-b border-gray-200 sticky top-0 z-50 shadow-sm">
            <div className="max-w-full mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex items-center justify-between h-16">
                    {/* Left: Logo & App Name */}
                    <div className="flex items-center gap-3">
                        <div className="flex items-center gap-2">
                            <div className="h-10 w-10 bg-gradient-to-br from-indigo-600 to-purple-600 rounded-xl flex items-center justify-center">
                                <BookOpen className="h-6 w-6 text-white" />
                            </div>
                            <div className="hidden md:block">
                                <h1 className="text-xl font-bold text-gray-900">SchoolMS</h1>
                                <p className="text-xs text-gray-500">Dashboard</p>
                            </div>
                        </div>
                    </div>

                    {/* Center: Quick Actions & Term Switcher */}
                    <div className="flex items-center gap-3">
                        {/* Quick Actions Dropdown */}
                        <div className="relative" ref={quickActionsRef}>
                            <button
                                onClick={() => setShowQuickActions(!showQuickActions)}
                                className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors text-sm font-medium text-gray-700"
                            >
                                <Zap className="h-4 w-4 text-yellow-500" />
                                <span className="hidden md:inline">Quick Actions</span>
                                <ChevronDown className={`h-4 w-4 transition-transform ${showQuickActions ? "rotate-180" : ""}`} />
                            </button>

                            <AnimatePresence>
                                {showQuickActions && (
                                    <motion.div
                                        initial={{ opacity: 0, y: -10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        exit={{ opacity: 0, y: -10 }}
                                        transition={{ duration: 0.2 }}
                                        className="absolute left-0 mt-2 w-56 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-50"
                                    >
                                        {quickActions.map((action) =>
                                            action.divider ? (
                                                <div key={action.id} className="my-1 border-t border-gray-200" />
                                            ) : (
                                                <button
                                                    key={action.id}
                                                    onClick={() => handleQuickAction(action)}
                                                    className="w-full flex items-center gap-3 px-4 py-2 hover:bg-indigo-50 transition-colors text-left"
                                                >
                                                    <action.icon className="h-4 w-4 text-gray-600" />
                                                    <span className="text-sm text-gray-700">{action.label}</span>
                                                </button>
                                            )
                                        )}
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </div>

                        {/* Term Switcher */}
                        <div className="relative" ref={termSwitcherRef}>
                            <button
                                onClick={() => setShowTermSwitcher(!showTermSwitcher)}
                                className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-lg hover:from-indigo-700 hover:to-purple-700 transition-colors text-sm font-medium"
                            >
                                <Calendar className="h-4 w-4" />
                                <span className="hidden md:inline">
                                    {currentTerm ? `${currentTerm.year} - ${currentTerm.name}` : "Select Term"}
                                </span>
                                <span className="md:hidden">Term</span>
                                <ChevronDown className={`h-4 w-4 transition-transform ${showTermSwitcher ? "rotate-180" : ""}`} />
                            </button>

                            <AnimatePresence>
                                {showTermSwitcher && (
                                    <motion.div
                                        initial={{ opacity: 0, y: -10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        exit={{ opacity: 0, y: -10 }}
                                        transition={{ duration: 0.2 }}
                                        className="absolute right-0 mt-2 w-64 bg-white rounded-lg shadow-lg border border-gray-200 py-2 z-50"
                                    >
                                        <div className="px-4 py-2 border-b border-gray-200">
                                            <p className="text-xs font-semibold text-gray-500 uppercase">Academic Term</p>
                                        </div>

                                        <div className="py-1">
                                            <div className="px-4 py-2 bg-indigo-50 border-l-4 border-indigo-600">
                                                <div className="flex items-center justify-between">
                                                    <div>
                                                        <p className="text-sm font-semibold text-gray-900">
                                                            {currentTerm ? `${currentTerm.year} - ${currentTerm.name}` : "No Term Selected"}
                                                        </p>
                                                        <p className="text-xs text-indigo-600">Current Term</p>
                                                    </div>
                                                    <div className="h-2 w-2 bg-green-500 rounded-full"></div>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="border-t border-gray-200 mt-2 pt-2">
                                            <button
                                                onClick={() => {
                                                    if (onTermChange) onTermChange();
                                                    setShowTermSwitcher(false);
                                                }}
                                                className="w-full px-4 py-2 text-sm font-medium text-indigo-600 hover:bg-indigo-50 transition-colors text-left flex items-center gap-2"
                                            >
                                                <Calendar className="h-4 w-4" />
                                                Next Term
                                            </button>
                                        </div>
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </div>
                    </div>

                    {/* Right: Notifications & Profile */}
                    <div className="flex items-center gap-3">
                        {/* Notifications */}
                        <button
                            onClick={() => navigate("/admin/notifications")}
                            className="relative p-2 hover:bg-gray-100 rounded-lg transition-colors"
                        >
                            <Bell className="h-5 w-5 text-gray-600" />
                            {notificationCount > 0 && (
                                <span className="absolute top-0 right-0 h-5 w-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center">
                                    {notificationCount > 9 ? "9+" : notificationCount}
                                </span>
                            )}
                        </button>

                        {/* Profile Dropdown */}
                        <div className="relative" ref={profileRef}>
                            <button
                                onClick={() => setShowProfile(!showProfile)}
                                className="flex items-center gap-2 hover:bg-gray-100 rounded-lg px-2 py-1 transition-colors"
                            >
                                <div className="h-8 w-8 bg-gradient-to-br from-indigo-600 to-purple-600 rounded-full flex items-center justify-center">
                                    <User className="h-5 w-5 text-white" />
                                </div>
                                <span className="hidden md:inline text-sm font-medium text-gray-700">Admin</span>
                                <ChevronDown className={`h-4 w-4 text-gray-600 transition-transform ${showProfile ? "rotate-180" : ""}`} />
                            </button>

                            <AnimatePresence>
                                {showProfile && (
                                    <motion.div
                                        initial={{ opacity: 0, y: -10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        exit={{ opacity: 0, y: -10 }}
                                        transition={{ duration: 0.2 }}
                                        className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-50"
                                    >
                                        <button
                                            onClick={() => {
                                                navigate("/profile");
                                                setShowProfile(false);
                                            }}
                                            className="w-full flex items-center gap-3 px-4 py-2 hover:bg-gray-50 transition-colors text-left"
                                        >
                                            <User className="h-4 w-4 text-gray-600" />
                                            <span className="text-sm text-gray-700">Profile</span>
                                        </button>
                                        <button
                                            onClick={() => {
                                                navigate("/settings");
                                                setShowProfile(false);
                                            }}
                                            className="w-full flex items-center gap-3 px-4 py-2 hover:bg-gray-50 transition-colors text-left"
                                        >
                                            <Settings className="h-4 w-4 text-gray-600" />
                                            <span className="text-sm text-gray-700">Settings</span>
                                        </button>
                                        <div className="my-1 border-t border-gray-200" />
                                        <button
                                            onClick={handleLogout}
                                            className="w-full flex items-center gap-3 px-4 py-2 hover:bg-red-50 transition-colors text-left"
                                        >
                                            <LogOut className="h-4 w-4 text-red-600" />
                                            <span className="text-sm text-red-600">Logout</span>
                                        </button>
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
