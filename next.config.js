/** @type {import('next').NextConfig} */
module.exports = {
  reactStrictMode: true,
  webpack: (config, context) => {
    config.experiments = {
      ...config.experiments,
      topLevelAwait: true,
      asyncWebAssembly: true,
    };

    config.module.rules.push({
      test: /\.md$/i,
      use: "raw-loader",
    });

    return config;
  },
  transpilePackages: ["@visheratin/web-ai"],
  async redirects() {
    return [
      {
        source: "/github",
        destination: "https://github.com/FelippeChemello/document-ocr-chat",
        permanent: false,
      },
    ];
  },
};