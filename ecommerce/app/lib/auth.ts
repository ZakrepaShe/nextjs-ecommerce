"use server";

import { cookies } from "next/headers";
import { connectToDatabase } from "@/app/api/db";
import type { User, FrontendUser } from "../types";

const SESSION_COOKIE_NAME = "session_userId";
const COOKIE_MAX_AGE = 60 * 60 * 24 * 7; // 7 days

/**
 * Sets the authenticated user session cookie
 */
export async function setAuthCookie(userId: string) {
  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE_NAME, userId, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: COOKIE_MAX_AGE,
    path: "/",
  });
}

/**
 * Clears the authentication cookie (logout)
 */
export async function clearAuthCookie() {
  const cookieStore = await cookies();
  cookieStore.delete(SESSION_COOKIE_NAME);
}

/**
 * Gets the authenticated user's ID from the session cookie
 */
export async function getAuthUserId(): Promise<string | null> {
  const cookieStore = await cookies();
  const userId = cookieStore.get(SESSION_COOKIE_NAME)?.value;
  return userId || null;
}

/**
 * Gets the full authenticated user from the database
 */
export async function getAuthenticatedUser(): Promise<FrontendUser | null> {
  const userId = await getAuthUserId();

  if (!userId) {
    return null;
  }

  try {
    const { db } = await connectToDatabase();
    const user = await db.collection<User>("users").findOne({ userId });

    if (!user) {
      // User ID in cookie but user doesn't exist - clear the cookie
      await clearAuthCookie();
      return null;
    }

    return {
      userId: user.userId,
      name: user.name,
      isAdmin: user.isAdmin,
    };
  } catch (error) {
    console.error("Error fetching authenticated user:", error);
    return null;
  }
}

/**
 * Requires authentication - redirects to login if not authenticated
 */
export async function requireAuth(): Promise<FrontendUser> {
  const user = await getAuthenticatedUser();

  if (!user) {
    throw new Error("Authentication required");
  }

  return user;
}
