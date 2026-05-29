module.exports = function (api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
    plugins: [
      // path alias `@/...`
      [
        'module-resolver',
        {
          alias: {
            '@': './src',
          },
        },
      ],
      // Reanimated 4 / SDK 54: worklets plugin must be LAST.
      'react-native-worklets/plugin',
    ],
  };
};
