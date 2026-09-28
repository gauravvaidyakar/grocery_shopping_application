import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  UseGuards,
} from "@nestjs/common";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";
import { Role } from "@prisma/client";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { CurrentUser } from "../common/current-user.decorator";
import type { RequestUser } from "../common/request-user";
import { Roles } from "../common/roles.decorator";
import { RolesGuard } from "../common/roles.guard";
import { PaginationDto } from "../common/pagination.dto";
import { IntegrationSettingsService } from "../integration-settings/integration-settings.service";
import { UpdateIntegrationSettingsDto } from "../integration-settings/integration-settings.dto";
import { RejectProductDto } from "../products/products.dto";
import { VendorDocumentsService } from "../vendor-documents/vendor-documents.service";
import { VendorInspectionsService } from "../vendor-inspections/vendor-inspections.service";
import {
  CreateInspectionDto,
  UpdateInspectionDto,
  VerifyDocumentDto,
} from "../vendors/vendors.dto";
import { AdminService } from "./admin.service";
import { BankVerificationDto, DecisionDto, SuspensionDto } from "./admin.dto";

@ApiTags("Admin")
@ApiBearerAuth()
@Controller("admin")
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ADMIN)
export class AdminController {
  constructor(
    private readonly admin: AdminService,
    private readonly documents: VendorDocumentsService,
    private readonly inspections: VendorInspectionsService,
    private readonly integrationSettings: IntegrationSettingsService,
  ) {}
  @Get("dashboard") dashboard() {
    return this.admin.dashboard();
  }
  @Get("customers") customers(@Query() query: PaginationDto) {
    return this.admin.listCustomers(query.page, query.limit);
  }
  @Get("vendors") vendors(@Query() query: PaginationDto) {
    return this.admin.listVendors(query.page, query.limit);
  }
  @Get("vendors/:id") vendor(@Param("id", ParseUUIDPipe) id: string) {
    return this.admin.vendor(id);
  }
  @Post("vendors/:id/approve") approveVendor(
    @CurrentUser() user: RequestUser,
    @Param("id", ParseUUIDPipe) id: string,
  ) {
    return this.admin.approveVendor(id, user.id);
  }
  @Post("vendors/:id/reject") rejectVendor(
    @CurrentUser() user: RequestUser,
    @Param("id", ParseUUIDPipe) id: string,
    @Body() input: DecisionDto,
  ) {
    return this.admin.rejectVendor(id, user.id, input.reason);
  }
  @Post("vendors/:id/suspend") suspendVendor(
    @CurrentUser() user: RequestUser,
    @Param("id", ParseUUIDPipe) id: string,
    @Body() input: SuspensionDto,
  ) {
    return this.admin.suspendVendor(id, user.id, input.reason, input.details);
  }
  @Patch("vendor-documents/:id/verify") verifyDocument(
    @CurrentUser() user: RequestUser,
    @Param("id", ParseUUIDPipe) id: string,
    @Body() input: VerifyDocumentDto,
  ) {
    return this.documents.verify(
      id,
      user.id,
      input.status,
      input.rejectionReason,
    );
  }
  @Patch("vendor-bank-accounts/:id/verify") verifyBank(
    @CurrentUser() user: RequestUser,
    @Param("id", ParseUUIDPipe) id: string,
    @Body() input: BankVerificationDto,
  ) {
    return this.admin.verifyBank(id, user.id, input.status, input.reason);
  }
  @Post("vendors/:vendorId/inspection") inspection(
    @CurrentUser() user: RequestUser,
    @Param("vendorId", ParseUUIDPipe) vendorId: string,
    @Body() input: CreateInspectionDto,
  ) {
    return this.inspections.create(vendorId, user.id, input);
  }
  @Get("vendors/:vendorId/inspections") inspectionsForVendor(
    @Param("vendorId", ParseUUIDPipe) vendorId: string,
  ) {
    return this.inspections.list(vendorId);
  }
  @Patch("inspections/:id") updateInspection(
    @CurrentUser() user: RequestUser,
    @Param("id", ParseUUIDPipe) id: string,
    @Body() input: UpdateInspectionDto,
  ) {
    return this.inspections.update(id, user.id, input);
  }
  @Get("products") products(@Query() query: PaginationDto) {
    return this.admin.listProducts(query.page, query.limit);
  }
  @Post("products/:id/approve") approveProduct(
    @CurrentUser() user: RequestUser,
    @Param("id", ParseUUIDPipe) id: string,
  ) {
    return this.admin.approveProduct(id, user.id);
  }
  @Post("products/:id/reject") rejectProduct(
    @CurrentUser() user: RequestUser,
    @Param("id", ParseUUIDPipe) id: string,
    @Body() input: RejectProductDto,
  ) {
    return this.admin.rejectProduct(id, user.id, input.reason);
  }
  @Get("orders") orders(@Query() query: PaginationDto) {
    return this.admin.listOrders(query.page, query.limit);
  }
  @Get("orders/:id") order(@Param("id", ParseUUIDPipe) id: string) {
    return this.admin.order(id);
  }
  @Get("payments") payments(@Query() query: PaginationDto) { return this.admin.payments(query.page, query.limit); }
  @Get("shipments") shipments(@Query() query: PaginationDto) { return this.admin.shipments(query.page, query.limit); }
  @Get("ledger") ledger(@Query() query: PaginationDto) { return this.admin.ledger(query.page, query.limit); }
  @Get("replacements") replacements(@Query() query: PaginationDto) { return this.admin.replacements(query.page, query.limit); }
  @Get("notifications") notifications(@Query() query: PaginationDto) { return this.admin.notifications(query.page, query.limit); }
  @Get("audit-logs") auditLogs(@Query() query: PaginationDto) { return this.admin.auditLogs(query.page, query.limit); }
  @Get("reports") reports() { return this.admin.reports(); }
  @Get("integration-settings") integrationConfiguration() {
    return this.integrationSettings.list();
  }
  @Patch("integration-settings") updateIntegrationConfiguration(
    @CurrentUser() user: RequestUser,
    @Body() input: UpdateIntegrationSettingsDto,
  ) {
    return this.integrationSettings.update(user.id, input);
  }
  @Delete("integration-settings/:key") removeIntegrationConfiguration(
    @CurrentUser() user: RequestUser,
    @Param("key") key: string,
  ) {
    return this.integrationSettings.remove(user.id, key);
  }
}
