import { Injectable, NotFoundException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { PrismaService } from "../database/prisma.service";
import type {
  CreateHomeHeroSlideDto,
  UpdateHomeHeroSlideDto,
} from "./home-hero.dto";
import { HomeHeroImageService } from "./home-hero-image.service";

const responseSelect = {
  id: true,
  eyebrow: true,
  title: true,
  description: true,
  ctaLabel: true,
  ctaHref: true,
  imageUrl: true,
  imageAlt: true,
  isActive: true,
  sortOrder: true,
  createdAt: true,
  updatedAt: true,
} satisfies Prisma.HomeHeroSlideSelect;

@Injectable()
export class HomeHeroService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly images: HomeHeroImageService,
  ) {}

  listPublic() {
    return this.prisma.homeHeroSlide.findMany({
      where: { isActive: true, imageUrl: { not: null } },
      orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
      select: responseSelect,
    });
  }

  adminList() {
    return this.prisma.homeHeroSlide.findMany({
      orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
      select: responseSelect,
    });
  }

  create(input: CreateHomeHeroSlideDto) {
    return this.prisma.homeHeroSlide.create({ data: input, select: responseSelect });
  }

  async update(id: string, input: UpdateHomeHeroSlideDto) {
    await this.requireSlide(id);
    return this.prisma.homeHeroSlide.update({
      where: { id },
      data: input,
      select: responseSelect,
    });
  }

  async remove(id: string) {
    await this.requireSlide(id);
    return this.prisma.homeHeroSlide.delete({ where: { id }, select: responseSelect });
  }

  async uploadImage(id: string, file?: Express.Multer.File) {
    await this.requireSlide(id);
    const optimized = await this.images.optimize(file);
    return this.prisma.homeHeroSlide.update({
      where: { id },
      data: {
        imageUrl: this.images.publicUrl(id, optimized.digest),
        imageData: optimized.bytes,
        imageMimeType: optimized.mimeType,
      },
      select: responseSelect,
    });
  }

  async removeImage(id: string) {
    await this.requireSlide(id);
    return this.prisma.homeHeroSlide.update({
      where: { id },
      data: { imageUrl: null, imageData: null, imageMimeType: null },
      select: responseSelect,
    });
  }

  async readImage(filename: string) {
    const id = this.images.slideIdFromFilename(filename);
    if (!id) throw new NotFoundException("Hero image not found");
    const slide = await this.prisma.homeHeroSlide.findUnique({
      where: { id },
      select: { imageUrl: true, imageData: true, imageMimeType: true },
    });
    if (
      !slide?.imageData ||
      !slide.imageMimeType ||
      slide.imageUrl !== `/api/v1/home-hero-images/${filename}`
    ) {
      throw new NotFoundException("Hero image not found");
    }
    return { bytes: Buffer.from(slide.imageData), mimeType: slide.imageMimeType };
  }

  private async requireSlide(id: string) {
    const slide = await this.prisma.homeHeroSlide.findUnique({
      where: { id },
      select: { id: true },
    });
    if (!slide) throw new NotFoundException("Homepage hero slide not found");
    return slide;
  }
}
