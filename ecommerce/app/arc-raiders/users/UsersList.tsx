"use client";

import type { User } from "@/app/components/UserProvider";

type UsersListProps = {
  users: User[];
  selectedUser: User | null;
  onSelectUser: (user: User) => void;
};

export default function UsersList({ users, selectedUser, onSelectUser }: UsersListProps) {
  return (
    <div className="h-full flex flex-col p-4">
      <h1 className="text-2xl font-bold text-white uppercase mb-4">Users</h1>
      <ul className="space-y-2 overflow-y-auto flex-1">
        {users.map((user) => (
          <li
            key={user.userId}
            onClick={() => onSelectUser(user)}
            className={`cursor-pointer p-3 rounded-md transition-colors ${selectedUser?.userId === user.userId
                ? "bg-gray-800 text-white font-semibold"
                : "text-gray-300 hover:bg-gray-900 hover:text-white"
              }`}
          >
            {user.name}
          </li>
        ))}
      </ul>
    </div>
  );
}