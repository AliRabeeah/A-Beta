// Must be the very first import in the app, before anything else — without
// it, react-native-gesture-handler's native event manager never installs
// on Android and every gesture-handler-based control (column resize drag,
// row reordering, etc.) simply stops responding to touch with no error.
import 'react-native-gesture-handler';

import { registerWidgetTaskHandler } from 'react-native-android-widget';
import { widgetTaskHandler } from './src/widgets/widget-task-handler';

registerWidgetTaskHandler(widgetTaskHandler);

import 'expo/AppEntry';
