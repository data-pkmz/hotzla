import { CatalogService } from '../catalog.service';
import { prisma } from '../../config/db';
import { Prisma } from '@prisma/client';
import type { ProductAttributeDefinition, ProductAttributeOption } from '@prisma/client';
import { AttributeType, PricingImpactType, PriceModifierType } from 'shared-types';
import { ZodError } from 'zod';

const validProductId = '11111111-1111-1111-1111-111111111111';
const validAttributeId = '22222222-2222-2222-2222-222222222222';
const validOptionId1 = '33333333-3333-3333-3333-333333333333';
const validOptionId2 = '44444444-4444-4444-4444-444444444444';

type ProductAttributeDefinitionWithNestedOptions = ProductAttributeDefinition & {
  attributeOptionEntries: ProductAttributeOption[];
};

jest.mock('../../config/db', () => ({
  prisma: {
    productAttributeDefinition: {
      create: jest.fn(),
      findMany: jest.fn(),
      update: jest.fn(),
    },
    productAttributeOption: {
      create: jest.fn(),
      update: jest.fn(),
    },
    $transaction: jest.fn(),
  },
}));

describe('CatalogService - Attributes & Options CRUD (DPS-013)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // ============================================================
  // Attribute Definitions CRUD
  // ============================================================

  describe('createAttributeDefinition', () => {
    it('creates a SELECT attribute with valid options and returns it', async () => {
      const dto = {
        productId: validProductId,
        attributeName: 'Paper Type',
        attributeType: AttributeType.SELECT,
        isRequired: true,
        displayOrder: 1,
        pricingRule: PricingImpactType.FLAT_ADD_PER_OPTION,
        options: [
          {
            optionLabel: 'Glossy 300g',
            optionValue: 'glossy_300',
            priceModifier: 15,
            priceModifierType: PriceModifierType.FIXED_ADD,
            displayOrder: 0,
            isPerUnit: true,
          },
          {
            optionLabel: 'Matte 350g',
            optionValue: 'matte_350',
            priceModifier: 20,
            priceModifierType: PriceModifierType.FIXED_ADD,
            displayOrder: 1,
            isPerUnit: true,
          },
        ],
      };

      const mockCreated: ProductAttributeDefinitionWithNestedOptions = {
        id: validAttributeId,
        productId: validProductId,
        attributeName: dto.attributeName,
        attributeType: dto.attributeType,
        isRequired: true,
        displayOrder: 1,
        pricingRule: dto.pricingRule,
        unitPrice: null,
        minValue: null,
        maxValue: null,
        isDeleted: false,
        attributeOptionEntries: dto.options.map((opt, i) => ({
          id: `opt-${i}`,
          attributeDefinitionId: validAttributeId,
          optionLabel: opt.optionLabel,
          optionValue: opt.optionValue,
          priceModifier: new Prisma.Decimal(opt.priceModifier),
          priceModifierType: opt.priceModifierType,
          displayOrder: opt.displayOrder,
          isPerUnit: opt.isPerUnit,
          isDeleted: false,
        })),
      };

      jest
        .mocked(prisma.productAttributeDefinition.create)
        .mockResolvedValue(mockCreated as unknown as ProductAttributeDefinition);

      const result = await CatalogService.createAttributeDefinition(validProductId, dto);

      expect(result).toEqual(mockCreated);
      expect(prisma.productAttributeDefinition.create).toHaveBeenCalledWith({
        data: {
          productId: validProductId,
          attributeName: dto.attributeName,
          attributeType: dto.attributeType,
          isRequired: true,
          displayOrder: 1,
          pricingRule: PricingImpactType.FLAT_ADD_PER_OPTION,
          unitPrice: null,
          minValue: null,
          maxValue: null,
          attributeOptionEntries: {
            create: [
              {
                optionLabel: 'Glossy 300g',
                optionValue: 'glossy_300',
                priceModifier: 15,
                priceModifierType: PriceModifierType.FIXED_ADD,
                displayOrder: 0,
                isPerUnit: true,
              },
              {
                optionLabel: 'Matte 350g',
                optionValue: 'matte_350',
                priceModifier: 20,
                priceModifierType: PriceModifierType.FIXED_ADD,
                displayOrder: 1,
                isPerUnit: true,
              },
            ],
          },
        },
        include: {
          attributeOptionEntries: true,
        },
      });
    });

    it('creates a non-SELECT attribute (e.g. NUMBER) without options', async () => {
      const dto = {
        productId: validProductId,
        attributeName: 'Quantity per pack',
        attributeType: AttributeType.NUMBER,
        isRequired: false,
        displayOrder: 2,
        pricingRule: PricingImpactType.NONE,
        minValue: 10,
        maxValue: 1000,
      };

      const mockCreated: ProductAttributeDefinition = {
        id: validAttributeId,
        productId: validProductId,
        attributeName: dto.attributeName,
        attributeType: dto.attributeType,
        isRequired: false,
        displayOrder: 2,
        pricingRule: dto.pricingRule,
        unitPrice: null,
        minValue: new Prisma.Decimal(10),
        maxValue: new Prisma.Decimal(1000),
        isDeleted: false,
      };

      jest.mocked(prisma.productAttributeDefinition.create).mockResolvedValue(mockCreated);

      const result = await CatalogService.createAttributeDefinition(validProductId, dto);

      expect(result).toEqual(mockCreated);
      expect(prisma.productAttributeDefinition.create).toHaveBeenCalledWith({
        data: {
          productId: validProductId,
          attributeName: dto.attributeName,
          attributeType: dto.attributeType,
          isRequired: false,
          displayOrder: 2,
          pricingRule: PricingImpactType.NONE,
          unitPrice: null,
          minValue: 10,
          maxValue: 1000,
          attributeOptionEntries: undefined,
        },
        include: {
          attributeOptionEntries: true,
        },
      });
    });

    it('propagates Prisma database errors', async () => {
      jest
        .mocked(prisma.productAttributeDefinition.create)
        .mockRejectedValue(new Error('Database error'));

      await expect(
        CatalogService.createAttributeDefinition(validProductId, {
          productId: validProductId,
          attributeName: 'Notes',
          attributeType: AttributeType.TEXT,
        })
      ).rejects.toThrow('Database error');
    });
  });

  describe('getAttributeDefinitions', () => {
    it('returns non-deleted attribute definitions with active options ordered by displayOrder', async () => {
      const mockDefinitions: ProductAttributeDefinitionWithNestedOptions[] = [
        {
          id: validAttributeId,
          productId: validProductId,
          attributeName: 'Paper Type',
          attributeType: 'SELECT',
          isRequired: true,
          displayOrder: 1,
          pricingRule: 'NONE',
          unitPrice: null,
          minValue: null,
          maxValue: null,
          isDeleted: false,
          attributeOptionEntries: [
            {
              id: validOptionId1,
              attributeDefinitionId: validAttributeId,
              optionLabel: 'Option 1',
              optionValue: 'opt_1',
              priceModifier: new Prisma.Decimal(0),
              priceModifierType: 'FIXED_ADD',
              displayOrder: 0,
              isDeleted: false,
              isPerUnit: false,
            },
          ],
        },
      ];

      jest
        .mocked(prisma.productAttributeDefinition.findMany)
        .mockResolvedValue(mockDefinitions as unknown as ProductAttributeDefinition[]);

      const result = await CatalogService.getAttributeDefinitions(validProductId);

      expect(result).toEqual(mockDefinitions);
      expect(prisma.productAttributeDefinition.findMany).toHaveBeenCalledWith({
        where: { productId: validProductId, isDeleted: false },
        include: {
          attributeOptionEntries: {
            where: { isDeleted: false },
            orderBy: { displayOrder: 'asc' },
          },
        },
        orderBy: { displayOrder: 'asc' },
      });
    });

    it('propagates Prisma database errors', async () => {
      jest
        .mocked(prisma.productAttributeDefinition.findMany)
        .mockRejectedValue(new Error('Database error'));

      await expect(CatalogService.getAttributeDefinitions(validProductId)).rejects.toThrow(
        'Database error'
      );
    });
  });

  describe('updateAttributeDefinition', () => {
    it('updates specified attribute fields and validates schema', async () => {
      const dto = {
        attributeName: 'Updated Paper Type',
        isRequired: true,
        displayOrder: 3,
      };

      const mockUpdated: ProductAttributeDefinition = {
        id: validAttributeId,
        productId: validProductId,
        attributeName: 'Updated Paper Type',
        attributeType: 'SELECT',
        isRequired: true,
        displayOrder: 3,
        pricingRule: 'NONE',
        unitPrice: null,
        minValue: null,
        maxValue: null,
        isDeleted: false,
      };

      jest.mocked(prisma.productAttributeDefinition.update).mockResolvedValue(mockUpdated);

      const result = await CatalogService.updateAttributeDefinition(validAttributeId, dto);

      expect(result).toEqual(mockUpdated);
      expect(prisma.productAttributeDefinition.update).toHaveBeenCalledWith({
        where: { id: validAttributeId },
        data: {
          attributeName: 'Updated Paper Type',
          isRequired: true,
          displayOrder: 3,
        },
        include: {
          attributeOptionEntries: {
            where: { isDeleted: false },
            orderBy: { displayOrder: 'asc' },
          },
        },
      });
    });

    it('propagates Prisma database errors', async () => {
      jest
        .mocked(prisma.productAttributeDefinition.update)
        .mockRejectedValue(new Error('Attribute not found'));

      await expect(
        CatalogService.updateAttributeDefinition(validAttributeId, {
          attributeName: 'Updated',
        })
      ).rejects.toThrow('Attribute not found');
    });
  });

  describe('deleteAttributeDefinition / softDeleteAttribute', () => {
    it('marks the attribute definition as isDeleted: true', async () => {
      const mockDeleted: ProductAttributeDefinition = {
        id: validAttributeId,
        productId: validProductId,
        attributeName: 'Paper Type',
        attributeType: 'SELECT',
        isRequired: true,
        displayOrder: 1,
        pricingRule: 'NONE',
        unitPrice: null,
        minValue: null,
        maxValue: null,
        isDeleted: true,
      };

      jest.mocked(prisma.productAttributeDefinition.update).mockResolvedValue(mockDeleted);

      const result = await CatalogService.deleteAttributeDefinition(validAttributeId);

      expect(result).toEqual(mockDeleted);
      expect(prisma.productAttributeDefinition.update).toHaveBeenCalledWith({
        where: { id: validAttributeId },
        data: { isDeleted: true },
      });
    });

    it('softDeleteAttribute delegates to deleteAttributeDefinition', async () => {
      const mockDeleted: ProductAttributeDefinition = {
        id: validAttributeId,
        productId: validProductId,
        attributeName: 'Paper Type',
        attributeType: 'SELECT',
        isRequired: true,
        displayOrder: 1,
        pricingRule: 'NONE',
        unitPrice: null,
        minValue: null,
        maxValue: null,
        isDeleted: true,
      };

      jest.mocked(prisma.productAttributeDefinition.update).mockResolvedValue(mockDeleted);

      const result = await CatalogService.softDeleteAttribute(validAttributeId);

      expect(result).toEqual(mockDeleted);
      expect(prisma.productAttributeDefinition.update).toHaveBeenCalledWith({
        where: { id: validAttributeId },
        data: { isDeleted: true },
      });
    });
  });

  describe('updateAttributeDefinitionsDisplayOrder', () => {
    it('updates displayOrder in a Prisma transaction', async () => {
      const orders = [
        { id: validAttributeId, displayOrder: 0 },
        { id: '55555555-5555-5555-5555-555555555555', displayOrder: 1 },
      ];

      const mockResults: ProductAttributeDefinition[] = [
        {
          id: validAttributeId,
          productId: validProductId,
          attributeName: 'Paper Type',
          attributeType: 'SELECT',
          isRequired: true,
          displayOrder: 0,
          pricingRule: 'NONE',
          unitPrice: null,
          minValue: null,
          maxValue: null,
          isDeleted: false,
        },
      ];

      jest.mocked(prisma.$transaction).mockResolvedValue(mockResults);

      await CatalogService.updateAttributeDefinitionsDisplayOrder(orders);

      expect(prisma.$transaction).toHaveBeenCalledTimes(1);
    });

    it('rejects invalid display order values', async () => {
      const invalidOrders = [{ id: validAttributeId, displayOrder: -1 }];

      await expect(
        CatalogService.updateAttributeDefinitionsDisplayOrder(invalidOrders)
      ).rejects.toThrow(ZodError);
    });
  });

  // ============================================================
  // Product Attribute Options CRUD
  // ============================================================

  describe('createAttributeOption', () => {
    it('creates an attribute option with defaults', async () => {
      const optionDto = {
        optionLabel: 'Red',
        optionValue: 'red',
        priceModifier: 5,
        priceModifierType: PriceModifierType.FIXED_ADD,
        displayOrder: 0,
        isPerUnit: false,
      };

      const mockCreatedOption: ProductAttributeOption = {
        id: validOptionId1,
        attributeDefinitionId: validAttributeId,
        optionLabel: optionDto.optionLabel,
        optionValue: optionDto.optionValue,
        priceModifier: new Prisma.Decimal(5),
        priceModifierType: 'FIXED_ADD',
        displayOrder: 0,
        isPerUnit: false,
        isDeleted: false,
      };

      jest.mocked(prisma.productAttributeOption.create).mockResolvedValue(mockCreatedOption);

      const result = await CatalogService.createAttributeOption(validAttributeId, optionDto);

      expect(result).toEqual(mockCreatedOption);
      expect(prisma.productAttributeOption.create).toHaveBeenCalledWith({
        data: {
          attributeDefinitionId: validAttributeId,
          optionLabel: 'Red',
          optionValue: 'red',
          priceModifier: 5,
          priceModifierType: 'FIXED_ADD',
          displayOrder: 0,
          isPerUnit: false,
        },
      });
    });

    it('propagates Prisma database errors', async () => {
      jest
        .mocked(prisma.productAttributeOption.create)
        .mockRejectedValue(new Error('Foreign key error'));

      await expect(
        CatalogService.createAttributeOption(validAttributeId, {
          optionLabel: 'Blue',
          optionValue: 'blue',
        })
      ).rejects.toThrow('Foreign key error');
    });
  });

  describe('updateAttributeOption', () => {
    it('updates specified option fields', async () => {
      const dto = {
        optionLabel: 'Updated Label',
        priceModifier: 25,
        isPerUnit: true,
      };

      const mockUpdatedOption: ProductAttributeOption = {
        id: validOptionId1,
        attributeDefinitionId: validAttributeId,
        optionLabel: 'Updated Label',
        optionValue: 'red',
        priceModifier: new Prisma.Decimal(25),
        priceModifierType: 'FIXED_ADD',
        displayOrder: 0,
        isPerUnit: true,
        isDeleted: false,
      };

      jest.mocked(prisma.productAttributeOption.update).mockResolvedValue(mockUpdatedOption);

      const result = await CatalogService.updateAttributeOption(validOptionId1, dto);

      expect(result).toEqual(mockUpdatedOption);
      expect(prisma.productAttributeOption.update).toHaveBeenCalledWith({
        where: { id: validOptionId1 },
        data: {
          optionLabel: 'Updated Label',
          priceModifier: 25,
          isPerUnit: true,
        },
      });
    });

    it('propagates Prisma database errors', async () => {
      jest
        .mocked(prisma.productAttributeOption.update)
        .mockRejectedValue(new Error('Option not found'));

      await expect(
        CatalogService.updateAttributeOption(validOptionId1, { optionLabel: 'New' })
      ).rejects.toThrow('Option not found');
    });
  });

  describe('deleteAttributeOption', () => {
    it('soft-deletes the option (isDeleted: true)', async () => {
      const mockDeletedOption: ProductAttributeOption = {
        id: validOptionId1,
        attributeDefinitionId: validAttributeId,
        optionLabel: 'Red',
        optionValue: 'red',
        priceModifier: new Prisma.Decimal(0),
        priceModifierType: 'FIXED_ADD',
        displayOrder: 0,
        isPerUnit: false,
        isDeleted: true,
      };

      jest.mocked(prisma.productAttributeOption.update).mockResolvedValue(mockDeletedOption);

      const result = await CatalogService.deleteAttributeOption(validOptionId1);

      expect(result).toEqual(mockDeletedOption);
      expect(prisma.productAttributeOption.update).toHaveBeenCalledWith({
        where: { id: validOptionId1 },
        data: { isDeleted: true },
      });
    });
  });

  describe('updateAttributeOptionsDisplayOrder', () => {
    it('updates option displayOrder in a transaction', async () => {
      const orders = [
        { id: validOptionId1, displayOrder: 0 },
        { id: validOptionId2, displayOrder: 1 },
      ];

      const mockResults: ProductAttributeOption[] = [
        {
          id: validOptionId1,
          attributeDefinitionId: validAttributeId,
          optionLabel: 'Red',
          optionValue: 'red',
          priceModifier: new Prisma.Decimal(0),
          priceModifierType: 'FIXED_ADD',
          displayOrder: 0,
          isPerUnit: false,
          isDeleted: false,
        },
      ];

      jest.mocked(prisma.$transaction).mockResolvedValue(mockResults);

      await CatalogService.updateAttributeOptionsDisplayOrder(orders);

      expect(prisma.$transaction).toHaveBeenCalledTimes(1);
    });

    it('rejects invalid UUIDs for option display order', async () => {
      const invalidOrders = [{ id: 'not-a-uuid', displayOrder: 0 }];

      await expect(
        CatalogService.updateAttributeOptionsDisplayOrder(invalidOrders)
      ).rejects.toThrow(ZodError);
    });
  });

  // ============================================================
  // Zod Validation Rules & Edge Cases (CR Point 5)
  // ============================================================

  describe('Attribute Validation Rules', () => {
    it('fails when SELECT attribute has 0 options', async () => {
      await expect(
        CatalogService.createAttributeDefinition(validProductId, {
          productId: validProductId,
          attributeName: 'Select With No Options',
          attributeType: AttributeType.SELECT,
          options: [],
        })
      ).rejects.toThrow(ZodError);
    });

    it('fails when SELECT attribute has only 1 option (< 2)', async () => {
      await expect(
        CatalogService.createAttributeDefinition(validProductId, {
          productId: validProductId,
          attributeName: 'Select With 1 Option',
          attributeType: AttributeType.SELECT,
          options: [{ optionLabel: 'Single Option', optionValue: 'single' }],
        })
      ).rejects.toThrow(ZodError);
    });

    it('fails when non-SELECT attribute (NUMBER) has options', async () => {
      await expect(
        CatalogService.createAttributeDefinition(validProductId, {
          productId: validProductId,
          attributeName: 'Number With Options',
          attributeType: AttributeType.NUMBER,
          options: [{ optionLabel: 'Invalid', optionValue: 'invalid' }],
        })
      ).rejects.toThrow(ZodError);
    });

    it('fails when non-SELECT attribute (TEXT) has options', async () => {
      await expect(
        CatalogService.createAttributeDefinition(validProductId, {
          productId: validProductId,
          attributeName: 'Text With Options',
          attributeType: AttributeType.TEXT,
          options: [{ optionLabel: 'Invalid', optionValue: 'invalid' }],
        })
      ).rejects.toThrow(ZodError);
    });

    it('fails when non-SELECT attribute (FILE_UPLOAD) has options', async () => {
      await expect(
        CatalogService.createAttributeDefinition(validProductId, {
          productId: validProductId,
          attributeName: 'File Upload With Options',
          attributeType: AttributeType.FILE_UPLOAD,
          options: [{ optionLabel: 'Invalid', optionValue: 'invalid' }],
        })
      ).rejects.toThrow(ZodError);
    });

    it('fails when non-SELECT attribute (BOOLEAN) has options', async () => {
      await expect(
        CatalogService.createAttributeDefinition(validProductId, {
          productId: validProductId,
          attributeName: 'Boolean With Options',
          attributeType: AttributeType.BOOLEAN,
          options: [{ optionLabel: 'Invalid', optionValue: 'invalid' }],
        })
      ).rejects.toThrow(ZodError);
    });

    it('fails when productId is not a valid UUID', async () => {
      await expect(
        CatalogService.createAttributeDefinition('invalid-uuid', {
          productId: 'invalid-uuid',
          attributeName: 'Valid Name',
          attributeType: AttributeType.TEXT,
        })
      ).rejects.toThrow(ZodError);
    });

    it('fails when attributeName is empty', async () => {
      await expect(
        CatalogService.createAttributeDefinition(validProductId, {
          productId: validProductId,
          attributeName: '',
          attributeType: AttributeType.TEXT,
        })
      ).rejects.toThrow(ZodError);
    });
  });
});
