import { prisma } from '../config/db';
import { Prisma } from '@prisma/client';
import type { Product, ProductAttributeDefinition, ProductAttributeOption } from '@prisma/client';
import type {
  ProductType,
  AttributeType,
  AttributeDisplayStyle,
  PricingRule,
  CreateAttributeDto,
  UpdateAttributeDto,
  ProductAttributeOptionDto,
} from 'shared-types';
import {
  CreateAttributeSchema,
  UpdateAttributeSchema,
  UpdateDisplayOrderSchema,
} from '../validations/attribute.validation';

type ProductAttributeDefinitionWithOptions = Prisma.ProductAttributeDefinitionGetPayload<{
  include: {
    attributeOptionEntries: true;
  };
}>;

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
  pricingRule?: PricingRule;
  unitPrice?: number | null;
  minValue?: number | null;
  maxValue?: number | null;
  options?: ProductDefinitionOptionInput[];
}

export interface CreateProductInput {
  name: string;
  description: string;
  category: string;
  productType?: ProductType;
  basePrice: number;
  isActive?: boolean;
  imageUrl?: string;
  createdBy?: string;
  minQuantity: number;
  maxQuantity?: number | null;
  definitions?: ProductDefinitionInput[];
  attributes?: ProductDefinitionInput[];
}

export interface UpdateProductInput {
  name?: string;
  description?: string;
  category?: string;
  productType?: ProductType;
  basePrice?: number;
  isActive?: boolean;
  imageUrl?: string;
  minQuantity?: number;
  maxQuantity?: number | null;
  definitions?: ProductDefinitionInput[];
  attributes?: ProductDefinitionInput[];
}

function getDefaultDisplayStyle(
  attributeType: AttributeType,
  style?: AttributeDisplayStyle
): AttributeDisplayStyle {
  if (style) return style;
  switch (attributeType) {
    case 'SELECT':
      return 'DROPDOWN';
    case 'NUMBER':
      return 'NUMBER_INPUT';
    case 'BOOLEAN':
      return 'SWITCH';
    case 'TEXT':
      return 'SINGLE_LINE';
    case 'FILE_UPLOAD':
      return 'FILE_DROPZONE';
    default:
      return 'DROPDOWN';
  }
}

export class CatalogService {
  // ============================================================
  // PRODUCTS CRUD
  // ============================================================

  /**
   * Returns all products that are available in the catalogue.
   * Deleted products and inactive products are excluded.
   */
  public static async getProducts(): Promise<Product[]> {
    return prisma.product.findMany({
      where: {
        isDeleted: false,
        isActive: true,
      },
      orderBy: {
        name: 'asc',
      },
    });
  }

  /**
   * Returns a single active product by ID.
   * Deleted and inactive products are not returned.
   */
  public static async getProductById(id: string): Promise<Product | null> {
    return prisma.product.findFirst({
      where: {
        id,
        isDeleted: false,
        isActive: true,
      },
    });
  }

  /**
   * Creates a new product (and optionally its attribute definitions and options).
   */
  public static async createProduct(data: CreateProductInput): Promise<Product> {
    const rawDefinitions = data.definitions ?? data.attributes;

    if (!rawDefinitions || rawDefinitions.length === 0) {
      const createData: Prisma.ProductUncheckedCreateInput = {
        name: data.name,
        description: data.description,
        category: data.category,
        productType: data.productType ?? 'DYNAMIC',
        basePrice: data.basePrice,
        isActive: data.isActive ?? true,
        createdBy: data.createdBy,
        minQuantity: data.minQuantity,
        maxQuantity: data.maxQuantity ?? null,
      };
      if (data.imageUrl !== undefined) {
        createData.imageUrl = data.imageUrl;
      }
      return prisma.product.create({
        data: createData,
      });
    }

    return prisma.$transaction(async (tx) => {
      const createData: Prisma.ProductUncheckedCreateInput = {
        name: data.name,
        description: data.description,
        category: data.category,
        productType: data.productType ?? 'DYNAMIC',
        basePrice: data.basePrice,
        isActive: data.isActive ?? true,
        createdBy: data.createdBy,
        minQuantity: data.minQuantity,
        maxQuantity: data.maxQuantity ?? null,
      };
      if (data.imageUrl !== undefined) {
        createData.imageUrl = data.imageUrl;
      }
      const createdProduct = await tx.product.create({
        data: createData,
      });

      for (const def of rawDefinitions) {
        const attribute = await tx.productAttributeDefinition.create({
          data: {
            productId: createdProduct.id,
            attributeName: def.attributeName,
            attributeType: def.attributeType,
            displayStyle: getDefaultDisplayStyle(def.attributeType, def.displayStyle),
            isRequired: def.isRequired ?? false,
            displayOrder: def.displayOrder ?? 0,
            pricingRule: def.pricingRule ?? 'NONE',
            unitPrice: def.unitPrice ?? null,
            minValue: def.minValue ?? null,
            maxValue: def.maxValue ?? null,
          },
        });

        if (def.options && def.options.length > 0) {
          await tx.productAttributeOption.createMany({
            data: def.options.map((opt, idx) => ({
              attributeDefinitionId: attribute.id,
              optionLabel: opt.optionLabel,
              optionValue: opt.optionValue,
              priceModifier: opt.priceModifier ?? 0,
              priceModifierType: opt.priceModifierType ?? 'FIXED_ADD',
              displayOrder: opt.displayOrder ?? idx,
              isPerUnit: opt.isPerUnit ?? false,
            })),
          });
        }
      }

      return tx.product.findUniqueOrThrow({
        where: { id: createdProduct.id },
      });
    });
  }

