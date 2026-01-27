"use client"; 

import { useState, useEffect, useContext } from "react";
import { createContext } from "react";

export type User = {
  _id?: string;
  userId: string;
  name: string;
  isAdmin: boolean;
};

const STORAGE_KEY = "loggedInUser";

export const UserContext = createContext<{ 
  user: User | null; 
  setUser: (user: User | null) => void;
}>({ 
  user: null, 
  setUser: () => {} 
});

export default function UserProvider({ children }: { children: React.ReactNode }) {
  const [user, setUserState] = useState<User | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);

  // Load user from localStorage on mount
  useEffect(() => {
    try {
      const storedUser = localStorage.getItem(STORAGE_KEY);
      if (storedUser) {
        setUserState(JSON.parse(storedUser));
      }
    } catch (error) {
      console.error("Error loading user from localStorage:", error);
    } finally {
      setIsLoaded(true);
    }
  }, []);

  // Save user to localStorage whenever it changes
  const setUser = (newUser: User | null) => {
    setUserState(newUser);
    try {
      if (newUser) {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(newUser));
      } else {
        localStorage.removeItem(STORAGE_KEY);
      }
    } catch (error) {
      console.error("Error saving user to localStorage:", error);
    }
  };

  return (
    <UserContext.Provider value={{ user, setUser }}>
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