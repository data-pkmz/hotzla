import {
  AttributeType,
  Prisma,
  PricingRule,
  PriceModifierType,
  ProductType,
  AttributeDisplayStyle,
} from '@prisma/client';

import type { Product, ProductAttributeDefinition, ProductAttributeOption } from '@prisma/client';

import { prisma } from '../../config/db';
import { PricingEngineService } from '../pricing-engine.service';

jest.mock('../../config/db', () => ({
  prisma: {
    product: {
      findFirst: jest.fn(),
    },
    productAttributeDefinition: {
      findFirst: jest.fn(),
    },
    productAttributeOption: {
      findMany: jest.fn(),
    },
  },
}));

/**
 *Fixtures.
 */

const product: Product = {
  id: 'product-1',
  name: 'הדפסת חוברת הדרכה',
  description: 'חוברת הדרכה',
  category: 'הדפסה',
  imageUrl: '/images/test-product.jpg',
  productType: ProductType.DYNAMIC,
  basePrice: new Prisma.Decimal(0),
  isActive: true,
  createdBy: null,
  createdAt: new Date(),
  isDeleted: false,
};

const numberAttribute: ProductAttributeDefinition = {
  id: 'attribute-copies',
  productId: 'product-1',
  attributeName: 'כמות עותקים',
  attributeType: AttributeType.NUMBER,
  displayStyle: AttributeDisplayStyle.NUMBER_INPUT,
  isRequired: true,
  displayOrder: 1,
  pricingRule: PricingRule.PER_UNIT_MULTIPLIER,
  unitPrice: new Prisma.Decimal(1.2),
  minValue: new Prisma.Decimal(1),
  maxValue: new Prisma.Decimal(1000),
  isDeleted: false,
};

const paperAttribute: ProductAttributeDefinition = {
  id: 'attribute-paper',
  productId: 'product-1',
  attributeName: 'סוג נייר',
  attributeType: AttributeType.SELECT,
  displayStyle: AttributeDisplayStyle.CARDS,
  isRequired: true,
  displayOrder: 2,
  pricingRule: PricingRule.FLAT_ADD_PER_OPTION,
  unitPrice: null,
  minValue: null,
  maxValue: null,
  isDeleted: false,
};

const bindingAttribute: ProductAttributeDefinition = {
  id: 'attribute-binding',
  productId: 'product-1',
  attributeName: 'כריכה',
  attributeType: AttributeType.SELECT,
  displayStyle: AttributeDisplayStyle.DROPDOWN,
  isRequired: false,
  displayOrder: 3,
  pricingRule: PricingRule.FLAT_ADD_PER_OPTION,
  unitPrice: null,
  minValue: null,
  maxValue: null,
  isDeleted: false,
};

const booleanAttribute: ProductAttributeDefinition = {
  id: 'attribute-spiral',
  productId: 'product-1',
  attributeName: 'כריכת ספירלה',
  attributeType: AttributeType.BOOLEAN,
  displayStyle: AttributeDisplayStyle.CHECKBOX,
  isRequired: false,
  displayOrder: 4,
  pricingRule: PricingRule.FLAT_ADD_PER_OPTION,
  unitPrice: new Prisma.Decimal(5),
  minValue: null,
  maxValue: null,
  isDeleted: false,
};

const textAttribute: ProductAttributeDefinition = {
  id: 'attribute-notes',
  productId: 'product-1',
  attributeName: 'הערות מיוחדות',
  attributeType: AttributeType.TEXT,
  displayStyle: AttributeDisplayStyle.MULTI_LINE,
  isRequired: false,
  displayOrder: 5,
  pricingRule: PricingRule.NONE,
  unitPrice: null,
  minValue: null,
  maxValue: null,
  isDeleted: false,
};

const perUnitPaperOption: ProductAttributeOption = {
  id: 'option-chromo',
  attributeDefinitionId: 'attribute-paper',
  optionLabel: 'כרומו',
  optionValue: 'CHROMO',
  priceModifier: new Prisma.Decimal(0.2),
  priceModifierType: PriceModifierType.FIXED_ADD,
  isPerUnit: true,
  displayOrder: 1,
  isDeleted: false,
};

