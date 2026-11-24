import { Typography } from '@mui/material';

interface DemoDataPanelProps {
  areaLabel: string;
}

export default function DemoDataPanel({ areaLabel }: DemoDataPanelProps) {
  return (
    <Typography
      variant="caption"
      color="text.secondary"
      dir="rtl"
      aria-label={`נתוני הדגמה: ${areaLabel}`}
      sx={{ display: 'block', mb: 1 }}
    >
      המידע המוצג ב{areaLabel} פיקטיבי לדוגמה.
    </Typography>
  );
}
