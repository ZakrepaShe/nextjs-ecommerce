"use server";

import { cookies } from "next/headers";
import { connectToDatabase } from "@/app/api/db";
import { Db } from "mongodb";
import type { User, FrontendUser } from "../types";

const SESSION_COOKIE_NAME = "session_userId";
const COOKIE_MAX_AGE = 60 * 60 * 24 * 7; // 7 days

/**
 * Sets the authenticated user session cookie
 */
async function setAuthCookie(userId: string) {
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
async function clearAuthCookie() {
  const cookieStore = await cookies();
  cookieStore.delete(SESSION_COOKIE_NAME);
}

/**
 * Gets the authenticated user's ID from the session cookie
 */
async function getAuthUserId(): Promise<string | null> {
  const cookieStore = await cookies();
  const userId = cookieStore.get(SESSION_COOKIE_NAME)?.value;
  console.log("[Auth] getAuthUserId:", { userId, hasCookie: !!userId });
  return userId || null;
}

/**
 * Gets the full authenticated user from the database
 */
async function getAuthenticatedUser(): Promise<FrontendUser | null> {
  console.log("[Auth] getAuthenticatedUser called");
  const userId = await getAuthUserId();

  if (!userId) {
    console.log("[Auth] No userId found in cookie");
    return null;
  }

  console.log("[Auth] Found userId in cookie:", userId);

  try {
    console.log("[Auth] Connecting to database...");
    const { db } = await connectToDatabase();
    console.log("[Auth] Querying for user with userId:", userId);
    const user = await db.collection<User>("users").findOne({ userId });

    if (!user) {
      console.log("[Auth] User not found in database, clearing cookie");
      // User ID in cookie but user doesn't exist - clear the cookie
      await clearAuthCookie();
      return null;
    }

    console.log("[Auth] User found:", {
      userId: user.userId,
      name: user.name,
      isAdmin: user.isAdmin,
    });
    return {
      userId: user.userId,
      name: user.name,
      isAdmin: user.isAdmin,
    };
  } catch (error) {
    console.error("[Auth] Error fetching authenticated user:", error);
    return null;
  }
}

const convertToFrontendUser = (user: User): FrontendUser => {
  return {
    userId: user.userId,
    name: user.name,
    isAdmin: user.isAdmin,
  };
};

async function getNextUserId(db: Db): Promise<string> {
  const counterCollection = db.collection("counters");

  // Try to increment the userId counter
  const result = await counterCollection.findOneAndUpdate(
    { type: "userId" },
    { $inc: { sequence_value: 1 } },
    { upsert: true, returnDocument: "after" }
  );

  // If the document was just created, it starts at 1
  if (!result || !result.sequence_value) {
    // Check if there are any existing users to determine starting point
    const existingUsers = await db
      .collection("users")
      .find({ userId: { $exists: true } })
      .sort({ userId: -1 })
      .limit(1)
      .toArray();

    if (existingUsers.length > 0) {
      const maxUserId = parseInt(existingUsers[0].userId) || 0;
      const nextUserId = maxUserId + 1;
      await counterCollection.updateOne(
        { type: "userId" },
        { $set: { sequence_value: nextUserId } },
        { upsert: true }
      );
      return nextUserId.toString();
    }

    // Start from 1 if no users exist
    await counterCollection.updateOne(
      { type: "userId" },
      { $set: { sequence_value: 1 } },
      { upsert: true }
    );
    return "1";
  }

  return result.sequence_value.toString();
}

export async function login(name: string, password: string) {
  const { db } = await connectToDatabase();
  const user = await db.collection<User>("users").findOne({ name });
  if (!user) {
    return {
      success: false,
      message: "Invalid name or password",
      user: null,
    };
  }
  if (user.password !== password) {
    return {
      success: false,
      message: "Invalid name or password",
      user: null,
    };
  }

  // Set authentication cookie
  await setAuthCookie(user.userId);

  return {
    success: true,
    message: "Login successful",
    user: convertToFrontendUser(user),
  };
}

export async function register(name: string, password: string) {
  const { db } = await connectToDatabase();
  const user = await db.collection<User>("users").findOne({ name });
  if (user) {
    if (user.password === password) {
      // Set authentication cookie for existing user
      await setAuthCookie(user.userId);
      return {
        success: true,
        message: "User already exists and is logged in",
        user: convertToFrontendUser(user),
      };
    }
    return {
      success: false,
      message: "User already exists",
      user: null,
    };
  }
  const userId = await getNextUserId(db);
  const newUser = await db
    .collection("users")
    .insertOne({ userId, name, password });

  const insertedUser = await db
    .collection<User>("users")
    .findOne({ _id: newUser.insertedId });

  if (!insertedUser) {
    return {
      success: false,
      message: "Failed to register user",
      user: null,
    };
  }

  // Set authentication cookie for new user
  await setAuthCookie(insertedUser.userId);

  return {
    success: true,
    message: "User registered and logged in successfully",
    user: convertToFrontendUser(insertedUser),
  };
}

export async function logout() {
  await clearAuthCookie();
  return {
    success: true,
    message: "Logged out successfully",
  };
}

export async function getCurrentUser() {
  console.log("[user-actions] getCurrentUser called");
  const user = await getAuthenticatedUser();
  console.log("[user-actions] getCurrentUser returning:", user);
  return user;
}
