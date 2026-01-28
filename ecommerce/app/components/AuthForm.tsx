"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import toast from "react-hot-toast";
import { useUser } from "./UserProvider";
import type { FrontendUser } from "../types";

export type AuthFormType = "login" | "register";

type AuthFormProps = {
  type: AuthFormType;
  action: (name: string, password: string) => Promise<{
    success: boolean;
    message?: string;
    user?: FrontendUser;
  }>;
};

export default function AuthForm({ type, action }: AuthFormProps) {
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();
  const searchParams = useSearchParams();
  const { setUser } = useUser();

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsLoading(true);
    const formData = new FormData(e.target as HTMLFormElement);
    const name = formData.get("name") as string;
    const password = formData.get("password") as string;

    try {
      const result = await action(name, password);
      if (result && !result.success) {
        toast.error(result.message || "An error occurred");
      } else if (result && result.success) {
        // Store user in context (password will be excluded automatically)
        if (result.user) {
          setUser(result.user);
        }
        toast.success(result.message || "Success!");

        // Redirect to the original page or default to blueprints
        const redirectTo = searchParams.get("redirect") || "/arc-raiders/blueprints";
        router.push(redirectTo);
      }
    } catch (error) {
      toast.error("An unexpected error occurred");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <div className="mb-4">
        <label htmlFor="name" className="block text-gray-700 font-bold mb-2">
          Name
        </label>
        <input
          type="text"
          id="name"
          name="name"
          className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
        />
      </div>
      <div className="mb-4">
        <label
          htmlFor="password"
          className="block text-gray-700 font-bold mb-2"
        >
          Password
        </label>
        <input
          type="password"
          id="password"
          name="password"
          className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
        />
      </div>
      <div className="mb-4">
        <button
          disabled={isLoading}
          className={`w-full ${isLoading ? "opacity-50 cursor-not-allowed" : ""} bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline`}
          type="submit"
        >
          {isLoading
            ? "Submitting..."
            : type === "login"
              ? "Login"
              : "Register"}
        </button>
      </div>
    </form>
  );
}
