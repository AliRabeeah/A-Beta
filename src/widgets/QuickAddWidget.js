import React from 'react';
import { FlexWidget, TextWidget } from 'react-native-android-widget';
import { sizeScale, styleBackground } from '../utils/widgetCustomization';

const LABELS = {
  en: { add: 'Add' },
  ar: { add: 'إضافة' },
};

/**
 * A single big tap target that jumps straight into the app's "add" flow.
 * Small footprint (1x1 fits) but still customizable — accentColor tints
 * the "+" and label, style/size behave the same as the other widgets.
 */
export default function QuickAddWidget({
  language = 'en',
  accentColor = '#0A84FF',
  style = 'glass',
  size = 'medium',
  offset = { x: 0, y: 0 },
}) {
  const t = LABELS[language] || LABELS.en;
  const scale = sizeScale(size);
  const plusFont = Math.round(30 * scale.font);
  const labelFont = Math.round(12 * scale.font);

  return (
    <FlexWidget
      clickAction="ADD_OPEN_APP"
      style={{
        height: 'match_parent',
        width: 'match_parent',
        backgroundColor: styleBackground(style),
        borderRadius: 20,
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center',
        marginLeft: offset?.x || 0,
        marginTop: offset?.y || 0,
      }}
    >
      <FlexWidget
        style={{
          width: Math.round(44 * scale.rowHeight),
          height: Math.round(44 * scale.rowHeight),
          borderRadius: Math.round(22 * scale.rowHeight),
          backgroundColor: accentColor,
          justifyContent: 'center',
          alignItems: 'center',
        }}
      >
        <TextWidget text="+" style={{ color: '#0B0B0F', fontSize: plusFont, fontWeight: 'bold' }} />
      </FlexWidget>
      <TextWidget text={t.add} style={{ color: '#C8C8CC', fontSize: labelFont, marginTop: 6, fontWeight: '600' }} />
    </FlexWidget>
  );
}
