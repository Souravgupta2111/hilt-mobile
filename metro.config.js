const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// The linked @wayzyy/moderation-engine guards require('fs') behind a
// Node-runtime check that never runs on Hermes, but Metro still resolves
// it statically. Shim it to an empty module (our repo only, engine untouched).
config.resolver.extraNodeModules = {
  ...(config.resolver.extraNodeModules || {}),
  fs: require.resolve('./shims/empty.js'),
};

module.exports = config;
