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
import { Roles } from "../common/roles.decorator";
import { RolesGuard } from "../common/roles.guard";
import { CompleteBankRefundDto } from "./refunds.dto";
import { RefundsService } from "./refunds.service";

@ApiTags("Refunds")
@ApiBearerAuth()
@Controller("admin/refunds")
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ADMIN)
export class RefundsController {
  constructor(private readonly refunds: RefundsService) {}

  @Get()
  list() {
    return this.refunds.list();
  }

  @Get(":id")
  get(@Param("id", ParseUUIDPipe) id: string) {
    return this.refunds.get(id);
  }

  @Post(":id/process")
  process(@Param("id", ParseUUIDPipe) id: string) {
    return this.refunds.process(id);
  }

  @Post(":id/complete-bank-transfer")
  completeBankTransfer(
    @Param("id", ParseUUIDPipe) id: string,
    @Body() input: CompleteBankRefundDto,
  ) {
    return this.refunds.completeBankTransfer(id, input.providerReference);
  }
}
