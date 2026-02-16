import React, { createContext, useContext, useEffect, useRef, useState } from "react";
import { getAuth, onAuthStateChanged, signOut } from "firebase/auth";
import { ref, get, onValue, set } from "firebase/database";
import { db } from "../utils/firebase";

const AuthContext = createContext();

export function useAuth() {
  return useContext(AuthContext);
}

export function AuthProvider({ children }) {
  const [currentUser, setCurrentUser] = useState(null);
  const [role, setRole] = useState(null);
  const [loading, setLoading] = useState(true);
  const [notifications, setNotifications] = useState([]);
  const [unreadMap, setUnreadMap] = useState({});
  const listenersRef = useRef([]);
  const firstLoadRef = useRef(true);

  useEffect(() => {
    const auth = getAuth();
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        setCurrentUser(user);

        // Fetch role from Realtime Database
        const userRef = ref(db, `users/${user.uid}`);
        const snapshot = await get(userRef);
        if (snapshot.exists()) {
          const data = snapshot.val();
          setRole(data.role || null);
          // set up notification listeners after role/profile known
          setupNotificationListeners(user.uid, data.classId || null);
        } else {
          setRole(null);
          setupNotificationListeners(user.uid, null);
        }
      } else {
        // cleanup notification listeners
        cleanupListeners();
        setCurrentUser(null);
        setRole(null);
      }
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  const logout = () => {
    const auth = getAuth();
    return signOut(auth);
  };

  function cleanupListeners() {
    listenersRef.current.forEach((unsub) => {
      try { unsub(); } catch (e) { /* ignore */ }
    });
    listenersRef.current = [];
    setNotifications([]);
    setUnreadMap({});
    firstLoadRef.current = true;
  }

  function setupNotificationListeners(uid, classId) {
    // remove existing listeners
    cleanupListeners();

    // helper to merge notif arrays and dedupe by id
    function mergeNotifications(newArr) {
      setNotifications((prev) => {
        const map = new Map();
        prev.forEach((p) => map.set(p.id, p));
        newArr.forEach((n) => map.set(n.id, n));
        const merged = Array.from(map.values()).sort((a, b) => (b.createdAt || b.timestamp || 0) - (a.createdAt || a.timestamp || 0));
        return merged;
      });
    }

    // global
    const gRef = ref(db, `notifications/global`);
    const unsubG = onValue(gRef, (snap) => {
      const val = snap.val() || {};
      const arr = Object.keys(val).map((k) => ({ id: k, ...val[k] }));
      mergeNotifications(arr);
    });
    listenersRef.current.push(unsubG);

    // user-specific
    const uRef = ref(db, `notifications/user/${uid}`);
    const unsubU = onValue(uRef, (snap) => {
      const val = snap.val() || {};
      const arr = Object.keys(val).map((k) => ({ id: k, ...val[k] }));
      mergeNotifications(arr);
    });
    listenersRef.current.push(unsubU);

    // class-specific (if we have classId)
    if (classId) {
      const cRef = ref(db, `notifications/class/${classId}`);
      const unsubC = onValue(cRef, (snap) => {
        const val = snap.val() || {};
        const arr = Object.keys(val).map((k) => ({ id: k, ...val[k] }));
        mergeNotifications(arr);
      });
      listenersRef.current.push(unsubC);
    }

    // subscribe to per-user read map: notificationReadsByUser/<uid>
    const readsRef = ref(db, `notificationReadsByUser/${uid}`);
    const unsubR = onValue(readsRef, (snap) => {
      const val = snap.val() || {};
      setUnreadMap(val);
    });
    listenersRef.current.push(unsubR);
  }

  // mark notification as read for current user
  async function markAsRead(notifId) {
    if (!currentUser) return;
    try {
      await set(ref(db, `notificationReadsByUser/${currentUser.uid}/${notifId}`), true);
    } catch (err) {
      console.error("Failed to mark notification read:", err);
    }
  }

  return (
    <AuthContext.Provider value={{ currentUser, role, logout, notifications, unreadMap, markAsRead }}>
      {!loading && children}
    </AuthContext.Provider>
  );
}
