import { BadRequestException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import sharp from "sharp";
import { describe, expect, it } from "vitest";
import { HomeHeroImageService } from "../src/home-hero/home-hero-image.service";

function service(maxBytes = "5242880") {
  const config = {
    get: (key: string, fallback: string) =>
      key === "MAX_UPLOAD_BYTES" ? maxBytes : fallback,
  } as ConfigService;
  return new HomeHeroImageService(config);
}

function imageFile(name: string, type: string, buffer: Buffer): Express.Multer.File {
  return {
    fieldname: "file",
    originalname: name,
    encoding: "7bit",
    mimetype: type,
    size: buffer.length,
    buffer,
    destination: "",
    filename: "",
    path: "",
    stream: null as never,
  };
}

describe("homepage hero image optimization", () => {
  it("creates a content-hashed, landscape WebP asset", async () => {
    const original = await sharp({
      create: { width: 2000, height: 1300, channels: 3, background: "#155631" },
    }).png().toBuffer();
    const optimized = await service().optimize(imageFile("hero.png", "image/png", original));
    const metadata = await sharp(optimized.bytes).metadata();
    const id = "5f2315c1-75c1-4b49-91b8-8aea56753f27";
    const url = service().publicUrl(id, optimized.digest);

    expect(metadata.format).toBe("webp");
    expect(metadata.width).toBeLessThanOrEqual(1600);
    expect(metadata.height).toBeLessThanOrEqual(900);
    expect(url).toMatch(/^\/api\/v1\/home-hero-images\/[0-9a-f-]{36}-[0-9a-f]{16}\.webp$/);
    expect(service().slideIdFromFilename(url.split("/").at(-1)!)).toBe(id);
  });

  it("rejects invalid image contents", async () => {
    await expect(service().optimize(imageFile("hero.png", "image/png", Buffer.from("invalid"))))
      .rejects.toThrow(BadRequestException);
  });

  it("rejects files over the configured upload limit", async () => {
    await expect(service("4").optimize(imageFile("hero.jpg", "image/jpeg", Buffer.alloc(5))))
      .rejects.toThrow("must not exceed 4 bytes");
  });
});
