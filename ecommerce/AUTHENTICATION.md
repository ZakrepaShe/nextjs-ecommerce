# Authentication System Documentation

## Overview

This application uses **server-side authentication** with HTTP-only cookies for secure session management. The authentication state is synchronized between the server and client.

## Architecture

### Server-Side Components

#### 1. **Auth Library** (`app/lib/auth.ts`)

Core authentication utilities that manage session cookies:

- `setAuthCookie(userId)` - Creates a secure HTTP-only cookie with the user's ID
- `clearAuthCookie()` - Removes the authentication cookie (logout)
- `getAuthUserId()` - Retrieves the authenticated user's ID from cookies
- `getAuthenticatedUser()` - Fetches the complete user object from the database
- `requireAuth()` - Throws an error if user is not authenticated

**Cookie Configuration:**

- Name: `session_userId`
- HTTP-only: Yes (prevents JavaScript access - XSS protection)
- Secure: Yes in production (HTTPS only)
- SameSite: Lax (CSRF protection)
- Max Age: 7 days
- Path: `/`

#### 2. **Middleware** (`middleware.ts`)

Protects routes at the edge before they even load:

**Protected Routes** (require authentication):

- `/arc-raiders/blueprints`
- `/cart`
- `/checkout`
- `/admin`

**Auth Routes** (redirect if already authenticated):

- `/login`
- `/register`

When accessing a protected route without authentication, users are redirected to `/login?redirect=/original-path` and then redirected back after successful login.

#### 3. **User Actions** (`app/actions/user-actions.ts`)

Server actions that handle authentication operations:

- `login(name, password)` - Authenticates user and sets cookie
- `register(name, password)` - Creates user account and sets cookie
- `logout()` - Clears authentication cookie
- `getCurrentUser()` - Returns current user (for client sync)

### Client-Side Components

#### 1. **UserProvider** (`app/components/UserProvider.tsx`)

React Context provider that:

- Syncs with server authentication on mount by calling `getCurrentUser()`
- Provides user state to all client components
- Exposes `user`, `setUser`, and `isLoading` values

#### 2. **AuthForm** (`app/components/AuthForm.tsx`)

Handles login/register forms:

- Calls server actions for authentication
- Updates client-side user context
- Handles redirect parameter for post-login navigation

## Using Authentication

### In Server Components

Server Components can directly access authentication:

```typescript
import { getAuthenticatedUser } from "@/app/lib/auth";
import { redirect } from "next/navigation";

export default async function MyPage() {
  const user = await getAuthenticatedUser();

  if (!user) {
    redirect("/login");
  }

  // Use user.userId, user.name, user.isAdmin
  return <div>Hello {user.name}</div>;
}
```

### In Client Components

Client Components use the UserContext:

```typescript
"use client";

import { useUser } from "@/app/components/UserProvider";

export default function MyComponent() {
  const { user, isLoading } = useUser();

  if (isLoading) {
    return <div>Loading...</div>;
  }

  if (!user) {
    return <div>Please log in</div>;
  }

  return <div>Hello {user.name}</div>;
}
```

### In Server Actions

Server Actions can access the authenticated user:

```typescript
"use server";

import { getAuthenticatedUser } from "@/app/lib/auth";

export async function myAction() {
  const user = await getAuthenticatedUser();

  if (!user) {
    return { error: "Not authenticated" };
  }

  // Use user.userId for database operations
  // ...
}
```

## Security Features

### 1. **HTTP-Only Cookies**

- Cookies are inaccessible to JavaScript (prevents XSS attacks)
- Only the server can read/write authentication cookies

### 2. **Secure Cookie Attributes**

- `secure`: Only transmitted over HTTPS in production
- `sameSite: lax`: Protection against CSRF attacks
- Short-lived: 7-day expiration

### 3. **No User ID in URLs**

- User ID never appears in URLs (prevents enumeration attacks)
- Authentication is always validated server-side

### 4. **Middleware Protection**

- Routes are protected at the edge before rendering
- Unauthorized access is immediately redirected

### 5. **Server-Side Validation**

- Every protected page validates authentication on the server
- Client-side context is only for UI convenience

## Authentication Flow

### Login/Register Flow

1. User submits login/register form
2. Server action validates credentials
3. On success, server sets HTTP-only cookie
4. Server returns user data (without password)
5. Client updates UserContext
6. User redirected to protected page

### Page Load Flow

1. User navigates to protected page
2. Middleware checks for authentication cookie
3. If no cookie, redirect to `/login`
4. If cookie exists, page loads
5. Server Component calls `getAuthenticatedUser()`
6. User data passed to Client Components
7. UserProvider syncs with server on mount

### Logout Flow

1. User clicks logout
2. Client calls `logout()` server action
3. Server clears authentication cookie
4. Client clears UserContext
5. User redirected to login page

## Best Practices

### ✅ DO

- Use `getAuthenticatedUser()` in Server Components and Actions
- Use `useUser()` hook in Client Components
- Validate authentication server-side for sensitive operations
- Use the middleware for route protection
- Store minimal data in cookies (just user ID)

### ❌ DON'T

- Don't put user ID in URLs for authentication
- Don't store passwords or sensitive data in cookies
- Don't rely solely on client-side authentication
- Don't access localStorage for authentication state
- Don't bypass server-side validation

## Migration Notes

### What Changed

**Before:**

- Authentication state stored in localStorage only
- No server-side session management
- User ID could be manipulated by clients

**After:**

- HTTP-only cookies for session management
- Server-side authentication validation
- Secure, tamper-proof user sessions

### Backwards Compatibility

The `UserProvider` still provides the same interface:

- `user` - Current user object
- `setUser()` - Update user state

However, it now syncs with server authentication instead of localStorage.

## Troubleshooting

### User not persisting between refreshes

- Check that cookies are being set (DevTools → Application → Cookies)
- Verify `secure` flag matches environment (should be false in development)

### Infinite redirect loops

- Check middleware matcher configuration
- Ensure `/login` and `/register` are in `authRoutes`
- Verify cookie name matches between middleware and auth library

### "Not authenticated" errors

- Ensure server actions call `getAuthenticatedUser()`
- Check cookie expiration (7 days default)
- Verify database connection is working