  /**
   * Updates an existing product (and optionally its attribute definitions and options).
   */
  public static async updateProduct(id: string, data: UpdateProductInput): Promise<Product> {
    const rawDefinitions = data.definitions ?? data.attributes;

    const productUpdateData: Prisma.ProductUpdateInput = {};
    if (data.name !== undefined) productUpdateData.name = data.name;
    if (data.description !== undefined) productUpdateData.description = data.description;
    if (data.category !== undefined) productUpdateData.category = data.category;
    if (data.productType !== undefined) productUpdateData.productType = data.productType;
    if (data.basePrice !== undefined) productUpdateData.basePrice = data.basePrice;
    if (data.isActive !== undefined) productUpdateData.isActive = data.isActive;
    if (data.imageUrl !== undefined) productUpdateData.imageUrl = data.imageUrl;
    if (data.minQuantity !== undefined) productUpdateData.minQuantity = data.minQuantity;
    if (data.maxQuantity !== undefined) productUpdateData.maxQuantity = data.maxQuantity;

    if (!rawDefinitions) {
      return prisma.product.update({
        where: { id },
        data: productUpdateData,
      });
    }

    return prisma.$transaction(async (tx) => {
      await tx.product.update({
        where: { id },
        data: productUpdateData,
      });

      // Soft delete existing attribute definitions and their options
      await tx.productAttributeDefinition.updateMany({
        where: { productId: id, isDeleted: false },
        data: { isDeleted: true },
      });

      // Re-create new definitions
      for (const def of rawDefinitions) {
        const attribute = await tx.productAttributeDefinition.create({
          data: {
            productId: id,
            attributeName: def.attributeName,
            attributeType: def.attributeType,
            displayStyle: getDefaultDisplayStyle(def.attributeType, def.displayStyle),
            isRequired: def.isRequired ?? false,
            displayOrder: def.displayOrder ?? 0,
            pricingRule: def.pricingRule ?? 'NONE',
            unitPrice: def.unitPrice ?? null,
            minValue: def.minValue ?? null,
            maxValue: def.maxValue ?? null,
          },
        });

        if (def.options && def.options.length > 0) {
          await tx.productAttributeOption.createMany({
            data: def.options.map((opt, idx) => ({
              attributeDefinitionId: attribute.id,
              optionLabel: opt.optionLabel,
              optionValue: opt.optionValue,
              priceModifier: opt.priceModifier ?? 0,
              priceModifierType: opt.priceModifierType ?? 'FIXED_ADD',
              displayOrder: opt.displayOrder ?? idx,
              isPerUnit: opt.isPerUnit ?? false,
            })),
          });
        }
      }

      return tx.product.findUniqueOrThrow({
        where: { id },
      });
    });
  }

  /**
   * Soft-deletes a product by setting its isDeleted flag and deactivating it.
   */
  public static async softDeleteProduct(id: string): Promise<Product> {
    return prisma.product.update({
      where: { id },
      data: {
        isDeleted: true,
        isActive: false,
      },
    });
  }

  /**
   * Activates a product.
   */
  public static async activateProduct(id: string): Promise<Product> {
    return prisma.product.update({
      where: { id, isDeleted: false },
      data: {
        isActive: true,
      },
    });
  }

