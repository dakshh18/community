/**
 * Color tokens. Heritage & Connection palette — saffron accent + warm neutrals.
 * Carried forward from the Stitch design system.
 */
export const colors = {
  // Brand
  primary: '#FF9933',          // saffron
  primaryDark: '#E5762A',
  primarySoft: '#FFF3E0',      // 12% tint for chips/backgrounds

  // Surfaces
  background: '#FFF6E5',       // cream — global bg
  surface: '#FFFFFF',
  surfaceMuted: '#FAF3E7',

  // Text
  text: '#1F1B16',
  textMuted: '#6B6259',
  textOnPrimary: '#FFFFFF',

  // Lines
  border: '#E8DFD0',
  divider: '#F1E9D9',

  // Semantic
  success: '#2E7D32',          // deep green — matches the prompt
  successSoft: '#E8F5E9',
  warning: '#B26A00',
  warningSoft: '#FFF3E0',
  danger: '#B0140A',            // maroon — matches the prompt
  dangerSoft: '#FBE9E7',
  info: '#1976D2',

  // Status chips
  pending: '#B26A00',
  partial: '#1976D2',
  paid: '#2E7D32',
} as const;

export type ColorKey = keyof typeof colors;
