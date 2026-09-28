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
  Query,
  UseGuards,
} from "@nestjs/common";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";
import { Role } from "@prisma/client";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { CurrentUser } from "../common/current-user.decorator";
import type { RequestUser } from "../common/request-user";
import { Roles } from "../common/roles.decorator";
import { RolesGuard } from "../common/roles.guard";
import {
  CreateProductDto,
  ProductQueryDto,
  UpdateProductDto,
} from "./products.dto";
import { ProductsService } from "./products.service";

@ApiTags("Products")
@Controller()
export class ProductsController {
  constructor(private readonly products: ProductsService) {}
  @Get("products")
  @Header("Cache-Control", "public, max-age=60, stale-while-revalidate=300")
  @Header("CDN-Cache-Control", "public, s-maxage=300, stale-while-revalidate=86400")
  @Header("Vercel-CDN-Cache-Control", "public, s-maxage=300, stale-while-revalidate=86400")
  list(@Query() query: ProductQueryDto) {
    return this.products.publicList(query);
  }
  @Get("products/:id")
  @Header("Cache-Control", "public, max-age=60, stale-while-revalidate=300")
  @Header("CDN-Cache-Control", "public, s-maxage=300, stale-while-revalidate=86400")
  @Header("Vercel-CDN-Cache-Control", "public, s-maxage=300, stale-while-revalidate=86400")
  get(@Param("id") id: string) {
    return this.products.publicGet(id);
  }
  @Get("vendor/products")
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.VENDOR)
  vendorList(
    @CurrentUser() user: RequestUser,
    @Query() query: ProductQueryDto,
  ) {
    return this.products.vendorList(user.id, query);
  }
  @Post("vendor/products")
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.VENDOR)
  create(@CurrentUser() user: RequestUser, @Body() input: CreateProductDto) {
    return this.products.create(user.id, input);
  }
  @Get("vendor/products/:id")
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.VENDOR)
  owned(
    @CurrentUser() user: RequestUser,
    @Param("id", ParseUUIDPipe) id: string,
  ) {
    return this.products.getOwned(user.id, id);
  }
  @Patch("vendor/products/:id")
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.VENDOR)
  update(
    @CurrentUser() user: RequestUser,
    @Param("id", ParseUUIDPipe) id: string,
    @Body() input: UpdateProductDto,
  ) {
    return this.products.update(user.id, id, input);
  }
  @Post("vendor/products/:id/submit")
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.VENDOR)
  submit(
    @CurrentUser() user: RequestUser,
    @Param("id", ParseUUIDPipe) id: string,
  ) {
    return this.products.submit(user.id, id);
  }
  @Delete("vendor/products/:id")
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.VENDOR)
  archive(
    @CurrentUser() user: RequestUser,
    @Param("id", ParseUUIDPipe) id: string,
  ) {
    return this.products.archive(user.id, id);
  }
}