  /**
   * Deactivates a product without deleting it.
   */
  public static async deactivateProduct(id: string): Promise<Product> {
    return prisma.product.update({
      where: { id, isDeleted: false },
      data: {
        isActive: false,
      },
    });
  }

  // ============================================================
  // PRODUCT ATTRIBUTE DEFINITIONS
  // ============================================================

  /**
   * Creates a new attribute definition for a product with full DTO validation.
   */
  public static async createAttributeDefinition(
    productId: string,
    dto: CreateAttributeDto
  ): Promise<ProductAttributeDefinition> {
    CreateAttributeSchema.parse({ ...dto, productId });

    return prisma.productAttributeDefinition.create({
      data: {
        productId,
        attributeName: dto.attributeName,
        attributeType: dto.attributeType,
        displayStyle: dto.displayStyle,
        isRequired: dto.isRequired ?? false,
        displayOrder: dto.displayOrder ?? 0,
        pricingRule: dto.pricingRule ?? 'NONE',
        unitPrice: dto.unitPrice ?? null,
        minValue: dto.minValue ?? null,
        maxValue: dto.maxValue ?? null,
        attributeOptionEntries: dto.options
          ? {
              create: dto.options.map((opt: ProductAttributeOptionDto, index: number) => ({
                optionLabel: opt.optionLabel,
                optionValue: opt.optionValue,
                priceModifier: opt.priceModifier ?? 0,
                priceModifierType: opt.priceModifierType ?? 'FIXED_ADD',
                displayOrder: opt.displayOrder ?? index,
                isPerUnit: opt.isPerUnit ?? false,
              })),
            }
          : undefined,
      },
      include: {
        attributeOptionEntries: true,
      },
    });
  }

  /**
   * Basic attribute creation helper for backwards compatibility.
   */
  public static async createAttribute(
    productId: string,
    data: {
      attributeName: string;
      attributeType: AttributeType;
      displayStyle: AttributeDisplayStyle;
      isRequired: boolean;
      displayOrder: number;
      pricingRule: PricingRule;
      unitPrice?: number;
      minValue?: number;
      maxValue?: number;
    }
  ): Promise<ProductAttributeDefinition> {
    return prisma.productAttributeDefinition.create({
      data: {
        productId,
        attributeName: data.attributeName,
        attributeType: data.attributeType,
        displayStyle: data.displayStyle,
        isRequired: data.isRequired,
        displayOrder: data.displayOrder,
        pricingRule: data.pricingRule,
        unitPrice: data.unitPrice,
        minValue: data.minValue,
        maxValue: data.maxValue,
      },
    });
  }

  /**
   * Retrieves all non-deleted attribute definitions for a product, ordered by displayOrder.
   */
  public static async getAttributeDefinitions(
    productId: string
  ): Promise<ProductAttributeDefinitionWithOptions[]> {
    return prisma.productAttributeDefinition.findMany({
      where: { productId, isDeleted: false },
      include: {
        attributeOptionEntries: {
          where: { isDeleted: false },
          orderBy: { displayOrder: 'asc' },
        },
      },
      orderBy: { displayOrder: 'asc' },
    });
  }

  /**
   * Updates an attribute definition with Zod validation.
   */
  public static async updateAttributeDefinition(
    id: string,
    dto: UpdateAttributeDto
  ): Promise<ProductAttributeDefinition> {
    UpdateAttributeSchema.parse(dto);

    const dataToUpdate: Prisma.ProductAttributeDefinitionUpdateInput = {};

    if (dto.attributeName !== undefined) dataToUpdate.attributeName = dto.attributeName;
    if (dto.attributeType !== undefined) dataToUpdate.attributeType = dto.attributeType;
    if (dto.displayStyle !== undefined) dataToUpdate.displayStyle = dto.displayStyle;
    if (dto.isRequired !== undefined) dataToUpdate.isRequired = dto.isRequired;
    if (dto.displayOrder !== undefined) dataToUpdate.displayOrder = dto.displayOrder;
    if (dto.pricingRule !== undefined) dataToUpdate.pricingRule = dto.pricingRule;
    if (dto.unitPrice !== undefined) dataToUpdate.unitPrice = dto.unitPrice;
    if (dto.minValue !== undefined) dataToUpdate.minValue = dto.minValue;
    if (dto.maxValue !== undefined) dataToUpdate.maxValue = dto.maxValue;

    return prisma.productAttributeDefinition.update({
      where: { id },
      data: dataToUpdate,
      include: {
        attributeOptionEntries: {
          where: { isDeleted: false },
          orderBy: { displayOrder: 'asc' },
        },
      },
    });
  }

