import { Body, Controller, Get, Patch, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";
import { Role } from "@prisma/client";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { CurrentUser } from "../common/current-user.decorator";
import type { RequestUser } from "../common/request-user";
import { Roles } from "../common/roles.decorator";
import { RolesGuard } from "../common/roles.guard";
import { UpdateCustomerDto } from "./customers.dto";
import { CustomersService } from "./customers.service";
@ApiTags("Customers")
@ApiBearerAuth()
@Controller("customers/me")
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.CUSTOMER)
export class CustomersController {
  constructor(private readonly customers: CustomersService) {}
  @Get() get(@CurrentUser() user: RequestUser) {
    return this.customers.profile(user.id);
  }
  @Patch() update(
    @CurrentUser() user: RequestUser,
    @Body() input: UpdateCustomerDto,
  ) {
    return this.customers.update(user.id, input);
  }
}
