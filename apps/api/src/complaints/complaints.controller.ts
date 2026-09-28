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
import {
  ComplaintMessageDto,
  CreateComplaintDto,
  UpdateComplaintStatusDto,
} from "./complaints.dto";
import { ComplaintsService } from "./complaints.service";
@ApiTags("Complaints")
@ApiBearerAuth()
@Controller("complaints")
@UseGuards(JwtAuthGuard, RolesGuard)
export class ComplaintsController {
  constructor(private readonly complaints: ComplaintsService) {}
  @Roles(Role.CUSTOMER)
  @Post()
  @ApiConsumes("multipart/form-data", "application/json")
  @UseInterceptors(
    FilesInterceptor("attachments", 3, {
      limits: { fileSize: 5_242_880, files: 3, fields: 10 },
    }),
  )
  create(
    @CurrentUser() u: RequestUser,
    @Body() b: CreateComplaintDto,
    @UploadedFiles() files: Express.Multer.File[] = [],
  ) {
    return this.complaints.create(u.id, b, files);
  }
  @Roles(Role.CUSTOMER)
  @Get()
  list(@CurrentUser() u: RequestUser) {
    return this.complaints.list(u.id);
  }
  @Roles(Role.CUSTOMER)
  @Get(":id")
  get(@CurrentUser() u: RequestUser, @Param("id", ParseUUIDPipe) i: string) {
    return this.complaints.get(u.id, i);
  }
  @Roles(Role.CUSTOMER)
  @Post(":id/messages")
  message(
    @CurrentUser() u: RequestUser,
    @Param("id", ParseUUIDPipe) i: string,
    @Body() b: ComplaintMessageDto,
  ) {
    return this.complaints.message(u.id, i, b.message);
  }

  @Get("/admin/all")
  @Roles(Role.ADMIN)
  adminList() {
    return this.complaints.adminList();
  }

  @Get("/vendor/all")
  @Roles(Role.VENDOR)
  vendorList(@CurrentUser() user: RequestUser) {
    return this.complaints.vendorList(user.id);
  }

  @Post(":id/staff-messages")
  @Roles(Role.ADMIN, Role.VENDOR)
  staffMessage(
    @CurrentUser() user: RequestUser,
    @Param("id", ParseUUIDPipe) id: string,
    @Body() input: ComplaintMessageDto,
  ) {
    return this.complaints.staffMessage(user.id, user.role, id, input.message);
  }

  @Post(":id/status")
  @Roles(Role.ADMIN)
  updateStatus(
    @Param("id", ParseUUIDPipe) id: string,
    @Body() input: UpdateComplaintStatusDto,
  ) {
    return this.complaints.updateStatus(id, input.status, input.resolution);
  }
}
