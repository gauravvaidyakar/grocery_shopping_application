import { Body, Controller, Post, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";
import { Role } from "@prisma/client";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { CurrentUser } from "../common/current-user.decorator";
import type { RequestUser } from "../common/request-user";
import { Roles } from "../common/roles.decorator";
import { RolesGuard } from "../common/roles.guard";
import { ValidateCheckoutDto } from "./checkout.dto";
import { CheckoutService } from "./checkout.service";
@ApiTags("Checkout")
@ApiBearerAuth()
@Controller("checkout")
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.CUSTOMER)
export class CheckoutController {
  constructor(private readonly checkout: CheckoutService) {}
  @Post("validate") validate(
    @CurrentUser() user: RequestUser,
    @Body() input: ValidateCheckoutDto,
  ) {
    return this.checkout.validate(
      user.id,
      input.addressId,
      input.paymentMethod,
    );
  }
}
