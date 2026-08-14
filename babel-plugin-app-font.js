/**
 * Rewrites, at compile time:
 *   import { Text, TextInput, View, ... } from 'react-native';
 * into:
 *   import { View, ... } from 'react-native';
 *   import { Text, TextInput } from '<relative path to src/components/AppText.js>';
 *
 * This is how the app-wide font picker (Settings -> Font) reaches every
 * screen without editing ~85 files by hand: AppText.js's <Text>/<TextInput>
 * read the selected font from FontContext and apply it unless the screen
 * already set its own `fontFamily`. See src/components/AppText.js for why
 * this indirection is used instead of patching react-native's Text
 * directly (that trick doesn't survive the New Architecture / Fabric).
 *
 * Aliased imports (`import { Text as Foo } from 'react-native'`) are
 * preserved as-is. AppText.js itself, and anything under node_modules, is
 * left untouched so it can still import the real react-native components.
 */
const path = require('path');

const REDIRECTED_NAMES = new Set(['Text', 'TextInput']);
const WRAPPER_ABS_PATH = path.resolve(__dirname, 'src/components/AppText.js');

module.exports = function appFontBabelPlugin({ types: t }) {
  return {
    name: 'app-font-text-redirect',
    visitor: {
      ImportDeclaration(nodePath, state) {
        if (nodePath.node.source.value !== 'react-native') return;

        const filename = state.file.opts.filename || '';
        if (!filename) return;
        const normalized = filename.split(path.sep).join('/');
        if (normalized.includes('node_modules')) return;
        if (normalized.endsWith('src/components/AppText.js')) return;

        const keep = [];
        const redirected = [];

        for (const spec of nodePath.node.specifiers) {
          if (
            t.isImportSpecifier(spec) &&
            (t.isIdentifier(spec.imported) || t.isStringLiteral(spec.imported)) &&
            REDIRECTED_NAMES.has(t.isIdentifier(spec.imported) ? spec.imported.name : spec.imported.value)
          ) {
            redirected.push(spec);
          } else {
            keep.push(spec);
          }
        }

        if (redirected.length === 0) return;

        let relative = path.relative(path.dirname(filename), WRAPPER_ABS_PATH).replace(/\.js$/, '');
        relative = relative.split(path.sep).join('/');
        if (!relative.startsWith('.')) relative = './' + relative;

        const newImport = t.importDeclaration(redirected, t.stringLiteral(relative));

        if (keep.length === 0) {
          nodePath.replaceWith(newImport);
        } else {
          nodePath.node.specifiers = keep;
          nodePath.insertAfter(newImport);
        }
      },
    },
  };
};
