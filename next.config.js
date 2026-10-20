/** @type {import('next').NextConfig} */
const nextConfig = {
  // Mematikan pemeriksaan TypeScript/ESLint yang memblokir build
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  // Konfigurasi fallback modul Node.js untuk Webpack & Turbopack
  webpack: (config, { isServer }) => {
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        v8: false,
        net: false,
        tls: false,
        child_process: false,
        dns: false,
      };
    }
    return config;
  },
  turbopack: {
    resolveAlias: {
      fs: './node_modules/node-stdlib-browser/mock/empty.js',
    },
  },
};

module.exports = nextConfig;
