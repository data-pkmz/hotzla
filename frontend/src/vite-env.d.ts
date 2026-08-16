/// <reference types="vite/client" />

import type { PaletteColorOptions } from '@mui/material/styles';

declare module '@mui/material/styles' {
  interface SimplePaletteColorOptions {
    container?: string;
    onContainer?: string;
  }

  interface PaletteColor {
    container?: string;
    onContainer?: string;
  }

  interface Palette {
    tertiary?: PaletteColor;
    surface?: {
      main: string;
      dim: string;
      bright: string;
      containerLowest: string;
      containerLow: string;
      container: string;
      containerHigh: string;
      containerHighest: string;
      variant: string;
    };
    customStatus?: {
      pendingBudget: string;
      pendingBudgetBg: string;
      budgetApproved: string;
      budgetApprovedBg: string;
      approvedForProduction: string;
      approvedForProductionBg: string;
      inPrinting: string;
      inPrintingBg: string;
      readyForPickup: string;
      readyForPickupBg: string;
      completed: string;
      completedBg: string;
      rejected: string;
      rejectedBg: string;
    };
  }

  interface PaletteOptions {
    tertiary?: PaletteColorOptions;
    surface?: {
      main?: string;
      dim?: string;
      bright?: string;
      containerLowest?: string;
      containerLow?: string;
      container?: string;
      containerHigh?: string;
      containerHighest?: string;
      variant?: string;
    };
    customStatus?: {
      pendingBudget?: string;
      pendingBudgetBg?: string;
      budgetApproved?: string;
      budgetApprovedBg?: string;
      approvedForProduction?: string;
      approvedForProductionBg?: string;
      inPrinting?: string;
      inPrintingBg?: string;
      readyForPickup?: string;
      readyForPickupBg?: string;
      completed?: string;
      completedBg?: string;
      rejected?: string;
      rejectedBg?: string;
    };
  }
}
