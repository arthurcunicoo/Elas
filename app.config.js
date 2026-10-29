const base = require('./app.json').expo;
module.exports = () => {
  const qa = process.env.APP_VARIANT === 'qa';
  const sentry = process.env.SENTRY_ORG && process.env.SENTRY_PROJECT;
  return {
    ...base,
    name: qa ? 'Elas QA' : base.name,
    scheme: qa ? 'elas-qa' : base.scheme,
    android: {...base.android, package: qa ? 'br.com.elasnacidade.app.qa' : base.android.package,
      ...(process.env.GOOGLE_SERVICES_JSON ? {googleServicesFile:process.env.GOOGLE_SERVICES_JSON} : {})},
    ios: {...base.ios, bundleIdentifier: qa ? 'br.com.elasnacidade.app.qa' : base.ios.bundleIdentifier},
    extra: {...base.extra,...(process.env.EAS_PROJECT_ID ? {eas:{projectId:process.env.EAS_PROJECT_ID}} : {})},
    plugins: [...base.plugins, ['expo-secure-store',{configureAndroidBackup:true}], ['expo-notifications',{defaultChannel:'participacao',enableBackgroundRemoteNotifications:false}],
      ...(process.env.GOOGLE_MAPS_ANDROID_API_KEY ? [['react-native-maps',{androidGoogleMapsApiKey:process.env.GOOGLE_MAPS_ANDROID_API_KEY}]] : []),
      ...(sentry ? [['@sentry/react-native/expo',{organization:process.env.SENTRY_ORG,project:process.env.SENTRY_PROJECT,url:'https://sentry.io/'}]] : []),
    ],
  };
};
