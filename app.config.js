// Adds settings that depend on build-time environment variables to app.json.
//
// Google sign-in on iOS needs a URL scheme made from the iOS OAuth client ID
// (EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID, set as an EAS environment variable). The
// plugin refuses to build without it, so it is only added once the ID exists.
module.exports = ({ config }) => {
  const iosClientId = process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID;
  const plugins = [...(config.plugins ?? [])];
  if (iosClientId) {
    const prefix = iosClientId.replace(/\.apps\.googleusercontent\.com$/, '');
    plugins.push([
      '@react-native-google-signin/google-signin',
      { iosUrlScheme: `com.googleusercontent.apps.${prefix}` },
    ]);
  }
  return { ...config, plugins };
};
