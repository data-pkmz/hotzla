import logger from '../src/utils/logger';
import { prisma } from '../src/config/db';
import { OrderStatus, Status, ChangeSource } from '@prisma/client';

async function main() {
  logger.info('Starting database seed...');

  // --------------------
  // Users
  // --------------------

  const requester = await prisma.user.upsert({
    where: {
      adUsername: 'requester',
    },
    update: {},
    create: {
      fullName: 'משתמש מבקש',
      militaryEmail: 'requester@example.com',
      adUsername: 'requester',
      unit: 'יחידת פיתוח',
      phone: '050-1111111',
      role: 'REQUESTER',
    },
  });

  const manager = await prisma.user.upsert({
    where: {
      adUsername: 'manager',
    },
    update: {},
    create: {
      fullName: 'מנהל מערכת',
      militaryEmail: 'manager@example.com',
      adUsername: 'manager',
      unit: 'יחידת פיתוח',
      phone: '050-2222222',
      role: 'MANAGER',
    },
  });

  const worker = await prisma.user.upsert({
    where: {
      adUsername: 'worker',
    },
    update: {},
    create: {
      fullName: 'עובד דפוס',
      militaryEmail: 'worker@example.com',
      adUsername: 'worker',
      unit: 'בית דפוס',
      phone: '050-3333333',
      role: 'WORKER',
    },
  });

  // --------------------
  // Products
  // --------------------

  const businessCards = await prisma.product.upsert({
    where: {
      id: '00000000-0000-0000-0000-000000000001',
    },
    update: {},
    create: {
      id: '00000000-0000-0000-0000-000000000001',
      name: 'כרטיסי ביקור',
      description: 'כרטיסי ביקור מודפסים ומקצועיים.',
      category: 'הדפסה',
      imageUrl: '/images/business-cards.jpg',
      productType: 'FIXED',
      basePrice: 50,
      isActive: true,
      createdBy: manager.id,
    },
  });

  const letterhead = await prisma.product.upsert({
    where: {
      id: '00000000-0000-0000-0000-000000000002',
    },
    update: {},
    create: {
      id: '00000000-0000-0000-0000-000000000002',
      name: 'נייר מכתבים',
      description: 'נייר מכתבים מודפס לשימוש מקצועי.',
      category: 'הדפסה',
      imageUrl: '/images/letterhead.jpg',
      productType: 'FIXED',
      basePrice: 40,
      isActive: true,
      createdBy: manager.id,
    },
  });

  const notebooks = await prisma.product.upsert({
    where: {
      id: '00000000-0000-0000-0000-000000000003',
    },
    update: {},
    create: {
      id: '00000000-0000-0000-0000-000000000003',
      name: 'מחברות',
      description: 'מחברות להדפסה ולעיצוב בהתאמה אישית.',
      category: 'הדפסה',
      imageUrl: '/images/notebooks.jpg',
      productType: 'DYNAMIC',
      basePrice: 60,
      isActive: true,
      createdBy: manager.id,
    },
  });

  const rollups = await prisma.product.upsert({
    where: {
      id: '00000000-0000-0000-0000-000000000004',
    },
    update: {},
    create: {
      id: '00000000-0000-0000-0000-000000000004',
      name: 'רול-אפים',
      description: 'שלטי רול-אפ להדפסה בפורמט גדול.',
      category: 'שילוט',
      imageUrl: '/images/rollups.jpg',
      productType: 'DYNAMIC',
      basePrice: 150,
      isActive: true,
      createdBy: manager.id,
    },
  });

  const pricingTestProduct = await prisma.product.upsert({
    where: {
      id: '00000000-0000-0000-0000-000000000005',
    },
    update: {},
    create: {
      id: '00000000-0000-0000-0000-000000000005',
      name: 'חוברת הדרכה לבדיקה',
      description: 'מוצר פיתוח לבדיקת מנוע התמחור.',
      category: 'בדיקות',
      productType: 'DYNAMIC',
      basePrice: 0,
      isActive: true,
      createdBy: manager.id,
    },
  });

  // --------------------
  // Notebook attributes
  // --------------------

  const notebookSize = await prisma.productAttributeDefinition.upsert({
    where: {
      id: '10000000-0000-0000-0000-000000000001',
    },
    update: {},
    create: {
      id: '10000000-0000-0000-0000-000000000001',
      productId: notebooks.id,
      attributeName: 'גודל',
      attributeType: 'SELECT',
      displayStyle: 'DROPDOWN',
      isRequired: true,
      displayOrder: 1,
      pricingRule: 'FLAT_ADD_PER_OPTION',
    },
  });

  await prisma.productAttributeOption.upsert({
    where: {
      id: '20000000-0000-0000-0000-000000000001',
    },
    update: {},
    create: {
      id: '20000000-0000-0000-0000-000000000001',
      attributeDefinitionId: notebookSize.id,
      optionLabel: 'A5',
      optionValue: 'A5',
      priceModifier: 0,
      priceModifierType: 'FIXED_ADD',
      isPerUnit: false,
      displayOrder: 1,
    },
  });

  await prisma.productAttributeOption.upsert({
    where: {
      id: '20000000-0000-0000-0000-000000000002',
    },
    update: {},
    create: {
      id: '20000000-0000-0000-0000-000000000002',
      attributeDefinitionId: notebookSize.id,
      optionLabel: 'A4',
      optionValue: 'A4',
      priceModifier: 15,
      priceModifierType: 'FIXED_ADD',
      isPerUnit: false,
      displayOrder: 2,
    },
  });

  // --------------------
  // Roll-up attributes
  // --------------------

  await prisma.productAttributeDefinition.upsert({
    where: {
      id: '10000000-0000-0000-0000-000000000002',
    },
    update: {},
    create: {
      id: '10000000-0000-0000-0000-000000000002',
      productId: rollups.id,
      attributeName: 'רוחב',
      attributeType: 'NUMBER',
      displayStyle: 'NUMBER_INPUT',
      isRequired: true,
      displayOrder: 1,
      pricingRule: 'PER_UNIT_MULTIPLIER',
      unitPrice: 0.5,
      minValue: 50,
      maxValue: 200,
    },
  });

  // --------------------
  // Pricing test product attributes
  // --------------------

  // NUMBER:
  // Example:
  // 100 copies * 1.2 = 120
  const copiesAttribute = await prisma.productAttributeDefinition.upsert({
    where: {
      id: '10000000-0000-0000-0000-000000000010',
    },
    update: {},
    create: {
      id: '10000000-0000-0000-0000-000000000010',
      productId: pricingTestProduct.id,
      attributeName: 'כמות עותקים',
      attributeType: 'NUMBER',
      displayStyle: 'NUMBER_INPUT',
      isRequired: true,
      displayOrder: 1,
      pricingRule: 'PER_UNIT_MULTIPLIER',
      unitPrice: 1.2,
      minValue: 1,
      maxValue: 1000,
    },
  });

  // SELECT:
  // Paper type, where price can be multiplied by product quantity.
  const paperTypeAttribute = await prisma.productAttributeDefinition.upsert({
    where: {
      id: '10000000-0000-0000-0000-000000000011',
    },
    update: {},
    create: {
      id: '10000000-0000-0000-0000-000000000011',
      productId: pricingTestProduct.id,
      attributeName: 'סוג נייר',
      attributeType: 'SELECT',
      displayStyle: 'CARDS',
      isRequired: true,
      displayOrder: 2,
      pricingRule: 'FLAT_ADD_PER_OPTION',
    },
  });

  await prisma.productAttributeOption.upsert({
    where: {
      id: '20000000-0000-0000-0000-000000000010',
    },
    update: {},
    create: {
      id: '20000000-0000-0000-0000-000000000010',
      attributeDefinitionId: paperTypeAttribute.id,
      optionLabel: 'רגיל',
      optionValue: 'REGULAR',
      priceModifier: 0,
      priceModifierType: 'FIXED_ADD',
      isPerUnit: true,
      displayOrder: 1,
    },
  });

  await prisma.productAttributeOption.upsert({
    where: {
      id: '20000000-0000-0000-0000-000000000011',
    },
    update: {},
    create: {
      id: '20000000-0000-0000-0000-000000000011',
      attributeDefinitionId: paperTypeAttribute.id,
      optionLabel: 'כרומו',
      optionValue: 'CHROME',
      priceModifier: 0.2,
      priceModifierType: 'FIXED_ADD',
      isPerUnit: true,
      displayOrder: 2,
    },
  });

  // SELECT:
  // Binding is a one-time price addition.
  const bindingAttribute = await prisma.productAttributeDefinition.upsert({
    where: {
      id: '10000000-0000-0000-0000-000000000012',
    },
    update: {},
    create: {
      id: '10000000-0000-0000-0000-000000000012',
      productId: pricingTestProduct.id,
      attributeName: 'כריכה',
      attributeType: 'SELECT',
      displayStyle: 'DROPDOWN',
      isRequired: true,
      displayOrder: 3,
      pricingRule: 'FLAT_ADD_PER_OPTION',
    },
  });

  await prisma.productAttributeOption.upsert({
    where: {
      id: '20000000-0000-0000-0000-000000000012',
    },
    update: {},
    create: {
      id: '20000000-0000-0000-0000-000000000012',
      attributeDefinitionId: bindingAttribute.id,
      optionLabel: 'ללא כריכה',
      optionValue: 'NONE',
      priceModifier: 0,
      priceModifierType: 'FIXED_ADD',
      isPerUnit: false,
      displayOrder: 1,
    },
  });

  await prisma.productAttributeOption.upsert({
    where: {
      id: '20000000-0000-0000-0000-000000000013',
    },
    update: {},
    create: {
      id: '20000000-0000-0000-0000-000000000013',
      attributeDefinitionId: bindingAttribute.id,
      optionLabel: 'ספירלה',
      optionValue: 'SPIRAL',
      priceModifier: 8,
      priceModifierType: 'FIXED_ADD',
      isPerUnit: false,
      displayOrder: 2,
    },
  });

  // BOOLEAN:
  // Adds 5 once when checked.
  await prisma.productAttributeDefinition.upsert({
    where: {
      id: '10000000-0000-0000-0000-000000000013',
    },
    update: {},
    create: {
      id: '10000000-0000-0000-0000-000000000013',
      productId: pricingTestProduct.id,
      attributeName: 'למינציה',
      attributeType: 'BOOLEAN',
      displayStyle: 'CHECKBOX',
      isRequired: false,
      displayOrder: 4,
      pricingRule: 'NONE',
      unitPrice: 5,
    },
  });

  // TEXT:
  // No price contribution.
  await prisma.productAttributeDefinition.upsert({
    where: {
      id: '10000000-0000-0000-0000-000000000014',
    },
    update: {},
    create: {
      id: '10000000-0000-0000-0000-000000000014',
      productId: pricingTestProduct.id,
      attributeName: 'הערות מיוחדות',
      attributeType: 'TEXT',
      displayStyle: 'MULTI_LINE',
      isRequired: false,
      displayOrder: 5,
      pricingRule: 'NONE',
    },
  });

  // FILE_UPLOAD:
  // No price contribution for now.
  await prisma.productAttributeDefinition.upsert({
    where: {
      id: '10000000-0000-0000-0000-000000000015',
    },
    update: {},
    create: {
      id: '10000000-0000-0000-0000-000000000015',
      productId: pricingTestProduct.id,
      attributeName: 'קובץ עיצוב',
      attributeType: 'FILE_UPLOAD',
      displayStyle: 'FILE_DROPZONE',
      isRequired: false,
      displayOrder: 6,
      pricingRule: 'NONE',
    },
  });

  // --------------------
  // DPS-028: Test Cart for 'requester'
  // --------------------
  let activeCart = await prisma.cart.findFirst({
    where: { userId: requester.id, status: Status.ACTIVE },
  });

  if (!activeCart) {
    activeCart = await prisma.cart.create({
      data: {
        userId: requester.id,
        status: Status.ACTIVE,
        updatedAt: new Date(),
      },
    });
  }

  // Clear old items just in case
  await prisma.cartItem.deleteMany({
    where: { cartId: activeCart.id },
  });

  await prisma.cartItem.createMany({
    data: [
      {
        cartId: activeCart.id,
        productId: businessCards.id,
        quantity: 2,
        computedPrice: 100,
        selectedAttributes: {},
        uploadedFilePath: '',
      },
      {
        cartId: activeCart.id,
        productId: letterhead.id,
        quantity: 5,
        computedPrice: 200,
        selectedAttributes: {},
        uploadedFilePath: '',
      },
      {
        cartId: activeCart.id,
        productId: notebooks.id,
        quantity: 1,
        computedPrice: 50,
        selectedAttributes: {},
        uploadedFilePath: '',
      },
    ],
  });

  // --------------------
  // DPS-034: Test Order History for 'requester'
  // --------------------
  const testOrder = await prisma.order.upsert({
    where: { orderNumber: '2026-9999' },
    update: {
      status: OrderStatus.APPROVED_FOR_PRODUCTION,
    },
    create: {
      orderNumber: '2026-9999',
      requesterId: requester.id,
      unit: requester.unit || 'טייסת 101',
      budgetOfficerName: 'רס״ן כהן',
      budgetOfficerEmail: 'budget@example.com',
      totalPrice: 200,
      status: OrderStatus.APPROVED_FOR_PRODUCTION,
      itemEntries: {
        create: [
          {
            productId: businessCards.id,
            computedUnitPrice: 100,
            computedTotalPrice: 200,
            uploadedFilePath: '',
          },
        ],
      },
    },
  });

  // Clear existing history for this order to re-seed cleanly
  await prisma.orderStatusHistory.deleteMany({
    where: { orderId: testOrder.id },
  });

  const now = new Date();
  const twoDaysAgo = new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000);
  const oneDayAgo = new Date(now.getTime() - 1 * 24 * 60 * 60 * 1000);

  await prisma.orderStatusHistory.createMany({
    data: [
      {
        orderId: testOrder.id,
        toStatus: OrderStatus.PENDING_BUDGET,
        changedByUserId: requester.id,
        changedBySource: ChangeSource.SYSTEM,
        note: 'הזמנה נוצרה ממערכת ההזמנות',
        changedAt: twoDaysAgo,
      },
      {
        orderId: testOrder.id,
        fromStatus: OrderStatus.PENDING_BUDGET,
        toStatus: OrderStatus.BUDGET_APPROVED,
        changedBySource: ChangeSource.EMAIL_BUDGET_OFFICER,
        note: 'אושר תקציב באמצעות קישור במייל ע"י קצין תקציבים',
        changedAt: oneDayAgo,
      },
      {
        orderId: testOrder.id,
        fromStatus: OrderStatus.BUDGET_APPROVED,
        toStatus: OrderStatus.APPROVED_FOR_PRODUCTION,
        changedByUserId: manager.id,
        changedBySource: ChangeSource.MANAGER_UI,
        note: 'אושר ע"י מנהל בית דפוס - הועבר לביצוע',
        changedAt: now,
      },
    ],
  });

  logger.info('Seeded development data', {
    users: {
      requester: requester.adUsername,
      manager: manager.adUsername,
      worker: worker.adUsername,
    },
    products: [
      businessCards.name,
      letterhead.name,
      notebooks.name,
      rollups.name,
      pricingTestProduct.name,
    ],
    pricingTest: {
      productId: pricingTestProduct.id,
      copiesAttributeId: copiesAttribute.id,
      paperTypeAttributeId: paperTypeAttribute.id,
      bindingAttributeId: bindingAttribute.id,
    },
    testData: {
      cartItems: 3,
      orderNumber: testOrder.orderNumber,
      orderHistoryEvents: 3,
    },
  });
}

main()
  .catch((error) => {
    if (error instanceof Error) {
      logger.error('Seed failed', {
        errorName: error.name,
        errorMessage: error.message,
        errorStack: error.stack,
      });
    } else {
      logger.error('Seed failed', {
        error: String(error),
      });
    }

    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
