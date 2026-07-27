import React from 'react';
import { FlexWidget, TextWidget } from 'react-native-android-widget';

const SIZE_PRESETS = {
  small: { quote: 14, author: 11 },
  medium: { quote: 18, author: 13 },
  large: { quote: 24, author: 15 },
};

const ALIGN_MAP = {
  left: 'flex-start',
  center: 'center',
  right: 'flex-end',
};

const ALIGN_TEXT_MAP = {
  left: 'left',
  center: 'center',
  right: 'right',
};

/**
 * A fully transparent home-screen widget: only the quote text (and
 * optionally the author + an emoji) is visible, no card/background of any
 * kind — matches the "just the writing floating on the home screen" brief.
 * Tapping anywhere on the widget requests a new random quote.
 */
export default function QuoteWidget({
  quoteText = '',
  author = '',
  emoji = '',
  showAuthor = true,
  textColor = '#FFFFFF',
  fontFamily = 'serif',
  size = 'medium',
  align = 'center',
}) {
  const preset = SIZE_PRESETS[size] || SIZE_PRESETS.medium;
  const alignItems = ALIGN_MAP[align] || 'center';
  const textAlign = ALIGN_TEXT_MAP[align] || 'center';

  return (
    <FlexWidget
      clickAction="NEW_QUOTE"
      style={{
        height: 'match_parent',
        width: 'match_parent',
        backgroundColor: '#00000000',
        padding: 16,
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems,
      }}
    >
      {emoji ? (
        <TextWidget
          text={emoji}
          style={{ fontSize: preset.quote, marginBottom: 6, textAlign }}
        />
      ) : null}

      <TextWidget
        text={`"${quoteText}"`}
        style={{
          color: textColor,
          fontSize: preset.quote,
          fontWeight: '700',
          fontFamily,
          textAlign,
        }}
      />

      {showAuthor && author ? (
        <TextWidget
          text={`— ${author}`}
          style={{
            color: textColor,
            fontSize: preset.author,
            fontFamily,
            marginTop: 8,
            textAlign,
          }}
        />
      ) : null}
    </FlexWidget>
  );
}
