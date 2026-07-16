import React from 'react';
import type { ProductAttributeDefinition } from 'shared-types';

interface DynamicAttributeInputProps {
  definition: ProductAttributeDefinition;
  value: any;
  onChange: (value: any) => void;
}

export const DynamicAttributeInput: React.FC<DynamicAttributeInputProps> = ({
  definition,
  value,
  onChange,
}) => {
  return (
    <div className="dynamic-attribute-input">
      <label>{definition.attributeName}</label>
      <input
        type="text"
        value={value || ''}
        onChange={(e) => onChange(e.target.value)}
      />
      <span style={{ fontSize: '0.8em', color: 'gray' }}> ({definition.attributeType})</span>
    </div>
  );
};
export default DynamicAttributeInput;
