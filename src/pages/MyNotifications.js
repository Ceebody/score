import React from "react";
import { useAuth } from "../context/AuthContext";
import { Bell, Check } from "lucide-react";

export default function MyNotifications() {
    const { notifications, unreadMap, markAsRead } = useAuth();

    const handleMarkAllRead = () => {
        if (notifications) {
            notifications.forEach((n) => markAsRead(n.id));
        }
    };

    return (
        <div className="p-6 max-w-4xl mx-auto">
            <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold flex items-center gap-2">
                    <Bell className="h-6 w-6 text-indigo-600" />
                    My Notifications
                </h2>

                {notifications && notifications.length > 0 && (
                    <button
                        onClick={handleMarkAllRead}
                        className="flex items-center gap-2 px-4 py-2 bg-indigo-50 text-indigo-700 rounded-lg hover:bg-indigo-100 transition-colors text-sm font-medium"
                    >
                        <Check className="h-4 w-4" />
                        Mark all read
                    </button>
                )}
            </div>

            <div className="space-y-4">
                {!notifications || notifications.length === 0 ? (
                    <div className="text-center py-12 bg-white rounded-xl border border-dashed border-gray-300">
                        <Bell className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                        <p className="text-gray-500">No notifications yet</p>
                    </div>
                ) : (
                    notifications.map((n) => {
                        const isUnread = unreadMap && unreadMap[n.id];
                        return (
                            <div
                                key={n.id}
                                className={`p-5 rounded-xl border transition-all ${!isUnread
                                        ? 'bg-white border-l-4 border-l-indigo-500 shadow-sm'
                                        : 'bg-indigo-50/50 border-l-4 border-l-indigo-200 opacity-75'
                                    } border-gray-100 hover:shadow-md`}
                            >
                                <div className="flex justify-between items-start gap-4">
                                    <div className="flex-1">
                                        <h3 className={`font-semibold text-lg mb-1 ${!isUnread ? 'text-gray-900' : 'text-gray-700'}`}>
                                            {n.title}
                                        </h3>
                                        <p className="text-gray-600 leading-relaxed">{n.body}</p>
                                        <p className="text-xs text-gray-400 mt-3 font-medium">
                                            {n.createdAt || n.timestamp ? new Date(n.createdAt || n.timestamp).toLocaleString() : 'Just now'}
                                        </p>
                                    </div>

                                    {!isUnread && (
                                        <button
                                            onClick={() => markAsRead(n.id)}
                                            className="shrink-0 p-2 text-indigo-600 hover:bg-indigo-50 rounded-full transition-colors"
                                            title="Mark as read"
                                        >
                                            <div className="h-3 w-3 rounded-full bg-indigo-500"></div>
                                        </button>
                                    )}
                                </div>
                            </div>
                        );
                    })
                )}
            </div>
        </div>
    );
}
