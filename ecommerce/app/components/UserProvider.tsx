"use client";

import { useState, useEffect, useContext } from "react";
import { createContext } from "react";
import { getCurrentUser } from "../actions/user-actions";

export type User = {
  _id?: string;
  userId: string;
  name: string;
  isAdmin: boolean;
};

export const UserContext = createContext<{
  user: User | null;
  setUser: (user: User | null) => void;
  isLoading: boolean;
}>({
  user: null,
  setUser: () => { },
  isLoading: true,
});

export default function UserProvider({ children }: { children: React.ReactNode }) {
  const [user, setUserState] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Sync with server-side authentication on mount
  useEffect(() => {
    const syncUser = async () => {
      try {
        console.log("[UserProvider] Calling getCurrentUser...");
        const serverUser = await getCurrentUser();
        console.log("[UserProvider] getCurrentUser returned:", serverUser);
        setUserState(serverUser);
      } catch (error) {
        console.error("[UserProvider] Error syncing user from server:", error);
        setUserState(null);
      } finally {
        setIsLoading(false);
      }
    };

    syncUser();
  }, []);

  const setUser = (newUser: User | null) => {
    setUserState(newUser);
  };

  return (
    <UserContext.Provider value={{ user, setUser, isLoading }}>
      {children}
    </UserContext.Provider>
  );
}

// Custom hook to easily access user context
export function useUser() {
  const context = useContext(UserContext);
  if (context === undefined) {
    throw new Error("useUser must be used within a UserProvider");
  }
  return context;
}