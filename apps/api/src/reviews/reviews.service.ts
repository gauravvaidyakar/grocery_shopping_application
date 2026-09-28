import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { OrderStatus, ReviewStatus } from "@prisma/client";
import { PrismaService } from "../database/prisma.service";
import type { CreateReviewDto, UpdateReviewDto } from "./reviews.dto";
import { ComplaintCategory } from "@prisma/client";
import { ConfigService } from "@nestjs/config";
import { randomUUID } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { extname, resolve, sep } from "node:path";

const REVIEW_IMAGE_TYPES = new Map([['image/jpeg', new Set(['.jpg', '.jpeg'])], ['image/png', new Set(['.png'])], ['image/webp', new Set(['.webp'])]]);
@Injectable()
export class ReviewsService {
  constructor(private readonly prisma: PrismaService, private readonly config: ConfigService) {}
  async create(userId: string, productId: string, input: CreateReviewDto, files: Express.Multer.File[] = []) {
    const item = await this.prisma.orderItem.findFirst({
      where: {
        id: input.orderItemId,
        productId,
        vendorOrder: { masterOrder: { customer: { userId } } },
      },
      include: {
        vendorOrder: {
          include: { masterOrder: { include: { customer: true } } },
        },
      },
    });
    if (!item) throw new NotFoundException("Purchased order item not found");
    if (item.status !== OrderStatus.DELIVERED)
      throw new BadRequestException("Only delivered products can be reviewed");
    const images = [...(input.imageUrls ?? []), ...(await this.storeImages(files))].slice(0, 3);
    const review = await this.prisma.review.create({
      data: {
        customerId: item.vendorOrder.masterOrder.customer.id,
        productId,
        orderItemId: item.id,
        rating: input.rating,
        comment: input.comment,
        images,
        status: ReviewStatus.PENDING,
      },
    });
    return this.present(review);
  }
  async public(productId: string) {
    const reviews = await this.prisma.review.findMany({
      where: { productId, status: ReviewStatus.PUBLISHED },
      select: {
        id: true,
        rating: true,
        comment: true,
        images: true,
        createdAt: true,
        customer: { select: { firstName: true } },
      },
      orderBy: { createdAt: "desc" },
    });
    return reviews.map((review) => ({
      id: review.id,
      rating: review.rating,
      comment: review.comment,
      images: Array.isArray(review.images) ? review.images.filter((image): image is string => typeof image === "string") : [],
      customerName: review.customer.firstName,
      submittedAt: review.createdAt.toISOString(),
    }));
  }

  async update(userId: string, id: string, input: UpdateReviewDto, files: Express.Multer.File[] = []) {
    const review = await this.prisma.review.findFirst({ where: { id, customer: { userId } } });
    if (!review) throw new NotFoundException("Review not found");
    const uploaded = await this.storeImages(files);
    const images = uploaded.length ? [...(input.imageUrls ?? []), ...uploaded].slice(0, 3) : (input.imageUrls ?? (Array.isArray(review.images) ? review.images : []));
    const updated = await this.prisma.review.update({
      where: { id },
      data: { rating: input.rating, comment: input.comment, images, status: ReviewStatus.PENDING },
    });
    return this.present(updated);
  }

  async report(userId: string, id: string, reason?: string) {
    const [review, reporter] = await Promise.all([
      this.prisma.review.findUnique({ where: { id }, include: { product: { select: { name: true, vendorId: true } } } }),
      this.prisma.customerProfile.findUnique({ where: { userId } }),
    ]);
    if (!review || review.status !== ReviewStatus.PUBLISHED) throw new NotFoundException("Published review not found");
    if (!reporter) throw new NotFoundException("Customer not found");
    if (review.customerId === reporter.id) throw new ForbiddenException("You cannot report your own review");
    const existing = await this.prisma.complaint.findFirst({
      where: { customerId: reporter.id, subject: `Reported review ${review.id}`, status: { not: "CLOSED" } },
    });
    if (existing) return { reported: true, referenceNumber: existing.referenceNumber };
    const complaint = await this.prisma.complaint.create({
      data: {
        referenceNumber: `CMP-${Date.now()}-REVIEW`,
        customerId: reporter.id,
        vendorId: review.product.vendorId,
        category: ComplaintCategory.PRODUCT,
        subject: `Reported review ${review.id}`,
        description: reason?.trim() || `Review reported on ${review.product.name}`,
        messages: { create: { authorId: userId, authorRole: "CUSTOMER", message: reason?.trim() || "This review may violate marketplace standards." } },
      },
    });
    return { reported: true, referenceNumber: complaint.referenceNumber };
  }

