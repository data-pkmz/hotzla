import { createTheme } from '@mui/material/styles';
import { colors, typography, radii, shadows } from './tokens';

export const theme = createTheme({
  direction: 'rtl',
  palette: {
    primary: {
<<<<<<< HEAD
      main: colors.primary,
      light: colors.primaryContainer,
      dark: '#020b1a',
      contrastText: colors.onPrimary,
=======
      main: '#1976d2',
      light: '#42a5f5',
      dark: '#1565c0',
>>>>>>> 8a3a984 (feat: add initial layout components and RTL cache)
    },
    secondary: {
      main: colors.secondary,
      light: colors.secondaryContainer,
      dark: colors.onSecondaryFixedVariant,
      contrastText: colors.onSecondary,
    },
    tertiary: {
      main: colors.tertiary,
      light: colors.tertiaryContainer,
      dark: '#05002b',
      contrastText: colors.onTertiary,
      container: colors.tertiaryContainer,
      onContainer: colors.onTertiaryContainer,
    },
    error: {
      main: colors.error,
      light: colors.errorContainer,
      dark: colors.onErrorContainer,
      contrastText: colors.onError,
    },
    background: {
<<<<<<< HEAD
      default: colors.background,
      paper: colors.surfaceContainerLowest,
=======
      default: '#f4f6f8',
      paper: '#ffffff',
>>>>>>> 8a3a984 (feat: add initial layout components and RTL cache)
    },
    text: {
      primary: colors.onSurface,
      secondary: colors.onSurfaceVariant,
      disabled: colors.outline,
    },
    divider: colors.borderSubtle,
    action: {
      hover: 'rgba(4, 22, 50, 0.04)',
      selected: 'rgba(0, 93, 167, 0.08)',
      focus: 'rgba(0, 93, 167, 0.12)',
    },
    surface: {
      main: colors.surface,
      dim: colors.surfaceDim,
      bright: colors.surfaceBright,
      containerLowest: colors.surfaceContainerLowest,
      containerLow: colors.surfaceContainerLow,
      container: colors.surfaceContainer,
      containerHigh: colors.surfaceContainerHigh,
      containerHighest: colors.surfaceContainerHighest,
      variant: colors.surfaceVariant,
    },
    customStatus: colors.status,
  },
  typography: {
<<<<<<< HEAD
    fontFamily: typography.fontFamily,
    h1: {
      fontFamily: typography.fontFamily,
      fontSize: typography.displayLg.fontSize,
      fontWeight: typography.displayLg.fontWeight,
      lineHeight: typography.displayLg.lineHeight,
      letterSpacing: typography.displayLg.letterSpacing,
      color: colors.onSurface,
    },
    h2: {
      fontFamily: typography.fontFamily,
      fontSize: typography.headlineLg.fontSize,
      fontWeight: typography.headlineLg.fontWeight,
      lineHeight: typography.headlineLg.lineHeight,
      color: colors.onSurface,
    },
    h3: {
      fontFamily: typography.fontFamily,
      fontSize: typography.headlineMd.fontSize,
      fontWeight: typography.headlineMd.fontWeight,
      lineHeight: typography.headlineMd.lineHeight,
      color: colors.onSurface,
    },
    h4: {
      fontFamily: typography.fontFamily,
      fontSize: typography.titleLg.fontSize,
      fontWeight: typography.titleLg.fontWeight,
      lineHeight: typography.titleLg.lineHeight,
      color: colors.onSurface,
    },
    h5: {
      fontFamily: typography.fontFamily,
      fontSize: typography.bodyLg.fontSize,
      fontWeight: 600,
      lineHeight: typography.bodyLg.lineHeight,
      color: colors.onSurface,
    },
    h6: {
      fontFamily: typography.fontFamily,
      fontSize: typography.bodyMd.fontSize,
      fontWeight: 600,
      lineHeight: typography.bodyMd.lineHeight,
      color: colors.onSurface,
    },
    body1: {
      fontFamily: typography.fontFamily,
      fontSize: typography.bodyMd.fontSize,
      fontWeight: typography.bodyMd.fontWeight,
      lineHeight: typography.bodyMd.lineHeight,
      color: colors.onSurface,
    },
    body2: {
      fontFamily: typography.fontFamily,
      fontSize: typography.bodySm.fontSize,
      fontWeight: typography.bodySm.fontWeight,
      lineHeight: typography.bodySm.lineHeight,
      color: colors.onSurfaceVariant,
    },
    subtitle1: {
      fontFamily: typography.fontFamily,
      fontSize: typography.bodyLg.fontSize,
      fontWeight: typography.bodyLg.fontWeight,
      lineHeight: typography.bodyLg.lineHeight,
      color: colors.onSurfaceVariant,
    },
    subtitle2: {
      fontFamily: typography.fontFamily,
      fontSize: typography.labelMd.fontSize,
      fontWeight: typography.labelMd.fontWeight,
      lineHeight: typography.labelMd.lineHeight,
      color: colors.onSurface,
    },
    button: {
      fontFamily: typography.fontFamily,
      fontWeight: typography.labelMd.fontWeight,
      fontSize: typography.labelMd.fontSize,
      lineHeight: typography.labelMd.lineHeight,
      textTransform: 'none',
    },
    caption: {
      fontFamily: typography.fontFamily,
      fontSize: typography.labelSm.fontSize,
      fontWeight: typography.labelSm.fontWeight,
      lineHeight: typography.labelSm.lineHeight,
      color: colors.onSurfaceVariant,
    },
  },
  shape: {
    borderRadius: 8,
=======
    fontFamily: 'Rubik, Heebo, system-ui, -apple-system, sans-serif',
>>>>>>> 8a3a984 (feat: add initial layout components and RTL cache)
  },
  components: {
    MuiCssBaseline: {
      styleOverrides: {
<<<<<<< HEAD
        body: {
          backgroundColor: colors.background,
          color: colors.onSurface,
          fontFamily: typography.fontFamily,
          direction: 'rtl',
=======
        root: {
          borderRadius: 12,
          boxShadow: '0 4px 12px 0 rgba(0,0,0,0.05)',
>>>>>>> 8a3a984 (feat: add initial layout components and RTL cache)
        },
      },
    },
    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: radii.default,
          textTransform: 'none',
          fontWeight: 600,
<<<<<<< HEAD
          boxShadow: 'none',
          padding: '8px 18px',
          transition: 'all 0.15s ease-in-out',
          '&:hover': {
            boxShadow: 'none',
          },
        },
        containedPrimary: {
          backgroundColor: colors.primary,
          color: colors.onPrimary,
          '&:hover': {
            backgroundColor: colors.primaryContainer,
          },
        },
        containedSecondary: {
          backgroundColor: colors.secondary,
          color: colors.onSecondary,
          '&:hover': {
            backgroundColor: colors.secondaryContainer,
          },
        },
        outlinedPrimary: {
          borderColor: colors.outlineVariant,
          color: colors.primary,
          '&:hover': {
            borderColor: colors.secondary,
            backgroundColor: 'rgba(0, 93, 167, 0.04)',
          },
        },
        outlinedSecondary: {
          borderColor: colors.secondary,
          color: colors.secondary,
          '&:hover': {
            borderColor: colors.secondaryContainer,
            backgroundColor: 'rgba(0, 93, 167, 0.06)',
          },
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          borderRadius: radii.lg,
          backgroundColor: colors.surfaceContainerLowest,
          border: `1px solid ${colors.surfaceContainer}`,
          boxShadow: shadows.level1,
          transition: 'box-shadow 0.2s ease, transform 0.2s ease, border-color 0.2s ease',
          '&:hover': {
            boxShadow: shadows.level2,
          },
        },
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: {
          borderRadius: radii.lg,
          backgroundImage: 'none',
        },
        elevation1: {
          boxShadow: shadows.level1,
          border: `1px solid ${colors.surfaceContainer}`,
        },
        elevation2: {
          boxShadow: shadows.level2,
          border: `1px solid ${colors.surfaceContainer}`,
        },
        elevation3: {
          boxShadow: shadows.level3,
          border: `1px solid ${colors.surfaceContainer}`,
        },
      },
    },
    MuiTextField: {
      defaultProps: {
        variant: 'outlined',
        size: 'small',
      },
    },
    MuiOutlinedInput: {
      styleOverrides: {
        root: {
          borderRadius: radii.default,
          backgroundColor: colors.surfaceContainerLowest,
          '& .MuiOutlinedInput-notchedOutline': {
            borderColor: colors.borderSubtle,
            transition: 'border-color 0.2s ease, box-shadow 0.2s ease',
          },
          '&:hover .MuiOutlinedInput-notchedOutline': {
            borderColor: colors.borderHover,
          },
          '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
            borderColor: colors.secondary,
            borderWidth: 2,
          },
        },
      },
    },
    MuiChip: {
      styleOverrides: {
        root: {
          borderRadius: radii.md,
          fontWeight: 600,
          fontSize: typography.labelSm.fontSize,
        },
      },
    },
    MuiAppBar: {
      styleOverrides: {
        root: {
          backgroundColor: colors.surfaceContainerLowest,
          color: colors.onSurface,
          boxShadow: shadows.level1,
          borderBottom: `1px solid ${colors.surfaceContainer}`,
        },
      },
    },
    MuiDrawer: {
      styleOverrides: {
        paper: {
          backgroundColor: colors.surfaceContainerLowest,
          borderLeft: `1px solid ${colors.surfaceContainer}`,
          boxShadow: 'none',
        },
      },
    },
    MuiTableHead: {
      styleOverrides: {
        root: {
          backgroundColor: colors.neutralLight,
        },
      },
    },
    MuiTableCell: {
      styleOverrides: {
        root: {
          fontFamily: typography.fontFamily,
          borderBottom: `1px solid ${colors.neutralLight}`,
          padding: '12px 16px',
        },
        head: {
          backgroundColor: colors.neutralLight,
          fontWeight: 600,
          fontSize: '13px',
          color: colors.onSurfaceVariant,
        },
        body: {
          fontSize: '14px',
          color: colors.onSurface,
        },
      },
    },
    MuiTableRow: {
      styleOverrides: {
        root: {
          transition: 'background-color 0.15s ease',
          '&:hover': {
            backgroundColor: 'rgba(4, 22, 50, 0.02) !important',
          },
        },
      },
    },
    MuiBreadcrumbs: {
      styleOverrides: {
        root: {
          fontSize: typography.bodySm.fontSize,
          color: colors.neutral,
        },
        separator: {
          color: colors.outlineVariant,
=======
>>>>>>> 8a3a984 (feat: add initial layout components and RTL cache)
        },
      },
    },
  },
});
