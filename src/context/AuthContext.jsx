import { createContext, useContext, useEffect, useState } from "react";
import { onAuthStateChanged } from "firebase/auth";
import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  serverTimestamp,
} from "firebase/firestore";

import { auth, db } from "../firebase/firebase";

const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [currentUser, setCurrentUser] = useState(null);
  const [userData, setUserData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      try {
        if (firebaseUser) {
          const userRef = doc(db, "users", firebaseUser.uid);
          const userSnap = await getDoc(userRef);

          if (userSnap.exists()) {
            await updateDoc(userRef, {
              status: "online",
              lastSeen: serverTimestamp(),
            });

            setUserData(userSnap.data());
          } else {
            const newUser = {
              uid: firebaseUser.uid,
              name: firebaseUser.displayName || "Без имени",
              email: firebaseUser.email,
              avatarUrl: firebaseUser.photoURL || "",
              role: "user",
              status: "online",
              createdAt: serverTimestamp(),
              lastSeen: serverTimestamp(),
            };

            await setDoc(userRef, newUser);
            setUserData(newUser);
          }

          setCurrentUser(firebaseUser);
        } else {
          setCurrentUser(null);
          setUserData(null);
        }
      } catch (error) {
        console.error("Ошибка AuthContext:", error);
      } finally {
        setLoading(false);
      }
    });

    return () => unsubscribe();
  }, []);

  const value = {
    currentUser,
    userData,
    loading,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  return useContext(AuthContext);
}