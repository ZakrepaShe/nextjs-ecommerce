"use client";

import { syncBlueprints } from "../actions/arc-blueprints-actions";
import { useUser } from "../components/UserProvider";

export default function AdminPage() {
  const { user } = useUser();
  const handleSyncBlueprints = async () => {
    const result = await syncBlueprints();
    console.log(result);
  };
  return (
    <div className="container mx-auto p-8 flex flex-col items-center justify-center h-screen">
      <h1 className="text-4xl font-bold mb-4">Admin</h1>
      {!user?.isAdmin ? (
        <div className="text-center">
          <p className="text-gray-600 mb-2">You are not authorized to access this page</p>
        </div>
      ) : (
        <div className="text-center">
          <button
            onClick={handleSyncBlueprints}
            className="bg-blue-500 text-white px-4 py-2 rounded-md">
            Sync Blueprints
          </button>
        </div>
      )}
    </div>
  );
}