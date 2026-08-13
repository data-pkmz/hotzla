import { AttributeType, Prisma, PricingRule, PriceModifierType } from '@prisma/client';
import { prisma } from '../config/db.js';
import type { CalculatePriceParams, PriceBreakdownLine, PriceResult } from 'shared-types';

export class PricingEngineService {
  public static async calculatePrice(params: CalculatePriceParams): Promise<PriceResult> {
    const { productId, quantity, selectedAttributes = [] } = params;

    /**
     *Product quantity must be a positive whole number.
     */
    if (!Number.isInteger(quantity) || quantity <= 0) {
      throw new Error('Quantity must be a positive integer');
    }

    /**
     *Loads the active, non-deleted product.
     */
    const product = await prisma.product.findFirst({
      where: {
        id: productId,
        isDeleted: false,
        isActive: true,
      },
    });

    if (!product) {
      throw new Error('Product not found or unavailable');
    }

    /**
     *Base price may be 0, but not negative.
     */
    if (product.basePrice.isNegative()) {
      throw new Error(`Product ${product.id} has a negative base price`);
    }

    const quantityDecimal = new Prisma.Decimal(quantity);

    /**
     *Base price is always independent from attribute pricing.
     */
    const baseTotal = product.basePrice.mul(quantityDecimal);

    const breakdown: PriceBreakdownLine[] = [];

    /**
     *Keeps all money calculations as Decimal until returning.
     */
    let totalAdditionalPrice = new Prisma.Decimal(0);

    /**
     *Calculates every selected attribute independently.
     */
    for (const selectedAttribute of selectedAttributes) {
      const attributeDefinition = await prisma.productAttributeDefinition.findFirst({
        where: {
          id: selectedAttribute.attributeDefinitionId,
          productId,
          isDeleted: false,
        },
      });

      if (!attributeDefinition) {
        throw new Error(
          `Attribute ${selectedAttribute.attributeDefinitionId} is invalid for this product`
        );
      }

      let additionalPrice: InstanceType<typeof Prisma.Decimal>;
      let selectedValue: string;

      switch (attributeDefinition.attributeType) {
        /**
         *Calculates NUMBER attribute pricing.
         *
         *Example:
         *value = 100
         *unitPrice = 1.2
         *
         *Additional price:
         *100 × 1.2 = 120
         */
        case AttributeType.NUMBER: {
          if (attributeDefinition.pricingRule !== PricingRule.PER_UNIT_MULTIPLIER) {
            throw new Error(
              `NUMBER attribute ${attributeDefinition.id} must use PER_UNIT_MULTIPLIER pricing`
            );
          }

          if (
            attributeDefinition.unitPrice === null ||
            attributeDefinition.unitPrice.lessThanOrEqualTo(0)
          ) {
            throw new Error(`Attribute ${attributeDefinition.id} requires a positive unit price`);
          }

          if (
            typeof selectedAttribute.value !== 'number' ||
            !Number.isFinite(selectedAttribute.value)
          ) {
            throw new Error(`Attribute ${attributeDefinition.id} requires a numeric value`);
          }

          const numericValue = new Prisma.Decimal(selectedAttribute.value);

          if (
            attributeDefinition.minValue !== null &&
            numericValue.lessThan(attributeDefinition.minValue)
          ) {
            throw new Error(`Attribute ${attributeDefinition.id} is below its minimum value`);
          }

          if (
            attributeDefinition.maxValue !== null &&
            numericValue.greaterThan(attributeDefinition.maxValue)
          ) {
            throw new Error(`Attribute ${attributeDefinition.id} is above its maximum value`);
          }

          additionalPrice = numericValue.mul(attributeDefinition.unitPrice);
          selectedValue = selectedAttribute.value.toString();

          break;
        }

        /**
         *Calculates SELECT attribute pricing.
         *
         *Pricing comes from ProductAttributeOption.priceModifier.
         *
         *When isPerUnit is true, priceModifier is multiplied by
         *the product quantity. Otherwise, priceModifier is added once.
         */
        case AttributeType.SELECT: {
          const selectedOptionIds = selectedAttribute.selectedOptionIds ?? [];

          if (selectedOptionIds.length === 0) {
            throw new Error(`Attribute ${attributeDefinition.id} requires a selected option`);
          }

          const uniqueSelectedOptionIds = [...new Set(selectedOptionIds)];

          const selectedOptions = await prisma.productAttributeOption.findMany({
            where: {
              id: {
                in: uniqueSelectedOptionIds,
              },
              attributeDefinitionId: attributeDefinition.id,
              isDeleted: false,
            },
          });

          if (selectedOptions.length !== uniqueSelectedOptionIds.length) {
            throw new Error(
              `One or more selected options for attribute ${attributeDefinition.id} are invalid`
            );
          }

          additionalPrice = new Prisma.Decimal(0);

          for (const option of selectedOptions) {
            if (option.priceModifierType !== PriceModifierType.FIXED_ADD) {
              throw new Error(`Option ${option.id} must use FIXED_ADD pricing`);
            }

            if (option.priceModifier.isNegative()) {
              throw new Error(`Option ${option.id} has a negative price modifier`);
            }

            let optionPrice = option.priceModifier;

            if (option.isPerUnit) {
              optionPrice = optionPrice.mul(quantityDecimal);
            }

            additionalPrice = additionalPrice.add(optionPrice);
          }

          selectedValue = selectedOptions.map((option) => option.optionLabel).join(', ');

          break;
        }

        /**
         *Calculates BOOLEAN attribute pricing.
         *
         *A false value has no price contribution.
         *A true value adds the definition unit price once.
         */
        case AttributeType.BOOLEAN: {
          if (typeof selectedAttribute.value !== 'boolean') {
            throw new Error(`Attribute ${attributeDefinition.id} requires a boolean value`);
          }

          selectedValue = selectedAttribute.value ? 'true' : 'false';

          if (!selectedAttribute.value) {
            additionalPrice = new Prisma.Decimal(0);
            break;
          }

          if (
            attributeDefinition.unitPrice === null ||
            attributeDefinition.unitPrice.lessThanOrEqualTo(0)
          ) {
            throw new Error(`Attribute ${attributeDefinition.id} requires a positive unit price`);
          }

          additionalPrice = attributeDefinition.unitPrice;

          break;
        }

        /**
         *Handles TEXT attributes.
         *
         *Text attributes do not affect pricing.
         */
        case AttributeType.TEXT: {
          if (
            selectedAttribute.value !== undefined &&
            typeof selectedAttribute.value !== 'string'
          ) {
            throw new Error(`Attribute ${attributeDefinition.id} requires a text value`);
          }

          additionalPrice = new Prisma.Decimal(0);

          selectedValue =
            typeof selectedAttribute.value === 'string' ? selectedAttribute.value : '';

          break;
        }

        /**
         *Handles FILE_UPLOAD attributes.
         *
         *Uploaded files do not affect pricing.
         */
        case AttributeType.FILE_UPLOAD: {
          if (
            selectedAttribute.value !== undefined &&
            typeof selectedAttribute.value !== 'string'
          ) {
            throw new Error(`Attribute ${attributeDefinition.id} requires a file value`);
          }

          additionalPrice = new Prisma.Decimal(0);

          selectedValue =
            typeof selectedAttribute.value === 'string' ? selectedAttribute.value : '';

          break;
        }

        default: {
          throw new Error(`Unsupported attribute type for attribute ${attributeDefinition.id}`);
        }
      }

      totalAdditionalPrice = totalAdditionalPrice.add(additionalPrice);

      breakdown.push({
        attributeName: attributeDefinition.attributeName,
        selectedValue,
        contribution: additionalPrice.toNumber(),
      });
    }

    const totalPrice = baseTotal.add(totalAdditionalPrice);

    return {
      baseTotal: baseTotal.toNumber(),
      totalAdditionalPrice: totalAdditionalPrice.toNumber(),
      totalPrice: totalPrice.toNumber(),
      breakdown,
    };
  }
}

export default PricingEngineService;
