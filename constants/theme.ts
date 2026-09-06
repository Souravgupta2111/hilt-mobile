// Hilt Mountain Luxury Design System & Color Tokens
// Extracted from DITTO reference mockups & Himalayan palette

export const Colors = {
  // Primaries & Canvas
  primaryBlack: '#000000',
  charcoalDark: '#0F1419',
  surfaceLight: '#FFFFFF',
  backgroundApp: '#F8F9FA',
  
  // Grays & Neutrals
  pillInactive: '#F3F4F6',
  borderLight: '#E5E7EB',
  borderMuted: '#EEEEEE',
  
  // Text Tokens
  textPrimary: '#111827',
  textSecondary: '#6B7280',
  textMuted: '#9CA3AF',
  textWhite: '#FFFFFF',
  
  // Vibrant Accents (From Mockups)
  greenVibrant: '#22C55E', // Map price pins ($750k) & histogram bars
  greenDensity: '#5CD85A', // Secondary bright green for volume charts
  greenDark: '#16A34A',
  heartRed: '#EF4444',     // Active wishlist heart
  
  // Hilt Mountain Accents
  goldHimalayan: '#FFFFFF', // Clean White Accent (Replaced ochre/beige)
  whiteAccent: '#FFFFFF',
  forestDeep: '#07100B',    // Alpine dark forest
  
  // Frosted Overlays
  frostedDarkGlass: 'rgba(15, 20, 25, 0.78)',
  frostedLightGlass: 'rgba(255, 255, 255, 0.88)',
  glassBorder: 'rgba(255, 255, 255, 0.18)',
  promoBadgeBg: 'rgba(30, 41, 59, 0.55)',
  
  // Status
  success: '#10B981',
  warning: '#F59E0B',
  info: '#3B82F6',
};

export const Typography = {
  weights: {
    regular: '400' as const,
    medium: '500' as const,
    semibold: '600' as const,
    bold: '700' as const,
    extrabold: '800' as const,
  },
};

export const Radii = {
  pill: 9999,
  cardLarge: 28,
  imageHero: 22,
  badge: 12,
  chip: 8,
};