const flatBindingOption: ProductAttributeOption = {
  id: 'option-spiral',
  attributeDefinitionId: 'attribute-binding',
  optionLabel: 'ספירלה',
  optionValue: 'SPIRAL',
  priceModifier: new Prisma.Decimal(8),
  priceModifierType: PriceModifierType.FIXED_ADD,
  isPerUnit: false,
  displayOrder: 1,
  isDeleted: false,
};

/**
 *Tests.
 */

describe('PricingEngineService', () => {
  beforeEach(() => {
    jest.clearAllMocks();

    jest.mocked(prisma.product.findFirst).mockResolvedValue(product);
  });

  /**
   *Quantity.
   */

  describe('quantity validation', () => {
    it('rejects quantity zero', async () => {
      await expect(
        PricingEngineService.calculatePrice({
          productId: 'product-1',
          quantity: 0,
        })
      ).rejects.toThrow('הכמות חייבת להיות מספר שלם וחיובי');
    });

    it('rejects a negative quantity', async () => {
      await expect(
        PricingEngineService.calculatePrice({
          productId: 'product-1',
          quantity: -1,
        })
      ).rejects.toThrow('הכמות חייבת להיות מספר שלם וחיובי');
    });

    it('rejects a fractional quantity', async () => {
      await expect(
        PricingEngineService.calculatePrice({
          productId: 'product-1',
          quantity: 1.5,
        })
      ).rejects.toThrow('הכמות חייבת להיות מספר שלם וחיובי');
    });
  });

  /**
   *Base product price.
   */

  describe('base price', () => {
    it('multiplies base price by product quantity', async () => {
      jest.mocked(prisma.product.findFirst).mockResolvedValue({
        ...product,
        basePrice: new Prisma.Decimal(10),
      });

      const result = await PricingEngineService.calculatePrice({
        productId: 'product-1',
        quantity: 5,
      });

      expect(result.baseTotal).toBe(50);
      expect(result.totalAdditionalPrice).toBe(0);
      expect(result.totalPrice).toBe(50);
    });

    it('allows base price to be zero', async () => {
      const result = await PricingEngineService.calculatePrice({
        productId: 'product-1',
        quantity: 100,
      });

      expect(result.baseTotal).toBe(0);
      expect(result.totalPrice).toBe(0);
    });

    it('rejects a negative base price', async () => {
      jest.mocked(prisma.product.findFirst).mockResolvedValue({
        ...product,
        basePrice: new Prisma.Decimal(-1),
      });

      await expect(
        PricingEngineService.calculatePrice({
          productId: 'product-1',
          quantity: 1,
        })
      ).rejects.toThrow('מחיר בסיס שלילי');
    });

    it('only loads active and non-deleted products', async () => {
      await PricingEngineService.calculatePrice({
        productId: 'product-1',
        quantity: 1,
      });

      expect(jest.mocked(prisma.product.findFirst)).toHaveBeenCalledWith({
        where: {
          id: 'product-1',
          isDeleted: false,
          isActive: true,
        },
      });
    });

    it('rejects a missing or unavailable product', async () => {
      jest.mocked(prisma.product.findFirst).mockResolvedValue(null);

      await expect(
        PricingEngineService.calculatePrice({
          productId: 'missing-product',
          quantity: 1,
        })
      ).rejects.toThrow('המוצר לא נמצא או אינו זמין');
    });
  });

  /**
   *NUMBER.
   */

  describe('NUMBER attributes', () => {
    beforeEach(() => {
      jest.mocked(prisma.productAttributeDefinition.findFirst).mockResolvedValue(numberAttribute);
    });

    it('multiplies numeric value by unit price', async () => {
      const result = await PricingEngineService.calculatePrice({
        productId: 'product-1',
        quantity: 100,
        selectedAttributes: [
          {
            attributeDefinitionId: 'attribute-copies',
            value: 100,
          },
        ],
      });

      /**
       *100 copies × 1.2 = 120
       */
      expect(result.baseTotal).toBe(0);
      expect(result.totalAdditionalPrice).toBe(120);
      expect(result.totalPrice).toBe(120);

      expect(result.breakdown).toEqual([
        {
          attributeDefinitionId: 'attribute-copies',
          attributeName: 'כמות עותקים',
          selectedValue: '100',
          contribution: 120,
        },
      ]);
    });

    it('rejects a missing numeric value', async () => {
      await expect(
        PricingEngineService.calculatePrice({
          productId: 'product-1',
          quantity: 1,
          selectedAttributes: [
            {
              attributeDefinitionId: 'attribute-copies',
            },
          ],
        })
      ).rejects.toThrow('דורש ערך מספרי');
    });

    it('rejects a value below minValue', async () => {
      await expect(
        PricingEngineService.calculatePrice({
          productId: 'product-1',
          quantity: 1,
          selectedAttributes: [
            {
              attributeDefinitionId: 'attribute-copies',
              value: 0,
            },
          ],
        })
      ).rejects.toThrow('נמוך מהערך המינימלי המותר');
    });

    it('rejects a value above maxValue', async () => {
      await expect(
        PricingEngineService.calculatePrice({
          productId: 'product-1',
          quantity: 1,
          selectedAttributes: [
            {
              attributeDefinitionId: 'attribute-copies',
              value: 1001,
            },
          ],
        })
      ).rejects.toThrow('גבוה מהערך המקסימלי המותר');
    });

    it('rejects zero unit price', async () => {
      jest.mocked(prisma.productAttributeDefinition.findFirst).mockResolvedValue({
        ...numberAttribute,
        unitPrice: new Prisma.Decimal(0),
      });

      await expect(
        PricingEngineService.calculatePrice({
          productId: 'product-1',
          quantity: 1,
          selectedAttributes: [
            {
              attributeDefinitionId: 'attribute-copies',
              value: 100,
            },
          ],
        })
      ).rejects.toThrow('דורש מחיר ליחידה גדול מאפס');
    });

    it('rejects negative unit price', async () => {
      jest.mocked(prisma.productAttributeDefinition.findFirst).mockResolvedValue({
        ...numberAttribute,
        unitPrice: new Prisma.Decimal(-1),
      });

      await expect(
        PricingEngineService.calculatePrice({
          productId: 'product-1',
          quantity: 1,
          selectedAttributes: [
            {
              attributeDefinitionId: 'attribute-copies',
              value: 100,
            },
          ],
        })
      ).rejects.toThrow('דורש מחיר ליחידה גדול מאפס');
    });
  });

  /**
   *SELECT.
   */

  describe('SELECT attributes', () => {
    it('multiplies a per-unit option by product quantity', async () => {
      jest.mocked(prisma.productAttributeDefinition.findFirst).mockResolvedValue(paperAttribute);

      jest.mocked(prisma.productAttributeOption.findMany).mockResolvedValue([perUnitPaperOption]);

      const result = await PricingEngineService.calculatePrice({
        productId: 'product-1',
        quantity: 100,
        selectedAttributes: [
          {
            attributeDefinitionId: 'attribute-paper',
            selectedOptionIds: ['option-chromo'],
          },
        ],
      });

      /**
       *0.2 × 100 = 20
       */
      expect(result.totalAdditionalPrice).toBe(20);
      expect(result.totalPrice).toBe(20);

      expect(result.breakdown).toEqual([
        {
          attributeDefinitionId: 'attribute-paper',
          attributeName: 'סוג נייר',
          selectedValue: 'כרומו',
          contribution: 20,
        },
      ]);
    });

    it('adds a non-per-unit option only once', async () => {
      jest.mocked(prisma.productAttributeDefinition.findFirst).mockResolvedValue(bindingAttribute);

      jest.mocked(prisma.productAttributeOption.findMany).mockResolvedValue([flatBindingOption]);

      const result = await PricingEngineService.calculatePrice({
        productId: 'product-1',
        quantity: 100,
        selectedAttributes: [
          {
            attributeDefinitionId: 'attribute-binding',
            selectedOptionIds: ['option-spiral'],
          },
        ],
      });

      /**
       *8 once, not 8 × 100.
       */
      expect(result.totalAdditionalPrice).toBe(8);
      expect(result.totalPrice).toBe(8);

      expect(result.breakdown).toEqual([
        {
          attributeDefinitionId: 'attribute-binding',
          attributeName: 'כריכה',
          selectedValue: 'ספירלה',
          contribution: 8,
        },
      ]);
    });

    it('sums multiple selected option contributions', async () => {
      jest.mocked(prisma.productAttributeDefinition.findFirst).mockResolvedValue(paperAttribute);

      jest.mocked(prisma.productAttributeOption.findMany).mockResolvedValue([
        perUnitPaperOption,
        {
          ...flatBindingOption,
          id: 'option-extra',
          attributeDefinitionId: 'attribute-paper',
          optionLabel: 'תוספת קבועה',
          priceModifier: new Prisma.Decimal(3),
        },
      ]);

      const result = await PricingEngineService.calculatePrice({
        productId: 'product-1',
        quantity: 10,
        selectedAttributes: [
          {
            attributeDefinitionId: 'attribute-paper',
            selectedOptionIds: ['option-chromo', 'option-extra'],
          },
        ],
      });

      /**
       *0.2 × 10 = 2
       *+ 3 once
       *= 5
       */
      expect(result.totalAdditionalPrice).toBe(5);
    });

    it('rejects a SELECT with no selected option', async () => {
      jest.mocked(prisma.productAttributeDefinition.findFirst).mockResolvedValue(paperAttribute);

      await expect(
        PricingEngineService.calculatePrice({
          productId: 'product-1',
          quantity: 1,
          selectedAttributes: [
            {
              attributeDefinitionId: 'attribute-paper',
              selectedOptionIds: [],
            },
          ],
        })
      ).rejects.toThrow('דורש בחירת אפשרות');
    });

    it('rejects an invalid or deleted selected option', async () => {
      jest.mocked(prisma.productAttributeDefinition.findFirst).mockResolvedValue(paperAttribute);

      jest.mocked(prisma.productAttributeOption.findMany).mockResolvedValue([]);

      await expect(
        PricingEngineService.calculatePrice({
          productId: 'product-1',
          quantity: 1,
          selectedAttributes: [
            {
              attributeDefinitionId: 'attribute-paper',
              selectedOptionIds: ['invalid-option'],
            },
          ],
        })
      ).rejects.toThrow('אפשרות אחת או יותר שנבחרו אינן תקינות');
    });

    it('rejects a negative option price modifier', async () => {
      jest.mocked(prisma.productAttributeDefinition.findFirst).mockResolvedValue(paperAttribute);

      jest.mocked(prisma.productAttributeOption.findMany).mockResolvedValue([
        {
          ...perUnitPaperOption,
          priceModifier: new Prisma.Decimal(-0.2),
        },
      ]);

      await expect(
        PricingEngineService.calculatePrice({
          productId: 'product-1',
          quantity: 10,
          selectedAttributes: [
            {
              attributeDefinitionId: 'attribute-paper',
              selectedOptionIds: ['option-chromo'],
            },
          ],
        })
      ).rejects.toThrow('תוספת מחיר שלילית');
    });
  });

  /**
   *BOOLEAN.
   */

  describe('BOOLEAN attributes', () => {
    beforeEach(() => {
      jest.mocked(prisma.productAttributeDefinition.findFirst).mockResolvedValue(booleanAttribute);
    });

    it('adds its unit price once when true', async () => {
      const result = await PricingEngineService.calculatePrice({
        productId: 'product-1',
        quantity: 100,
        selectedAttributes: [
          {
            attributeDefinitionId: 'attribute-spiral',
            value: true,
          },
        ],
      });

      expect(result.totalAdditionalPrice).toBe(5);
      expect(result.breakdown[0].contribution).toBe(5);
    });

    it('adds nothing when false', async () => {
      const result = await PricingEngineService.calculatePrice({
        productId: 'product-1',
        quantity: 100,
        selectedAttributes: [
          {
            attributeDefinitionId: 'attribute-spiral',
            value: false,
          },
        ],
      });

      expect(result.totalAdditionalPrice).toBe(0);
      expect(result.breakdown).toEqual([]);
    });

    it('rejects a non-boolean value', async () => {
      await expect(
        PricingEngineService.calculatePrice({
          productId: 'product-1',
          quantity: 1,
          selectedAttributes: [
            {
              attributeDefinitionId: 'attribute-spiral',
              value: 'yes',
            },
          ],
        })
      ).rejects.toThrow('דורש ערך בוליאני');
    });
  });

  /**
   *TEXT.
   */

  describe('TEXT attributes', () => {
    beforeEach(() => {
      jest.mocked(prisma.productAttributeDefinition.findFirst).mockResolvedValue(textAttribute);
    });

    it('does not affect the price', async () => {
      const result = await PricingEngineService.calculatePrice({
        productId: 'product-1',
        quantity: 10,
        selectedAttributes: [
          {
            attributeDefinitionId: 'attribute-notes',
            value: 'נא להדפיס בצבע',
          },
        ],
      });

      expect(result.totalAdditionalPrice).toBe(0);
      expect(result.breakdown).toEqual([]);
    });
  });

  /**
   *Full specification example.
   */

  describe('complete dynamic product calculation', () => {
    it('calculates the documented 148 price example', async () => {
      jest
        .mocked(prisma.productAttributeDefinition.findFirst)
        .mockResolvedValueOnce(numberAttribute)
        .mockResolvedValueOnce(paperAttribute)
        .mockResolvedValueOnce(bindingAttribute);

      jest
        .mocked(prisma.productAttributeOption.findMany)
        .mockResolvedValueOnce([perUnitPaperOption])
        .mockResolvedValueOnce([flatBindingOption]);

      const result = await PricingEngineService.calculatePrice({
        productId: 'product-1',
        quantity: 100,
        selectedAttributes: [
          {
            attributeDefinitionId: 'attribute-copies',
            value: 100,
          },
          {
            attributeDefinitionId: 'attribute-paper',
            selectedOptionIds: ['option-chromo'],
          },
          {
            attributeDefinitionId: 'attribute-binding',
            selectedOptionIds: ['option-spiral'],
          },
        ],
      });

      /**
       *Base:
       *0 × 100 = 0
       *
       *Copies:
       *100 × 1.2 = 120
       *
       *Chromo paper:
       *0.2 × 100 = 20
       *
       *Spiral binding:
       *+8 once
       *
       *Total:
       *0 + 120 + 20 + 8 = 148
       */

      expect(result.baseTotal).toBe(0);
      expect(result.totalAdditionalPrice).toBe(148);
      expect(result.totalPrice).toBe(148);

      expect(result.breakdown).toHaveLength(3);
      expect(result.breakdown[0].contribution).toBe(120);
      expect(result.breakdown[1].contribution).toBe(20);
      expect(result.breakdown[2].contribution).toBe(8);
    });
  });

  /**
   *Attribute validation.
   */

  describe('attribute validation', () => {
    it('rejects an attribute that does not belong to the product', async () => {
      jest.mocked(prisma.productAttributeDefinition.findFirst).mockResolvedValue(null);

      await expect(
        PricingEngineService.calculatePrice({
          productId: 'product-1',
          quantity: 1,
          selectedAttributes: [
            {
              attributeDefinitionId: 'invalid-attribute',
            },
          ],
        })
      ).rejects.toThrow('אינו תקין עבור מוצר זה');
    });

    it('searches only for a non-deleted attribute belonging to the product', async () => {
      jest.mocked(prisma.productAttributeDefinition.findFirst).mockResolvedValue(textAttribute);

      await PricingEngineService.calculatePrice({
        productId: 'product-1',
        quantity: 1,
        selectedAttributes: [
          {
            attributeDefinitionId: 'attribute-notes',
            value: 'test',
          },
        ],
      });

      expect(jest.mocked(prisma.productAttributeDefinition.findFirst)).toHaveBeenCalledWith({
        where: {
          id: 'attribute-notes',
          productId: 'product-1',
          isDeleted: false,
        },
      });
    });
  });

  /**
   *Prisma errors.
   */

  describe('Prisma errors', () => {
    it('propagates product database errors', async () => {
      jest.mocked(prisma.product.findFirst).mockRejectedValue(new Error('שגיאת מסד נתונים'));

      await expect(
        PricingEngineService.calculatePrice({
          productId: 'product-1',
          quantity: 1,
        })
      ).rejects.toThrow('שגיאת מסד נתונים');
    });

    it('propagates attribute database errors', async () => {
      jest
        .mocked(prisma.productAttributeDefinition.findFirst)
        .mockRejectedValue(new Error('שגיאת מסד נתונים'));

      await expect(
        PricingEngineService.calculatePrice({
          productId: 'product-1',
          quantity: 1,
          selectedAttributes: [
            {
              attributeDefinitionId: 'attribute-notes',
              value: 'test',
            },
          ],
        })
      ).rejects.toThrow('שגיאת מסד נתונים');
    });
  });
});
