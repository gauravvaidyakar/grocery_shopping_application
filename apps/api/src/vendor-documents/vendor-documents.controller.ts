import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  StreamableFile,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from "@nestjs/common";
import { FileInterceptor } from "@nestjs/platform-express";
import { ApiBearerAuth, ApiConsumes, ApiTags } from "@nestjs/swagger";
import { Role } from "@prisma/client";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { CurrentUser } from "../common/current-user.decorator";
import type { RequestUser } from "../common/request-user";
import { Roles } from "../common/roles.decorator";
import { RolesGuard } from "../common/roles.guard";
import { DocumentMetadataDto } from "../vendors/vendors.dto";
import { VendorDocumentsService } from "./vendor-documents.service";

@ApiTags("Vendor KYC documents")
@ApiBearerAuth()
@Controller()
@UseGuards(JwtAuthGuard, RolesGuard)
export class VendorDocumentsController {
  constructor(private readonly documents: VendorDocumentsService) {}
  @Post("vendor/kyc/documents")
  @Roles(Role.VENDOR)
  @ApiConsumes("multipart/form-data")
  @UseInterceptors(
    FileInterceptor("file", {
      limits: { fileSize: 5_242_880, files: 1, fields: 5 },
    }),
  )
  upload(
    @CurrentUser() user: RequestUser,
    @Body() body: DocumentMetadataDto,
    @UploadedFile() file?: Express.Multer.File,
  ) {
    return this.documents.upload(user.id, body, file);
  }
  @Get("vendor-documents/:id/download")
  @Roles(Role.VENDOR, Role.ADMIN)
  async download(
    @CurrentUser() user: RequestUser,
    @Param("id", ParseUUIDPipe) id: string,
  ): Promise<StreamableFile> {
    const file = await this.documents.download(user, id);
    return new StreamableFile(file.bytes, {
      type: file.mimeType,
      disposition: `attachment; filename="${file.name.replaceAll('"', "")}"`,
    });
  }
}
