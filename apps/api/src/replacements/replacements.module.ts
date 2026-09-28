import { Controller, Get, Module, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";
import { Role } from "@prisma/client";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { CurrentUser } from "../common/current-user.decorator";
import type { RequestUser } from "../common/request-user";
import { Roles } from "../common/roles.decorator";
import { RolesGuard } from "../common/roles.guard";
import { PrismaService } from "../database/prisma.service";
@ApiTags("Replacements")
@ApiBearerAuth()
@Controller("replacements")
@UseGuards(JwtAuthGuard, RolesGuard)
class ReplacementsController {
  constructor(private readonly prisma: PrismaService) {}
  @Get() @Roles(Role.CUSTOMER) list(@CurrentUser() u: RequestUser) {
    return this.prisma.replacement.findMany({
      where: {
        orderItem: {
          vendorOrder: { masterOrder: { customer: { userId: u.id } } },
        },
      },
      include: { orderItem: { include: { product: true } } },
      orderBy: { createdAt: "desc" },
    });
  }
  @Get("vendor/all") @Roles(Role.VENDOR) vendorList(@CurrentUser() user: RequestUser) {
    return this.prisma.replacement.findMany({
      where: { orderItem: { vendorOrder: { vendor: { userId: user.id } } } },
      include: { orderItem: { include: { product: true, vendorOrder: true } } },
      orderBy: { createdAt: "desc" },
    });
  }
}
@Module({ controllers: [ReplacementsController] })
export class ReplacementsModule {}
