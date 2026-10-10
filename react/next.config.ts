import type { NextConfig } from "next";
const appUrl = process.env.NEXT_PUBLIC_APP_URL;
const nextConfig: NextConfig = {
  poweredByHeader: false,
  reactStrictMode: true,
  outputFileTracingIncludes: { "/api/v1/leave-requests/*": ["./assets/fonts/BeVietnamPro-Regular.ttf"] },
  allowedDevOrigins: appUrl ? [new URL(appUrl).hostname] : [],
};
export default nextConfig;
