// app.config.js — dynamic config that layers environment variables on top of
// the static app.json.  This is the place to inject EXPO_PUBLIC_* vars that
// must be baked into the bundle at EAS build time (they are NOT available from
// .env on the EAS build servers unless you explicitly pass them here via
// process.env, which EAS populates from your project's Secrets & Variables).
//
// How to add secrets for EAS builds:
//   eas secret:create --scope project --name EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY --value pk_live_xxx
//   eas secret:create --scope project --name EXPO_PUBLIC_API_URL --value https://doctor.aurasutra.org
//
// Local development: values in .env are auto-loaded by Expo CLI so no change needed there.

const { withAndroidManifest } = require('@expo/config-plugins');

/** @type {import('@expo/config').ExpoConfig} */
const baseConfig = require('./app.json').expo;

module.exports = ({ config: _config }) => {
  return {
    ...baseConfig,
    extra: {
      ...baseConfig.extra,
      // Expose these at runtime via Constants.expoConfig.extra if needed
      // (EXPO_PUBLIC_* vars are already inlined by the bundler, but listing
      //  them here also documents which vars this project needs).
      clerkPublishableKey: process.env.EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY ?? '',
      apiUrl: process.env.EXPO_PUBLIC_API_URL ?? '',
    },
  };
};

