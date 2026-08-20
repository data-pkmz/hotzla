import { Stack, Chip } from '@mui/material';

interface CategoryFilterProps {
  categories: string[];
  selectedCategory: string | null;
  onCategoryChange: (category: string | null) => void;
}

export default function CategoryFilter({
  categories,
  selectedCategory,
  onCategoryChange,
}: CategoryFilterProps) {
  return (
    <Stack direction="row" spacing={1} useFlexGap flexWrap="wrap">
      <Chip
        label="הכל"
        clickable
        onClick={() => onCategoryChange(null)}
        variant={selectedCategory === null ? 'filled' : 'outlined'}
        sx={{
          fontWeight: 600,
          borderColor: 'text.primary',
          bgcolor: selectedCategory === null ? 'text.primary' : 'background.paper',
          color: selectedCategory === null ? 'background.paper' : 'text.primary',
          '&:hover': {
            bgcolor: selectedCategory === null ? 'text.primary' : 'action.hover',
          },
        }}
      />

      {categories.map((category) => {
        const selected = selectedCategory === category;

        return (
          <Chip
            key={category}
            label={category}
            clickable
            onClick={() => onCategoryChange(category)}
            variant={selected ? 'filled' : 'outlined'}
            sx={{
              fontWeight: 600,
              borderColor: 'text.primary',
              bgcolor: selected ? 'text.primary' : 'background.paper',
              color: selected ? 'background.paper' : 'text.primary',
              '&:hover': {
                bgcolor: selected ? 'text.primary' : 'action.hover',
              },
            }}
          />
        );
      })}
    </Stack>
  );
}
