/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  webpack: (config, { isServer }) => {
    if (!isServer) {
      config.resolve.fallback = {
        fs: false,
        readline: false,
        path: false,
        crypto: false,
        os: false,
        stream: false,
        constants: false,
      };
    }
    return config;
  },
};

export default nextConfig;

