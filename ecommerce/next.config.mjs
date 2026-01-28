/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  // Generate unique build ID to prevent Server Action mismatches
  generateBuildId: async () => {
    // Use timestamp to ensure each build has a unique ID
    return `build-${Date.now()}`;
  },
};

export default nextConfig;
