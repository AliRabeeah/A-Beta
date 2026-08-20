import React from 'react';
import { FlexWidget, TextWidget } from 'react-native-android-widget';
import { estimateQuoteFontSize } from '../utils/quotePicker';
import { DEFAULT_WIDGET_OFFSETS, WIDGET_TEXT_SHADOW } from '../utils/quoteSettings';

// Ceiling/floor for each user-facing size preset. The *actual* font size
// used is computed per-quote by estimateQuoteFontSize(), which shrinks the
// text (down to `min`) whenever it's long enough that `max` would overflow
// the widget's real on-screen size and get clipped by Android.
const SIZE_PRESETS = {
  small: { max: 16, min: 10, author: 11 },
  medium: { max: 20, min: 11, author: 13 },
  large: { max: 26, min: 12, author: 15 },
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
  shadowEnabled = false,
  widgetWidthDp = null,
  widgetHeightDp = null,
  fitRatio = 0.8,
  offsets = DEFAULT_WIDGET_OFFSETS,
}) {
  const preset = SIZE_PRESETS[size] || SIZE_PRESETS.medium;
  const alignItems = ALIGN_MAP[align] || 'center';
  const textAlign = ALIGN_TEXT_MAP[align] || 'center';
  const emojiOffset = offsets?.emoji || DEFAULT_WIDGET_OFFSETS.emoji;
  const quoteOffset = offsets?.quote || DEFAULT_WIDGET_OFFSETS.quote;
  const authorOffset = offsets?.author || DEFAULT_WIDGET_OFFSETS.author;

  // Real, working "auto-size": shrink the quote's font size (never below
  // preset.min) until it's estimated to fit the actual widget dimensions
  // Android reported for this instance (with a safety margin — see
  // estimateQuoteFontSize's comment on launchers misreporting widget
  // size), so long quotes are never clipped.
  const { fontSize: quoteFontSize, boxWidthDp } = estimateQuoteFontSize({
    text: quoteText,
    widthDp: widgetWidthDp,
    heightDp: widgetHeightDp,
    hasAuthorLine: showAuthor && !!author,
    hasEmoji: !!emoji,
    maxFontSize: preset.max,
    minFontSize: preset.min,
    safetyRatio: fitRatio,
    offsetXDp: quoteOffset.x,
    offsetYDp: quoteOffset.y,
  });

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
      <FlexWidget
        style={{
          width: boxWidthDp,
          flexDirection: 'column',
          alignItems,
        }}
      >
        {emoji ? (
          <TextWidget
            text={emoji}
            style={{
              fontSize: preset.max,
              marginBottom: 6,
              marginLeft: emojiOffset.x,
              marginTop: emojiOffset.y,
              textAlign,
            }}
          />
        ) : null}

        <TextWidget
          text={`"${quoteText}"`}
          // maxLines/truncate are a last-resort safety net only — with
          // quoteFontSize + boxWidthDp already sized to fit, this should
          // rarely engage.
          maxLines={10}
          truncate="END"
          style={{
            width: boxWidthDp,
            color: textColor,
            fontSize: quoteFontSize,
            fontWeight: '700',
            fontFamily,
            marginLeft: quoteOffset.x,
            marginTop: quoteOffset.y,
            textAlign,
            ...(shadowEnabled
              ? {
                  textShadowColor: WIDGET_TEXT_SHADOW.color,
                  textShadowRadius: WIDGET_TEXT_SHADOW.radius,
                  textShadowOffset: WIDGET_TEXT_SHADOW.offset,
                }
              : null),
          }}
        />

        {showAuthor && author ? (
          <TextWidget
            text={`— ${author}`}
            style={{
              width: boxWidthDp,
              color: textColor,
              fontSize: preset.author,
              fontFamily,
              marginTop: 8 + authorOffset.y,
              marginLeft: authorOffset.x,
              textAlign,
            }}
          />
        ) : null}
      </FlexWidget>
    </FlexWidget>
  );
}
