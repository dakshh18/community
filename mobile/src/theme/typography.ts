/**
 * Typography. Plus Jakarta Sans — loaded by `useAppFonts` at boot.
 * Sizes lean larger than usual: the spec calls out elderly users.
 */
import type { TextStyle } from 'react-native';

export const fonts = {
  regular: 'PlusJakartaSans_400Regular',
  medium: 'PlusJakartaSans_500Medium',
  semibold: 'PlusJakartaSans_600SemiBold',
  bold: 'PlusJakartaSans_700Bold',
} as const;

type T = TextStyle;

export const typography = {
  display: { fontFamily: fonts.bold, fontSize: 32, lineHeight: 40 } as T,
  h1: { fontFamily: fonts.bold, fontSize: 26, lineHeight: 32 } as T,
  h2: { fontFamily: fonts.semibold, fontSize: 22, lineHeight: 28 } as T,
  h3: { fontFamily: fonts.semibold, fontSize: 18, lineHeight: 24 } as T,
  body: { fontFamily: fonts.regular, fontSize: 16, lineHeight: 24 } as T,
  bodyMedium: { fontFamily: fonts.medium, fontSize: 16, lineHeight: 24 } as T,
  bodySmall: { fontFamily: fonts.regular, fontSize: 14, lineHeight: 20 } as T,
  caption: { fontFamily: fonts.medium, fontSize: 12, lineHeight: 16 } as T,
  button: { fontFamily: fonts.semibold, fontSize: 16, lineHeight: 20 } as T,
  monospace: { fontFamily: 'Courier', fontSize: 18, lineHeight: 24, letterSpacing: 6 } as T,
} as const;
