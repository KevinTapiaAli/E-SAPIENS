import type { NextConfig } from "next";
import { existsSync } from "node:fs";
import { resolve } from "node:path";

const rootEnv = resolve(process.cwd(), "../../.env");
if (existsSync(rootEnv)) process.loadEnvFile(rootEnv);

if (process.env.VERCEL === "1") {
  const missing = ["API_URL", "APP_URL"].filter((name) => !process.env[name]);
  if (missing.length) {
    console.warn(
      `[IDENTITY_CONFIGURATION_ERROR] Faltan ${missing.join(", ")}. Configura estas variables del servidor en el entorno de Vercel correspondiente y vuelve a desplegar. El acceso autenticado no estará disponible hasta configurarlas.`,
    );
  }
}

const nextConfig: NextConfig = {
  poweredByHeader: false,
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Frame-Options", value: "DENY" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          {
            key: "Content-Security-Policy",
            // Targeted policy compatible with Next.js streaming and the theme script.
            value:
              "base-uri 'self'; object-src 'none'; frame-ancestors 'none'; form-action 'self'",
          },
          {
            key: "Permissions-Policy",
            value:
              "camera=(self), microphone=(self), geolocation=(), payment=()",
          },
          ...(process.env.NODE_ENV === "production" &&
          process.env.APP_URL?.startsWith("https://")
            ? [
                {
                  key: "Strict-Transport-Security",
                  value: "max-age=31536000",
                },
              ]
            : []),
        ],
      },
      {
        source: "/portal/:path*",
        headers: [{ key: "X-Robots-Tag", value: "noindex, nofollow" }],
      },
      {
        source: "/mi-cuenta/:path*",
        headers: [{ key: "X-Robots-Tag", value: "noindex, nofollow" }],
      },
      {
        source: "/api/:path*",
        headers: [{ key: "X-Robots-Tag", value: "noindex, nofollow" }],
      },
    ];
  },
};

export default nextConfig;
