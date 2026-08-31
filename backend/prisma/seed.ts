import logger from '../src/utils/logger';
import { prisma } from '../src/config/db';

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
      militaryEmail: 'eitantestemail@gmail.com',
      adUsername: 'requester',
      unit: 'יחידת פיתוח',
      phone: '050-1111111',
      role: 'REQUESTER',
    },
  });

  const requesterTwo = await prisma.user.upsert({
    where: {
      adUsername: 'requester2',
    },
    update: {},
    create: {
      fullName: 'משתמש מבקש נוסף',
      militaryEmail: 'eitantestemail@gmail.com',
      adUsername: 'requester2',
      unit: 'יחידת בדיקות',
      phone: '050-4444444',
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
      militaryEmail: 'eitantestemail@gmail.com',
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
      militaryEmail: 'eitantestemail@gmail.com',
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
    update: {
      minQuantity: 2,
      maxQuantity: 5,
    },
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
      minQuantity: 2,
      maxQuantity: 5,
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
      minQuantity: 1,
      maxQuantity: 100,
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
      minQuantity: 1,
      maxQuantity: 100,
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
      minQuantity: 1,
      maxQuantity: 100,
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
      minQuantity: 1,
      maxQuantity: 100,
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

  const notebookA5 = await prisma.productAttributeOption.upsert({
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

  const notebookA4 = await prisma.productAttributeOption.upsert({
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

  // ============================================================
  // Cart
  // ============================================================
  //
  // Active development cart for requester.
  //
  // Business cards:
  // quantity 2
  // minQuantity 2
  // maxQuantity 5
  // 2 * 50 = 100
  //
  // Letterhead:
  // quantity 3
  // 3 * 40 = 120
  //
  // Cart total: 220
  // ============================================================

  const activeCart = await prisma.cart.upsert({
    where: {
      id: '50000000-0000-0000-0000-000000000001',
    },
    update: {
      userId: requester.id,
      status: 'ACTIVE',
      isDeleted: false,
      updatedAt: new Date(),
    },
    create: {
      id: '50000000-0000-0000-0000-000000000001',
      userId: requester.id,
      status: 'ACTIVE',
      updatedAt: new Date(),
    },
  });

  await prisma.cartItem.upsert({
    where: {
      id: '51000000-0000-0000-0000-000000000001',
    },
    update: {
      cartId: activeCart.id,
      productId: businessCards.id,
      quantity: 2,
      computedPrice: 100,
      selectedAttributes: [],
      uploadedFilePath: '',
      isDeleted: false,
    },
    create: {
      id: '51000000-0000-0000-0000-000000000001',
      cartId: activeCart.id,
      productId: businessCards.id,
      quantity: 2,
      computedPrice: 100,
      selectedAttributes: [],
      uploadedFilePath: '',
    },
  });

  await prisma.cartItem.upsert({
    where: {
      id: '51000000-0000-0000-0000-000000000002',
    },
    update: {
      cartId: activeCart.id,
      productId: letterhead.id,
      quantity: 3,
      computedPrice: 120,
      selectedAttributes: [],
      uploadedFilePath: '',
      isDeleted: false,
    },
    create: {
      id: '51000000-0000-0000-0000-000000000002',
      cartId: activeCart.id,
      productId: letterhead.id,
      quantity: 3,
      computedPrice: 120,
      selectedAttributes: [],
      uploadedFilePath: '',
    },
  });

  await prisma.cartItem.upsert({
    where: {
      id: '51000000-0000-0000-0000-000000000003',
    },
    update: {
      cartId: activeCart.id,
      productId: notebooks.id,
      quantity: 2,
      computedPrice: 135,
      selectedAttributes: [
        {
          attributeDefinitionId: notebookSize.id,
          selectedOptionIds: [notebookA4.id],
        },
      ],
      uploadedFilePath: '',
      isDeleted: false,
    },
    create: {
      id: '51000000-0000-0000-0000-000000000003',
      cartId: activeCart.id,
      productId: notebooks.id,
      quantity: 2,
      computedPrice: 135,
      selectedAttributes: [
        {
          attributeDefinitionId: notebookSize.id,
          selectedOptionIds: [notebookA4.id],
        },
      ],
      uploadedFilePath: '',
      isDeleted: false,
    },
  });

  // Cart for requesterTwo (pricingTestProduct)
  const activeCartTwo = await prisma.cart.upsert({
    where: {
      id: '50000000-0000-0000-0000-000000000002',
    },
    update: {
      userId: requesterTwo.id,
      status: 'ACTIVE',
      isDeleted: false,
      updatedAt: new Date(),
    },
    create: {
      id: '50000000-0000-0000-0000-000000000002',
      userId: requesterTwo.id,
      status: 'ACTIVE',
      updatedAt: new Date(),
    },
  });

  await prisma.cartItem.upsert({
    where: {
      id: '51000000-0000-0000-0000-000000000004',
    },
    update: {
      cartId: activeCartTwo.id,
      productId: pricingTestProduct.id,
      quantity: 1,
      computedPrice: 8,
      selectedAttributes: [
        {
          attributeDefinitionId: copiesAttribute.id,
          value: 50,
        },
        {
          attributeDefinitionId: paperTypeAttribute.id,
          selectedOptionIds: ['20000000-0000-0000-0000-000000000010'],
        },
        {
          attributeDefinitionId: bindingAttribute.id,
          selectedOptionIds: ['20000000-0000-0000-0000-000000000013'],
        },
      ],
      uploadedFilePath: '',
      isDeleted: false,
    },
    create: {
      id: '51000000-0000-0000-0000-000000000004',
      cartId: activeCartTwo.id,
      productId: pricingTestProduct.id,
      quantity: 1,
      computedPrice: 8,
      selectedAttributes: [
        {
          attributeDefinitionId: copiesAttribute.id,
          value: 50,
        },
        {
          attributeDefinitionId: paperTypeAttribute.id,
          selectedOptionIds: ['20000000-0000-0000-0000-000000000010'],
        },
        {
          attributeDefinitionId: bindingAttribute.id,
          selectedOptionIds: ['20000000-0000-0000-0000-000000000013'],
        },
      ],
      uploadedFilePath: '',
    },
  });

  // ============================================================
  // Orders
  // ============================================================

  // ------------------------------------------------------------
  // Order 1
  // A new order waiting for budget approval.
  //
  // 5 notebooks:
  // Base: 5 * 60 = 300
  // A4 option: +15
  // Total: 315
  // ------------------------------------------------------------

  const pendingOrder = await prisma.order.upsert({
    where: {
      orderNumber: 'ORD-1001',
    },
    update: {},
    create: {
      id: '60000000-0000-0000-0000-000000000001',
      orderNumber: 'ORD-1001',
      requesterId: requester.id,
      unit: requester.unit ?? 'יחידת פיתוח',
      status: 'PENDING_BUDGET',
      budgetOfficerName: 'קצין תקציבים',
      budgetOfficerEmail: 'budget@example.com',
      totalPrice: 315,
      createdAt: new Date('2026-08-20T09:00:00.000Z'),
    },
  });

  const requesterTwoOrder = await prisma.order.upsert({
    where: {
      orderNumber: 'ORD-2001',
    },
    update: {},
    create: {
      id: '60000000-0000-0000-0000-000000000004',
      orderNumber: 'ORD-2001',
      requesterId: requesterTwo.id,
      unit: requesterTwo.unit ?? 'יחידת בדיקות',
      status: 'READY_FOR_PICKUP',
      budgetOfficerName: 'קצין תקציבים נוסף',
      budgetOfficerEmail: 'budget2@example.com',
      totalPrice: 100,
      createdAt: new Date('2026-08-22T10:00:00.000Z'),
    },
  });

  const pendingNotebookItem = await prisma.orderItem.upsert({
    where: {
      id: '70000000-0000-0000-0000-000000000001',
    },
    update: {},
    create: {
      id: '70000000-0000-0000-0000-000000000001',
      orderId: pendingOrder.id,
      productId: notebooks.id,
      quantity: 5,
      uploadedFilePath: '',
      computedUnitPrice: 60,
      computedTotalPrice: 315,
    },
  });

  await prisma.orderItem.upsert({
    where: {
      id: '70000000-0000-0000-0000-000000000006',
    },
    update: {},
    create: {
      id: '70000000-0000-0000-0000-000000000006',
      orderId: requesterTwoOrder.id,
      productId: businessCards.id,
      quantity: 2,
      uploadedFilePath: '',
      computedUnitPrice: 50,
      computedTotalPrice: 100,
    },
  });

  await prisma.orderItemAttributeValue.upsert({
    where: {
      id: '80000000-0000-0000-0000-000000000001',
    },
    update: {},
    create: {
      id: '80000000-0000-0000-0000-000000000001',
      orderItemId: pendingNotebookItem.id,
      attributeDefinitionId: notebookSize.id,
      selectedOptionId: notebookA4.id,
      valueText: notebookA4.optionLabel,
    },
  });

  await prisma.orderStatusHistory.upsert({
    where: {
      id: '90000000-0000-0000-0000-000000000001',
    },
    update: {},
    create: {
      id: '90000000-0000-0000-0000-000000000001',
      orderId: pendingOrder.id,
      fromStatus: null,
      toStatus: 'PENDING_BUDGET',
      changedByUserId: requester.id,
      changedBySource: 'SYSTEM',
      changedAt: new Date('2026-08-20T09:00:00.000Z'),
      note: 'ההזמנה נוצרה ונשלחה לאישור תקציבי.',
    },
  });

  // ------------------------------------------------------------
  // Order 2
  // An order currently in printing.
  //
  // Business cards:
  // 2 * 50 = 100
  //
  // Notebooks A5:
  // 2 * 60 = 120
  //
  // Total: 220
  // ------------------------------------------------------------

  const printingOrder = await prisma.order.upsert({
    where: {
      orderNumber: 'ORD-1002',
    },
    update: {},
    create: {
      id: '60000000-0000-0000-0000-000000000002',
      orderNumber: 'ORD-1002',
      requesterId: requester.id,
      unit: requester.unit ?? 'יחידת פיתוח',
      status: 'IN_PRINTING',
      budgetOfficerName: 'קצין תקציבים',
      budgetOfficerEmail: 'budget@example.com',
      totalPrice: 220,
      approvedByManagerId: manager.id,
      approvedByManagerAt: new Date('2026-08-15T10:30:00.000Z'),
      workerId: worker.id,
      createdAt: new Date('2026-08-14T08:00:00.000Z'),
    },
  });

  await prisma.orderItem.upsert({
    where: {
      id: '70000000-0000-0000-0000-000000000002',
    },
    update: {},
    create: {
      id: '70000000-0000-0000-0000-000000000002',
      orderId: printingOrder.id,
      productId: businessCards.id,
      quantity: 2,
      uploadedFilePath: '',
      computedUnitPrice: 50,
      computedTotalPrice: 100,
    },
  });

  const printingNotebookItem = await prisma.orderItem.upsert({
    where: {
      id: '70000000-0000-0000-0000-000000000003',
    },
    update: {},
    create: {
      id: '70000000-0000-0000-0000-000000000003',
      orderId: printingOrder.id,
      productId: notebooks.id,
      quantity: 2,
      uploadedFilePath: '',
      computedUnitPrice: 60,
      computedTotalPrice: 120,
    },
  });

  await prisma.orderItemAttributeValue.upsert({
    where: {
      id: '80000000-0000-0000-0000-000000000002',
    },
    update: {},
    create: {
      id: '80000000-0000-0000-0000-000000000002',
      orderItemId: printingNotebookItem.id,
      attributeDefinitionId: notebookSize.id,
      selectedOptionId: notebookA5.id,
      valueText: notebookA5.optionLabel,
    },
  });

  await prisma.orderStatusHistory.upsert({
    where: {
      id: '90000000-0000-0000-0000-000000000010',
    },
    update: {},
    create: {
      id: '90000000-0000-0000-0000-000000000010',
      orderId: printingOrder.id,
      fromStatus: null,
      toStatus: 'PENDING_BUDGET',
      changedByUserId: requester.id,
      changedBySource: 'SYSTEM',
      changedAt: new Date('2026-08-14T08:00:00.000Z'),
      note: 'ההזמנה נוצרה ונשלחה לאישור תקציבי.',
    },
  });

  await prisma.orderStatusHistory.upsert({
    where: {
      id: '90000000-0000-0000-0000-000000000011',
    },
    update: {},
    create: {
      id: '90000000-0000-0000-0000-000000000011',
      orderId: printingOrder.id,
      fromStatus: 'PENDING_BUDGET',
      toStatus: 'BUDGET_APPROVED',
      changedByUserId: null,
      changedBySource: 'EMAIL_BUDGET_OFFICER',
      changedAt: new Date('2026-08-14T12:00:00.000Z'),
      note: 'האישור התקציבי התקבל.',
    },
  });

  await prisma.orderStatusHistory.upsert({
    where: {
      id: '90000000-0000-0000-0000-000000000030',
    },
    update: {},
    create: {
      id: '90000000-0000-0000-0000-000000000030',
      orderId: requesterTwoOrder.id,
      fromStatus: 'IN_PRINTING',
      toStatus: 'READY_FOR_PICKUP',
      changedByUserId: worker.id,
      changedBySource: 'WORKER_UI',
      changedAt: new Date('2026-08-23T12:00:00.000Z'),
      note: 'ההזמנה מוכנה לאיסוף.',
    },
  });

  await prisma.orderStatusHistory.upsert({
    where: {
      id: '90000000-0000-0000-0000-000000000012',
    },
    update: {},
    create: {
      id: '90000000-0000-0000-0000-000000000012',
      orderId: printingOrder.id,
      fromStatus: 'BUDGET_APPROVED',
      toStatus: 'APPROVED_FOR_PRODUCTION',
      changedByUserId: manager.id,
      changedBySource: 'MANAGER_UI',
      changedAt: new Date('2026-08-15T10:30:00.000Z'),
      note: 'ההזמנה אושרה להפקה.',
    },
  });

  await prisma.orderStatusHistory.upsert({
    where: {
      id: '90000000-0000-0000-0000-000000000013',
    },
    update: {},
    create: {
      id: '90000000-0000-0000-0000-000000000013',
      orderId: printingOrder.id,
      fromStatus: 'APPROVED_FOR_PRODUCTION',
      toStatus: 'IN_PRINTING',
      changedByUserId: worker.id,
      changedBySource: 'WORKER_UI',
      changedAt: new Date('2026-08-16T07:30:00.000Z'),
      note: 'ההזמנה הועברה להדפסה.',
    },
  });

  // ------------------------------------------------------------
  // Order 3
  // Completed order with a full status history.
  //
  // Letterhead:
  // 3 * 40 = 120
  //
  // Notebook A4:
  // 1 * 60 + 15 = 75
  //
  // Total: 195
  // ------------------------------------------------------------

  const completedOrder = await prisma.order.upsert({
    where: {
      orderNumber: 'ORD-1003',
    },
    update: {},
    create: {
      id: '60000000-0000-0000-0000-000000000003',
      orderNumber: 'ORD-1003',
      requesterId: requester.id,
      unit: requester.unit ?? 'יחידת פיתוח',
      status: 'COMPLETED',
      budgetOfficerName: 'קצין תקציבים',
      budgetOfficerEmail: 'budget@example.com',
      totalPrice: 195,
      approvedByManagerId: manager.id,
      approvedByManagerAt: new Date('2026-08-06T11:00:00.000Z'),
      workerId: worker.id,
      completedAt: new Date('2026-08-10T14:30:00.000Z'),
      createdAt: new Date('2026-08-05T08:30:00.000Z'),
    },
  });

  await prisma.orderItem.upsert({
    where: {
      id: '70000000-0000-0000-0000-000000000004',
    },
    update: {},
    create: {
      id: '70000000-0000-0000-0000-000000000004',
      orderId: completedOrder.id,
      productId: letterhead.id,
      quantity: 3,
      uploadedFilePath: '',
      computedUnitPrice: 40,
      computedTotalPrice: 120,
    },
  });

  const completedNotebookItem = await prisma.orderItem.upsert({
    where: {
      id: '70000000-0000-0000-0000-000000000005',
    },
    update: {},
    create: {
      id: '70000000-0000-0000-0000-000000000005',
      orderId: completedOrder.id,
      productId: notebooks.id,
      quantity: 1,
      uploadedFilePath: '',
      computedUnitPrice: 60,
      computedTotalPrice: 75,
    },
  });

  await prisma.orderItemAttributeValue.upsert({
    where: {
      id: '80000000-0000-0000-0000-000000000003',
    },
    update: {},
    create: {
      id: '80000000-0000-0000-0000-000000000003',
      orderItemId: completedNotebookItem.id,
      attributeDefinitionId: notebookSize.id,
      selectedOptionId: notebookA4.id,
      valueText: notebookA4.optionLabel,
    },
  });

  await prisma.orderStatusHistory.upsert({
    where: {
      id: '90000000-0000-0000-0000-000000000020',
    },
    update: {},
    create: {
      id: '90000000-0000-0000-0000-000000000020',
      orderId: completedOrder.id,
      fromStatus: null,
      toStatus: 'PENDING_BUDGET',
      changedByUserId: requester.id,
      changedBySource: 'SYSTEM',
      changedAt: new Date('2026-08-05T08:30:00.000Z'),
      note: 'ההזמנה נוצרה ונשלחה לאישור תקציבי.',
    },
  });

  await prisma.orderStatusHistory.upsert({
    where: {
      id: '90000000-0000-0000-0000-000000000021',
    },
    update: {},
    create: {
      id: '90000000-0000-0000-0000-000000000021',
      orderId: completedOrder.id,
      fromStatus: 'PENDING_BUDGET',
      toStatus: 'BUDGET_APPROVED',
      changedByUserId: null,
      changedBySource: 'EMAIL_BUDGET_OFFICER',
      changedAt: new Date('2026-08-05T13:00:00.000Z'),
      note: 'האישור התקציבי התקבל.',
    },
  });

  await prisma.orderStatusHistory.upsert({
    where: {
      id: '90000000-0000-0000-0000-000000000022',
    },
    update: {},
    create: {
      id: '90000000-0000-0000-0000-000000000022',
      orderId: completedOrder.id,
      fromStatus: 'BUDGET_APPROVED',
      toStatus: 'APPROVED_FOR_PRODUCTION',
      changedByUserId: manager.id,
      changedBySource: 'MANAGER_UI',
      changedAt: new Date('2026-08-06T11:00:00.000Z'),
      note: 'ההזמנה אושרה להפקה.',
    },
  });

  await prisma.orderStatusHistory.upsert({
    where: {
      id: '90000000-0000-0000-0000-000000000023',
    },
    update: {},
    create: {
      id: '90000000-0000-0000-0000-000000000023',
      orderId: completedOrder.id,
      fromStatus: 'APPROVED_FOR_PRODUCTION',
      toStatus: 'IN_PRINTING',
      changedByUserId: worker.id,
      changedBySource: 'WORKER_UI',
      changedAt: new Date('2026-08-07T07:30:00.000Z'),
      note: 'ההזמנה הועברה להדפסה.',
    },
  });

  await prisma.orderStatusHistory.upsert({
    where: {
      id: '90000000-0000-0000-0000-000000000024',
    },
    update: {},
    create: {
      id: '90000000-0000-0000-0000-000000000024',
      orderId: completedOrder.id,
      fromStatus: 'IN_PRINTING',
      toStatus: 'READY_FOR_PICKUP',
      changedByUserId: worker.id,
      changedBySource: 'WORKER_UI',
      changedAt: new Date('2026-08-09T12:00:00.000Z'),
      note: 'ההזמנה מוכנה לאיסוף.',
    },
  });

  await prisma.orderStatusHistory.upsert({
    where: {
      id: '90000000-0000-0000-0000-000000000025',
    },
    update: {},
    create: {
      id: '90000000-0000-0000-0000-000000000025',
      orderId: completedOrder.id,
      fromStatus: 'READY_FOR_PICKUP',
      toStatus: 'COMPLETED',
      changedByUserId: worker.id,
      changedBySource: 'WORKER_UI',
      changedAt: new Date('2026-08-10T14:30:00.000Z'),
      note: 'ההזמנה נאספה והושלמה.',
    },
  });

  // --------------------
  // Seed summary
  // --------------------

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
    orders: [
      {
        orderNumber: pendingOrder.orderNumber,
        status: pendingOrder.status,
      },
      {
        orderNumber: printingOrder.orderNumber,
        status: printingOrder.status,
      },
      {
        orderNumber: completedOrder.orderNumber,
        status: completedOrder.status,
      },
    ],
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
