/**
 * Gets the API base URL, with fallback for local development.
 * Uses NEXT_PUBLIC_API_URL when available (for Vercel), otherwise falls back to localhost.
 */
export function getApiUrl(): string {
  // For client components, NEXT_PUBLIC_* vars are replaced at build time
  // For server components, they're available at runtime
  const apiUrl = process.env.NEXT_PUBLIC_API_URL;
  
  // If undefined or the string "undefined", use localhost fallback
  if (!apiUrl || apiUrl === 'undefined') {
    return 'http://localhost:3000';
  }
  
  return apiUrl;
}