  async readImage(filename: string): Promise<{ bytes: Buffer; mimeType: string }> {
    if (!/^[0-9a-f-]+\.(?:jpe?g|png|webp)$/i.test(filename)) throw new NotFoundException("Review image not found");
    const extension = extname(filename).toLowerCase();
    const mimeType = extension === '.png' ? 'image/png' : extension === '.webp' ? 'image/webp' : 'image/jpeg';
    try { return { bytes: await readFile(this.reviewImagePath(filename)), mimeType }; }
    catch { throw new NotFoundException("Review image not found"); }
  }

  private async storeImages(files: Express.Multer.File[]): Promise<string[]> {
    if (!files.length) return [];
    const maxBytes = Number(this.config.get<string>('MAX_UPLOAD_BYTES', '5242880'));
    const root = resolve(this.config.get<string>('PUBLIC_UPLOAD_DIR', './public-uploads'));
    const directory = resolve(root, 'reviews');
    await mkdir(directory, { recursive: true });
    const urls: string[] = [];
    for (const file of files) {
      const extension = extname(file.originalname).toLowerCase();
      if (!REVIEW_IMAGE_TYPES.get(file.mimetype)?.has(extension)) throw new BadRequestException('Review images must be matching JPG, JPEG, PNG or WEBP files');
      if (file.size > maxBytes) throw new BadRequestException(`Review image must not exceed ${maxBytes} bytes`);
      const filename = `${randomUUID()}${extension}`;
      const target = this.reviewImagePath(filename);
      if (!target.startsWith(`${directory}${sep}`)) throw new BadRequestException('Invalid review image path');
      await writeFile(target, file.buffer, { flag: 'wx' });
      urls.push(`/api/v1/review-images/${filename}`);
    }
    return urls;
  }

  private reviewImagePath(filename: string): string {
    const root = resolve(this.config.get<string>('PUBLIC_UPLOAD_DIR', './public-uploads'));
    return resolve(root, 'reviews', filename);
  }

  adminList() {
    return this.prisma.review.findMany({
      include: { customer: true, product: true, orderItem: true },
      orderBy: { createdAt: "desc" },
    });
  }

  vendorList(userId: string) {
    return this.prisma.review.findMany({
      where: { product: { vendor: { userId } } },
      select: {
        id: true, rating: true, comment: true, status: true, createdAt: true,
        product: { select: { id: true, name: true } },
        customer: { select: { firstName: true } },
      },
      orderBy: { createdAt: "desc" },
    });
  }

  moderate(id: string, status: ReviewStatus) {
    if (status === ReviewStatus.PENDING) {
      throw new BadRequestException(
        "Moderation must publish or reject a review",
      );
    }
    return this.prisma.review.update({ where: { id }, data: { status } });
  }

  private present(review: {
    id: string;
    productId: string;
    orderItemId: string;
    rating: number;
    comment: string;
    status: ReviewStatus;
    images?: unknown;
    createdAt: Date;
  }) {
    return {
      id: review.id,
      productId: review.productId,
      orderItemId: review.orderItemId,
      rating: review.rating,
      comment: review.comment,
      images: Array.isArray(review.images) ? review.images.filter((image): image is string => typeof image === "string") : [],
      status: review.status,
      submittedAt: review.createdAt.toISOString(),
    };
  }
}
