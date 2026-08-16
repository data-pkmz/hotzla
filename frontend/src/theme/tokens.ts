/**
 * Design Tokens for DPS (Digital Print Service)
 * Based on DESIGN.md and Brand Guidelines
 */

export const colors = {
  // Surfaces
  surface: '#f8f9ff',
  surfaceDim: '#cbdbf5',
  surfaceBright: '#f8f9ff',
  surfaceContainerLowest: '#ffffff',
  surfaceContainerLow: '#eff4ff',
  surfaceContainer: '#e5eeff',
  surfaceContainerHigh: '#dce9ff',
  surfaceContainerHighest: '#d3e4fe',
  surfaceVariant: '#d3e4fe',
  surfaceTint: '#4f5e7e',

  // Text & On-surfaces
  onSurface: '#0b1c30',
  onSurfaceVariant: '#44474d',
  inverseSurface: '#213145',
  inverseOnSurface: '#eaf1ff',
  onBackground: '#0b1c30',
  background: '#f8f9ff',

  // Borders & Outlines
  outline: '#75777e',
  outlineVariant: '#c5c6ce',
  borderSubtle: '#e2e8f0',
  borderHover: '#0076d1',

  // Primary (Deep Navy)
  primary: '#041632',
  onPrimary: '#ffffff',
  primaryContainer: '#1b2b48',
  onPrimaryContainer: '#8393b5',
  inversePrimary: '#b7c7eb',
  primaryFixed: '#d7e2ff',
  primaryFixedDim: '#b7c7eb',
  onPrimaryFixed: '#091b37',
  onPrimaryFixedVariant: '#374765',

  // Secondary (Sky Blue)
  secondary: '#005da7',
  onSecondary: '#ffffff',
  secondaryContainer: '#0076d1',
  onSecondaryContainer: '#fdfcff',
  secondaryFixed: '#d3e3ff',
  secondaryFixedDim: '#a3c9ff',
  onSecondaryFixed: '#001c39',
  onSecondaryFixedVariant: '#004883',
  secondaryLight: '#e0f2fe',

  // Tertiary (Deep Royal Violet)
  tertiary: '#0b005b',
  onTertiary: '#ffffff',
  tertiaryContainer: '#190096',
  onTertiaryContainer: '#8784ff',
  tertiaryFixed: '#e2dfff',
  tertiaryFixedDim: '#c3c0ff',
  onTertiaryFixed: '#0f0069',
  onTertiaryFixedVariant: '#3323cc',

  // Neutral
  neutral: '#64748b',
  neutralLight: '#f1f5f9',
  neutralDark: '#334155',

  // Error & Statuses
  error: '#ba1a1a',
  onError: '#ffffff',
  errorContainer: '#ffdad6',
  onErrorContainer: '#93000a',

  // Status Colors for Job Lifecycle
  status: {
    pendingBudget: '#d97706',
    pendingBudgetBg: '#fef3c7',
    budgetApproved: '#0284c7',
    budgetApprovedBg: '#e0f2fe',
    approvedForProduction: '#16a34a',
    approvedForProductionBg: '#dcfce7',
    inPrinting: '#0076d1',
    inPrintingBg: '#e5eeff',
    readyForPickup: '#7c3aed',
    readyForPickupBg: '#f3e8ff',
    completed: '#059669',
    completedBg: '#d1fae5',
    rejected: '#dc2626',
    rejectedBg: '#fee2e2',
  },
} as const;

export const typography = {
  fontFamily: "'Hanken Grotesk', Rubik, system-ui, -apple-system, sans-serif",
  displayLg: {
    fontFamily: "'Hanken Grotesk', Rubik, system-ui, -apple-system, sans-serif",
    fontSize: '48px',
    fontWeight: 700,
    lineHeight: '1.2',
    letterSpacing: '-0.02em',
  },
  headlineLg: {
    fontFamily: "'Hanken Grotesk', Rubik, system-ui, -apple-system, sans-serif",
    fontSize: '32px',
    fontWeight: 600,
    lineHeight: '1.3',
  },
  headlineMd: {
    fontFamily: "'Hanken Grotesk', Rubik, system-ui, -apple-system, sans-serif",
    fontSize: '24px',
    fontWeight: 600,
    lineHeight: '1.3',
  },
  titleLg: {
    fontFamily: "'Hanken Grotesk', Rubik, system-ui, -apple-system, sans-serif",
    fontSize: '20px',
    fontWeight: 500,
    lineHeight: '1.4',
  },
  bodyLg: {
    fontFamily: "'Hanken Grotesk', Rubik, system-ui, -apple-system, sans-serif",
    fontSize: '18px',
    fontWeight: 400,
    lineHeight: '1.6',
  },
  bodyMd: {
    fontFamily: "'Hanken Grotesk', Rubik, system-ui, -apple-system, sans-serif",
    fontSize: '16px',
    fontWeight: 400,
    lineHeight: '1.5',
  },
  bodySm: {
    fontFamily: "'Hanken Grotesk', Rubik, system-ui, -apple-system, sans-serif",
    fontSize: '14px',
    fontWeight: 400,
    lineHeight: '1.5',
  },
  labelMd: {
    fontFamily: "'Hanken Grotesk', Rubik, system-ui, -apple-system, sans-serif",
    fontSize: '14px',
    fontWeight: 600,
    lineHeight: '1.2',
  },
  labelSm: {
    fontFamily: "'Hanken Grotesk', Rubik, system-ui, -apple-system, sans-serif",
    fontSize: '12px',
    fontWeight: 500,
    lineHeight: '1.2',
  },
} as const;

export const radii = {
  sm: '4px',
  default: '8px',
  md: '12px',
  lg: '16px',
  xl: '24px',
  full: '9999px',
} as const;

export const spacing = {
  base: 4,
  xs: 8,
  sm: 12,
  md: 16,
  lg: 24,
  xl: 32,
  '2xl': 48,
  gutter: 20,
  margin: 32,
} as const;

export const shadows = {
  level0: 'none',
  level1: '0px 2px 8px rgba(4, 22, 50, 0.05)',
  level2: '0px 10px 25px -3px rgba(4, 22, 50, 0.1), 0px 4px 6px -2px rgba(4, 22, 50, 0.05)',
  level3: '0px 20px 25px -5px rgba(4, 22, 50, 0.15), 0px 10px 10px -5px rgba(4, 22, 50, 0.04)',
} as const;
