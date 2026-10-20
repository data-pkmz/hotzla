import { Prisma, Status } from '@prisma/client';
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
import { prisma } from '../config/db';
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
function normalizeProductDefinitions(
  definitions: ProductDefinitionInput[] = []
): ProductDefinitionInput[] {
  const regularDefinitions = definitions.filter(
    (definition) => definition.attributeType !== 'FILE_UPLOAD'
  );
  const existingUpload = definitions.find(
    (definition) => definition.attributeType === 'FILE_UPLOAD'
  );
  const uploadDefinition: ProductDefinitionInput = {
    id: existingUpload?.id,
    attributeName: 'קובץ להדפסה',
    attributeType: 'FILE_UPLOAD',
    displayStyle: 'FILE_DROPZONE',
    isRequired: true,
    displayOrder: regularDefinitions.length,
    pricingRule: 'NONE',
    unitPrice: null,
    minValue: null,
    maxValue: null,
    options: [],
  };
  return [
    ...regularDefinitions.map((definition, index) => ({
      ...definition,
      displayOrder: index,
    })),
    uploadDefinition,
  ];
}
function getDefaultDisplayStyle(
  attributeType: AttributeType,
  style?: AttributeDisplayStyle
): AttributeDisplayStyle {
  if (style) {
    return style;
  }
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

/**
 * Removes all occurrences of a product from users' active carts.
 *
 * This must execute inside the same transaction as the
 * product update, so failed updates never clear cart items.
 *
 * Historical carts and existing orders are not modified.
 */
async function removeProductFromActiveCarts(
  tx: Prisma.TransactionClient,
  productId: string
): Promise<number> {
  const result = await tx.cartItem.updateMany({
    where: {
      productId,
      isDeleted: false,
      cart: {
        status: Status.ACTIVE,
        isDeleted: false,
      },
    },
    data: {
      isDeleted: true,
    },
  });

  return result.count;
}

export class CatalogService {
  // ============================================================
  // PRODUCTS CRUD
  // ============================================================
  /**
   * Returns all products that are available in the catalogue.
   *
   * Deleted products and inactive products are excluded.
   *
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
   * Returns products for the manager catalog, including inactive products.
   * Soft-deleted products remain excluded.
   */
  public static async getAllAdminProducts(): Promise<Product[]> {
    return prisma.product.findMany({
      where: {
        isDeleted: false,
      },
      orderBy: {
        name: 'asc',
      },
    });
  }

  /**
   * Returns a single active product by ID.
   *
   * Deleted and inactive products are not returned.
   *
   * This basic method is retained because other callers may only need
   * the product record without its attribute definitions.
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
   * Returns an active product together with its non-deleted attribute
   * definitions and available options.
   *
   * This is used by the public product-details endpoint so the controller
   * does not need to perform one product lookup followed by a separate
   * attribute-definition lookup.
   */
  public static async getProductDetails(id: string) {
    return prisma.product.findFirst({
      where: {
        id,
        isDeleted: false,
        isActive: true,
      },
      include: {
        attributeDefinitionEntries: {
          where: {
            isDeleted: false,
          },
          orderBy: {
            displayOrder: 'asc',
          },
          include: {
            attributeOptionEntries: {
              where: {
                isDeleted: false,
              },
              orderBy: {
                displayOrder: 'asc',
              },
            },
          },
        },
      },
    });
  }
  /**
   * Returns an active or inactive, non-deleted product with its current
   * attribute definitions and options for the manager edit page.
   * The included relation structure matches getProductDetails().
   */
  public static async getAdminProductDetails(id: string) {
    return prisma.product.findFirst({
      where: {
        id,
        isDeleted: false,
      },
      include: {
        attributeDefinitionEntries: {
          where: {
            isDeleted: false,
          },
          orderBy: {
            displayOrder: 'asc',
          },
          include: {
            attributeOptionEntries: {
              where: {
                isDeleted: false,
              },
              orderBy: {
                displayOrder: 'asc',
              },
            },
          },
        },
      },
    });
  }

  /**
   * Creates a new product and optionally its attribute definitions
   * and options.
   */
  public static async createProduct(data: CreateProductInput): Promise<Product> {
    const rawDefinitions = normalizeProductDefinitions(data.definitions ?? data.attributes ?? []);
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
        where: {
          id: createdProduct.id,
        },
      });
    });
  }
  /**
   * Updates an existing product and optionally its attribute
   * definitions and options.
   */
  public static async updateProduct(id: string, data: UpdateProductInput): Promise<Product> {
    const suppliedDefinitions = data.definitions ?? data.attributes;
    const rawDefinitions =
      suppliedDefinitions !== undefined
        ? normalizeProductDefinitions(suppliedDefinitions)
        : undefined;
    const existingProduct = await prisma.product.findUnique({
      where: {
        id,
      },
    });
    if (!existingProduct) {
      throw new Error('Product not found');
    }
    const effectiveMinQuantity = data.minQuantity ?? existingProduct.minQuantity;
    const effectiveMaxQuantity =
      data.maxQuantity !== undefined ? data.maxQuantity : existingProduct.maxQuantity;
    if (effectiveMaxQuantity !== null && effectiveMaxQuantity < effectiveMinQuantity) {
      throw new Error('Maximum quantity cannot be less than minimum quantity');
    }
    const productUpdateData: Prisma.ProductUpdateInput = {};
    if (data.name !== undefined) {
      productUpdateData.name = data.name;
    }
    if (data.description !== undefined) {
      productUpdateData.description = data.description;
    }
    if (data.category !== undefined) {
      productUpdateData.category = data.category;
    }
    if (data.productType !== undefined) {
      productUpdateData.productType = data.productType;
    }
    if (data.basePrice !== undefined) {
      productUpdateData.basePrice = data.basePrice;
    }
    if (data.isActive !== undefined) {
      productUpdateData.isActive = data.isActive;
    }
    if (data.imageUrl !== undefined) {
      productUpdateData.imageUrl = data.imageUrl;
    }
    if (data.minQuantity !== undefined) {
      productUpdateData.minQuantity = data.minQuantity;
    }
    if (data.maxQuantity !== undefined) {
      productUpdateData.maxQuantity = data.maxQuantity;
    }

    if (!rawDefinitions) {
      return prisma.$transaction(async (tx) => {
        const updatedProduct = await tx.product.update({
          where: { id },
          data: productUpdateData,
        });

        await removeProductFromActiveCarts(tx, id);

        return updatedProduct;
      });
    }

    return prisma.$transaction(async (tx) => {
      await tx.product.update({
        where: { id },
        data: productUpdateData,
      });

      const existingDefinitions = await tx.productAttributeDefinition.findMany({
        where: {
          productId: id,
          isDeleted: false,
        },
        include: {
          attributeOptionEntries: {
            where: { isDeleted: false },
          },
        },
      });

      const definitionsById = new Map(
        existingDefinitions.map((definition) => [definition.id, definition])
      );

      const submittedDefinitionIds = new Set<string>();
      const submittedOptionIds = new Set<string>();

      for (const def of rawDefinitions) {
        if (def.id) {
          if (!definitionsById.has(def.id) || submittedDefinitionIds.has(def.id)) {
            throw new Error('Invalid or duplicate attribute definition ID');
          }

          submittedDefinitionIds.add(def.id);
        }

        const definitionData = {
          attributeName: def.attributeName,
          attributeType: def.attributeType,
          displayStyle: getDefaultDisplayStyle(def.attributeType, def.displayStyle),
          isRequired: def.isRequired ?? false,
          displayOrder: def.displayOrder ?? 0,
          pricingRule: def.pricingRule ?? 'NONE',
          unitPrice: def.unitPrice ?? null,
          minValue: def.minValue ?? null,
          maxValue: def.maxValue ?? null,
        };

        const attribute = def.id
          ? await tx.productAttributeDefinition.update({
              where: { id: def.id },
              data: definitionData,
            })
          : await tx.productAttributeDefinition.create({
              data: {
                ...definitionData,
                productId: id,
              },
            });

        // The newly created definition also needs to survive
        // the soft-delete reconciliation at the end of the transaction.
        submittedDefinitionIds.add(attribute.id);

        const existingOptions = def.id
          ? (definitionsById.get(def.id)?.attributeOptionEntries ?? [])
          : [];

        const optionsById = new Map(existingOptions.map((option) => [option.id, option]));

        const retainedOptionIds = new Set<string>();

        for (const [index, opt] of (def.options ?? []).entries()) {
          if (opt.id) {
            if (!optionsById.has(opt.id) || submittedOptionIds.has(opt.id)) {
              throw new Error('Invalid or duplicate attribute option ID');
            }

            submittedOptionIds.add(opt.id);
            retainedOptionIds.add(opt.id);
          }

          const optionData = {
            optionLabel: opt.optionLabel,
            optionValue: opt.optionValue,
            priceModifier: opt.priceModifier ?? 0,
            priceModifierType: opt.priceModifierType ?? 'FIXED_ADD',
            displayOrder: opt.displayOrder ?? index,
            isPerUnit: opt.isPerUnit ?? false,
          };

          if (opt.id) {
            await tx.productAttributeOption.update({
              where: { id: opt.id },
              data: optionData,
            });

            retainedOptionIds.add(opt.id);
          } else {
            const createdOption = await tx.productAttributeOption.create({
              data: {
                ...optionData,
                attributeDefinitionId: attribute.id,
              },
            });

            // New options must be retained during the subsequent
            // soft-delete reconciliation.
            retainedOptionIds.add(createdOption.id);
          }
        }

        // Soft-delete options removed from this attribute.
        await tx.productAttributeOption.updateMany({
          where: {
            attributeDefinitionId: attribute.id,
            isDeleted: false,
            id: { notIn: [...retainedOptionIds] },
          },
          data: { isDeleted: true },
        });
      }

      // Soft-delete definitions removed from the product.
      await tx.productAttributeDefinition.updateMany({
        where: {
          productId: id,
          isDeleted: false,
          id: { notIn: [...submittedDefinitionIds] },
        },
        data: { isDeleted: true },
      });

      // Remove this product from all active carts.
      // This is part of the same transaction as the product update.
      await removeProductFromActiveCarts(tx, id);

      return tx.product.findUniqueOrThrow({
        where: { id },
      });
    });
  }

  /**
   * Soft-deletes a product by setting its isDeleted flag and
   * deactivating it.
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
   * Creates a new attribute definition for a product with full
   * DTO validation.
   */
  public static async createAttributeDefinition(
    productId: string,
    dto: CreateAttributeDto
  ): Promise<ProductAttributeDefinition> {
    CreateAttributeSchema.parse({
      ...dto,
      productId,
    });
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
   * Retrieves all non-deleted attribute definitions for a product,
   * ordered by displayOrder.
   *
   * Retained for callers that need definitions separately from
   * product details.
   */
  public static async getAttributeDefinitions(
    productId: string
  ): Promise<ProductAttributeDefinitionWithOptions[]> {
    return prisma.productAttributeDefinition.findMany({
      where: {
        productId,
        isDeleted: false,
      },
      include: {
        attributeOptionEntries: {
          where: {
            isDeleted: false,
          },
          orderBy: {
            displayOrder: 'asc',
          },
        },
      },
      orderBy: {
        displayOrder: 'asc',
      },
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
    if (dto.attributeName !== undefined) {
      dataToUpdate.attributeName = dto.attributeName;
    }
    if (dto.attributeType !== undefined) {
      dataToUpdate.attributeType = dto.attributeType;
    }
    if (dto.displayStyle !== undefined) {
      dataToUpdate.displayStyle = dto.displayStyle;
    }
    if (dto.isRequired !== undefined) {
      dataToUpdate.isRequired = dto.isRequired;
    }
    if (dto.displayOrder !== undefined) {
      dataToUpdate.displayOrder = dto.displayOrder;
    }
    if (dto.pricingRule !== undefined) {
      dataToUpdate.pricingRule = dto.pricingRule;
    }
    if (dto.unitPrice !== undefined) {
      dataToUpdate.unitPrice = dto.unitPrice;
    }
    if (dto.minValue !== undefined) {
      dataToUpdate.minValue = dto.minValue;
    }
    if (dto.maxValue !== undefined) {
      dataToUpdate.maxValue = dto.maxValue;
    }
    return prisma.productAttributeDefinition.update({
      where: {
        id,
      },
      data: dataToUpdate,
      include: {
        attributeOptionEntries: {
          where: {
            isDeleted: false,
          },
          orderBy: {
            displayOrder: 'asc',
          },
        },
      },
    });
  }
  /**
   * Updates an attribute definition without schema parsing
   * for backwards compatibility.
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
      where: {
        id,
      },
      data,
    });
  }
  /**
   * Soft-deletes an attribute definition.
   */
  public static async deleteAttributeDefinition(id: string): Promise<ProductAttributeDefinition> {
    return prisma.productAttributeDefinition.update({
      where: {
        id,
      },
      data: {
        isDeleted: true,
      },
    });
  }
  /**
   * Soft-deletes an attribute definition (alias).
   */
  public static async softDeleteAttribute(id: string): Promise<ProductAttributeDefinition> {
    return CatalogService.deleteAttributeDefinition(id);
  }
  /**
   * Updates the display order for multiple attribute definitions
   * in a single transaction.
   */
  public static async updateAttributeDefinitionsDisplayOrder(
    orders: { id: string; displayOrder: number }[]
  ): Promise<ProductAttributeDefinition[]> {
    UpdateDisplayOrderSchema.parse(orders);
    const updates = orders.map((order) =>
      prisma.productAttributeDefinition.update({
        where: {
          id: order.id,
        },
        data: {
          displayOrder: order.displayOrder,
        },
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
    if (dto.optionLabel !== undefined) {
      dataToUpdate.optionLabel = dto.optionLabel;
    }
    if (dto.optionValue !== undefined) {
      dataToUpdate.optionValue = dto.optionValue;
    }
    if (dto.priceModifier !== undefined) {
      dataToUpdate.priceModifier = dto.priceModifier;
    }
    if (dto.priceModifierType !== undefined) {
      dataToUpdate.priceModifierType = dto.priceModifierType;
    }
    if (dto.displayOrder !== undefined) {
      dataToUpdate.displayOrder = dto.displayOrder;
    }
    if (dto.isPerUnit !== undefined) {
      dataToUpdate.isPerUnit = dto.isPerUnit;
    }
    return prisma.productAttributeOption.update({
      where: {
        id,
      },
      data: dataToUpdate,
    });
  }
  /**
   * Soft-deletes an attribute option.
   */
  public static async deleteAttributeOption(id: string): Promise<ProductAttributeOption> {
    return prisma.productAttributeOption.update({
      where: {
        id,
      },
      data: {
        isDeleted: true,
      },
    });
  }
  /**
   * Updates the display order for multiple attribute options
   * in a single transaction.
   */
  public static async updateAttributeOptionsDisplayOrder(
    orders: { id: string; displayOrder: number }[]
  ): Promise<ProductAttributeOption[]> {
    UpdateDisplayOrderSchema.parse(orders);
    const updates = orders.map((order) =>
      prisma.productAttributeOption.update({
        where: {
          id: order.id,
        },
        data: {
          displayOrder: order.displayOrder,
        },
      })
    );
    return prisma.$transaction(updates);
  }
}
export default CatalogService;
