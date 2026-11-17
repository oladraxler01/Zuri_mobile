import { lightColors as t } from '@/theme/tokens';

/**
 * @deprecated Use `useTheme().colors` from `@/theme` (light and dark) instead.
 * Kept as an alias while screens move to tokens (design system §8); delete it
 * once nothing imports it. Don't add new keys.
 *
 * Keys whose value already matches a token point at it. The rest keep their
 * old value so nothing changes visually yet; the comment names the token each
 * use site should switch to when its screen migrates (the brand corrects these:
 * olive ink → Ink, #77786c failed 4.5:1 contrast, the yellow-green success fill).
 */
export const UI = {
  bg: '#fbf9f4', // token: surface (#fbf9f8)
  card: t['surface-raised'],
  cardMuted: '#f5f3ee', // token: surface-sunken
  ink: '#272e0a', // token: text
  inkSoft: '#46483d', // token: text-muted
  muted: '#77786c', // token: text-subtle
  border: 'rgba(26, 28, 22, 0.1)', // token: border
  borderSoft: 'rgba(26, 28, 22, 0.06)', // token: border
  amber: '#c5832b', // token: warning when it means "due soon", accent when it's a highlight
  amberSoft: '#fdf1df', // token: warning-container
  success: t.success,
  successSoft: '#dfe8a9', // token: success-container
  error: t.danger,
  errorSoft: t['danger-container'],
} as const;
