/** @type {import('next').NextConfig} */
const nextConfig = {
  typescript: {
    ignoreBuildErrors: true,
  },
  // Keep the native canvas addon and the OpenCV wasm bundle external so
  // Turbopack does not try to bundle them.
  serverExternalPackages: ["canvas", "@techstark/opencv-js"],
  outputFileTracingIncludes: {
    "/arc-raiders/blueprints": ["./public/templates/**/*"],
    "/arc-raiders/users": ["./public/templates/**/*"],
    "/arc-raiders/users/**": ["./public/templates/**/*"],
    "/api/*": ["./public/templates/**/*"],
  },
};

export default nextConfig;
