"use client";

import { useState, useEffect } from "react";
import { getUsersBlueprints } from "@/app/actions/arc-blueprints-actions";
import type { User } from "@/app/components/UserProvider";
import type { UserBlueprint } from "@/app/types";
import UsersList from "./UsersList";
import BlueprintsGrid from "./BlueprintsGrid";
import type { Blueprint } from "@/app/types";

type UsersPageClientProps = {
  users: User[];
  blueprints: Blueprint[];
  blueprintsOrder: string[];
  initialUserBlueprints: Record<string, UserBlueprint>;
};

export default function UsersPageClient({
  users,
  blueprints,
  blueprintsOrder,
  initialUserBlueprints,
}: UsersPageClientProps) {
  const [selectedUser, setSelectedUser] = useState<User | null>(users[0] || null);
  const [userBlueprints, setUserBlueprints] = useState<Record<string, UserBlueprint>>(
    initialUserBlueprints
  );
  const [isLoadingBlueprints, setIsLoadingBlueprints] = useState(false);

  useEffect(() => {
    const loadUserBlueprints = async () => {
      if (!selectedUser) {
        setUserBlueprints({});
        return;
      }

      setIsLoadingBlueprints(true);
      try {
        const result = await getUsersBlueprints(selectedUser.userId);
        setUserBlueprints(result.blueprints);
      } catch (error) {
        console.error("Error loading user blueprints:", error);
      } finally {
        setIsLoadingBlueprints(false);
      }
    };

    loadUserBlueprints();
  }, [selectedUser]);

  const handleSelectUser = (user: User) => {
    setSelectedUser(user);
  };

  return (
    <div className="flex h-[calc(100vh-48px)] bg-black overflow-hidden">
      {/* Left Sidebar - Users List */}
      <div className="w-64 flex-shrink-0 bg-black border-r border-gray-800 overflow-hidden">
        <UsersList users={users} selectedUser={selectedUser} onSelectUser={handleSelectUser} />
      </div>

      {/* Right Side - Blueprints */}
      <div className="flex-1 overflow-hidden">
        {isLoadingBlueprints ? (
          <div className="flex items-center justify-center h-full">
            <p className="text-white">Loading blueprints...</p>
          </div>
        ) : (
          <BlueprintsGrid
            blueprints={blueprints}
            userBlueprints={userBlueprints}
            blueprintsOrder={blueprintsOrder}
          />
        )}
      </div>
    </div>
  );
}
