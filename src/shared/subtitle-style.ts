import { DEFAULT_SETTINGS, type Settings } from './types'

const px = (n: number) => `${n}px`

/** A font name that is safe to put in quotes in CSS. */
export const cleanFontName = (name: string) => name.replace(/["\\]/g, '').trim()

/** Inline styles for the subtitle bar and list, from the appearance settings. Used on the video
 *  and in the preview on the Settings page. */
export function subtitleStyles(s: Settings) {
  // 0 with the default background or a darker one, up to 1 with no background. The less
  // background, the more the text and the buttons need a shadow of their own.
  const bare = Math.max(0, 1 - s.subtitleBgOpacity / DEFAULT_SETTINGS.subtitleBgOpacity)
  const shade = (alpha: number) => `rgb(0 0 0 / ${alpha})`
  const font = cleanFontName(s.subtitleFont)
  return {
    /** For the sentence and translation text only, not the buttons. */
    font: font ? { fontFamily: `"${font}", var(--font-sans)` } : {},
    bar: { backgroundColor: `rgb(0 0 0 / ${s.subtitleBgOpacity}%)` },
    text: bare ? { textShadow: `0 0 2px ${shade(bare)}, 0 1px 4px ${shade(bare)}` } : {},
    /** A glass capsule behind each button group, only when the bar is see-through. */
    controls: bare ? { backgroundColor: shade(bare * 0.5), backdropFilter: 'blur(4px)' } : {},
    /** With almost no background, the buttons are faint until the pointer is on the bar. */
    dimControls: s.subtitleBgOpacity < 50,
    // The translation is smaller in the same ratio as the default sizes (28/22 and 15/13).
    barSentence: { fontSize: px(s.subtitleTextSize) },
    barTranslation: { fontSize: px(Math.round((s.subtitleTextSize * 22) / 28)) },
    listSentence: { fontSize: px(s.listTextSize) },
    listTranslation: { fontSize: px(Math.round((s.listTextSize * 13) / 15)) },
  }
}
