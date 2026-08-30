import { useState } from 'react';
import { Box, IconButton, InputBase } from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import RemoveIcon from '@mui/icons-material/Remove';

interface QuantityControlProps {
  quantity: number;
  minQuantity?: number;
  maxQuantity?: number | null;
  onUpdate: (newQuantity: number) => void;
  size?: 'small' | 'medium';
}

export default function QuantityControl({
  quantity,
  minQuantity = 1,
  maxQuantity = null,
  onUpdate,
  size = 'medium',
}: QuantityControlProps) {
  const [prevQuantity, setPrevQuantity] = useState<number>(quantity);
  const [localQty, setLocalQty] = useState<string>(String(quantity));

  if (quantity !== prevQuantity) {
    setPrevQuantity(quantity);
    setLocalQty(String(quantity));
  }

  const handleDecrease = () => {
    if (quantity > minQuantity) {
      onUpdate(quantity - 1);
    }
  };

  const handleIncrease = () => {
    if (maxQuantity === null || quantity < maxQuantity) {
      onUpdate(quantity + 1);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setLocalQty(e.target.value);
  };

  const submitQuantity = () => {
    const parsed = Number(localQty);

    const isValid =
      Number.isInteger(parsed) &&
      parsed >= minQuantity &&
      (maxQuantity === null || parsed <= maxQuantity);

    if (!isValid) {
      setLocalQty(String(quantity));
      return;
    }

    if (parsed !== quantity) {
      onUpdate(parsed);
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
      <IconButton
        size="small"
        onClick={handleIncrease}
        disabled={maxQuantity !== null && quantity >= maxQuantity}
        sx={{ p: isSmall ? 0.5 : 1 }}
      >
        <AddIcon fontSize={isSmall ? 'inherit' : 'small'} />
      </IconButton>

      <InputBase
        value={localQty}
        onChange={handleInputChange}
        onBlur={submitQuantity}
        onKeyDown={handleKeyDown}
        inputProps={{
          type: 'number',
          min: minQuantity,
          max: maxQuantity ?? undefined,
          step: 1,
          style: {
            textAlign: 'center',
            width: isSmall ? '50px' : '70px',
            padding: 0,
            fontSize: isSmall ? '0.875rem' : '1rem',
          },
        }}
        sx={{ mx: isSmall ? 0.5 : 1 }}
      />

      <IconButton
        size="small"
        onClick={handleDecrease}
        disabled={quantity <= minQuantity}
        sx={{ p: isSmall ? 0.5 : 1 }}
      >
        <RemoveIcon fontSize={isSmall ? 'inherit' : 'small'} />
      </IconButton>
    </Box>
  );
}
