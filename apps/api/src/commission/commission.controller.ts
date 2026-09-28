import { Body, Controller, Get, Post, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";
import { Role } from "@prisma/client";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { CurrentUser } from "../common/current-user.decorator";
import type { RequestUser } from "../common/request-user";
import { Roles } from "../common/roles.decorator";
import { RolesGuard } from "../common/roles.guard";
import { CommissionRuleDto } from "./commission.dto";
import { CommissionService } from "./commission.service";
@ApiTags("Commission")
@ApiBearerAuth()
@Controller()
@UseGuards(JwtAuthGuard, RolesGuard)
export class CommissionController {
  constructor(private readonly commission: CommissionService) {}
  @Get("admin/commission/rules") @Roles(Role.ADMIN) rules() {
    return this.commission.rules();
  }
  @Post("admin/commission/rules") @Roles(Role.ADMIN) create(
    @Body() b: CommissionRuleDto,
  ) {
    return this.commission.create(b);
  }
  @Get("vendor/commission/transactions") @Roles(Role.VENDOR) transactions(
    @CurrentUser() u: RequestUser,
  ) {
    return this.commission.vendorTransactions(u.id);
  }
}
