import React from 'react';
import { FlexWidget, TextWidget } from 'react-native-android-widget';

/**
 * The smallest possible widget: a single tap opens A. Meant for
 * a 1x1 home-screen slot when you just want fast access to the app
 * rather than a data display.
 */
export default function QuickAddWidget({ opacity = 100 }) {
  const alpha = Math.max(0, Math.min(255, Math.round((opacity / 100) * 255)));
  const backgroundColor = `#${alpha.toString(16).padStart(2, '0')}000000`;

  return (
    <FlexWidget
      clickAction="OPEN_APP"
      style={{
        height: 'match_parent',
        width: 'match_parent',
        backgroundColor,
        borderRadius: 20,
        justifyContent: 'center',
        alignItems: 'center',
      }}
    >
      <FlexWidget
        style={{
          width: 36,
          height: 36,
          borderRadius: 18,
          backgroundColor: '#FF8A00',
          justifyContent: 'center',
          alignItems: 'center',
        }}
      >
        <TextWidget text="+" style={{ color: '#000000', fontSize: 22, fontWeight: 'bold' }} />
      </FlexWidget>
    </FlexWidget>
  );
}
