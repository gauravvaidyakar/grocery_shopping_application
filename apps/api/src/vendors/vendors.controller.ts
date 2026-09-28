import { Body, Controller, Get, Patch, Post, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";
import { Role } from "@prisma/client";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { CurrentUser } from "../common/current-user.decorator";
import type { RequestUser } from "../common/request-user";
import { Roles } from "../common/roles.decorator";
import { RolesGuard } from "../common/roles.guard";
import {
  BankAccountDto,
  UpdateVendorContactDto,
  UpdateVendorDto,
} from "./vendors.dto";
import { VendorsService } from "./vendors.service";

@ApiTags("Vendor profile")
@ApiBearerAuth()
@Controller("vendor")
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.VENDOR)
export class VendorsController {
  constructor(private readonly vendors: VendorsService) {}
  @Get("dashboard") dashboard(@CurrentUser() user: RequestUser) {
    return this.vendors.dashboard(user.id);
  }
  @Get("profile") profile(@CurrentUser() user: RequestUser) {
    return this.vendors.getByUser(user.id);
  }
  @Patch("profile") update(
    @CurrentUser() user: RequestUser,
    @Body() input: UpdateVendorDto,
  ) {
    return this.vendors.update(user.id, input);
  }
  @Patch("contact") updateContact(
    @CurrentUser() user: RequestUser,
    @Body() input: UpdateVendorContactDto,
  ) {
    return this.vendors.updateContact(user.id, input);
  }
  @Post("bank-account") bank(
    @CurrentUser() user: RequestUser,
    @Body() input: BankAccountDto,
  ) {
    return this.vendors.saveBankAccount(user.id, input);
  }
  @Post("kyc/submit") submit(@CurrentUser() user: RequestUser) {
    return this.vendors.submitKyc(user.id);
  }
  @Get("kyc/status") status(@CurrentUser() user: RequestUser) {
    return this.vendors.getByUser(user.id);
  }
}
