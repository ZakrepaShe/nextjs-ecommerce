import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// Routes that require authentication
const protectedRoutes = [
  "/arc-raiders/blueprints",
  "/cart",
  "/checkout",
  "/admin",
];

// Routes that should redirect to home if already authenticated
const authRoutes = ["/login", "/register"];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  console.log("[Middleware] Request:", {
    method: request.method,
    pathname,
    headers: {
      "next-action": request.headers.get("next-action"),
      "content-type": request.headers.get("content-type"),
    },
  });

  // Skip middleware entirely for non-GET requests (Server Actions, API calls, etc.)
  // Middleware should only handle page navigation redirects
  if (request.method !== "GET") {
    console.log("[Middleware] Skipping non-GET request");
    return NextResponse.next();
  }

  const sessionCookie = request.cookies.get("session_userId");
  const isAuthenticated = !!sessionCookie;

  console.log("[Middleware] Auth check:", {
    hasSessionCookie: !!sessionCookie,
    sessionValue: sessionCookie?.value,
    isAuthenticated,
  });

  // Check if the current route is protected
  const isProtectedRoute = protectedRoutes.some((route) =>
    pathname.startsWith(route)
  );

  // Check if the current route is an auth route
  const isAuthRoute = authRoutes.some((route) => pathname.startsWith(route));

  console.log("[Middleware] Route check:", {
    isProtectedRoute,
    isAuthRoute,
  });

  // Redirect to login if trying to access protected route without authentication
  if (isProtectedRoute && !isAuthenticated) {
    console.log("[Middleware] Redirecting to login - no auth");
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("redirect", pathname);
    return NextResponse.redirect(loginUrl);
  }

  // Redirect to home if trying to access auth routes while authenticated
  if (isAuthRoute && isAuthenticated) {
    console.log(
      "[Middleware] Redirecting to blueprints - already authenticated"
    );
    return NextResponse.redirect(
      new URL("/arc-raiders/blueprints", request.url)
    );
  }

  console.log("[Middleware] Allowing request through");
  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - _next/data (data fetching)
     * - favicon.ico (favicon file)
     * - public files (images, etc)
     */
    "/((?!api|_next/static|_next/image|_next/data|favicon.ico|.*\\.(?:jpg|jpeg|gif|png|svg|ico|webp|bmp)).*)",
  ],
};
