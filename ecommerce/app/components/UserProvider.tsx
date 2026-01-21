"use client"; 

import { useState } from "react";
import { createContext } from "react";

export type User = {
  userId: string;
  name: string;
  password: string;
};

export const UserContext = createContext<{ user: User | null; setUser: (user: User | null) => void }>({ user: null, setUser: () => {} });

export default function UserProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  return <UserContext.Provider value={{ user, setUser }}>{children}</UserContext.Provider>;
}