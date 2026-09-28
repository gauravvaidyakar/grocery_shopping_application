import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  UploadedFiles,
  UseGuards,
  UseInterceptors,
} from "@nestjs/common";
import { FilesInterceptor } from "@nestjs/platform-express";
import { ApiBearerAuth, ApiConsumes, ApiTags } from "@nestjs/swagger";
import { Role } from "@prisma/client";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { CurrentUser } from "../common/current-user.decorator";
import type { RequestUser } from "../common/request-user";
import { Roles } from "../common/roles.decorator";
import { RolesGuard } from "../common/roles.guard";
import { CreateReturnDto, UpdateReturnStatusDto } from "./returns.dto";
import { ReturnsService } from "./returns.service";
@ApiTags("Returns")
@ApiBearerAuth()
@Controller()
@UseGuards(JwtAuthGuard, RolesGuard)
export class ReturnsController {
  constructor(private readonly returns: ReturnsService) {}
  @Roles(Role.CUSTOMER)
  @Post("orders/:orderId/items/:itemId/return")
  @ApiConsumes("multipart/form-data", "application/json")
  @UseInterceptors(
    FilesInterceptor("attachments", 3, {
      limits: { fileSize: 5_242_880, files: 3, fields: 10 },
    }),
  )
  create(
    @CurrentUser() u: RequestUser,
    @Param("orderId", ParseUUIDPipe) o: string,
    @Param("itemId", ParseUUIDPipe) i: string,
    @Body() b: CreateReturnDto,
    @UploadedFiles() files: Express.Multer.File[] = [],
  ) {
    return this.returns.create(u.id, o, i, b, files);
  }
  @Roles(Role.CUSTOMER)
  @Get("returns")
  list(@CurrentUser() u: RequestUser) {
    return this.returns.list(u.id);
  }

  @Get("admin/returns")
  @Roles(Role.ADMIN)
  adminList() {
    return this.returns.adminList();
  }

  @Get("vendor/returns")
  @Roles(Role.VENDOR)
  vendorList(@CurrentUser() user: RequestUser) {
    return this.returns.vendorList(user.id);
  }

  @Post("admin/returns/:id/status")
  @Roles(Role.ADMIN)
  updateStatus(
    @Param("id", ParseUUIDPipe) id: string,
    @Body() input: UpdateReturnStatusDto,
  ) {
    return this.returns.updateStatus(id, input.status);
  }
}
