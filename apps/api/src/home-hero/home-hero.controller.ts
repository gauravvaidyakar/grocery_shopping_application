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
import { CreateHomeHeroSlideDto, UpdateHomeHeroSlideDto } from "./home-hero.dto";
import { HomeHeroService } from "./home-hero.service";

@ApiTags("Homepage hero")
@Controller()
export class HomeHeroController {
  constructor(private readonly hero: HomeHeroService) {}

  @Get("home-hero-slides")
  @Header("Cache-Control", "public, max-age=30, stale-while-revalidate=300")
  listPublic() {
    return this.hero.listPublic();
  }

  @Get("home-hero-images/:filename")
  @Header("Cross-Origin-Resource-Policy", "cross-origin")
  @Header("Cache-Control", "public, max-age=86400, immutable")
  @Header("CDN-Cache-Control", "public, s-maxage=31536000, immutable")
  async image(@Param("filename") filename: string) {
    const image = await this.hero.readImage(filename);
    return new StreamableFile(image.bytes, { type: image.mimeType, disposition: "inline" });
  }

  @Get("admin/home-hero-slides")
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  adminList() {
    return this.hero.adminList();
  }

  @Post("admin/home-hero-slides")
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  create(@Body() input: CreateHomeHeroSlideDto) {
    return this.hero.create(input);
  }

  @Patch("admin/home-hero-slides/:id")
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  update(
    @Param("id", ParseUUIDPipe) id: string,
    @Body() input: UpdateHomeHeroSlideDto,
  ) {
    return this.hero.update(id, input);
  }

  @Delete("admin/home-hero-slides/:id")
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  remove(@Param("id", ParseUUIDPipe) id: string) {
    return this.hero.remove(id);
  }

  @Post("admin/home-hero-slides/:id/image")
  @ApiBearerAuth()
  @ApiConsumes("multipart/form-data")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @UseInterceptors(FileInterceptor("file", { limits: { fileSize: 5_242_880, files: 1, fields: 0 } }))
  uploadImage(
    @Param("id", ParseUUIDPipe) id: string,
    @UploadedFile() file?: Express.Multer.File,
  ) {
    return this.hero.uploadImage(id, file);
  }

  @Delete("admin/home-hero-slides/:id/image")
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  removeImage(@Param("id", ParseUUIDPipe) id: string) {
    return this.hero.removeImage(id);
  }
}
