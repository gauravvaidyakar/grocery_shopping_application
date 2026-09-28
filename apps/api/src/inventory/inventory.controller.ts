import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  UseGuards,
} from "@nestjs/common";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";
import { Role } from "@prisma/client";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { CurrentUser } from "../common/current-user.decorator";
import type { RequestUser } from "../common/request-user";
import { Roles } from "../common/roles.decorator";
import { RolesGuard } from "../common/roles.guard";
import { InventoryAdjustmentDto } from "../products/products.dto";
import { InventoryService } from "./inventory.service";

@ApiTags("Inventory")
@ApiBearerAuth()
@Controller("vendor/inventory")
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.VENDOR)
export class InventoryController {
  constructor(private readonly inventory: InventoryService) {}
  @Get() list(@CurrentUser() user: RequestUser) {
    return this.inventory.list(user.id);
  }
  @Get(":productId/history") history(
    @CurrentUser() user: RequestUser,
    @Param("productId", ParseUUIDPipe) productId: string,
  ) {
    return this.inventory.history(user.id, productId);
  }
  @Patch(":productId") adjust(
    @CurrentUser() user: RequestUser,
    @Param("productId", ParseUUIDPipe) productId: string,
    @Body() input: InventoryAdjustmentDto,
  ) {
    return this.inventory.adjust(
      user.id,
      productId,
      input.quantity,
      input.reason,
    );
  }
}
