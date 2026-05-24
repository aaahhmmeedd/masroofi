const { getDefaultConfig } = require("expo/metro-config");

const config = getDefaultConfig(__dirname);

const existing = config.resolver.blockList;
config.resolver.blockList = [
  ...(existing ? (Array.isArray(existing) ? existing : [existing]) : []),
  /.*_tmp_\d+.*/,
];

// Remove unstable watcher options that cause validation warnings
if (config.watchman && config.watchman.watcher) {
  delete config.watchman.watcher.unstable_lazySha1;
  delete config.watchman.watcher.unstable_autoSaveCache;
}

module.exports = config;
