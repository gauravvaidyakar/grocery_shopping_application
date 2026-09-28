import {
  Body,
  Controller,
  Get,
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
import {
  CancelItemDto,
  CreateOrderDto,
  UpdateOrderStatusDto,
} from "./orders.dto";
import { OrdersService } from "./orders.service";
@ApiTags("Orders")
@ApiBearerAuth()
@Controller()
@UseGuards(JwtAuthGuard, RolesGuard)
export class OrdersController {
  constructor(private readonly orders: OrdersService) {}
  @Post("orders") @Roles(Role.CUSTOMER) create(
    @CurrentUser() user: RequestUser,
    @Body() input: CreateOrderDto,
  ) {
    return this.orders.create(user.id, input);
  }
  @Get("orders") @Roles(Role.CUSTOMER) list(@CurrentUser() u: RequestUser) {
    return this.orders.customerList(u.id);
  }
  @Get("orders/:id") @Roles(Role.CUSTOMER) get(
    @CurrentUser() u: RequestUser,
    @Param("id", ParseUUIDPipe) i: string,
  ) {
    return this.orders.customerGet(u.id, i);
  }
  @Get("vendor/orders") @Roles(Role.VENDOR) vendor(
    @CurrentUser() u: RequestUser,
  ) {
    return this.orders.vendorList(u.id);
  }
  @Get("vendor/orders/:id") @Roles(Role.VENDOR) vendorOrder(
    @CurrentUser() user: RequestUser,
    @Param("id", ParseUUIDPipe) id: string,
  ) {
    return this.orders.vendorGet(user.id, id);
  }
  @Patch("vendor/orders/:id/status") @Roles(Role.VENDOR) status(
    @CurrentUser() u: RequestUser,
    @Param("id", ParseUUIDPipe) i: string,
    @Body() b: UpdateOrderStatusDto,
  ) {
    return this.orders.transition(u.id, i, b.status);
  }
  @Post("vendor/orders/:id/cancel-item/:itemId") @Roles(Role.VENDOR) cancel(
    @CurrentUser() u: RequestUser,
    @Param("id", ParseUUIDPipe) i: string,
    @Param("itemId", ParseUUIDPipe) item: string,
    @Body() b: CancelItemDto,
  ) {
    return this.orders.cancelItem(u.id, i, item, b.reason);
  }
  @Post("orders/:id/items/:itemId/cancel")
  @Roles(Role.CUSTOMER)
  customerCancel(
    @CurrentUser() user: RequestUser,
    @Param("id", ParseUUIDPipe) orderId: string,
    @Param("itemId", ParseUUIDPipe) itemId: string,
    @Body() input: CancelItemDto,
  ) {
    return this.orders.customerCancelItem(
      user.id,
      orderId,
      itemId,
      input.reason,
    );
  }
}
