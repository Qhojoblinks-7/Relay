// metro.config.js
// The Stream Video SDK's `react-native` field points to its TypeScript `src`,
// which uses internal path aliases that Metro cannot resolve (errors like
// "Cannot find module '../lib/statuses'"). Redirect the package entry to its
// prebuilt `dist/module` output so all transitive imports resolve from `dist`.
const { getDefaultConfig } = require("expo/metro-config");
const path = require("path");
const metroResolver = require("metro-resolver");

const config = getDefaultConfig(__dirname);

const STREAM_SDK = "@stream-io/video-react-native-sdk";
const STREAM_DST_INDEX = path.join(
  __dirname,
  "node_modules",
  "@stream-io",
  "video-react-native-sdk",
  "dist",
  "module",
  "index.js"
);

config.resolver.resolveRequest = (context, moduleName, platform, realResolver) => {
  if (moduleName === STREAM_SDK) {
    return {
      filePath: STREAM_DST_INDEX,
      type: "sourceFile",
    };
  }
  // Delegate everything else to Metro's default resolver. Prefer the resolver
  // Metro hands us, otherwise call metro-resolver directly. We strip the hook
  // from the context copy to avoid recursive re-entry into this function.
  if (typeof realResolver === "function") {
    return realResolver(context, moduleName, platform);
  }
  return metroResolver.resolve(
    { ...context, resolveRequest: undefined },
    moduleName,
    platform
  );
};

module.exports = config;
