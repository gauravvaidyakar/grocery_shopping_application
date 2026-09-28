import { PrismaClient, ProductType, Role } from "@prisma/client";
import { hash } from "bcryptjs";

const prisma = new PrismaClient();

async function seed(): Promise<void> {
  const adminEmail = process.env.ADMIN_EMAIL;
  const adminPassword = process.env.ADMIN_PASSWORD;
  if (!adminEmail || !adminPassword || adminPassword.length < 12) {
    throw new Error(
      "ADMIN_EMAIL and ADMIN_PASSWORD (minimum 12 characters) are required for seeding",
    );
  }
  await prisma.user.upsert({
    where: { email: adminEmail.toLowerCase() },
    create: {
      email: adminEmail.toLowerCase(),
      passwordHash: await hash(adminPassword, 12),
      role: Role.ADMIN,
    },
    update: {},
  });
  const categories = [
    ["Food Products", "food-products"],
    ["Millets", "millets"],
    ["Millet-based Products", "millet-based-products"],
    ["Jaggery", "jaggery"],
  ] as const;
  for (const [name, slug] of categories) {
    await prisma.category.upsert({
      where: { slug },
      create: { name, slug },
      update: { name, isActive: true },
    });
  }
  const existingRules = await prisma.commissionRule.count();
  if (existingRules === 0) {
    await prisma.commissionRule.createMany({
      data: [
        {
          productType: ProductType.RAW_COMMODITY,
          percentage: 14,
          effectiveFrom: new Date("2026-01-01T00:00:00.000Z"),
        },
        {
          productType: ProductType.VALUE_ADDED,
          percentage: 18,
          effectiveFrom: new Date("2026-01-01T00:00:00.000Z"),
        },
      ],
    });
  }
}

seed().finally(async () => prisma.$disconnect());
