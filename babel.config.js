module.exports = function (api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
    plugins: ['./babel-plugin-app-font.js', 'react-native-reanimated/plugin'],
  };
};
