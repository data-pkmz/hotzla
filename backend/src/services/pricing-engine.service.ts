import {
  AttributeType,
  Prisma,
  PrismaClient,
  PricingRule,
  PriceModifierType,
} from '@prisma/client';

import { prisma } from '../config/db';

import type { CalculatePriceParams, PriceBreakdownLine, PriceResult } from 'shared-types';

export type DbClient = Prisma.TransactionClient | PrismaClient;

export class PricingEngineService {
  public static async calculatePrice(
    params: CalculatePriceParams,
    dbClient: DbClient = prisma
  ): Promise<PriceResult> {
    const { productId, quantity, selectedAttributes = [] } = params;

    /**
     * Product quantity must be a positive whole number.
     */
    if (!Number.isInteger(quantity) || quantity <= 0) {
      throw new Error('הכמות חייבת להיות מספר שלם וחיובי');
    }

    /**
     * Load the active, non-deleted product.
     *
     * Query 1.
     */
    const product = await dbClient.product.findFirst({
      where: {
        id: productId,
        isDeleted: false,
        isActive: true,
      },
    });

    if (!product) {
      throw new Error('המוצר לא נמצא או אינו זמין');
    }

    /**
     * Product quantity must respect the configured
     * minimum and maximum quantity limits.
     */
    if (quantity < product.minQuantity) {
      throw new Error(`הכמות המינימלית למוצר זה היא ${product.minQuantity}`);
    }

    if (product.maxQuantity !== null && quantity > product.maxQuantity) {
      throw new Error(`הכמות המקסימלית למוצר זה היא ${product.maxQuantity}`);
    }

    /**
     * Base price may be 0, but not negative.
     */
    if (product.basePrice.isNegative()) {
      throw new Error(`למוצר ${product.id} יש מחיר בסיס שלילי`);
    }

    const quantityDecimal = new Prisma.Decimal(quantity);

    /**
     * Base price is always independent from attribute pricing.
     */
    const baseTotal = product.basePrice.mul(quantityDecimal);

    const breakdown: PriceBreakdownLine[] = [];

    /**
     * Keeps all money calculations as Decimal until returning.
     */
    let totalAdditionalPrice = new Prisma.Decimal(0);

    /**
     * Load all requested attribute definitions in one query instead of
     * performing one database lookup per selected attribute.
     */
    const attributeDefinitionIds = [
      ...new Set(
        selectedAttributes.map((selectedAttribute) => selectedAttribute.attributeDefinitionId)
      ),
    ];

    /**
     * Query 2.
     *
     * If no attributes were supplied, there is no reason to query the
     * attribute-definition table.
     */
    const attributeDefinitions =
      attributeDefinitionIds.length > 0
        ? await dbClient.productAttributeDefinition.findMany({
            where: {
              id: {
                in: attributeDefinitionIds,
              },
              productId,
              isDeleted: false,
            },
          })
        : [];

    /**
     * Create an in-memory lookup so the pricing loop does not need any
     * additional database queries for attribute definitions.
     */
    const attributeDefinitionById = new Map(
      attributeDefinitions.map((definition) => [definition.id, definition])
    );

    /**
     * Collect every selected option ID used by SELECT attributes.
     *
     * Attribute definitions have already been loaded, so invalid attribute
     * IDs are ignored here and will produce the normal validation error
     * later in the pricing loop.
     */
    const allSelectedOptionIds = new Set<string>();
    const selectAttributeDefinitionIds = new Set<string>();

    for (const selectedAttribute of selectedAttributes) {
      const attributeDefinition = attributeDefinitionById.get(
        selectedAttribute.attributeDefinitionId
      );

      if (attributeDefinition?.attributeType !== AttributeType.SELECT) {
        continue;
      }

      selectAttributeDefinitionIds.add(attributeDefinition.id);

      for (const optionId of selectedAttribute.selectedOptionIds ?? []) {
        allSelectedOptionIds.add(optionId);
      }
    }

    /**
     * Load all selected options in one query instead of one query for every
     * SELECT attribute.
     *
     * Query 3.
     */
    const selectedOptions =
      allSelectedOptionIds.size > 0
        ? await dbClient.productAttributeOption.findMany({
            where: {
              id: {
                in: [...allSelectedOptionIds],
              },
              attributeDefinitionId: {
                in: [...selectAttributeDefinitionIds],
              },
              isDeleted: false,
            },
          })
        : [];

    /**
     * Create an in-memory lookup for selected options.
     */
    const selectedOptionById = new Map(selectedOptions.map((option) => [option.id, option]));

    /**
     * Calculate every selected attribute independently.
     *
     * All required database records have already been loaded, so this loop
     * performs pricing and validation entirely in memory.
     */
    for (const selectedAttribute of selectedAttributes) {
      const attributeDefinition = attributeDefinitionById.get(
        selectedAttribute.attributeDefinitionId
      );

      if (!attributeDefinition) {
        throw new Error(
          `המאפיין ${selectedAttribute.attributeDefinitionId} אינו תקין עבור מוצר זה`
        );
      }

      let additionalPrice: Prisma.Decimal;
      let selectedValue: string;

      switch (attributeDefinition.attributeType) {
        /**
         * Calculates NUMBER attribute pricing.
         *
         * Example:
         * value = 100
         * unitPrice = 1.2
         *
         * Additional price:
         * 100 × 1.2 = 120
         */
        case AttributeType.NUMBER: {
          if (attributeDefinition.pricingRule !== PricingRule.PER_UNIT_MULTIPLIER) {
            throw new Error(
              `המאפיין המספרי ${attributeDefinition.id} חייב להשתמש בתמחור PER_UNIT_MULTIPLIER`
            );
          }

          if (
            attributeDefinition.unitPrice === null ||
            attributeDefinition.unitPrice.lessThanOrEqualTo(0)
          ) {
            throw new Error(`המאפיין ${attributeDefinition.id} דורש מחיר ליחידה גדול מאפס`);
          }

          if (
            typeof selectedAttribute.value !== 'number' ||
            !Number.isFinite(selectedAttribute.value)
          ) {
            throw new Error(`המאפיין ${attributeDefinition.id} דורש ערך מספרי`);
          }

          const numericValue = new Prisma.Decimal(selectedAttribute.value);

          if (
            attributeDefinition.minValue !== null &&
            numericValue.lessThan(attributeDefinition.minValue)
          ) {
            throw new Error(`המאפיין ${attributeDefinition.id} נמוך מהערך המינימלי המותר`);
          }

          if (
            attributeDefinition.maxValue !== null &&
            numericValue.greaterThan(attributeDefinition.maxValue)
          ) {
            throw new Error(`המאפיין ${attributeDefinition.id} גבוה מהערך המקסימלי המותר`);
          }

          additionalPrice = numericValue.mul(attributeDefinition.unitPrice);
          selectedValue = selectedAttribute.value.toString();

          break;
        }

        /**
         * Calculates SELECT attribute pricing.
         *
         * All options have already been loaded in a single database query.
         *
         * Pricing comes from ProductAttributeOption.priceModifier.
         *
         * When isPerUnit is true, priceModifier is multiplied by the
         * product quantity. Otherwise, priceModifier is added once.
         */
        case AttributeType.SELECT: {
          const selectedOptionIds = selectedAttribute.selectedOptionIds ?? [];

          if (selectedOptionIds.length === 0) {
            throw new Error(`המאפיין ${attributeDefinition.id} דורש בחירת אפשרות`);
          }

          const uniqueSelectedOptionIds = [...new Set(selectedOptionIds)];

          const optionsForAttribute = uniqueSelectedOptionIds.map((optionId) => {
            const option = selectedOptionById.get(optionId);

            /**
             * An option must exist and must belong to the current attribute.
             *
             * Checking attributeDefinitionId preserves the validation that
             * previously came from querying with:
             *
             * attributeDefinitionId: attributeDefinition.id
             */
            if (!option || option.attributeDefinitionId !== attributeDefinition.id) {
              throw new Error(
                `אפשרות אחת או יותר שנבחרו אינן תקינות עבור המאפיין ${attributeDefinition.id}`
              );
            }

            return option;
          });

          additionalPrice = new Prisma.Decimal(0);

          for (const option of optionsForAttribute) {
            if (option.priceModifierType !== PriceModifierType.FIXED_ADD) {
              throw new Error(`האפשרות ${option.id} חייבת להשתמש בתמחור FIXED_ADD`);
            }

            if (option.priceModifier.isNegative()) {
              throw new Error(`לאפשרות ${option.id} יש תוספת מחיר שלילית`);
            }

            let optionPrice = option.priceModifier;

            if (option.isPerUnit) {
              optionPrice = optionPrice.mul(quantityDecimal);
            }

            additionalPrice = additionalPrice.add(optionPrice);
          }

          selectedValue = optionsForAttribute.map((option) => option.optionLabel).join(', ');

          break;
        }

        /**
         * Calculates BOOLEAN attribute pricing.
         *
         * A false value has no price contribution.
         * A true value adds the definition unit price once.
         */
        case AttributeType.BOOLEAN: {
          if (typeof selectedAttribute.value !== 'boolean') {
            throw new Error(`המאפיין ${attributeDefinition.id} דורש ערך בוליאני`);
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
            throw new Error(`המאפיין ${attributeDefinition.id} דורש מחיר ליחידה גדול מאפס`);
          }

          additionalPrice = attributeDefinition.unitPrice;

          break;
        }

        /**
         * Handles TEXT attributes.
         *
         * Text attributes do not affect pricing.
         */
        case AttributeType.TEXT: {
          if (
            selectedAttribute.value !== undefined &&
            typeof selectedAttribute.value !== 'string'
          ) {
            throw new Error(`המאפיין ${attributeDefinition.id} דורש ערך טקסט`);
          }

          additionalPrice = new Prisma.Decimal(0);

          selectedValue =
            typeof selectedAttribute.value === 'string' ? selectedAttribute.value : '';

          break;
        }

        /**
         * Handles FILE_UPLOAD attributes.
         *
         * Uploaded files do not affect pricing.
         */
        case AttributeType.FILE_UPLOAD: {
          if (
            selectedAttribute.value !== undefined &&
            typeof selectedAttribute.value !== 'string'
          ) {
            throw new Error(`המאפיין ${attributeDefinition.id} דורש ערך קובץ`);
          }

          additionalPrice = new Prisma.Decimal(0);

          selectedValue =
            typeof selectedAttribute.value === 'string' ? selectedAttribute.value : '';

          break;
        }

        default: {
          throw new Error(`סוג מאפיין לא נתמך עבור המאפיין ${attributeDefinition.id}`);
        }
      }

      totalAdditionalPrice = totalAdditionalPrice.add(additionalPrice);

      /**
       * Only attributes that actually change the price belong in the
       * visible price breakdown.
       */
      if (!additionalPrice.isZero()) {
        breakdown.push({
          attributeDefinitionId: attributeDefinition.id,
          attributeName: attributeDefinition.attributeName,
          selectedValue,
          contribution: additionalPrice.toNumber(),
        });
      }
    }

    const totalPrice = baseTotal.add(totalAdditionalPrice);

    return {
      quantity,
      baseTotal: baseTotal.toNumber(),
      totalAdditionalPrice: totalAdditionalPrice.toNumber(),
      totalPrice: totalPrice.toNumber(),
      breakdown,
    };
  }
}

export default PricingEngineService;
