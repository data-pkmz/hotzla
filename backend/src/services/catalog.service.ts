import { PrismaClient, Prisma } from '@prisma/client';
import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';
import { CreateAttributeDto, UpdateAttributeDto, ProductAttributeOptionDto } from 'shared-types';
import {
  CreateAttributeSchema,
  UpdateAttributeSchema,
  UpdateDisplayOrderSchema,
} from '../validations/attribute.validation';

const connectionString =
  process.env.DATABASE_URL || 'postgresql://hotzla_user:hotzla_password@localhost:5433/hotzla_db';
const pool = new Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

export class CatalogService {
  // --- PRODUCT ATTRIBUTE DEFINITIONS ---

  async createAttributeDefinition(productId: string, dto: CreateAttributeDto) {
    // Validate payload
    CreateAttributeSchema.parse({ ...dto, productId });
    const created = await prisma.productAttributeDefinition.create({
      data: {
        productId: productId,
        attributeName: dto.attributeName,
        attributeType: dto.attributeType,
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

    return created;
  }

  async getAttributeDefinitions(productId: string) {
    const definitions = await prisma.productAttributeDefinition.findMany({
      where: { productId, isDeleted: false },
      include: {
        attributeOptionEntries: {
          where: { isDeleted: false },
          orderBy: { displayOrder: 'asc' },
        },
      },
      orderBy: { displayOrder: 'asc' },
    });

    return definitions;
  }

  async updateAttributeDefinition(id: string, dto: UpdateAttributeDto) {
    UpdateAttributeSchema.parse(dto);

    const dataToUpdate: Prisma.ProductAttributeDefinitionUpdateInput = {};

    if (dto.attributeName !== undefined) dataToUpdate.attributeName = dto.attributeName;
    if (dto.attributeType !== undefined) dataToUpdate.attributeType = dto.attributeType;
    if (dto.isRequired !== undefined) dataToUpdate.isRequired = dto.isRequired;
    if (dto.displayOrder !== undefined) dataToUpdate.displayOrder = dto.displayOrder;
    if (dto.pricingRule !== undefined) dataToUpdate.pricingRule = dto.pricingRule;
    if (dto.unitPrice !== undefined) dataToUpdate.unitPrice = dto.unitPrice;
    if (dto.minValue !== undefined) dataToUpdate.minValue = dto.minValue;
    if (dto.maxValue !== undefined) dataToUpdate.maxValue = dto.maxValue;

    const updated = await prisma.productAttributeDefinition.update({
      where: { id },
      data: dataToUpdate,
      include: {
        attributeOptionEntries: {
          where: { isDeleted: false },
          orderBy: { displayOrder: 'asc' },
        },
      },
    });

    return updated;
  }

  async deleteAttributeDefinition(id: string) {
    return prisma.productAttributeDefinition.update({
      where: { id },
      data: { isDeleted: true },
    });
  }

  async updateAttributeDefinitionsDisplayOrder(orders: { id: string; displayOrder: number }[]) {
    UpdateDisplayOrderSchema.parse(orders);
    const updates = orders.map((order) =>
      prisma.productAttributeDefinition.update({
        where: { id: order.id },
        data: { displayOrder: order.displayOrder },
      })
    );
    return prisma.$transaction(updates);
  }

  // --- PRODUCT ATTRIBUTE OPTIONS ---

  async createAttributeOption(attributeDefinitionId: string, dto: ProductAttributeOptionDto) {
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

  async updateAttributeOption(id: string, dto: Partial<ProductAttributeOptionDto>) {
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

  async deleteAttributeOption(id: string) {
    return prisma.productAttributeOption.update({
      where: { id },
      data: { isDeleted: true },
    });
  }

  async updateAttributeOptionsDisplayOrder(orders: { id: string; displayOrder: number }[]) {
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
