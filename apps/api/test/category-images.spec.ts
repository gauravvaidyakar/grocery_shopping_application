import { BadRequestException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import sharp from "sharp";
import { describe, expect, it } from "vitest";
import { CategoryImageStorageService } from "../src/categories/category-image-storage.service";

function storage(maxBytes = "5242880") {
  const config = {
    get: (key: string, fallback: string) =>
      key === "MAX_UPLOAD_BYTES" ? maxBytes : fallback,
  } as ConfigService;
  return new CategoryImageStorageService(config);
}

function imageFile(
  originalname: string,
  mimetype: string,
  bytes: Buffer,
): Express.Multer.File {
  return {
    fieldname: "file",
    originalname,
    encoding: "7bit",
    mimetype,
    size: bytes.length,
    buffer: bytes,
    destination: "",
    filename: "",
    path: "",
    stream: null as never,
  };
}

async function png(width = 1200, height = 900): Promise<Buffer> {
  return sharp({
    create: {
      width,
      height,
      channels: 3,
      background: { r: 35, g: 110, b: 62 },
    },
  })
    .png()
    .toBuffer();
}

describe("category image optimization", () => {
  it("converts uploads to a bounded, cacheable WebP asset", async () => {
    const service = storage();
    const original = await png();
    const optimized = await service.optimize(
      imageFile("millets.png", "image/png", original),
    );
    const metadata = await sharp(optimized.bytes).metadata();
    const categoryId = "5f2315c1-75c1-4b49-91b8-8aea56753f27";
    const url = service.publicUrl(categoryId, optimized.digest);

    expect(metadata.format).toBe("webp");
    expect(metadata.width).toBeLessThanOrEqual(800);
    expect(metadata.height).toBeLessThanOrEqual(600);
    expect(optimized.bytes.length).toBeLessThan(original.length);
    expect(url).toMatch(
      /^\/api\/v1\/category-images\/[0-9a-f-]{36}-[0-9a-f]{16}\.webp$/,
    );
    expect(
      service.categoryIdFromPersistentFilename(url.split("/").at(-1)!),
    ).toBe(categoryId);
  });

  it("optimizes a trusted legacy image without multipart metadata", async () => {
    const service = storage();
    const optimized = await service.optimizeBytes(await png(640, 480));
    const metadata = await sharp(optimized.bytes).metadata();
    expect(metadata.format).toBe("webp");
    expect(metadata.width).toBe(640);
    expect(metadata.height).toBe(480);
  });

  it("rejects a MIME type and extension mismatch", async () => {
    const service = storage();
    await expect(
      service.optimize(imageFile("not-an-image.pdf", "image/png", await png())),
    ).rejects.toThrow(BadRequestException);
  });

  it("rejects malformed image content", async () => {
    const service = storage();
    await expect(
      service.optimize(imageFile("fake.png", "image/png", Buffer.from("not an image"))),
    ).rejects.toThrow("not a valid image");
  });

  it("rejects an oversized image", async () => {
    const service = storage("4");
    await expect(
      service.optimize(imageFile("large.jpg", "image/jpeg", Buffer.alloc(5))),
    ).rejects.toThrow("must not exceed 4 bytes");
  });
});
