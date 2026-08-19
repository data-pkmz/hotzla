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
   * Creates a new product.
   */
  public static async createProduct(data: {
    name: string;
    description: string;
    category: string;
    productType: ProductType;
    basePrice: number;
    createdBy?: string;
  }): Promise<Product> {
    return prisma.product.create({
      data: {
        name: data.name,
        description: data.description,
        category: data.category,
        productType: data.productType,
        basePrice: data.basePrice,
        isActive: true,
        createdBy: data.createdBy,
      },
    });
  }

  /**
   * Updates an existing product.
   */
  public static async updateProduct(
    id: string,
    data: {
      name?: string;
      description?: string;
      category?: string;
      productType?: ProductType;
      basePrice?: number;
    }
  ): Promise<Product> {
    return prisma.product.update({
      where: {
        id,
      },
      data,
    });
  }

  /**
   * Soft-deletes a product.
   * The database record is preserved so existing orders can continue to reference the product.
   */
  public static async softDeleteProduct(id: string): Promise<Product> {
    return prisma.product.update({
      where: {
        id,
      },
      data: {
        isDeleted: true,
        isActive: false,
      },
    });
  }

  /**
   * Activates a product.
   * This does not restore a soft-deleted product.
   */
  public static async activateProduct(id: string): Promise<Product> {
    return prisma.product.update({
      where: {
        id,
        isDeleted: false,
      },
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
      where: {
        id,
        isDeleted: false,
      },
      data: {
        isActive: false,
      },
    });
  }

  // ============================================================
  // PRODUCT ATTRIBUTE DEFINITIONS
  // ============================================================

  /**
   * Creates an attribute definition for a product with full validation and optional options.
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
        displayStyle: dto.displayStyle ?? null,
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
  ): Promise<ProductAttributeDefinition[]> {
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
