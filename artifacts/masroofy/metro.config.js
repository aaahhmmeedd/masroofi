const { getDefaultConfig } = require("expo/metro-config");

const config = getDefaultConfig(__dirname);

const existing = config.resolver.blockList;
config.resolver.blockList = [
  ...(existing ? (Array.isArray(existing) ? existing : [existing]) : []),
  /.*_tmp_\d+.*/,
];

module.exports = config;
