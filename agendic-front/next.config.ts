import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Las imágenes de Sucursal y el Logo del Negocio viajan en una server action; el tope por defecto es 1MB.
  experimental: { serverActions: { bodySizeLimit: '10mb' } },
};

export default nextConfig;
