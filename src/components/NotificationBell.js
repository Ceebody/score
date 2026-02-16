import React, { useState, useEffect, useRef } from "react";
import { Bell } from "lucide-react";
import { useAuth } from "../context/AuthContext";

export default function NotificationBell() {
  const { notifications, unreadMap, markAsRead } = useAuth();
  const [open, setOpen] = useState(false);
  const [toast, setToast] = useState(null);
  const prevLen = useRef(0);

  // show a small toast if a new notification arrives while not focused on dropdown
  useEffect(() => {
    if (!notifications) return;
    if (prevLen.current === 0) {
      prevLen.current = notifications.length;
      return; // initial load — don't toast
    }
    if (notifications.length > prevLen.current) {
      const newNotifs = notifications.slice(0, notifications.length - prevLen.current).reverse();
      const newest = newNotifs[0] || notifications[0];
      if (newest) {
        setToast(newest);
        setTimeout(() => setToast(null), 6000);
      }
    }
    prevLen.current = notifications.length;
  }, [notifications]);

  const unreadCount = notifications
    ? notifications.reduce((acc, n) => (unreadMap && unreadMap[n.id] ? acc : acc + 1), 0)
    : 0;

  return (
    <div className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        className="relative p-2 rounded hover:bg-indigo-100"
        title="Notifications"
      >
        <Bell className="h-5 w-5 text-indigo-700" />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 bg-red-600 text-white text-xs rounded-full px-1">{unreadCount}</span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-80 bg-white border rounded shadow-lg z-50 p-2">
          <div className="flex justify-between items-center mb-2">
            <h4 className="font-semibold">Notifications</h4>
            <button
              className="text-sm text-indigo-600"
              onClick={() => {
                // mark all read
                notifications.forEach((n) => markAsRead(n.id));
              }}
            >
              Mark all read
            </button>
          </div>
          <div className="max-h-64 overflow-y-auto">
            {notifications.length === 0 && <p className="text-sm text-gray-600">No notifications</p>}
            {notifications.map((n) => (
              <div key={n.id} className={`p-2 mb-1 rounded ${unreadMap && unreadMap[n.id] ? 'bg-gray-50' : 'bg-white'}`}>
                <div className="flex justify-between items-start">
                  <div>
                    <div className="font-semibold text-sm">{n.title}</div>
                    <div className="text-xs text-gray-600">{new Date(n.createdAt || n.timestamp || Date.now()).toLocaleString()}</div>
                    <div className="text-sm mt-1">{n.body}</div>
                  </div>
                  <div className="ml-2">
                    {! (unreadMap && unreadMap[n.id]) && (
                      <button
                        onClick={() => markAsRead(n.id)}
                        className="text-xs text-indigo-600"
                      >
                        Mark read
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* transient toast */}
      {toast && (
        <div className="fixed right-6 top-6 z-50 bg-indigo-700 text-white p-3 rounded shadow-lg">
          <div className="font-semibold">{toast.title}</div>
          <div className="text-sm">{toast.body}</div>
        </div>
      )}
    </div>
  );
}
