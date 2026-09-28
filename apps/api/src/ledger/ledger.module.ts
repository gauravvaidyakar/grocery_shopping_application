import { Controller, Get, Module, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";
import { Role } from "@prisma/client";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { CurrentUser } from "../common/current-user.decorator";
import type { RequestUser } from "../common/request-user";
import { Roles } from "../common/roles.decorator";
import { RolesGuard } from "../common/roles.guard";
import { PrismaService } from "../database/prisma.service";
import { VendorsModule } from "../vendors/vendors.module";
import { VendorsService } from "../vendors/vendors.service";
@ApiTags("Vendor ledger")
@ApiBearerAuth()
@Controller("vendor/ledger")
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.VENDOR)
class LedgerController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly vendors: VendorsService,
  ) {}
  @Get() async list(@CurrentUser() u: RequestUser) {
    return this.prisma.vendorLedger.findMany({
      where: { vendorId: await this.vendors.getVendorId(u.id) },
      orderBy: { createdAt: "desc" },
    });
  }
}
@Module({ imports: [VendorsModule], controllers: [LedgerController] })
export class LedgerModule {}
