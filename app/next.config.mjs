/** @type {import('next').NextConfig} */
const nextConfig = {
  webpack: (config) => {
    // wagmi / WalletConnect pull in optional native deps; mark them external.
    config.externals.push("pino-pretty", "lokijs", "encoding");
    // Optional React Native dep pulled in by @metamask/sdk — not used on web.
    config.resolve.alias = {
      ...config.resolve.alias,
      "@react-native-async-storage/async-storage": false,
    };
    return config;
  },
};

export default nextConfig;
