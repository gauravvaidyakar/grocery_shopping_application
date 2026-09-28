import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
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
import { CompleteSettlementDto } from "./settlements.dto";
import { SettlementsService } from "./settlements.service";

@ApiTags("Settlements")
@ApiBearerAuth()
@Controller()
@UseGuards(JwtAuthGuard, RolesGuard)
export class SettlementsController {
  constructor(private readonly settlements: SettlementsService) {}

  @Get("vendor/settlements")
  @Roles(Role.VENDOR)
  vendor(@CurrentUser() user: RequestUser) {
    return this.settlements.vendor(user.id);
  }

  @Get("admin/settlements")
  @Roles(Role.ADMIN)
  admin() {
    return this.settlements.admin();
  }

  @Post("admin/settlements/refresh-eligibility")
  @Roles(Role.ADMIN)
  refreshEligibility() {
    return this.settlements.refreshEligibility();
  }

  @Post("admin/settlements/:id/process")
  @Roles(Role.ADMIN)
  process(@Param("id", ParseUUIDPipe) id: string) {
    return this.settlements.process(id);
  }

  @Post("admin/settlements/:id/complete")
  @Roles(Role.ADMIN)
  complete(
    @Param("id", ParseUUIDPipe) id: string,
    @Body() input: CompleteSettlementDto,
  ) {
    return this.settlements.complete(id, input.providerReference);
  }
}
