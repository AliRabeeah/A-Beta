// Drop-in replacements for React Native's <Text> and <TextInput> that apply
// the app's user-selected font (Settings -> Font) whenever a component
// doesn't already set its own `fontFamily`.
//
// These are wired in automatically everywhere by babel-plugin-app-font.js
// (see babel.config.js), which rewrites every
// `import { Text, TextInput, ... } from 'react-native'` in `src/` and
// `App.js` to pull `Text`/`TextInput` from here instead — no per-screen
// changes needed. A screen that sets its own `fontFamily` in its style
// (e.g. AboutScreen's Fraunces/Manrope pairing, or the quote widget's font
// picker) is unaffected: that explicit value is applied after this
// component's base style, so it always wins.
//
// Why a wrapper component instead of patching Text/TextInput directly:
// React Native's New Architecture (Fabric, on by default since 0.76) no
// longer exposes a patchable `.render` on these components, so the old
// `Text.defaultProps` / `Text.render = ...` tricks silently stop working.
// A real component that reads the font from context and re-renders when
// it changes is the reliable way to do this on current React Native.
import React, { forwardRef } from 'react';
import { Text as RNText, TextInput as RNTextInput } from 'react-native';
import { useFont } from '../theme/FontContext';

export const Text = forwardRef(function Text({ style, ...rest }, ref) {
  const { fontFamily } = useFont();
  return (
    <RNText ref={ref} style={fontFamily ? [{ fontFamily }, style] : style} {...rest} />
  );
});

export const TextInput = forwardRef(function TextInput({ style, ...rest }, ref) {
  const { fontFamily } = useFont();
  return (
    <RNTextInput ref={ref} style={fontFamily ? [{ fontFamily }, style] : style} {...rest} />
  );
});
