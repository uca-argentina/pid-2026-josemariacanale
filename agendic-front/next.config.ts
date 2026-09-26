import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // ponytail: fotos placeholder para la página pública; ni Business ni Branch tienen campo de imagen todavía.
  images: { remotePatterns: [{ protocol: "https", hostname: "picsum.photos" }] },
};

export default nextConfig;
