import type {
  AttributeDisplayStyle,
  AttributeType,
  PricingImpactType,
  Product,
  ProductAttributeDefinition,
} from 'shared-types';
import { apiFetch } from '../api';

export interface ProductDefinitionOptionInput {
  id?: string;
  optionLabel: string;
  optionValue: string;
  priceModifier?: number;
  priceModifierType?: 'FIXED_ADD' | 'MULTIPLY';
  displayOrder?: number;
  isPerUnit?: boolean;
}

export interface ProductDefinitionInput {
  id?: string;
  attributeName: string;
  attributeType: AttributeType;
  displayStyle?: AttributeDisplayStyle;
  isRequired?: boolean;
  displayOrder?: number;
  pricingRule?: PricingImpactType;
  unitPrice?: number | null;
  minValue?: number | null;
  maxValue?: number | null;
  options?: ProductDefinitionOptionInput[];
}

export interface SaveProductPayload {
  name: string;
  description: string;
  category: string;
  productType: 'FIXED' | 'DYNAMIC';
  basePrice: number;
  minQuantity: number;
  maxQuantity: number | null;
  isActive: boolean;
  imageUrl: string;
  definitions: ProductDefinitionInput[];
}

interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
}

export interface ProductWithAttributes extends Product {
  attributes?: ProductAttributeDefinition[];
  attributeDefinitionEntries?: ProductAttributeDefinition[];
}

/**
 * Fetches single product with its attribute definitions.
 */
export const getAdminProductById = async (id: string): Promise<ProductWithAttributes> => {
  const response = await apiFetch(`/api/products/${id}`);

  if (!response.ok) {
    const errorBody = await response.json().catch(() => null);
    throw new Error(errorBody?.message || 'לא ניתן לטעון את נתוני המוצר');
  }

  const result: ApiResponse<ProductWithAttributes> = await response.json();

  if (!result.success) {
    throw new Error(result.message || 'לא ניתן לטעון את נתוני המוצר');
  }

  return result.data;
};

/**
 * Creates a new product in the admin catalog.
 */
export const createAdminProduct = async (
  payload: SaveProductPayload
): Promise<ProductWithAttributes> => {
  const response = await apiFetch('/api/admin/products', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  const result: ApiResponse<ProductWithAttributes> = await response.json();

  if (!response.ok || !result.success) {
    throw new Error(result.message || 'שמירת המוצר נכשלה');
  }

  return result.data;
};

/**
 * Updates an existing product in the admin catalog.
 */
export const updateAdminProduct = async (
  id: string,
  payload: SaveProductPayload
): Promise<ProductWithAttributes> => {
  const response = await apiFetch(`/api/admin/products/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  const result: ApiResponse<ProductWithAttributes> = await response.json();

  if (!response.ok || !result.success) {
    throw new Error(result.message || 'שמירת המוצר נכשלה');
  }

  return result.data;
};