  /**
   * Updates an attribute definition without schema parsing (for backwards compatibility).
   */
  public static async updateAttribute(
    id: string,
    data: {
      attributeName?: string;
      attributeType?: AttributeType;
      isRequired?: boolean;
      displayOrder?: number;
      pricingRule?: PricingRule;
      unitPrice?: number;
      minValue?: number;
      maxValue?: number;
    }
  ): Promise<ProductAttributeDefinition> {
    return prisma.productAttributeDefinition.update({
      where: { id },
      data,
    });
  }

  /**
   * Soft-deletes an attribute definition.
   */
  public static async deleteAttributeDefinition(id: string): Promise<ProductAttributeDefinition> {
    return prisma.productAttributeDefinition.update({
      where: { id },
      data: { isDeleted: true },
    });
  }

  /**
   * Soft-deletes an attribute definition (alias).
   */
  public static async softDeleteAttribute(id: string): Promise<ProductAttributeDefinition> {
    return CatalogService.deleteAttributeDefinition(id);
  }

  /**
   * Updates the display order for multiple attribute definitions in a single transaction.
   */
  public static async updateAttributeDefinitionsDisplayOrder(
    orders: { id: string; displayOrder: number }[]
  ): Promise<ProductAttributeDefinition[]> {
    UpdateDisplayOrderSchema.parse(orders);
    const updates = orders.map((order) =>
      prisma.productAttributeDefinition.update({
        where: { id: order.id },
        data: { displayOrder: order.displayOrder },
      })
    );
    return prisma.$transaction(updates);
  }

  // ============================================================
  // PRODUCT ATTRIBUTE OPTIONS
  // ============================================================

  /**
   * Creates a new option for an attribute definition.
   */
  public static async createAttributeOption(
    attributeDefinitionId: string,
    dto: ProductAttributeOptionDto
  ): Promise<ProductAttributeOption> {
    return prisma.productAttributeOption.create({
      data: {
        attributeDefinitionId,
        optionLabel: dto.optionLabel,
        optionValue: dto.optionValue,
        priceModifier: dto.priceModifier ?? 0,
        priceModifierType: dto.priceModifierType ?? 'FIXED_ADD',
        displayOrder: dto.displayOrder ?? 0,
        isPerUnit: dto.isPerUnit ?? false,
      },
    });
  }

  /**
   * Updates an existing attribute option.
   */
  public static async updateAttributeOption(
    id: string,
    dto: Partial<ProductAttributeOptionDto>
  ): Promise<ProductAttributeOption> {
    const dataToUpdate: Prisma.ProductAttributeOptionUpdateInput = {};

    if (dto.optionLabel !== undefined) dataToUpdate.optionLabel = dto.optionLabel;
    if (dto.optionValue !== undefined) dataToUpdate.optionValue = dto.optionValue;
    if (dto.priceModifier !== undefined) dataToUpdate.priceModifier = dto.priceModifier;
    if (dto.priceModifierType !== undefined) dataToUpdate.priceModifierType = dto.priceModifierType;
    if (dto.displayOrder !== undefined) dataToUpdate.displayOrder = dto.displayOrder;
    if (dto.isPerUnit !== undefined) dataToUpdate.isPerUnit = dto.isPerUnit;

    return prisma.productAttributeOption.update({
      where: { id },
      data: dataToUpdate,
    });
  }

  /**
   * Soft-deletes an attribute option.
   */
  public static async deleteAttributeOption(id: string): Promise<ProductAttributeOption> {
    return prisma.productAttributeOption.update({
      where: { id },
      data: { isDeleted: true },
    });
  }

  /**
   * Updates the display order for multiple attribute options in a single transaction.
   */
  public static async updateAttributeOptionsDisplayOrder(
    orders: { id: string; displayOrder: number }[]
  ): Promise<ProductAttributeOption[]> {
    UpdateDisplayOrderSchema.parse(orders);
    const updates = orders.map((order) =>
      prisma.productAttributeOption.update({
        where: { id: order.id },
        data: { displayOrder: order.displayOrder },
      })
    );
    return prisma.$transaction(updates);
  }
}

export default CatalogService;
