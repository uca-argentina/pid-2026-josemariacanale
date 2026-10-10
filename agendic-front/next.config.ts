import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    // Crear Negocio manda el Logo y hasta 5 imágenes (5 MB c/u, ADR 0007) en una sola server action.
    serverActions: { bodySizeLimit: "30mb" },
  },
};

export default nextConfig;
