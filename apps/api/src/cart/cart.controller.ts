import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  UseGuards,
} from "@nestjs/common";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";
import { Role } from "@prisma/client";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { CurrentUser } from "../common/current-user.decorator";
import type { RequestUser } from "../common/request-user";
import { Roles } from "../common/roles.decorator";
import { RolesGuard } from "../common/roles.guard";
import { AddCartItemDto, UpdateCartItemDto } from "./cart.dto";
import { CartService } from "./cart.service";
@ApiTags("Cart")
@ApiBearerAuth()
@Controller("cart")
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.CUSTOMER)
export class CartController {
  constructor(private readonly cart: CartService) {}
  @Get() get(@CurrentUser() u: RequestUser) {
    return this.cart.get(u.id);
  }
  @Post("items") add(@CurrentUser() u: RequestUser, @Body() b: AddCartItemDto) {
    return this.cart.add(u.id, b.productId, b.quantity);
  }
  @Patch("items/:id") update(
    @CurrentUser() u: RequestUser,
    @Param("id", ParseUUIDPipe) i: string,
    @Body() b: UpdateCartItemDto,
  ) {
    return this.cart.update(u.id, i, b.quantity);
  }
  @Delete("items/:id") remove(
    @CurrentUser() u: RequestUser,
    @Param("id", ParseUUIDPipe) i: string,
  ) {
    return this.cart.remove(u.id, i);
  }
  @Delete() @HttpCode(204) clear(@CurrentUser() u: RequestUser) {
    return this.cart.clear(u.id);
  }
}
