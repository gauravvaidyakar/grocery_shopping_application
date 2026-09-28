import {
  Body,
  Controller,
  Delete,
  Get,
  Header,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  StreamableFile,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from "@nestjs/common";
import { FileInterceptor } from "@nestjs/platform-express";
import { ApiBearerAuth, ApiConsumes, ApiTags } from "@nestjs/swagger";
import { Role } from "@prisma/client";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { Roles } from "../common/roles.decorator";
import { RolesGuard } from "../common/roles.guard";
import { CategoriesService } from "./categories.service";
import { CreateCategoryDto, UpdateCategoryDto } from "./categories.dto";

@ApiTags("Categories")
@Controller()
export class CategoriesController {
  constructor(private readonly categories: CategoriesService) {}
  @Get("categories")
  @Header("Cache-Control", "public, max-age=300, stale-while-revalidate=3600")
  @Header("CDN-Cache-Control", "public, s-maxage=600, stale-while-revalidate=86400")
  @Header("Vercel-CDN-Cache-Control", "public, s-maxage=600, stale-while-revalidate=86400")
  list() {
    return this.categories.list();
  }
  @Get("categories/:id")
  @Header("Cache-Control", "public, max-age=300, stale-while-revalidate=3600")
  @Header("CDN-Cache-Control", "public, s-maxage=600, stale-while-revalidate=86400")
  @Header("Vercel-CDN-Cache-Control", "public, s-maxage=600, stale-while-revalidate=86400")
  get(@Param("id") id: string) {
    return this.categories.get(id);
  }
  @Get("category-images/:filename")
  @Header("Cross-Origin-Resource-Policy", "cross-origin")
  @Header("Cache-Control", "public, max-age=86400, immutable")
  @Header("CDN-Cache-Control", "public, s-maxage=31536000, immutable")
  @Header("Vercel-CDN-Cache-Control", "public, s-maxage=31536000, immutable")
  async image(@Param("filename") filename: string) {
    const image = await this.categories.readImage(filename);
    return new StreamableFile(image.bytes, {
      type: image.mimeType,
      disposition: "inline",
    });
  }
  @Get("admin/categories")
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  adminList() {
    return this.categories.adminList();
  }
  @Post("admin/categories")
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  create(@Body() input: CreateCategoryDto) {
    return this.categories.create(input);
  }
  @Patch("admin/categories/:id")
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  update(
    @Param("id", ParseUUIDPipe) id: string,
    @Body() input: UpdateCategoryDto,
  ) {
    return this.categories.update(id, input);
  }
  @Post("admin/categories/:id/image")
  @ApiBearerAuth()
  @ApiConsumes("multipart/form-data")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @UseInterceptors(
    FileInterceptor("file", {
      limits: { fileSize: 5_242_880, files: 1, fields: 0 },
    }),
  )
  uploadImage(
    @Param("id", ParseUUIDPipe) id: string,
    @UploadedFile() file?: Express.Multer.File,
  ) {
    return this.categories.uploadImage(id, file);
  }
  @Delete("admin/categories/:id/image")
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  removeImage(@Param("id", ParseUUIDPipe) id: string) {
    return this.categories.removeImage(id);
  }
}
