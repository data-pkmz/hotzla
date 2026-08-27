import { prisma } from './src/config/db';

async function main() {
  const adUsername = 'requester';

  const user = await prisma.user.findUnique({ where: { adUsername } });
  if (!user) {
    throw new Error(`User '${adUsername}' not found! Run the seed first.`);
  }

  let cart = await prisma.cart.findFirst({ where: { userId: user.id, status: 'ACTIVE' } });
  if (!cart) {
    cart = await prisma.cart.create({
      data: { userId: user.id, status: 'ACTIVE', updatedAt: new Date() },
    });
  }

  // Get a real product from the database
  const product = await prisma.product.findFirst();
  if (!product) throw new Error('No products found in DB. Run seed first.');

  // Clean the cart to avoid duplicates
  await prisma.cartItem.deleteMany({ where: { cartId: cart.id } });

  // Add 3 copies of the first product
  await prisma.cartItem.create({
    data: {
      cartId: cart.id,
      productId: product.id,
      quantity: 3,
      computedPrice: Number(product.basePrice) * 3,
      uploadedFilePath: '',
      selectedAttributes: [],
    },
  });

  console.info("✅ ITEM INJECTED SUCCESSFULLY INTO 'requester' CART!");
}

main()
  .catch((e) => {
    console.error('❌ ERROR:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
