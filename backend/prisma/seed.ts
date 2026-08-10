import logger from '../src/utils/logger';
import { prisma } from '../src/config/db.js';

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
      productType: 'DYNAMIC',
      basePrice: 150,
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
      isRequired: true,
      displayOrder: 1,
      pricingRule: 'PER_UNIT_MULTIPLIER',
      unitPrice: 0.5,
      minValue: 50,
      maxValue: 200,
    },
  });

  logger.info('Seeded development data', {
    users: {
      requester: requester.adUsername,
      manager: manager.adUsername,
      worker: worker.adUsername,
    },
    products: [businessCards.name, letterhead.name, notebooks.name, rollups.name],
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
