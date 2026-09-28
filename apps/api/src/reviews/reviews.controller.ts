import {
  Body,
  Controller,
  Get,
  Header,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  StreamableFile,
  UploadedFiles,
  UseGuards,
  UseInterceptors,
} from "@nestjs/common";
import { FilesInterceptor } from "@nestjs/platform-express";
import { ApiBearerAuth, ApiConsumes, ApiTags } from "@nestjs/swagger";
import { Role } from "@prisma/client";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { CurrentUser } from "../common/current-user.decorator";
import type { RequestUser } from "../common/request-user";
import { Roles } from "../common/roles.decorator";
import { RolesGuard } from "../common/roles.guard";
import { CreateReviewDto, ModerateReviewDto, ReportReviewDto, UpdateReviewDto } from "./reviews.dto";
import { ReviewsService } from "./reviews.service";
@ApiTags("Reviews")
@Controller()
export class ReviewsController {
  constructor(private readonly reviews: ReviewsService) {}
  @Get("products/:productId/reviews") list(
    @Param("productId", ParseUUIDPipe) i: string,
  ) {
    return this.reviews.public(i);
  }
  @Get("review-images/:filename")
  @Header("Cross-Origin-Resource-Policy", "cross-origin")
  @Header("Cache-Control", "public, max-age=86400")
  async image(@Param("filename") filename: string) {
    const image = await this.reviews.readImage(filename);
    return new StreamableFile(image.bytes, { type: image.mimeType, disposition: "inline" });
  }
  @Post("products/:productId/reviews")
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.CUSTOMER)
  @ApiConsumes("multipart/form-data")
  @UseInterceptors(FilesInterceptor("images", 3, { limits: { fileSize: 5_242_880, files: 3 } }))
  create(
    @CurrentUser() u: RequestUser,
    @Param("productId", ParseUUIDPipe) i: string,
    @Body() b: CreateReviewDto,
    @UploadedFiles() files: Express.Multer.File[] = [],
  ) {
    return this.reviews.create(u.id, i, b, files);
  }

  @Patch("reviews/:id")
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.CUSTOMER)
  @ApiConsumes("multipart/form-data")
  @UseInterceptors(FilesInterceptor("images", 3, { limits: { fileSize: 5_242_880, files: 3 } }))
  update(@CurrentUser() user: RequestUser, @Param("id", ParseUUIDPipe) id: string, @Body() input: UpdateReviewDto, @UploadedFiles() files: Express.Multer.File[] = []) {
    return this.reviews.update(user.id, id, input, files);
  }

  @Post("reviews/:id/report")
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.CUSTOMER)
  report(@CurrentUser() user: RequestUser, @Param("id", ParseUUIDPipe) id: string, @Body() input: ReportReviewDto) {
    return this.reviews.report(user.id, id, input.reason);
  }

  @Get("admin/reviews")
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  adminList() {
    return this.reviews.adminList();
  }
  @Get("vendor/reviews")
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.VENDOR)
  vendorList(@CurrentUser() user: RequestUser) {
    return this.reviews.vendorList(user.id);
  }

  @Post("admin/reviews/:id/moderate")
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  moderate(
    @Param("id", ParseUUIDPipe) id: string,
    @Body() input: ModerateReviewDto,
  ) {
    return this.reviews.moderate(id, input.status);
  }
}
