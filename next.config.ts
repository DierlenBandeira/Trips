import type { NextConfig } from "next";

const developmentScriptPolicy =
  process.env.NODE_ENV === "development" ? " 'unsafe-eval'" : "";

const nextConfig: NextConfig = {
  poweredByHeader: false,
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          {
            key: "Content-Security-Policy",
            value: [
              "default-src 'self'",
              "base-uri 'self'",
              "form-action 'self'",
              "frame-ancestors 'none'",
              "object-src 'none'",
              `script-src 'self' 'unsafe-inline'${developmentScriptPolicy}`,
              "script-src-attr 'none'",
              "style-src 'self' 'unsafe-inline'",
              "img-src 'self' data: blob: https://tiles.openfreemap.org https://tile.openstreetmap.org",
              "connect-src 'self' https://tiles.openfreemap.org https://tile.openstreetmap.org",
              "font-src 'self' data:",
              "frame-src 'none'",
              "manifest-src 'self'",
              "media-src 'none'",
              "worker-src 'self' blob:",
            ].join("; "),
          },
          { key: "Referrer-Policy", value: "strict-origin" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-DNS-Prefetch-Control", value: "off" },
          { key: "X-Frame-Options", value: "DENY" },
          {
            key: "Strict-Transport-Security",
            value: "max-age=31536000",
          },
          {
            key: "Permissions-Policy",
            value:
              "camera=(), microphone=(), geolocation=(), payment=(), usb=()",
          },
          {
            key: "Cross-Origin-Opener-Policy",
            value: "same-origin",
          },
          {
            key: "Cross-Origin-Resource-Policy",
            value: "same-origin",
          },
        ],
      },
    ];
  },
};

export default nextConfig;
