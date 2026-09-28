import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { MongoData, ProductStatus, ReviewStatus, VendorStatus } from "../database/domain.types";
import { randomBytes } from "node:crypto";
import { MongoDatabaseService } from "../database/mongo-database.service";
import { VendorsService } from "../vendors/vendors.service";
import type {
  CreateProductDto,
  ProductQueryDto,
  UpdateProductDto,
} from "./products.dto";

const publicProductSelect = {
  id: true,
  vendorId: true,
  categoryId: true,
  name: true,
  slug: true,
  description: true,
  productType: true,
  price: true,
  mrp: true,
  weightGrams: true,
  lengthCm: true,
  widthCm: true,
  heightCm: true,
  ingredients: true,
  specifications: true,
  category: { select: { name: true } },
  vendor: {
    select: {
      id: true,
      businessName: true,
      pickupPincode: true,
      _count: {
        select: {
          products: { where: { status: ProductStatus.APPROVED } },
        },
      },
    },
  },
  images: {
    orderBy: { sortOrder: "asc" as const },
    select: { url: true },
  },
  inventory: {
    select: { quantity: true, reserved: true, lowStockThreshold: true },
  },
} satisfies MongoData.ProductSelect;

type PublicProduct = MongoData.ProductGetPayload<{
  select: typeof publicProductSelect;
}>;

@Injectable()
export class ProductsService {
  constructor(
    private readonly database: MongoDatabaseService,
    private readonly vendors: VendorsService,
  ) {}

  async publicList(query: ProductQueryDto) {
    const where: MongoData.ProductWhereInput = {
      status: ProductStatus.APPROVED,
      vendor: { status: VendorStatus.APPROVED },
      ...(query.search
        ? {
            OR: [
              { name: { contains: query.search, mode: "insensitive" } },
              { description: { contains: query.search, mode: "insensitive" } },
            ],
          }
        : {}),
      ...(query.category
        ? {
            category: {
              OR: [{ id: query.category }, { slug: query.category }],
            },
          }
        : {}),
      ...(query.vendorId ? { vendorId: query.vendorId } : {}),
      ...(query.productType ? { productType: query.productType } : {}),
      ...(query.minPrice !== undefined || query.maxPrice !== undefined
        ? { price: { gte: query.minPrice, lte: query.maxPrice } }
        : {}),
      ...(query.available
        ? { inventory: { is: { quantity: { gt: 0 } } } }
        : {}),
    };
    const orderBy: MongoData.ProductOrderByWithRelationInput =
      query.sort === "PRICE_ASC"
        ? { price: "asc" }
        : query.sort === "PRICE_DESC"
          ? { price: "desc" }
          : query.sort === "POPULAR"
            ? { orderItems: { _count: "desc" } }
            : { createdAt: "desc" };
    const [items, total] = await Promise.all([
      this.database.product.findMany({
        where,
        select: publicProductSelect,
        orderBy,
        skip: (query.page - 1) * query.limit,
        take: query.limit,
      }),
      this.database.product.count({ where }),
    ]);
    const ratings = await this.ratingMaps(items);
    return {
      data: items.map((item: any) =>
        this.toPublic(
          item,
          ratings.products.get(item.id),
          ratings.vendors.get(item.vendorId),
        ),
      ),
      meta: {
        page: query.page,
        limit: query.limit,
        total,
        totalPages: Math.ceil(total / query.limit),
      },
    };
  }

  async publicGet(idOrSlug: string) {
    const product = await this.database.product.findFirst({
      where: {
        OR: [{ id: idOrSlug }, { slug: idOrSlug }],
        status: ProductStatus.APPROVED,
        vendor: { status: VendorStatus.APPROVED },
      },
      select: publicProductSelect,
    });
    if (!product) throw new NotFoundException("Product not found");
    const ratings = await this.ratingMaps([product]);
    return this.toPublic(
      product,
      ratings.products.get(product.id),
      ratings.vendors.get(product.vendorId),
    );
  }

  async vendorList(userId: string, query: ProductQueryDto) {
    const vendorId = await this.vendors.getVendorId(userId);
    const where = {
      vendorId,
      ...(query.status ? { status: query.status } : {}),
    };
    const [data, total] = await Promise.all([
      this.database.product.findMany({
        where,
        include: { category: true, images: true, inventory: true },
        skip: (query.page - 1) * query.limit,
        take: query.limit,
        orderBy: { createdAt: "desc" },
      }),
      this.database.product.count({ where }),
    ]);
    return {
      data,
      meta: {
        page: query.page,
        limit: query.limit,
        total,
        totalPages: Math.ceil(total / query.limit),
      },
    };
  }

  async create(userId: string, input: CreateProductDto) {
    const vendor = await this.vendors.getByUser(userId);
    if (vendor.status !== VendorStatus.APPROVED)
      throw new ForbiddenException("Only approved vendors can create products");
    if (input.mrp !== undefined && input.mrp < input.price)
      throw new BadRequestException(
        "MRP cannot be lower than the selling price",
      );
    const slug = `${input.name
      .toLowerCase()
      .normalize("NFKD")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "")}-${randomBytes(3).toString("hex")}`;
    const { images, stock, specifications, ...data } = input;
    return this.database.transaction((tx: any) =>
      tx.product.create({
        data: {
          ...data,
          price: input.price,
          mrp:
            input.mrp === undefined ? undefined : input.mrp,
          gstRate: input.gstRate,
          lengthCm:
            input.lengthCm === undefined
              ? undefined
              : input.lengthCm,
          widthCm:
            input.widthCm === undefined
              ? undefined
              : input.widthCm,
          heightCm:
            input.heightCm === undefined
              ? undefined
              : input.heightCm,
          specifications: specifications,
          slug,
          vendorId: vendor.id,
          images: {
            create: images.map((url: any, sortOrder: any) => ({ url, sortOrder })),
          },
          inventory: {
            create: {
              quantity: stock,
              transactions: {
                create: {
                  type: "INITIAL_STOCK",
                  quantity: stock,
                  balanceAfter: stock,
                  notes: "Initial stock from product creation",
                },
              },
            },
          },
        },
        include: { images: true, inventory: true },
      }),
    );
  }

