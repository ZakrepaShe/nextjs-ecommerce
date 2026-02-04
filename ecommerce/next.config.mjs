/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  experimental: {
    outputFileTracingIncludes: {
      "/arc-raiders/blueprints": ["./public/templates/**/*"],
      "/api/*": ["./public/templates/**/*"],
    },
  },
};

export default nextConfig;
