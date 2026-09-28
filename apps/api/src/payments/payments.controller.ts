import {
  Body,
  Controller,
  Get,
  Headers,
  Param,
  ParseUUIDPipe,
  Post,
  RawBodyRequest,
  Req,
  UseGuards,
} from "@nestjs/common";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";
import { Role } from "@prisma/client";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { CurrentUser } from "../common/current-user.decorator";
import type { RequestUser } from "../common/request-user";
import { Roles } from "../common/roles.decorator";
import { RolesGuard } from "../common/roles.guard";
import { CreatePaymentDto, VerifyPaymentDto } from "./payments.dto";
import { PaymentsService } from "./payments.service";
import type { Request } from "express";

@ApiTags("Payment webhooks")
@Controller("payments")
export class PaymentWebhooksController {
  constructor(private readonly payments: PaymentsService) {}

  @Post("webhook")
  webhook(
    @Req() request: RawBodyRequest<Request>,
    @Headers("x-razorpay-signature") signature: string | undefined,
  ) {
    if (!request.rawBody) {
      throw new Error("Raw webhook body is unavailable");
    }
    return this.payments.webhook(request.rawBody, signature);
  }
}

@ApiTags("Payments")
@ApiBearerAuth()
@Controller("payments")
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.CUSTOMER)
export class PaymentsController {
  constructor(private readonly payments: PaymentsService) {}
  @Post("create") create(
    @CurrentUser() u: RequestUser,
    @Body() b: CreatePaymentDto,
  ) {
    return this.payments.create(u.id, b.masterOrderId);
  }
  @Post("verify") verify(
    @CurrentUser() u: RequestUser,
    @Body() b: VerifyPaymentDto,
  ) {
    return this.payments.verify(u.id, b);
  }
  @Get(":id/status") status(
    @CurrentUser() u: RequestUser,
    @Param("id", ParseUUIDPipe) i: string,
  ) {
    return this.payments.status(u.id, i);
  }

  @Post(":id/reconcile") reconcile(
    @CurrentUser() u: RequestUser,
    @Param("id", ParseUUIDPipe) i: string,
  ) {
    return this.payments.reconcile(u.id, i);
  }
}
