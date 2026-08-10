import React from 'react';
import type { PriceResult } from 'shared-types';

interface PriceBreakdownProps {
  priceResult: PriceResult;
}

export const PriceBreakdown: React.FC<PriceBreakdownProps> = ({ priceResult }) => {
  return (
    <div className="price-breakdown">
      <h3>פירוט מחיר</h3>
      <ul>
        {priceResult.breakdown.map((line, index) => (
          <li key={index}>
            {line.attributeName} ({line.selectedValue}): {line.contribution} ₪
          </li>
        ))}
      </ul>
      <hr />
      <strong>סה"כ לתשלום: {priceResult.totalPrice} ₪</strong>
    </div>
  );
};
export default PriceBreakdown;
