import { StyleSheet } from 'react-native';
import { LexiFonts } from '@/constants/lexi-theme';
import { UI } from '@/constants/lexi-ui';

/** Styles shared by the lecture tabs. */
export const tabStyles = StyleSheet.create({
  scroll: {
    padding: 20,
    paddingBottom: 40,
    maxWidth: 640,
    width: '100%',
    alignSelf: 'center',
  },
  sectionHeading: {
    fontFamily: LexiFonts.headlineMd,
    fontSize: 20,
    color: UI.ink,
    marginBottom: 12,
    marginTop: 8,
  },
  body: {
    fontFamily: LexiFonts.bodyRegular,
    fontSize: 15,
    lineHeight: 23,
    color: UI.inkSoft,
  },
  card: {
    backgroundColor: UI.card,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: UI.border,
    padding: 16,
  },
  banner: {
    flexDirection: 'row',
    gap: 10,
    alignItems: 'flex-start',
    backgroundColor: UI.amberSoft,
    borderRadius: 12,
    padding: 12,
    marginBottom: 16,
  },
  bannerText: {
    flex: 1,
    fontFamily: LexiFonts.bodyRegular,
    fontSize: 13,
    lineHeight: 19,
    color: '#6b4511',
  },
  primaryBtn: {
    height: 52,
    borderRadius: 26,
    backgroundColor: UI.ink,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  primaryBtnText: {
    fontFamily: LexiFonts.labelSmBold,
    fontSize: 15,
    color: '#fff',
  },
  secondaryBtn: {
    height: 52,
    borderRadius: 26,
    borderWidth: 1,
    borderColor: UI.border,
    backgroundColor: UI.card,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  secondaryBtnText: {
    fontFamily: LexiFonts.labelSmBold,
    fontSize: 15,
    color: UI.ink,
  },
  pressed: {
    opacity: 0.88,
    transform: [{ scale: 0.99 }],
  },
  timeChip: {
    alignSelf: 'flex-start',
    borderRadius: 6,
    backgroundColor: UI.cardMuted,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  timeChipText: {
    fontFamily: LexiFonts.labelSmBold,
    fontSize: 11,
    color: UI.amber,
    fontVariant: ['tabular-nums'],
  },
  // Bottom sheet modal
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: UI.bg,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 22,
    paddingBottom: 34,
    maxHeight: '88%',
  },
  sheetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
    gap: 12,
  },
  sheetTitle: {
    flex: 1,
    fontFamily: LexiFonts.headlineMd,
    fontSize: 20,
    color: UI.ink,
  },
  empty: {
    alignItems: 'center',
    padding: 32,
    gap: 8,
  },
  emptyText: {
    fontFamily: LexiFonts.bodyRegular,
    fontSize: 14,
    color: UI.muted,
    textAlign: 'center',
  },
});
