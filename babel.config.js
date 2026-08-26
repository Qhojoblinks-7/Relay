// babel.config.js
// The Stream Video SDK is incompatible with the `react-native-worklets`
// Babel plugin (it throws a misleading "Cannot find module '../lib/statuses'"
// while transforming the SDK's files). Exclude the SDK from that plugin so it
// bundles cleanly. babel-preset-expo already injects the plugin when
// react-native-worklets is present, so adding it here (with the exclude)
// prevents the preset from adding a second, unconfigured instance.
module.exports = function (api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
    plugins: [
      [
        'react-native-worklets/plugin',
        { exclude: [/node_modules[\\/]@stream-io[\\/]video-react-native-sdk/] },
      ],
    ],
  };
};
