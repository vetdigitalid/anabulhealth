/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  transpilePackages: ['tailwindcss'],
  webpack: (config, { isServer }) => {
    if (!isServer) {
      config.resolve = config.resolve || {};
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        v8: false,
        net: false,
        tls: false,
        module: false,
        perf_hooks: false,
        child_process: false,
        dns: false,
        path: false,
        os: false,
        crypto: false,
        stream: false,
      };
    }
    return config;
  },
};

module.exports = nextConfig;
