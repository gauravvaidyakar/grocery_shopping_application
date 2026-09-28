import { BadRequestException, Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { createHash } from "node:crypto";
import { extname } from "node:path";
import sharp from "sharp";

const ALLOWED_IMAGE_EXTENSIONS = new Map<string, ReadonlySet<string>>([
  ["image/jpeg", new Set([".jpg", ".jpeg"])],
  ["image/png", new Set([".png"])],
  ["image/webp", new Set([".webp"])],
]);

@Injectable()
export class HomeHeroImageService {
  constructor(private readonly config: ConfigService) {}

  async optimize(file?: Express.Multer.File) {
    if (!file) throw new BadRequestException("Hero image is required");
    const extension = extname(file.originalname).toLowerCase();
    if (!ALLOWED_IMAGE_EXTENSIONS.get(file.mimetype)?.has(extension)) {
      throw new BadRequestException(
        "Only matching JPG, JPEG, PNG or WEBP images are accepted",
      );
    }
    const maxBytes = Number(this.config.get<string>("MAX_UPLOAD_BYTES", "5242880"));
    if (!Number.isFinite(maxBytes) || maxBytes <= 0 || file.size > maxBytes) {
      throw new BadRequestException(
        `Hero image must not exceed ${Number.isFinite(maxBytes) ? maxBytes : 5_242_880} bytes`,
      );
    }

    try {
      const bytes = await sharp(file.buffer, { failOn: "error" })
        .rotate()
        .resize({
          width: 1600,
          height: 900,
          fit: "cover",
          position: "attention",
          withoutEnlargement: true,
        })
        .webp({ quality: 80, effort: 4 })
        .toBuffer();
      return {
        bytes,
        mimeType: "image/webp" as const,
        digest: createHash("sha256").update(bytes).digest("hex").slice(0, 16),
      };
    } catch {
      throw new BadRequestException("The uploaded file is not a valid image");
    }
  }

  publicUrl(slideId: string, digest: string) {
    return `/api/v1/home-hero-images/${slideId}-${digest}.webp`;
  }

  slideIdFromFilename(filename: string): string | null {
    const match = filename.match(
      /^([0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12})-[0-9a-f]{16}\.webp$/i,
    );
    return match?.[1] ?? null;
  }
}
