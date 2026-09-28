import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { createHash } from "node:crypto";
import { readFile, unlink } from "node:fs/promises";
import { extname, resolve, sep } from "node:path";
import sharp from "sharp";

const ALLOWED_IMAGE_EXTENSIONS = new Map<string, ReadonlySet<string>>([
  ["image/jpeg", new Set([".jpg", ".jpeg"])],
  ["image/png", new Set([".png"])],
  ["image/webp", new Set([".webp"])],
]);

export interface OptimizedCategoryImage {
  bytes: Buffer;
  mimeType: "image/webp";
  digest: string;
}

@Injectable()
export class CategoryImageStorageService {
  constructor(private readonly config: ConfigService) {}

  async optimize(file?: Express.Multer.File): Promise<OptimizedCategoryImage> {
    if (!file) throw new BadRequestException("Category image is required");
    const extension = extname(file.originalname).toLowerCase();
    if (!ALLOWED_IMAGE_EXTENSIONS.get(file.mimetype)?.has(extension)) {
      throw new BadRequestException(
        "Only matching JPG, JPEG, PNG or WEBP images are accepted",
      );
    }
    const maxBytes = Number(
      this.config.get<string>("MAX_UPLOAD_BYTES", "5242880"),
    );
    if (!Number.isFinite(maxBytes) || maxBytes <= 0 || file.size > maxBytes) {
      throw new BadRequestException(
        `Category image must not exceed ${Number.isFinite(maxBytes) ? maxBytes : 5_242_880} bytes`,
      );
    }

    return this.optimizeBytes(file.buffer);
  }

  async optimizeBytes(buffer: Buffer): Promise<OptimizedCategoryImage> {
    try {
      const bytes = await sharp(buffer, { failOn: "error" })
        .rotate()
        .resize({
          width: 800,
          height: 600,
          fit: "cover",
          position: "attention",
          withoutEnlargement: true,
        })
        .webp({ quality: 78, effort: 4 })
        .toBuffer();
      return {
        bytes,
        mimeType: "image/webp",
        digest: createHash("sha256").update(bytes).digest("hex").slice(0, 16),
      };
    } catch {
      throw new BadRequestException("The uploaded file is not a valid image");
    }
  }

  publicUrl(categoryId: string, digest: string): string {
    return `/api/v1/category-images/${categoryId}-${digest}.webp`;
  }

  categoryIdFromPersistentFilename(filename: string): string | null {
    const match = filename.match(
      /^([0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12})-[0-9a-f]{16}\.webp$/i,
    );
    return match?.[1] ?? null;
  }

  async readLegacy(filename: string): Promise<{ bytes: Buffer; mimeType: string }> {
    if (!/^[0-9a-f-]+\.(?:jpe?g|png|webp)$/i.test(filename)) {
      throw new NotFoundException("Category image not found");
    }
    const extension = extname(filename).toLowerCase();
    const mimeType =
      extension === ".png"
        ? "image/png"
        : extension === ".webp"
          ? "image/webp"
          : "image/jpeg";
    try {
      return {
        bytes: await readFile(this.absolute(`categories/${filename}`)),
        mimeType,
      };
    } catch {
      throw new NotFoundException("Category image not found");
    }
  }

  async removeLegacyUrl(url?: string | null): Promise<void> {
    const filename = url?.match(/\/category-images\/([^/?#]+)$/)?.[1];
    if (!filename || this.categoryIdFromPersistentFilename(filename)) return;
    try {
      await unlink(this.absolute(`categories/${filename}`));
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
    }
  }

  private root(): string {
    return resolve(
      this.config.get<string>("PUBLIC_UPLOAD_DIR", "./public-uploads"),
    );
  }

  private absolute(key: string): string {
    const root = this.root();
    const absolute = resolve(root, key);
    if (!absolute.startsWith(`${root}${sep}`)) {
      throw new BadRequestException("Invalid category image path");
    }
    return absolute;
  }
}