  async getOwned(userId: string, id: string) {
    const vendorId = await this.vendors.getVendorId(userId);
    const product = await this.database.product.findFirst({
      where: { id, vendorId },
      include: { category: true, images: true, inventory: true },
    });
    if (!product) throw new NotFoundException("Product not found");
    return product;
  }

  async update(userId: string, id: string, input: UpdateProductDto) {
    const current = await this.getOwned(userId, id);
    if (
      current.status !== ProductStatus.DRAFT &&
      current.status !== ProductStatus.REJECTED
    )
      throw new BadRequestException(
        "Only draft or rejected products can be edited",
      );
    const { images, specifications, ...data } = input;
    return this.database.transaction(async (tx: any) => {
      if (images) {
        await tx.productImage.deleteMany({ where: { productId: id } });
        await tx.productImage.createMany({
          data: images.map((url: any, sortOrder: any) => ({
            productId: id,
            url,
            sortOrder,
          })),
        });
      }
      return tx.product.update({
        where: { id },
        data: {
          ...data,
          specifications: specifications,
          rejectionReason: null,
        },
        include: { images: true, inventory: true },
      });
    });
  }

  async submit(userId: string, id: string) {
    const product = await this.getOwned(userId, id);
    if (
      product.status !== ProductStatus.DRAFT &&
      product.status !== ProductStatus.REJECTED
    )
      throw new BadRequestException(
        "Product cannot be submitted in its current state",
      );
    return this.database.product.update({
      where: { id },
      data: { status: ProductStatus.PENDING_APPROVAL, rejectionReason: null },
    });
  }
  async archive(userId: string, id: string) {
    await this.getOwned(userId, id);
    return this.database.product.update({
      where: { id },
      data: { status: ProductStatus.ARCHIVED },
    });
  }

  private toPublic(
    product: PublicProduct,
    productRating = { rating: 0, reviewCount: 0 },
    vendorRating = 0,
  ) {
    const available = Math.max(
      0,
      (product.inventory?.quantity ?? 0) - (product.inventory?.reserved ?? 0),
    );
    return {
      id: product.id,
      slug: product.slug,
      name: product.name,
      categoryId: product.categoryId,
      categoryName: product.category.name,
      productType: product.productType,
      vendor: {
        id: product.vendor.id,
        name: product.vendor.businessName,
        location: product.vendor.pickupPincode ?? "",
        rating: vendorRating,
        productCount: product.vendor._count.products,
      },
      price: { amount: product.price, currency: "INR" },
      mrp: product.mrp
        ? { amount: product.mrp, currency: "INR" }
        : undefined,
      gstInclusive: true,
      weight: `${product.weightGrams} g`,
      dimensions:
        product.lengthCm || product.widthCm || product.heightCm
          ? {
              lengthCm: product.lengthCm,
              widthCm: product.widthCm,
              heightCm: product.heightCm,
            }
          : undefined,
      description: product.description,
      ingredients: product.ingredients
        ?.split(",")
        .map((value: any) => value.trim())
        .filter(Boolean),
      specifications: product.specifications ?? {},
      images: product.images.map((image: any) => image.url),
      stockStatus:
        available === 0
          ? "OUT_OF_STOCK"
          : available <= (product.inventory?.lowStockThreshold ?? 5)
            ? "LOW_STOCK"
            : "IN_STOCK",
      availableQuantity: available,
      rating: productRating.rating,
      reviewCount: productRating.reviewCount,
      featured: false,
      bestSeller: false,
    };
  }

  private async ratingMaps(products: PublicProduct[]) {
    const productIds = products.map((product: any) => product.id);
    const vendorIds = [...new Set(products.map((product: any) => product.vendorId))];
    if (!productIds.length) {
      return {
        products: new Map<string, { rating: number; reviewCount: number }>(),
        vendors: new Map<string, number>(),
      };
    }

    const [productRatings, vendorReviews] = await Promise.all([
      this.database.review.groupBy({
        by: ["productId"],
        where: {
          productId: { in: productIds },
          status: ReviewStatus.PUBLISHED,
        },
        _avg: { rating: true },
        _count: { rating: true },
      }),
      this.database.review.findMany({
        where: {
          status: ReviewStatus.PUBLISHED,
          product: {
            vendorId: { in: vendorIds },
            status: ProductStatus.APPROVED,
          },
        },
        select: {
          rating: true,
          product: { select: { vendorId: true } },
        },
      }),
    ]);

    const productMap = new Map(
      productRatings.map((entry: any) => [
        entry.productId,
        {
          rating: entry._avg.rating ?? 0,
          reviewCount: entry._count.rating,
        },
      ]),
    );
    const vendorTotals = new Map<string, { total: number; count: number }>();
    vendorReviews.forEach((review: any) => {
      const current = vendorTotals.get(review.product.vendorId) ?? {
        total: 0,
        count: 0,
      };
      current.total += review.rating;
      current.count += 1;
      vendorTotals.set(review.product.vendorId, current);
    });
    const vendorMap = new Map(
      [...vendorTotals].map(([vendorId, summary]) => [
        vendorId,
        summary.count ? summary.total / summary.count : 0,
      ]),
    );
    return { products: productMap, vendors: vendorMap };
  }
}
