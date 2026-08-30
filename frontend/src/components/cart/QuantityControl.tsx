import { useState } from 'react';
import { Box, IconButton, InputBase } from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import RemoveIcon from '@mui/icons-material/Remove';

interface QuantityControlProps {
  quantity: number;
  onUpdate: (newQuantity: number) => void;
  size?: 'small' | 'medium';
}

export default function QuantityControl({
  quantity,
  onUpdate,
  size = 'medium',
}: QuantityControlProps) {
  const [prevQuantity, setPrevQuantity] = useState<number>(quantity);
  const [localQty, setLocalQty] = useState<string>(String(quantity));

  // Pattern: Adjusting state while rendering (to sync with external prop changes)
  if (quantity !== prevQuantity) {
    setPrevQuantity(quantity);
    setLocalQty(String(quantity));
  }

  const handleDecrease = () => {
    if (quantity > 1) {
      onUpdate(quantity - 1);
    }
  };

  const handleIncrease = () => {
    onUpdate(quantity + 1);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setLocalQty(e.target.value);
  };

  const submitQuantity = () => {
    const parsed = parseInt(localQty, 10);
    if (!isNaN(parsed) && parsed > 0) {
      if (parsed !== quantity) {
        onUpdate(parsed);
      }
    } else {
      setLocalQty(String(quantity)); // Revert if invalid
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      submitQuantity();
    }
  };

  const isSmall = size === 'small';

  return (
    <Box
      sx={{
        display: 'flex',
        alignItems: 'center',
        border: '1px solid',
        borderColor: 'divider',
        borderRadius: 2,
        p: isSmall ? 0.25 : 0.5,
      }}
    >
      <IconButton size="small" onClick={handleIncrease} sx={{ p: isSmall ? 0.5 : 1 }}>
        <AddIcon fontSize={isSmall ? 'inherit' : 'small'} />
      </IconButton>

      <InputBase
        value={localQty}
        onChange={handleInputChange}
        onBlur={submitQuantity}
        onKeyDown={handleKeyDown}
        inputProps={{
          type: 'number',
          style: {
            textAlign: 'center',
            width: isSmall ? '50px' : '70px', // Enlarged width for 9999+ numbers
            padding: 0,
            fontSize: isSmall ? '0.875rem' : '1rem',
          },
          min: 1,
        }}
        sx={{ mx: isSmall ? 0.5 : 1 }}
      />

      <IconButton
        size="small"
        onClick={handleDecrease}
        disabled={quantity <= 1}
        sx={{ p: isSmall ? 0.5 : 1 }}
      >
        <RemoveIcon fontSize={isSmall ? 'inherit' : 'small'} />
      </IconButton>
    </Box>
  );
}
