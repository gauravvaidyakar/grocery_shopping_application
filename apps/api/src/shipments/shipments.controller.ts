import {
  Headers,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  RawBodyRequest,
  Req,
  UseGuards,
} from "@nestjs/common";
import type { Request } from "express";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";
import { Role } from "@prisma/client";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { CurrentUser } from "../common/current-user.decorator";
import type { RequestUser } from "../common/request-user";
import { Roles } from "../common/roles.decorator";
import { RolesGuard } from "../common/roles.guard";
import { ShipmentsService } from "./shipments.service";

@ApiTags("Shipping webhooks")
@Controller("shipments")
export class ShipmentWebhooksController {
  constructor(private readonly shipments: ShipmentsService) {}

  @Post("webhook/shiprocket")
  webhook(
    @Req() request: RawBodyRequest<Request>,
    @Headers("x-api-key") secret: string | undefined,
  ) {
    if (!request.rawBody) throw new Error("Raw webhook body is unavailable");
    return this.shipments.shiprocketWebhook(request.rawBody, secret);
  }
}

@ApiTags("Shipments")
@ApiBearerAuth()
@Controller("shipments")
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.CUSTOMER, Role.VENDOR, Role.ADMIN)
export class ShipmentsController {
  constructor(private readonly shipments: ShipmentsService) {}
  @Get(":id/tracking") track(
    @CurrentUser() u: RequestUser,
    @Param("id", ParseUUIDPipe) i: string,
  ) {
    return this.shipments.tracking(u, i);
  }
  @Post("vendor-orders/:id") @Roles(Role.VENDOR) create(
    @CurrentUser() user: RequestUser,
    @Param("id", ParseUUIDPipe) id: string,
  ) {
    return this.shipments.createForVendorOrder(user.id, id);
  }
}
