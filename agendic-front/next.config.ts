import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    // Crear Negocio manda el Logo y hasta 5 imágenes (5 MB c/u, ADR 0007) más el resto del multipart en una sola server action.
    serverActions: { bodySizeLimit: "40mb" },
  },
};

export default nextConfig;
