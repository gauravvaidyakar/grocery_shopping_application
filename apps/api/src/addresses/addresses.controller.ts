import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  ParseUUIDPipe,
  Patch,
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
import { AddressDto } from "./addresses.dto";
import { AddressesService } from "./addresses.service";
@ApiTags("Addresses")
@ApiBearerAuth()
@Controller("customers/me/addresses")
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.CUSTOMER)
export class AddressesController {
  constructor(private readonly addresses: AddressesService) {}
  @Get() list(@CurrentUser() u: RequestUser) {
    return this.addresses.list(u.id);
  }
  @Post() create(@CurrentUser() u: RequestUser, @Body() b: AddressDto) {
    return this.addresses.create(u.id, b);
  }
  @Patch(":id") update(
    @CurrentUser() u: RequestUser,
    @Param("id", ParseUUIDPipe) i: string,
    @Body() b: AddressDto,
  ) {
    return this.addresses.update(u.id, i, b);
  }
  @Delete(":id") @HttpCode(204) remove(
    @CurrentUser() u: RequestUser,
    @Param("id", ParseUUIDPipe) i: string,
  ) {
    return this.addresses.remove(u.id, i);
  }
}
