import type { NextConfig } from "next";

/**
 * Content Security Policy: only this site's own files run, and the only
 * outside servers the page may talk to are the two game APIs.
 * - 'wasm-unsafe-eval' lets Stockfish's WebAssembly compile (the worker
 *   script gets these headers too, so the worker is covered)
 * - 'unsafe-inline' for scripts is needed by Next's inline bootstrap scripts,
 *   and for styles by React style props; no third-party code is loaded
 * Production only: the dev server relies on eval for fast refresh.
 */
const contentSecurityPolicy = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline' 'wasm-unsafe-eval'",
  "worker-src 'self'",
  "connect-src 'self' https://lichess.org https://api.chess.com",
  "img-src 'self' data: blob:",
  "style-src 'self' 'unsafe-inline'",
  "font-src 'self'",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
  "upgrade-insecure-requests",
].join("; ");

const securityHeaders = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), browsing-topics=()" },
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains" },
  ...(process.env.NODE_ENV === "production" ? [{ key: "Content-Security-Policy", value: contentSecurityPolicy }] : []),
];

const nextConfig: NextConfig = {
  cacheComponents: true,
  partialPrefetching: true,
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
  // Don't advertise the framework in every response
  poweredByHeader: false,
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
};

export default nextConfig;
