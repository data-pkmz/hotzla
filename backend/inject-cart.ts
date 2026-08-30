import { Status } from '@prisma/client';
import { prisma } from './src/config/db';

async function main() {
  console.info('Starting cart injection script for user "requester"...');

  // 1. Find or create the test user
  let user = await prisma.user.findUnique({
    where: { adUsername: 'requester' },
  });

  if (!user) {
    console.info('User "requester" not found. Creating...');
    user = await prisma.user.create({
      data: {
        adUsername: 'requester',
        fullName: 'Test Requester',
        role: 'REQUESTER',
        unit: 'Test Unit',
      },
    });
  }

  // 2. Find or create an ACTIVE cart for this user
  let cart = await prisma.cart.findFirst({
    where: {
      userId: user.id,
      status: Status.ACTIVE,
      isDeleted: false,
    },
  });

  if (!cart) {
    console.info('No active cart found. Creating a new cart...');
    cart = await prisma.cart.create({
      data: {
        userId: user.id,
        status: Status.ACTIVE,
        updatedAt: new Date(),
      },
    });
  }

  // 3. Find some products to add
  const products = await prisma.product.findMany({
    where: { isDeleted: false, isActive: true },
    take: 2,
  });

  if (products.length === 0) {
    console.error('No products found in the database. Please inject catalog first.');
    return;
  }

  // 4. Inject items into the cart
  console.info('Injecting items into the cart...');
  for (const product of products) {
    const existingItem = await prisma.cartItem.findFirst({
      where: {
        cartId: cart.id,
        productId: product.id,
        isDeleted: false,
      },
    });

    if (!existingItem) {
      await prisma.cartItem.create({
        data: {
          cartId: cart.id,
          productId: product.id,
          quantity: 2,
          computedPrice: Number(product.basePrice) * 2,
          selectedAttributes: { 'Example Attribute': 'Test Value' },
          uploadedFilePath: '',
        },
      });
      console.info(`Added product "${product.name}" to cart.`);
    } else {
      console.info(`Product "${product.name}" is already in the cart.`);
    }
  }

  console.info('Cart injection successful!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
